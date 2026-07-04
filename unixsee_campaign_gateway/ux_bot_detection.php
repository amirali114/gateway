<?php
/**
 * Unixsee Campaign Gateway – Bot Intelligence Module
 * -------------------------------------------------
 * هدف این ماژول این است که بدون آسیب‌زدن به کاربران واقعی و ربات‌های ضروری سئو
 * (Google/Bing/…)، بتوانیم:
 *  1) ربات‌های خوب را با دقت بالاتر اعتبارسنجی کنیم (Reverse/Forward DNS)
 *  2) برای هر IP یک «امتیاز اعتماد» نگه داریم که با رفتار به‌روز می‌شود
 *  3) نرخ درخواست را با پنجره‌ی زمانی لغزان (EWMA) پایش کنیم (کم‌سربار)
 *  4) در ترافیک بالا، تا حد امکان از Redis برای ذخیره‌سازی استفاده کنیم
 *  5) با کوکی امضاشده، امتیاز را بین چند درخواست هموار کنیم (کاهش False Positive)
 *  6) ساختار توسعه‌پذیر برای آینده (Hook برای ML یا Challengeهای JS)
 *
 * نکته مهم:
 * - اگر Redis در تنظیمات فعال باشد و اکستنشن Redis موجود باشد، نگهداری امتیازها
 *   در Redis انجام می‌شود و فقط رخدادهای مهم در SQLite لاگ می‌شوند.
 * - اگر Redis خاموش/ناموجود باشد، امتیازها در SQLite ذخیره می‌شوند.
 */

// Prevent redeclaration if included multiple times.
if (function_exists('ux_bot_gatekeeper')) {
    return;
}

/**
 * Get current time in milliseconds (integer).
 */
function ux_bot_now_ms(): int
{
    return (int)floor(microtime(true) * 1000);
}

/**
 * Safe clamp for int.
 */
function ux_bot_clamp_int(int $v, int $min, int $max): int
{
    if ($v < $min) {
        return $min;
    }
    if ($v > $max) {
        return $max;
    }
    return $v;
}

/**
 * Read a config value with default.
 */
function ux_bot_cfg(array $config, string $key, $default)
{
    return array_key_exists($key, $config) ? $config[$key] : $default;
}

/**
 * Determine whether this request should skip bot intelligence checks.
 * We skip:
 *  - CLI
 *  - admin entry (handled earlier)
 *  - static assets (css/js/images/fonts)
 */
function ux_bot_should_skip_request(array $config): bool
{
    if (PHP_SAPI === 'cli') {
        return true;
    }

    $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
    if ($uri === '') {
        return false;
    }

    // Quick static extension check.
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        return false;
    }
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if ($ext !== '') {
        $static = ['css','js','png','jpg','jpeg','gif','webp','svg','ico','woff','woff2','ttf','eot','map'];
        if (in_array($ext, $static, true)) {
            return true;
        }
    }
    return false;
}

/**
 * Create a secret key for signing cookies.
 */
function ux_bot_cookie_secret(array $config): string
{
    $custom = (string)ux_bot_cfg($config, 'bot_cookie_signing_key', '');
    if ($custom !== '') {
        return $custom;
    }
    // Fallback: derive from panel_token + file path.
    $token = (string)ux_bot_cfg($config, 'panel_token', '');
    return hash('sha256', $token . '|' . __DIR__ . '|' . PHP_VERSION);
}

/**
 * Base64url helpers.
 */
function ux_bot_b64url_encode(string $bin): string
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function ux_bot_b64url_decode(string $str): string
{
    $pad = strlen($str) % 4;
    if ($pad) {
        $str .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($str, '-_', '+/')) ?: '';
}

/**
 * Get cookie state (signed). Returns array|null.
 * Payload: {s:int, t:int, u:string}
 */
function ux_bot_cookie_get(array $config, string $uaLower): ?array
{
    if (empty(ux_bot_cfg($config, 'bot_cookie_enabled', true))) {
        return null;
    }
    $name = (string)ux_bot_cfg($config, 'bot_cookie_name', 'ux_bm');
    $raw  = (string)($_COOKIE[$name] ?? '');
    if ($raw === '' || strpos($raw, '.') === false) {
        return null;
    }
    [$p, $sig] = explode('.', $raw, 2);
    if ($p === '' || $sig === '') {
        return null;
    }
    $payloadJson = ux_bot_b64url_decode($p);
    if ($payloadJson === '') {
        return null;
    }
    $secret = ux_bot_cookie_secret($config);
    $calc   = hash_hmac('sha256', $p, $secret);
    if (!hash_equals($calc, $sig)) {
        return null;
    }
    $data = json_decode($payloadJson, true);
    if (!is_array($data)) {
        return null;
    }
    // bind to UA (reduces trivial replay)
    $uaHash = substr(hash('sha1', $uaLower), 0, 12);
    if (!isset($data['u']) || (string)$data['u'] !== $uaHash) {
        return null;
    }
    return $data;
}

/**
 * Set signed cookie state.
 */
function ux_bot_cookie_set(array $config, string $uaLower, int $score): void
{
    if (empty(ux_bot_cfg($config, 'bot_cookie_enabled', true))) {
        return;
    }
    $name = (string)ux_bot_cfg($config, 'bot_cookie_name', 'ux_bm');
    $ttl  = (int)ux_bot_cfg($config, 'bot_cookie_ttl_seconds', 7200);
    if ($ttl < 300) {
        $ttl = 300;
    }
    $uaHash = substr(hash('sha1', $uaLower), 0, 12);
    $payload = [
        's' => (int)$score,
        't' => time(),
        'u' => $uaHash,
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (!is_string($json)) {
        return;
    }
    $p = ux_bot_b64url_encode($json);
    $sig = hash_hmac('sha256', $p, ux_bot_cookie_secret($config));
    $value = $p . '.' . $sig;

    $secure = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    // Use SameSite=Lax so it doesn't break normal navigation.
    @setcookie($name, $value, [
        'expires'  => time() + $ttl,
        'path'     => '/',
        'domain'   => '',
        'secure'   => (bool)$secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Return default DNS domains for verified bots.
 * You can override/extend via config['bot_dns_allowed_domains']
 */
function ux_bot_dns_default_domains(): array
{
    return [
        // Official guidance: Googlebot uses *.googlebot.com and *.google.com
        'googlebot'   => ['.googlebot.com', '.google.com'],
        // Bingbot: *.search.msn.com
        'bingbot'     => ['.search.msn.com'],
        // Yandex bots
        'yandex'      => ['.yandex.ru', '.yandex.net'],
        // Baidu
        'baiduspider' => ['.baidu.com'],
        // DuckDuckGo
        'duckduckbot' => ['.duckduckgo.com'],
        // Apple
        'applebot'    => ['.apple.com'],
    ];
}

/**
 * Detect a claimed "high-value" bot token from UA.
 */
function ux_bot_claim_token(string $uaLower): ?string
{
    $candidates = ['googlebot','bingbot','yandex','baiduspider','duckduckbot','applebot'];
    foreach ($candidates as $t) {
        if ($t !== '' && strpos($uaLower, $t) !== false) {
            return $t;
        }
    }
    return null;
}

/**
 * DNS verify helper with caching.
 * Returns:
 *  - true  verified
 *  - false explicitly not verified (domain mismatch or forward mismatch)
 *  - null  unknown (dns failed), treated softly in "balanced" mode
 */
function ux_bot_dns_verify(array $config, string $ip, string $uaLower): ?bool
{
    if (empty(ux_bot_cfg($config, 'bot_dns_validation_enabled', false))) {
        return null;
    }
    $token = ux_bot_claim_token($uaLower);
    if ($token === null) {
        return null;
    }

    $ttl = (int)ux_bot_cfg($config, 'bot_dns_cache_ttl_seconds', 21600);
    if ($ttl < 300) {
        $ttl = 300;
    }
    $now = time();

    // Redis cache (preferred)
    $redis = null;
    if (function_exists('ux_redis_client')) {
        $redis = ux_redis_client();
    }
    $redisCacheEnabled = ($redis instanceof Redis) && !empty($config['redis_enabled']);
    $cacheKey = 'ux:botdns:' . $ip;
    if ($redisCacheEnabled) {
        try {
            $cached = $redis->hGetAll($cacheKey);
            if (is_array($cached) && isset($cached['expires_at'])) {
                $expiresAt = (int)$cached['expires_at'];
                if ($expiresAt > $now) {
                    $v = isset($cached['verified']) ? (int)$cached['verified'] : -1;
                    if ($v === 1) {
                        return true;
                    }
                    if ($v === 0) {
                        return false;
                    }
                    return null;
                }
            }
        } catch (Throwable $e) {
            // ignore cache issues
        }
    }

    // SQLite cache
    try {
        if (function_exists('ux_storage_pdo')) {
            $pdo = ux_storage_pdo();
            $stmt = $pdo->prepare("SELECT verified, expires_at FROM bot_dns_cache WHERE ip = :ip LIMIT 1");
            $stmt->execute([':ip' => $ip]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (is_array($row) && isset($row['expires_at']) && (int)$row['expires_at'] > $now) {
                $v = (int)($row['verified'] ?? -1);
                if ($v === 1) {
                    return true;
                }
                if ($v === 0) {
                    return false;
                }
                return null;
            }
        }
    } catch (Throwable $e) {
        // ignore
    }

    $domains = ux_bot_dns_default_domains();
    $override = ux_bot_cfg($config, 'bot_dns_allowed_domains', null);
    if (is_array($override)) {
        // Merge override over defaults (allow extend)
        foreach ($override as $k => $v) {
            if (!is_array($v)) {
                continue;
            }
            $domains[(string)$k] = array_values(array_filter(array_map('strval', $v), 'strlen'));
        }
    }
    $allowedSuffixes = $domains[$token] ?? [];
    if (!is_array($allowedSuffixes) || empty($allowedSuffixes)) {
        // No rule → do not force DNS validation.
        return null;
    }

    // Reverse DNS
    $host = @gethostbyaddr($ip);
    if (!is_string($host) || $host === '' || $host === $ip) {
        // Unknown (no PTR)
        ux_bot_dns_cache_store($config, $redis, $redisCacheEnabled, $ip, '', -1, $now, min(300, $ttl));
        return null;
    }
    $hostLower = strtolower($host);
    $suffixOk = false;
    foreach ($allowedSuffixes as $suf) {
        $suf = strtolower((string)$suf);
        if ($suf !== '' && substr($hostLower, -strlen($suf)) === $suf) {
            $suffixOk = true;
            break;
        }
    }
    if (!$suffixOk) {
        ux_bot_dns_cache_store($config, $redis, $redisCacheEnabled, $ip, $host, 0, $now, $ttl);
        return false;
    }

    // Forward DNS (A/AAAA)
    $ips = [];
    try {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $records = @dns_get_record($host, DNS_AAAA);
            if (is_array($records)) {
                foreach ($records as $r) {
                    if (isset($r['ipv6'])) {
                        $ips[] = (string)$r['ipv6'];
                    }
                }
            }
            $recordsA = @dns_get_record($host, DNS_A);
            if (is_array($recordsA)) {
                foreach ($recordsA as $r) {
                    if (isset($r['ip'])) {
                        $ips[] = (string)$r['ip'];
                    }
                }
            }
        } else {
            $list = @gethostbynamel($host);
            if (is_array($list)) {
                foreach ($list as $v) {
                    $ips[] = (string)$v;
                }
            }
        }
    } catch (Throwable $e) {
        // ignore
    }
    $ips = array_values(array_unique(array_filter($ips, 'strlen')));
    if (empty($ips)) {
        ux_bot_dns_cache_store($config, $redis, $redisCacheEnabled, $ip, $host, -1, $now, min(300, $ttl));
        return null;
    }
    if (!in_array($ip, $ips, true)) {
        ux_bot_dns_cache_store($config, $redis, $redisCacheEnabled, $ip, $host, 0, $now, $ttl);
        return false;
    }

    ux_bot_dns_cache_store($config, $redis, $redisCacheEnabled, $ip, $host, 1, $now, $ttl);
    return true;
}

function ux_bot_dns_cache_store(array $config, $redis, bool $redisCacheEnabled, string $ip, string $host, int $verified, int $now, int $ttl): void
{
    $expiresAt = $now + $ttl;
    if ($redisCacheEnabled && $redis instanceof Redis) {
        try {
            $redis->hMSet('ux:botdns:' . $ip, [
                'hostname'    => $host,
                'verified'    => (string)$verified,
                'checked_at'  => (string)$now,
                'expires_at'  => (string)$expiresAt,
            ]);
            $redis->expire('ux:botdns:' . $ip, $ttl);
        } catch (Throwable $e) {
            // ignore
        }
    }
    // Optional: persist to SQLite for dashboard visibility.
    // Disabled by default because any extra write-path can hurt under load.
    $persistSqlite = (bool)ux_bot_cfg($config, 'bot_dns_persist_sqlite', false);
    if ($persistSqlite) {
        try {
            if (function_exists('ux_storage_pdo')) {
                $pdo = ux_storage_pdo();
                $stmt = $pdo->prepare(
                    "INSERT INTO bot_dns_cache (ip, hostname, verified, checked_at, expires_at)\n" .
                    "VALUES (:ip, :hostname, :verified, :checked_at, :expires_at)\n" .
                    "ON CONFLICT(ip) DO UPDATE SET\n" .
                    "hostname=excluded.hostname, verified=excluded.verified, checked_at=excluded.checked_at, expires_at=excluded.expires_at"
                );
                $stmt->execute([
                    ':ip'         => $ip,
                    ':hostname'   => $host,
                    ':verified'   => $verified,
                    ':checked_at' => $now,
                    ':expires_at' => $expiresAt,
                ]);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
}

/**
 * Fetch score record for an IP from Redis (preferred) or SQLite (fallback).
 */
function ux_bot_score_get_record(array $config, string $ip): array
{
    $initial = (int)ux_bot_cfg($config, 'bot_score_initial', 50);
    $initial = ux_bot_clamp_int($initial, 0, 100);
    $nowMs   = ux_bot_now_ms();
    $now     = time();

    $default = [
        'ip'            => $ip,
        'user_agent'    => '',
        'score'         => $initial,
        'last_seen'     => $now,
        'last_req_ms'   => $nowMs,
        'rate_estimate' => 0.0,
        'created_at'    => $now,
        'updated_at'    => $now,
        // throttled SQLite persistence metadata (stored only in Redis)
        'persisted_at'   => 0,
        'persisted_score'=> $initial,
    ];

    $useRedis = !empty(ux_bot_cfg($config, 'bot_scoring_use_redis', true)) && !empty($config['redis_enabled']);
    $redis = null;
    if ($useRedis && function_exists('ux_redis_client')) {
        $redis = ux_redis_client();
    }
    if ($useRedis && $redis instanceof Redis) {
        try {
            $key = 'ux:botscore:' . $ip;
            $data = $redis->hGetAll($key);
            if (is_array($data) && !empty($data)) {
                return [
                    'ip'            => $ip,
                    'user_agent'    => (string)($data['user_agent'] ?? ''),
                    'score'         => (int)($data['score'] ?? $initial),
                    'last_seen'     => (int)($data['last_seen'] ?? $now),
                    'last_req_ms'   => (int)($data['last_req_ms'] ?? $nowMs),
                    'rate_estimate' => (float)($data['rate_estimate'] ?? 0),
                    'created_at'    => (int)($data['created_at'] ?? $now),
                    'updated_at'    => (int)($data['updated_at'] ?? $now),
                    'persisted_at'   => (int)($data['persisted_at'] ?? 0),
                    'persisted_score'=> (int)($data['persisted_score'] ?? $initial),
                ];
            }
        } catch (Throwable $e) {
            // ignore, fallback to SQLite
        }
    }

    // SQLite fallback
    try {
        if (function_exists('ux_storage_pdo')) {
            $pdo = ux_storage_pdo();
            $stmt = $pdo->prepare("SELECT ip, user_agent, score, last_seen, last_req_ms, rate_estimate, created_at, updated_at FROM bot_scores WHERE ip = :ip LIMIT 1");
            $stmt->execute([':ip' => $ip]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (is_array($row) && !empty($row)) {
                return [
                    'ip'            => $ip,
                    'user_agent'    => (string)($row['user_agent'] ?? ''),
                    'score'         => (int)($row['score'] ?? $initial),
                    'last_seen'     => (int)($row['last_seen'] ?? $now),
                    'last_req_ms'   => (int)($row['last_req_ms'] ?? $nowMs),
                    'rate_estimate' => (float)($row['rate_estimate'] ?? 0),
                    'created_at'    => (int)($row['created_at'] ?? $now),
                    'updated_at'    => (int)($row['updated_at'] ?? $now),
                    'persisted_at'   => 0,
                    'persisted_score'=> (int)($row['score'] ?? $initial),
                ];
            }
        }
    } catch (Throwable $e) {
        // ignore
    }

    return $default;
}

/**
 * Persist score record to Redis/SQLite.
 */
function ux_bot_score_save_record(array $config, array $rec): void
{
    $ip = (string)($rec['ip'] ?? '');
    if ($ip === '') {
        return;
    }

    $ttl = (int)ux_bot_cfg($config, 'bot_score_storage_ttl_seconds', 21600);
    if ($ttl < 600) {
        $ttl = 600;
    }

    $useRedis = !empty(ux_bot_cfg($config, 'bot_scoring_use_redis', true)) && !empty($config['redis_enabled']);
    $redis = null;
    if ($useRedis && function_exists('ux_redis_client')) {
        $redis = ux_redis_client();
    }
    if ($useRedis && $redis instanceof Redis) {
        try {
            $key = 'ux:botscore:' . $ip;
            $redis->hMSet($key, [
                'user_agent'    => (string)($rec['user_agent'] ?? ''),
                'score'         => (string)((int)($rec['score'] ?? 0)),
                'last_seen'     => (string)((int)($rec['last_seen'] ?? time())),
                'last_req_ms'   => (string)((int)($rec['last_req_ms'] ?? ux_bot_now_ms())),
                'rate_estimate' => (string)((float)($rec['rate_estimate'] ?? 0)),
                'created_at'    => (string)((int)($rec['created_at'] ?? time())),
                'updated_at'    => (string)((int)($rec['updated_at'] ?? time())),
                // throttled SQLite persistence metadata
                'persisted_at'   => (string)((int)($rec['persisted_at'] ?? 0)),
                'persisted_score'=> (string)((int)($rec['persisted_score'] ?? (int)($rec['score'] ?? 0))),
            ]);
            $redis->expire($key, $ttl);
        } catch (Throwable $e) {
            // ignore
        }
    }

    // Optional SQLite persistence (throttled)
    // Why: writing on every request can lock SQLite and hang the gateway under load.
    // Redis remains the source of truth for runtime decisions.
            $persistSqlite = (bool)ux_bot_cfg($config, 'bot_scoring_persist_sqlite', true);

            // Optional: for performance, only persist non-neutral scores (good/bad)
            // Neutral scores (between bad_threshold and good_threshold) are typically human traffic and can be very high-volume.
            if ($persistSqlite && $useRedis && (bool)ux_bot_cfg($config, 'bot_scoring_persist_sqlite_non_neutral_only', true)) {
                $goodThNow = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_good_threshold', 80), 0, 100);
                $badThNow  = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_bad_threshold', 30), 0, 100);
                $scoreNow  = (int)($rec['score'] ?? 0);
                if ($scoreNow < $goodThNow && $scoreNow > $badThNow) {
                    $persistSqlite = false;
                }
            }
    $intervalSec   = (int)ux_bot_cfg($config, 'bot_scoring_sqlite_write_interval_seconds', 300);
    $scoreDelta    = (int)ux_bot_cfg($config, 'bot_scoring_sqlite_write_score_delta', 10);
    if ($intervalSec < 30) {
        $intervalSec = 30;
    }
    if ($scoreDelta < 1) {
        $scoreDelta = 1;
    }

    $now = time();
    $lastPersistAt    = (int)($rec['persisted_at'] ?? 0);
    $lastPersistScore = (int)($rec['persisted_score'] ?? (int)($rec['score'] ?? 0));
    $curScore         = (int)($rec['score'] ?? 0);

    $shouldPersist = false;
    if (!$useRedis) {
        // If Redis isn't used, SQLite is the only storage.
        $shouldPersist = true;
    } elseif ($persistSqlite) {
        if ($lastPersistAt === 0 || ($now - $lastPersistAt) >= $intervalSec) {
            $shouldPersist = true;
        } elseif (abs($curScore - $lastPersistScore) >= $scoreDelta) {
            $shouldPersist = true;
        }
    }

    if ($shouldPersist) {
        try {
            if (function_exists('ux_storage_pdo')) {
                $pdo = ux_storage_pdo();
                $stmt = $pdo->prepare(
                    "INSERT INTO bot_scores (ip, user_agent, score, last_seen, last_req_ms, rate_estimate, created_at, updated_at)\n" .
                    "VALUES (:ip, :ua, :score, :last_seen, :last_req_ms, :rate_estimate, :created_at, :updated_at)\n" .
                    "ON CONFLICT(ip) DO UPDATE SET\n" .
                    "user_agent=excluded.user_agent, score=excluded.score, last_seen=excluded.last_seen, last_req_ms=excluded.last_req_ms, rate_estimate=excluded.rate_estimate, updated_at=excluded.updated_at"
                );
                $stmt->execute([
                    ':ip'           => $ip,
                    ':ua'           => (string)($rec['user_agent'] ?? ''),
                    ':score'        => $curScore,
                    ':last_seen'    => (int)($rec['last_seen'] ?? $now),
                    ':last_req_ms'  => (int)($rec['last_req_ms'] ?? ux_bot_now_ms()),
                    ':rate_estimate'=> (float)($rec['rate_estimate'] ?? 0),
                    ':created_at'   => (int)($rec['created_at'] ?? $now),
                    ':updated_at'   => (int)($rec['updated_at'] ?? $now),
                ]);

                // Update Redis persistence markers so we don't write again too soon.
                if ($useRedis && $redis instanceof Redis) {
                    try {
                        $key = 'ux:botscore:' . $ip;
                        $redis->hMSet($key, [
                            'persisted_at'    => (string)$now,
                            'persisted_score' => (string)$curScore,
                        ]);
                        $redis->expire($key, $ttl);
                    } catch (Throwable $e) {
                        // ignore
                    }
                }
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
}

/**
 * Update request rate estimate (requests per minute) using EWMA.
 */
function ux_bot_update_rate(array $config, array $rec, int $nowMs): float
{
    $lastMs = (int)($rec['last_req_ms'] ?? $nowMs);
    $dtMs = $nowMs - $lastMs;
    if ($dtMs < 1) {
        $dtMs = 1;
    }
    $dt = $dtMs / 1000.0;

    $halfLife = (float)ux_bot_cfg($config, 'bot_rate_half_life_seconds', 10.0);
    if ($halfLife < 1.0) {
        $halfLife = 1.0;
    }
    // time-aware alpha
    $alpha = 1.0 - exp(-$dt / $halfLife);
    if ($alpha < 0.0) {
        $alpha = 0.0;
    }
    if ($alpha > 1.0) {
        $alpha = 1.0;
    }
    $instantRpm = 60.0 / $dt;
    // Cap to prevent numeric explosion in extremely small dt
    $capRpm = (float)ux_bot_cfg($config, 'bot_rate_cap_rpm', 6000.0);
    if ($instantRpm > $capRpm) {
        $instantRpm = $capRpm;
    }

    $prev = (float)($rec['rate_estimate'] ?? 0.0);
    $next = (1.0 - $alpha) * $prev + $alpha * $instantRpm;
    if ($next < 0.0) {
        $next = 0.0;
    }
    return $next;
}

/**
 * Apply score decay toward baseline to prevent permanent punishment.
 */
function ux_bot_decay_score(array $config, int $score, int $lastSeen, int $now): int
{
    $initial = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_initial', 50), 0, 100);
    $halfLife = (int)ux_bot_cfg($config, 'bot_score_decay_half_life_seconds', 3600);
    if ($halfLife < 1) {
        return $score;
    }
    $dt = $now - $lastSeen;
    if ($dt <= 0) {
        return $score;
    }
    $alpha = 1.0 - exp(-((float)$dt / (float)$halfLife));
    if ($alpha < 0.0) {
        $alpha = 0.0;
    }
    if ($alpha > 1.0) {
        $alpha = 1.0;
    }
    $decayed = (int)round((1.0 - $alpha) * (float)$score + $alpha * (float)$initial);
    return ux_bot_clamp_int($decayed, 0, 100);
}

/**
 * Calculate score for current request and decide action.
 */
function ux_bot_score_request(array $config, string $ip, string $ua, string $uaLower, string $path, ?bool $dnsVerified): array
{
    $now   = time();
    $nowMs = ux_bot_now_ms();

    $initial = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_initial', 50), 0, 100);
    $goodTh  = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_good_threshold', 80), 0, 100);
    $badTh   = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_bad_threshold', 25), 0, 100);
    $rateTh  = (float)ux_bot_cfg($config, 'bot_score_rate_threshold', 120); // RPM
    if ($rateTh < 10) {
        $rateTh = 10;
    }

    // Load persisted record
    $rec = ux_bot_score_get_record($config, $ip);
    $prevScore = (int)($rec['score'] ?? $initial);
    $prevSeen  = (int)($rec['last_seen'] ?? $now);
    $prevScore = ux_bot_clamp_int($prevScore, 0, 100);
    $score = ux_bot_decay_score($config, $prevScore, $prevSeen, $now);

    // Update rate estimate
    $rate = ux_bot_update_rate($config, $rec, $nowMs);

    $reasons = [];

    // Basic UA checks
    if ($uaLower === '') {
        $score -= (int)ux_bot_cfg($config, 'bot_score_empty_ua_penalty', 10);
        $reasons[] = 'empty_ua';
    }

    // Suspicious UA patterns
    $susp = ux_bot_cfg($config, 'bot_score_suspicious_uas', null);
    if (!is_array($susp)) {
        $susp = ['curl','wget','python','scrapy','httpclient','okhttp','libwww-perl','java','go-http-client','aiohttp','selenium','headless','phantomjs'];
    }
    $hitSusp = false;
    foreach ($susp as $pat) {
        $pat = trim(strtolower((string)$pat));
        if ($pat === '') {
            continue;
        }
        if ($uaLower !== '' && strpos($uaLower, $pat) !== false) {
            $hitSusp = true;
            $score -= (int)ux_bot_cfg($config, 'bot_score_suspicious_ua_penalty', 25);
            $reasons[] = 'suspicious_ua:' . $pat;
            break;
        }
    }

    // Claimed search bot + DNS result
    $isSearchBot = function_exists('ux_is_search_bot') ? ux_is_search_bot($config) : false;
    if ($isSearchBot) {
        if ($dnsVerified === true) {
            $score += (int)ux_bot_cfg($config, 'bot_score_verified_search_bot_bonus', 35);
            $reasons[] = 'dns_verified_bot';
        } elseif ($dnsVerified === false) {
            $score -= (int)ux_bot_cfg($config, 'bot_score_fake_search_bot_penalty', 60);
            $reasons[] = 'dns_fake_bot';
        }
    }

    // Rate penalty
    if (!empty(ux_bot_cfg($config, 'bot_score_rate_enabled', true)) && $rate > $rateTh) {
        $penalty = (float)ux_bot_cfg($config, 'bot_score_rate_penalty_points', 20);
        // Scale penalty gently using ratio
        $ratio = $rate / $rateTh;
        if ($ratio < 1.0) {
            $ratio = 1.0;
        }
        $scaled = (int)round($penalty * min(3.0, log($ratio + 1.0)));
        if ($scaled < 1) {
            $scaled = 1;
        }
        $score -= $scaled;
        $reasons[] = 'high_rate:' . (int)round($rate);
    }

    // Cookie smoothing (reduces false positives)
    $cookie = ux_bot_cookie_get($config, $uaLower);
    if (is_array($cookie) && isset($cookie['s'])) {
        $w = (float)ux_bot_cfg($config, 'bot_cookie_weight', 0.25);
        if ($w < 0.0) {
            $w = 0.0;
        }
        if ($w > 0.6) {
            $w = 0.6;
        }
        $prev = (int)$cookie['s'];
        $score = (int)round((1.0 - $w) * (float)$score + $w * (float)$prev);
        $reasons[] = 'cookie_smooth';
    }
    else {
        // Optional: penalize repeat visitors that do not retain cookies.
        // (First request has no cookie yet; we only penalize if we've seen this IP before.)
        if (!empty(ux_bot_cfg($config, 'bot_cookie_enabled', true)) && empty($isSearchBot)) {
            $pen = (int)ux_bot_cfg($config, 'bot_score_missing_cookie_penalty', 0);
            if ($pen > 0) {
                $seenBefore = ((int)($rec['created_at'] ?? $now)) < $now;
                if ($seenBefore) {
                    $pen = ux_bot_clamp_int($pen, 0, 100);
                    $score -= $pen;
                    $reasons[] = 'no_cookie';
                }
            }
        }
    }

    // ML hook (optional, zero cost when disabled)
    if (!empty(ux_bot_cfg($config, 'bot_ml_enabled', false))) {
        $mlFile = (string)ux_bot_cfg($config, 'bot_ml_php_file', __DIR__ . '/ux_bot_ml.php');
        if ($mlFile !== '' && is_file($mlFile)) {
            try {
                require_once $mlFile;
                if (function_exists('ux_bot_ml_adjust_score')) {
                    $features = [
                        'ip' => $ip,
                        'ua' => $ua,
                        'path' => $path,
                        'rate_rpm' => $rate,
                        'dns_verified' => $dnsVerified,
                        'is_search_bot' => $isSearchBot,
                        'hit_suspicious_ua' => $hitSusp,
                    ];
                    $ml = ux_bot_ml_adjust_score($features, (int)$score);
                    if (is_int($ml)) {
                        $score = $ml;
                        $reasons[] = 'ml_adjust';
                    }
                }
            } catch (Throwable $e) {
                // ignore
            }
        }
    }

    $score = ux_bot_clamp_int((int)$score, 0, 100);

    // Persist updated record
    $rec['user_agent'] = $ua;
    $rec['score'] = $score;
    $rec['last_seen'] = $now;
    $rec['last_req_ms'] = $nowMs;
    $rec['rate_estimate'] = $rate;
    $rec['updated_at'] = $now;
    if (empty($rec['created_at'])) {
        $rec['created_at'] = $now;
    }
    ux_bot_score_save_record($config, $rec);

    // Update cookie to carry current score forward
    ux_bot_cookie_set($config, $uaLower, $score);

    // Decide action
    $badAction = (string)ux_bot_cfg($config, 'bot_bad_action', 'block'); // block | queue
    $classification = 'neutral';
    $action = 'allow';
    $hardBad = false;
    if ($dnsVerified === false) {
        $hardBad = true;
    }
    if ($hitSusp && $rate > ($rateTh * 1.2)) {
        $hardBad = true;
    }


    $hardBadTh = ux_bot_clamp_int((int)ux_bot_cfg($config, 'bot_score_hard_bad_threshold', 0), 0, 100);
    if ($hardBadTh > 0 && $score <= $hardBadTh) {
        $hardBad = true;
        $reasons[] = 'hard_bad_threshold';
    }
    if ($score >= $goodTh) {
        $classification = 'good';
    } elseif ($score <= $badTh) {
        $classification = 'bad';
    }

    if ($classification === 'bad') {
        if ($hardBad && $badAction === 'block') {
            $action = 'block';
        } else {
            // Soft bad: prefer queue (safer for real users behind NAT)
            $action = ($badAction === 'block') ? 'queue' : 'queue';
        }
    }

    return [
        'score' => $score,
        'rate_estimate' => $rate,
        'classification' => $classification,
        'action' => $action,
        'reasons' => $reasons,
    ];
}

/**
 * Log bot/scoring events into SQLite bot_logs.
 */
function ux_bot_log_event(array $config, int $status, string $ip, string $ua, string $path, ?int $score, array $reasons, string $classification, int $verified): void
{
    $logLevel = (int)ux_bot_cfg($config, 'bot_scoring_log_level', 1);
    // 0=off, 1=only important, 2=verbose
    if ($logLevel < 1) {
        return;
    }
    if ($logLevel === 1) {
        // Only log bypass/blocks/suspicious.
        $important = in_array($classification, ['search_bot_bypass','block','dns_fake_bot','bad'], true);
        if (!$important && $status < 400) {
            return;
        }
    }

    $ts = time();
    $botName = function_exists('ux_detect_bot_name') ? ux_detect_bot_name($ua) : '';
    $reasonsJson = json_encode(array_values($reasons), JSON_UNESCAPED_UNICODE);
    if (!is_string($reasonsJson)) {
        $reasonsJson = '[]';
    }
    try {
        if (function_exists('ux_storage_pdo')) {
            $pdo = ux_storage_pdo();
            $stmt = $pdo->prepare(
                "INSERT INTO bot_logs (timestamp, ip, user_agent, bot_name, result, path, score, reasons, classification, verified)\n" .
                "VALUES (:ts, :ip, :ua, :bot_name, :result, :path, :score, :reasons, :class, :verified)"
            );
            $stmt->execute([
                ':ts' => $ts,
                ':ip' => $ip,
                ':ua' => $ua,
                ':bot_name' => $botName,
                ':result' => $status,
                ':path' => $path,
                ':score' => $score,
                ':reasons' => $reasonsJson,
                ':class' => $classification,
                ':verified' => $verified,
            ]);
        }
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Main gatekeeper: called from gateway.php.
 * Handles:
 *  - Search bot bypass with optional DNS verification.
 *  - Advanced scoring (optional) for blocking/queue decision.
 */
function ux_bot_gatekeeper(array $config, string $wp_index): void
{
    if (ux_bot_should_skip_request($config)) {
        return;
    }

    // مسیرهایی که در تنظیمات به عنوان bypass تعریف شده‌اند (درگاه پرداخت، وب‌هوک و ...)
    // نباید درگیر Bot Intelligence شوند.
    if (function_exists('ux_should_bypass_request')) {
        try {
            if (ux_should_bypass_request($config)) {
                return;
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    $ip = function_exists('ux_get_user_ip') ? ux_get_user_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $uaLower = strtolower($ua);
    $path = (string)($_SERVER['REQUEST_URI'] ?? '');

    // Always-allow IPs should never be blocked by bot scoring / auto-block.
    if (!empty($config['always_allow_ips']) && in_array($ip, (array)$config['always_allow_ips'], true)) {
        return;
    }

    // --- Auto-Block (Strikes-based) config ---
    $autoEnabled = !empty($config['auto_block_enabled']);
    $autoMode    = isset($config['auto_block_mode']) ? (int)$config['auto_block_mode'] : 2; // 1=aggressive,2=balanced,3=safe
    if ($autoMode < 1 || $autoMode > 3) {
        $autoMode = 2;
    }
    $autoStrikes = isset($config['auto_block_strikes']) ? (int)$config['auto_block_strikes'] : 5;
    if ($autoStrikes < 2) {
        $autoStrikes = 2;
    }
    $autoWindow  = isset($config['auto_block_window_seconds']) ? (int)$config['auto_block_window_seconds'] : 600;
    if ($autoWindow < 60) {
        $autoWindow = 60;
    }
    $autoTarget  = isset($config['auto_block_target']) ? (string)$config['auto_block_target'] : 'ip'; // ip | ua
    if (!in_array($autoTarget, ['ip','ua'], true)) {
        $autoTarget = 'ip';
    }
    $autoBaseTtl = isset($config['auto_block_ttl_seconds']) ? (int)$config['auto_block_ttl_seconds'] : 3600;
    if ($autoBaseTtl < 60) {
        $autoBaseTtl = 3600;
    }
    $autoLadder = $config['auto_block_escalation_ladder_seconds'] ?? [3600, 21600, 86400];
    if (!is_array($autoLadder)) {
        // allow "3600,21600,86400"
        $autoLadder = array_filter(array_map('trim', explode(',', (string)$autoLadder)));
    }
    $autoExemptVerifiedBots = !empty($config['auto_block_exempt_verified_bots']);

    // 1) Search bots: bypass (with verification)
    $isSearchBot = function_exists('ux_is_search_bot') ? ux_is_search_bot($config) : false;
    $dnsMode = (string)ux_bot_cfg($config, 'bot_dns_validation_mode', 'balanced'); // off | balanced | strict
    if (!in_array($dnsMode, ['off','balanced','strict'], true)) {
        $dnsMode = 'balanced';
    }

    $dnsVerified = null;
    if ($isSearchBot) {
        $dnsVerified = ux_bot_dns_verify($config, $ip, $uaLower);
    }
    $verifiedFlag = ($dnsVerified === true) ? 1 : 0;
    $verifiedSearchBot = ($isSearchBot && $dnsVerified === true);

    // 1.1) Block checks (DB – auto/manual isolated). Verified search bots are exempt from AUTO blocks.
    $uaHash = function_exists('ux_ua_hash') ? ux_ua_hash($ua) : hash('sha256', $ua);

    try {
        $pdo = function_exists('ux_storage_pdo') ? ux_storage_pdo() : null;
        if ($pdo instanceof PDO) {
            $includeAuto = !($autoExemptVerifiedBots && $verifiedSearchBot);

            // IP blocks
            $blk = function_exists('ux_bot_block_find_active') ? ux_bot_block_find_active($pdo, 'ip', $ip, $includeAuto, true) : null;
            if (is_array($blk)) {
                if (!empty($blk['id'])) {
                    ux_bot_block_hit($pdo, (int)$blk['id']);
                }
                $src = (string)($blk['source'] ?? 'manual');
                $why = (string)($blk['reason'] ?? '');
                ux_bot_log_event($config, 403, $ip, $ua, $path, null, ['blocked_ip', 'source:' . $src, $why], 'block', $verifiedFlag);
                if (function_exists('ux_storage_log_visit')) {
                    ux_storage_log_visit(true, 403, 1);
                }
                if (function_exists('ux_ua_bank_record')) {
                    ux_ua_bank_record($ua, $ip, null, 'blocked', null);
                }
                header('HTTP/1.1 403 Forbidden');
                header('Content-Type: text/plain; charset=utf-8');
                if (function_exists('ux_agent_shadow_decision')) {
                    ux_agent_shadow_decision(['action' => 'block', 'reason' => 'bot_blocked_ip', 'status' => 403, 'retry_after' => null], $config);
                }
                echo 'Forbidden.';
                exit;
            }

            // UA blocks (by hash)
            $blk = function_exists('ux_bot_block_find_active') ? ux_bot_block_find_active($pdo, 'ua', $uaHash, $includeAuto, true) : null;
            if (is_array($blk)) {
                if (!empty($blk['id'])) {
                    ux_bot_block_hit($pdo, (int)$blk['id']);
                }
                $src = (string)($blk['source'] ?? 'manual');
                $why = (string)($blk['reason'] ?? '');
                ux_bot_log_event($config, 403, $ip, $ua, $path, null, ['blocked_ua', 'source:' . $src, $why], 'block', $verifiedFlag);
                if (function_exists('ux_storage_log_visit')) {
                    ux_storage_log_visit(true, 403, 1);
                }
                if (function_exists('ux_ua_bank_record')) {
                    ux_ua_bank_record($ua, $ip, null, 'blocked', null);
                }
                header('HTTP/1.1 403 Forbidden');
                header('Content-Type: text/plain; charset=utf-8');
                if (function_exists('ux_agent_shadow_decision')) {
                    ux_agent_shadow_decision(['action' => 'block', 'reason' => 'bot_blocked_ua', 'status' => 403, 'retry_after' => null], $config);
                }
                echo 'Forbidden.';
                exit;
            }
        }
    } catch (Throwable $e) {
        // ignore
    }

    // Continue search-bot bypass logic
    if ($isSearchBot) {
        $allowedByRules = function_exists('ux_should_allow_bot') ? ux_should_allow_bot($config) : false;

        $canBypass = false;
        if ($dnsMode === 'off' || empty(ux_bot_cfg($config, 'bot_dns_validation_enabled', false))) {
            $canBypass = $allowedByRules;
        } elseif ($dnsMode === 'strict') {
            $canBypass = ($dnsVerified === true);
        } else {
            // balanced
            $canBypass = ($dnsVerified === true) || $allowedByRules;
        }

        if ($canBypass) {
            // Log with score (optional)
            $scoreData = ['score' => null, 'reasons' => [], 'classification' => 'neutral'];
            if (!empty(ux_bot_cfg($config, 'bot_scoring_enabled', false))) {
                $scoreData = ux_bot_score_request($config, $ip, $ua, $uaLower, $path, $dnsVerified);
            }
            $verifiedFlag = ($dnsVerified === true) ? 1 : 0;
            ux_bot_log_event($config, 200, $ip, $ua, $path, $scoreData['score'] ?? null, (array)($scoreData['reasons'] ?? []), 'search_bot_bypass', $verifiedFlag);

            // UA bank
            if (!empty($config['ua_bank_enabled']) && function_exists('ux_ua_bank_record')) {
                $botName = function_exists('ux_detect_bot_name') ? ux_detect_bot_name($ua) : null;
                ux_ua_bank_record($ua, $ip, is_int($scoreData['score'] ?? null) ? (int)$scoreData['score'] : null, 'search_bot', $botName);
            }

            // Also log through existing analytics helper (kept for backward compatibility)
            if (function_exists('ux_log_bot_visit')) {
                try {
                    ux_log_bot_visit(
                        $config,
                        200,
                        is_int($scoreData['score'] ?? null) ? (int)$scoreData['score'] : null,
                        json_encode((array)($scoreData['reasons'] ?? []), JSON_UNESCAPED_UNICODE),
                        'search_bot_bypass',
                        $verifiedFlag
                    );
                } catch (Throwable $e) {
                    // ignore
                }
            }

            if (function_exists('ux_agent_shadow_decision')) {
                ux_agent_shadow_decision(['action' => 'pass', 'reason' => 'search_bot_bypass', 'status' => 200, 'retry_after' => null], $config);
            }
            require $wp_index;
            exit;
        }
    }

    // 2) Advanced scoring for everyone (optional)
    if (empty(ux_bot_cfg($config, 'bot_scoring_enabled', false))) {
        // UA bank for humans (optional)
        // NOTE: Recording every human request into SQLite can lock the DB under load.
        // By default we do NOT record human UAs unless explicitly enabled (or sampled).
        if (!empty($config['ua_bank_enabled']) && function_exists('ux_ua_bank_record')) {
            $recordHumans = !empty($config['ua_bank_record_humans']);
            $sampleRate = (float)($config['ua_bank_human_sample_rate'] ?? 0.0);
            if ($sampleRate < 0.0) { $sampleRate = 0.0; }
            if ($sampleRate > 1.0) { $sampleRate = 1.0; }
            $sampleOk = false;
            if (!$recordHumans && $sampleRate > 0.0) {
                $sampleOk = (mt_rand() / mt_getrandmax()) < $sampleRate;
            }
            if ($recordHumans || $sampleOk) {
                ux_ua_bank_record($ua, $ip, null, 'human', null);
            }
        }
        return;
    }

    $scoreData = ux_bot_score_request($config, $ip, $ua, $uaLower, $path, $dnsVerified);
    $action = (string)($scoreData['action'] ?? 'allow');
    $class  = (string)($scoreData['classification'] ?? 'neutral');
    $verifiedFlag = ($dnsVerified === true) ? 1 : 0;

    // UA bank capture (store last score/classification)
    // Default behavior: record ONLY non-neutral classifications (bots/suspicious),
    // unless explicitly configured to record humans too.
    if (!empty($config['ua_bank_enabled']) && function_exists('ux_ua_bank_record')) {
        $recordHumans = !empty($config['ua_bank_record_humans']);
        $shouldRecord = $recordHumans || ($class !== 'neutral') || ($action !== 'allow');
        if ($shouldRecord) {
            $botName = $isSearchBot && function_exists('ux_detect_bot_name') ? ux_detect_bot_name($ua) : null;
            ux_ua_bank_record(
                $ua,
                $ip,
                is_int($scoreData['score'] ?? null) ? (int)$scoreData['score'] : null,
                $class,
                $botName
            );
        }
    }

    // --- Strikes-based Auto-Block ---
    $didStrike = false;
    $strikeCount = 0;

    if ($autoEnabled) {
        $reasons = (array)($scoreData['reasons'] ?? []);
        $hitHighRate = false;
        $hitSuspUA   = false;
        foreach ($reasons as $r) {
            $r = (string)$r;
            if (strpos($r, 'high_rate:') === 0) {
                $hitHighRate = true;
            }
            if (strpos($r, 'suspicious_ua:') === 0) {
                $hitSuspUA = true;
            }
        }
        $dnsFake = ($dnsVerified === false) || in_array('dns_fake_bot', $reasons, true);

        // In safe mode, require stronger evidence
        if ($autoMode === 3) {
            $didStrike = ($dnsFake || ($class === 'bad' && $hitHighRate));
        } elseif ($autoMode === 1) {
            // aggressive
            $didStrike = ($action === 'block' || $class === 'bad' || $dnsFake || $hitHighRate || $hitSuspUA);
        } else {
            // balanced (recommended)
            $didStrike = ($action === 'block' || $class === 'bad' || $dnsFake || $hitHighRate);
        }

        // Exempt VERIFIED search bots from auto-block
        if ($autoExemptVerifiedBots && $verifiedSearchBot) {
            $didStrike = false;
        }

        if ($didStrike) {
            try {
                $pdo = function_exists('ux_storage_pdo') ? ux_storage_pdo() : null;
                if ($pdo instanceof PDO) {
                    $strikeType  = ($autoTarget === 'ua') ? 'ua' : 'ip';
                    $strikeValue = ($autoTarget === 'ua') ? $uaHash : $ip;

                    $strikeCount = ux_bot_strike_add(
                        $pdo,
                        $strikeType,
                        $strikeValue,
                        $autoWindow,
                        is_int($scoreData['score'] ?? null) ? (int)$scoreData['score'] : null,
                        (array)($scoreData['reasons'] ?? [])
                    );

                    // Log suspicious/strike event (status 200 - no immediate block)
                    ux_bot_log_event($config, 200, $ip, $ua, $path, (int)($scoreData['score'] ?? 0), (array)($scoreData['reasons'] ?? []), 'suspicious', $verifiedFlag);

                    if ($strikeCount >= $autoStrikes) {
                        $ttl = ux_bot_autoblock_ttl($pdo, $strikeType, $strikeValue, (array)$autoLadder, $autoBaseTtl);

                        $reason = 'Strikes reached: ' . $strikeCount . ' in ' . $autoWindow . 's';
                        $reason .= ' | score=' . (string)($scoreData['score'] ?? '');
                        $reason .= ' | class=' . $class;
                        if (!empty($reasons)) {
                            $reason .= ' | reasons=' . json_encode($reasons, JSON_UNESCAPED_UNICODE);
                        }

                        ux_bot_block_create($pdo, $strikeType, $strikeValue, $reason, 'auto', $ttl);
                        ux_bot_strikes_clear($pdo, $strikeType, $strikeValue);

                        // Block now (after threshold)
                        ux_bot_log_event($config, 403, $ip, $ua, $path, (int)($scoreData['score'] ?? 0), (array)($scoreData['reasons'] ?? []), 'block', $verifiedFlag);
                        if (function_exists('ux_storage_log_visit')) {
                            ux_storage_log_visit(true, 403, 1);
                        }
                        if (!empty($config['ua_bank_enabled']) && function_exists('ux_ua_bank_record')) {
                            ux_ua_bank_record($ua, $ip, is_int($scoreData['score'] ?? null) ? (int)$scoreData['score'] : null, 'blocked', null);
                        }
                        header('HTTP/1.1 403 Forbidden');
                        header('Content-Type: text/plain; charset=utf-8');
                        if (function_exists('ux_agent_shadow_decision')) {
                            ux_agent_shadow_decision(['action' => 'block', 'reason' => 'bot_auto_block_threshold', 'status' => 403, 'retry_after' => null], $config);
                        }
                        echo 'Forbidden.';
                        exit;
                    }
                }
            } catch (Throwable $e) {
                // ignore
            }
        }
    }

    // Backward compatible "immediate block" when auto-block is disabled
    if (!$autoEnabled && $action === 'block') {
        ux_bot_log_event($config, 403, $ip, $ua, $path, (int)($scoreData['score'] ?? 0), (array)($scoreData['reasons'] ?? []), 'block', $verifiedFlag);
        try {
            if (function_exists('ux_storage_log_visit')) {
                ux_storage_log_visit(true, 403, 1);
            }
        } catch (Throwable $e) {
            // ignore
        }
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: text/plain; charset=utf-8');
        if (function_exists('ux_agent_shadow_decision')) {
            ux_agent_shadow_decision(['action' => 'block', 'reason' => 'bot_score_block', 'status' => 403, 'retry_after' => null], $config);
        }
        echo 'Forbidden.';
        exit;
    }

    // Log suspicious signals (queue/bad) for visibility
    if ($action === 'queue' || $class === 'bad') {
        ux_bot_log_event($config, 200, $ip, $ua, $path, (int)($scoreData['score'] ?? 0), (array)($scoreData['reasons'] ?? []), 'suspicious', $verifiedFlag);
    }
}
