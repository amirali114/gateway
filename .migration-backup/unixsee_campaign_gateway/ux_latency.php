<?php
// Latency-based Smart Queue helpers (Adaptive Concurrency style)
// Designed to be extremely light on the hot path.

if (function_exists('ux_latency_bootstrap')) {
    return;
}

/**
 * Initialize latency sampling for the current request.
 * We only register a shutdown hook if this request is selected for sampling.
 */
function ux_latency_bootstrap(array $config): void
{
    $enabled = isset($config['latency_record_enabled']) ? (bool)$config['latency_record_enabled'] : true;
    if (!$enabled) {
        return;
    }

    $rate = isset($config['latency_sample_rate']) ? (float)$config['latency_sample_rate'] : 0.05;
    if ($rate <= 0) {
        return;
    }
    if ($rate > 1) {
        $rate = 1;
    }

    // Decide sampling once per request.
    $r = mt_rand() / (mt_getrandmax() ?: 1);
    if ($r > $rate) {
        $GLOBALS['_uxwr_lat_sample'] = false;
        return;
    }
    $GLOBALS['_uxwr_lat_sample'] = true;

    // Track only when we actually pass through to WP.
    $GLOBALS['_uxwr_lat_track'] = false;
    $GLOBALS['_uxwr_lat_start'] = microtime(true);

    register_shutdown_function(function () {
        if (empty($GLOBALS['_uxwr_lat_sample']) || empty($GLOBALS['_uxwr_lat_track'])) {
            return;
        }
        $start = $GLOBALS['_uxwr_lat_start'] ?? null;
        if (!$start) {
            return;
        }

        $ms = (int)round((microtime(true) - (float)$start) * 1000);
        if ($ms < 0) {
            $ms = 0;
        }

        $code = 200;
        if (function_exists('http_response_code')) {
            $tmp = (int)http_response_code();
            if ($tmp > 0) {
                $code = $tmp;
            }
        }

        // If a fatal error occurred, treat it as 500 for health/error-rate purposes.
        $err = error_get_last();
        if (is_array($err) && isset($err['type'])) {
            $t = (int)$err['type'];
            $fatal = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
            if (in_array($t, $fatal, true)) {
                $code = 500;
            }
        }

        try {
            ux_latency_record_sample(time(), $ms, $code);
        } catch (Throwable $e) {
            // Never break request.
        }
    });
}

/** Mark that this request was admitted to WordPress (so we should record latency). */
function ux_latency_mark_pass(): void
{
    if (!empty($GLOBALS['_uxwr_lat_sample'])) {
        $GLOBALS['_uxwr_lat_track'] = true;
    }
}

/**
 * Store a latency sample.
 * Prefers Redis (ZSET), falls back to SQLite (ux_campaign.sqlite).
 */
function ux_latency_record_sample(int $ts, int $ms, int $status): void
{
    $config = $GLOBALS['config'] ?? [];

    // Prefer Redis when available.
    $redis = function_exists('ux_redis_client') ? ux_redis_client() : null;
    if ($redis instanceof Redis) {
        $window = isset($config['latency_window_seconds']) ? (int)$config['latency_window_seconds'] : 60;
        if ($window < 30) {
            $window = 30;
        }

        $key = 'ux_lat_samples';
        // member format: ts:rand:ms:status
        $rand = (string)mt_rand(100000, 999999);
        $member = $ts . ':' . $rand . ':' . $ms . ':' . $status;
        $redis->zAdd($key, $ts, $member);

        // Best-effort pruning (keep multiple windows to avoid edge effects).
        $cut = $ts - ($window * 3);
        $redis->zRemRangeByScore($key, '-inf', (string)$cut);
        $redis->expire($key, max(120, $window * 4));
        return;
    }

    // SQLite fallback (low sample rate recommended).
    if (function_exists('ux_storage_pdo')) {
        $pdo = ux_storage_pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS ux_latency (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, ms INTEGER NOT NULL, status INTEGER NOT NULL);");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ux_latency_ts ON ux_latency(ts);");
        $stmt = $pdo->prepare("INSERT INTO ux_latency (ts, ms, status) VALUES (:ts,:ms,:st)");
        $stmt->execute([':ts' => $ts, ':ms' => $ms, ':st' => $status]);

        // Keep 24h max in SQLite.
        $cutoff = $ts - 86400;
        $del = $pdo->prepare("DELETE FROM ux_latency WHERE ts < :c");
        $del->execute([':c' => $cutoff]);
    }
}

/**
 * Compute window stats: p95 latency and 5xx error-rate.
 * Returns: ['p95_ms'=>?int, 'samples'=>int, 'err5xx_pct'=>?float]
 */
function ux_latency_get_window_stats(array $config): array
{
    $window = isset($config['latency_window_seconds']) ? (int)$config['latency_window_seconds'] : 60;
    if ($window < 30) {
        $window = 30;
    }

    $now  = time();
    $from = $now - $window;

    $samples = [];
    $codes   = [];

    $redis = function_exists('ux_redis_client') ? ux_redis_client() : null;
    if ($redis instanceof Redis) {
        try {
            $key = 'ux_lat_samples';
            $members = $redis->zRangeByScore($key, (string)$from, (string)$now);
            if (is_array($members)) {
                foreach ($members as $m) {
                    $parts = explode(':', (string)$m);
                    $cnt = count($parts);
                    if ($cnt < 4) {
                        continue;
                    }
                    $ms = (int)$parts[$cnt - 2];
                    $st = (int)$parts[$cnt - 1];
                    if ($ms >= 0) {
                        $samples[] = $ms;
                        $codes[]   = $st;
                    }
                }
            }
        } catch (Throwable $e) {
            // fall back below
        }
    }

    if (empty($samples) && function_exists('ux_storage_pdo')) {
        try {
            $pdo = ux_storage_pdo();
            // Table might not exist on older DBs; ignore errors.
            $stmt = $pdo->prepare("SELECT ms, status FROM ux_latency WHERE ts >= :from AND ts <= :now ORDER BY ts ASC");
            $stmt->execute([':from' => $from, ':now' => $now]);
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $samples[] = (int)($row['ms'] ?? 0);
                $codes[]   = (int)($row['status'] ?? 200);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    $n = count($samples);
    if ($n === 0) {
        return ['p95_ms' => null, 'samples' => 0, 'err5xx_pct' => null];
    }

    sort($samples);
    $idx = (int)floor(0.95 * max(0, ($n - 1)));
    if ($idx < 0) {
        $idx = 0;
    }
    if ($idx >= $n) {
        $idx = $n - 1;
    }
    $p95 = (int)$samples[$idx];

    $err = 0;
    foreach ($codes as $c) {
        $c = (int)$c;
        if ($c >= 500 && $c < 600) {
            $err++;
        }
    }
    $errPct = $n > 0 ? round(($err / $n) * 100, 2) : 0.0;

    return ['p95_ms' => $p95, 'samples' => $n, 'err5xx_pct' => $errPct];
}
