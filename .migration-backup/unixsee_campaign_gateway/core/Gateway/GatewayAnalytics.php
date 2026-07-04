<?php

/**
 * UxGatewayAnalytics
 *
 * A helper class that centralizes logging of HTTP visits (bots and humans)
 * and computes high‑level analytics such as success rates, error counts
 * and top error URLs for bots. This class relies on functions provided
 * by ux_storage.php to persist raw visit data into the ux_visits table.
 */
// Load the storage functions from the plugin root.  __DIR__ points to
// unixsee_campaign_gateway/core/Gateway, so we need to go up two levels
// (to unixsee_campaign_gateway) and include ux_storage.php. Using
// dirname(__DIR__, 2) avoids problems with relative paths when the
// plugin is installed in different directories on the server.
require_once dirname(__DIR__, 2) . '/ux_storage.php';

class UxGatewayAnalytics
{
    /**
     * Log a bot visit into the ux_visits table with the given HTTP status code.
     *
     * @param int $statusCode The HTTP status code returned to the bot.
     */
    public static function logBotVisit(int $statusCode): void
    {
        try {
            if (function_exists('ux_storage_log_visit')) {
                ux_storage_log_visit(true, $statusCode);
            }
        } catch (\Throwable $e) {
            error_log('UxGatewayAnalytics logBotVisit failed: ' . $e->getMessage());
        }
    }

    /**
     * Log a human visit into the ux_visits table. The status code is assumed
     * to be 200 (OK) for human visits.
     */
    public static function logHumanVisit(): void
    {
        try {
            if (function_exists('ux_storage_log_visit')) {
                ux_storage_log_visit(false, 200);
            }
        } catch (\Throwable $e) {
            error_log('UxGatewayAnalytics logHumanVisit failed: ' . $e->getMessage());
        }
    }

    /**
     * Compute bot statistics for the last 24 hours.
     *
     * This method queries the ux_visits table for entries marked as bots and
     * within the last 24 hours. It returns aggregate data including the
     * total number of bot requests, number of successes (2xx and 3xx),
     * a breakdown of status codes by class (2xx, 3xx, 4xx, 5xx) and a list
     * of the top URLs that returned errors (4xx or 5xx) with their counts.
     *
     * @param array $config Optional configuration array (currently unused).
     * @return array {
     *     @type int   $total_24h      Total number of bot requests in the past 24 hours.
     *     @type int   $success_24h    Number of successful bot requests (2xx or 3xx).
     *     @type array $status_counts  Associative array with keys '2xx','3xx','4xx','5xx' and integer counts.
     *     @type array $top_error_urls An array of arrays with 'path' and 'count' keys for error URLs.
     * }
     */
    /**
     * Compute bot statistics for the last 24 hours with optional filters.
     *
     * @param array $config  Configuration array (unused but kept for compatibility).
     * @param array $filters Optional filters: supports 'ua' (string) to restrict
     *                       to a specific substring of the user agent and 'path'
     *                       (string) to restrict to a particular path substring.
     *
     * @return array Statistics including counts, rates and top error URLs.
     */
    public static function getBotStats(array $config, array $filters = []): array
    {
        // Normalise filters
        $uaFilter   = '';
        $pathFilter = '';
        if (isset($filters['ua']) && is_string($filters['ua'])) {
            $uaFilter = trim(strtolower($filters['ua']));
        }
        // Also allow 'bot' as alias for UA filter
        if ($uaFilter === '' && isset($filters['bot']) && is_string($filters['bot'])) {
            $uaFilter = trim(strtolower($filters['bot']));
        }
        if (isset($filters['path']) && is_string($filters['path'])) {
            $pathFilter = trim($filters['path']);
        }

        $stats = [
            'total_24h'      => 0,
            'success_24h'    => 0,
            'status_counts'  => ['2xx' => 0, '3xx' => 0, '4xx' => 0, '5xx' => 0],
            'top_error_urls' => [],
            // initialise global error stats to safe defaults
            'status_counts_all' => ['4xx' => 0, '5xx' => 0],
            'top_error_urls_all' => [],
        ];

        // Attempt to serve cached analytics from Redis when available and enabled.
        // Determine analytics TTL, precompute settings, and whether to cache full error lists. Use the provided
        // $config first; if those keys are missing, fall back to the global $config
        // loaded by ux_load_config().
        $ttl = 0;
        $includeLists = false;
        $precomputeEnabled = false;
        $precomputeInterval = 0;
        $effectiveConfig = $config;
        if (!is_array($effectiveConfig) || !isset($effectiveConfig['analytics_cache_ttl'])) {
            if (isset($GLOBALS['config']) && is_array($GLOBALS['config'])) {
                $effectiveConfig = $GLOBALS['config'];
            }
        }
        if (is_array($effectiveConfig)) {
            if (isset($effectiveConfig['analytics_cache_ttl'])) {
                $ttl = (int)$effectiveConfig['analytics_cache_ttl'];
            }
            if (!empty($effectiveConfig['analytics_cache_include_lists'])) {
                $includeLists = true;
            }
            if (!empty($effectiveConfig['analytics_precompute_enabled'])) {
                $precomputeEnabled = true;
            }
            if (isset($effectiveConfig['analytics_precompute_interval'])) {
                $precomputeInterval = max(1, (int)$effectiveConfig['analytics_precompute_interval']);
            }
        }
        // If Redis is available and TTL is positive, attempt to fetch cached data
        $redis = null;
        if ($ttl > 0 && function_exists('ux_redis_client')) {
            $redis = ux_redis_client();
            if ($redis instanceof \Redis) {
                // Compose a cache key including filters and whether full lists are stored
                $cacheKey = 'ux_analytics:botstats:' . sha1('ua:' . $uaFilter . '|path:' . $pathFilter . '|full:' . ($includeLists ? '1' : '0'));
                $lastKey  = $cacheKey . ':last';
                try {
                    // Check if a cached copy exists
                    $cached = $redis->get($cacheKey);
                    if ($cached !== false && $cached !== null) {
                        // Precompute: if enabled and interval has elapsed, trigger a recomputation in the background.
                        if ($precomputeEnabled) {
                            $last = $redis->get($lastKey);
                            $nowTime = time();
                            if ($last === false || $last === null || ($nowTime - (int)$last) >= $precomputeInterval) {
                                // Trigger recompute asynchronously by invoking getBotStats in a non-blocking way.
                                // We'll use a fire-and-forget approach: compute analytics in a separate PHP process.
                                try {
                                    // Use exec with php -r to call this method; note that this may not work in all environments.
                                    // Because we cannot spawn asynchronous processes reliably in all hosting environments,
                                    // we simply record that recompute is due and let the next request compute.
                                    $redis->set($lastKey, $nowTime);
                                } catch (\Throwable $e) {
                                    // ignore
                                }
                            }
                        }
                        $tmp = json_decode($cached, true);
                        if (is_array($tmp)) {
                            return $tmp;
                        }
                    }
                } catch (\Throwable $e) {
                    // ignore Redis errors and proceed to compute fresh statistics
                }
            }
        }
        try {
            // Use the analytics PDO when available, falling back to the main storage PDO.
            if (function_exists('ux_storage_analytics_pdo')) {
                $pdo = ux_storage_analytics_pdo();
                // Ensure the analytics table exists by running its migration explicitly.
                if (function_exists('ux_storage_analytics_migrate')) {
                    try {
                        ux_storage_analytics_migrate($pdo);
                    } catch (\Throwable $e) {
                        // ignore migration errors here; queries below will handle missing tables
                    }
                }
            } else {
                $pdo = ux_storage_pdo();
                if (function_exists('ux_storage_migrate')) {
                    try {
                        ux_storage_migrate($pdo);
                    } catch (\Throwable $e) {
                        // ignore migration errors
                    }
                }
            }
            $now = time();
            $from = $now - 86400; // last 24 hours

            // Build base SQL and dynamic filters for bot-specific statistics
            $sql = "SELECT ts, ua, path, status_code FROM ux_visits WHERE is_bot = 1 AND ts >= :from";
            $params = [':from' => $from];
            if ($uaFilter !== '') {
                $sql .= " AND LOWER(ua) LIKE :ua";
                $params[':ua'] = '%' . $uaFilter . '%';
            }
            if ($pathFilter !== '') {
                $sql .= " AND path LIKE :path";
                $params[':path'] = '%' . $pathFilter . '%';
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $errorUrls = [];

            foreach ($rows as $row) {
                $stats['total_24h']++;
                $code = (int)($row['status_code'] ?? 0);
                $category = (int)floor($code / 100);
                if ($category === 2) {
                    $stats['status_counts']['2xx']++;
                    $stats['success_24h']++;
                } elseif ($category === 3) {
                    $stats['status_counts']['3xx']++;
                    $stats['success_24h']++;
                } elseif ($category === 4) {
                    $stats['status_counts']['4xx']++;
                    $rawPath = (string)($row['path'] ?? '');
                    // decode percent-encoded paths for readability
                    $path = $rawPath !== '' ? rawurldecode($rawPath) : '';
                    if ($path !== '') {
                        if (!isset($errorUrls[$path])) {
                            $errorUrls[$path] = 0;
                        }
                        $errorUrls[$path]++;
                    }
                } elseif ($category === 5) {
                    $stats['status_counts']['5xx']++;
                    $rawPath = (string)($row['path'] ?? '');
                    $path = $rawPath !== '' ? rawurldecode($rawPath) : '';
                    if ($path !== '') {
                        if (!isset($errorUrls[$path])) {
                            $errorUrls[$path] = 0;
                        }
                        $errorUrls[$path]++;
                    }
                } else {
                    // treat other codes as successes for analytics purposes
                    $stats['success_24h']++;
                }
            }

            if (!empty($errorUrls)) {
                arsort($errorUrls);
                $top = array_slice($errorUrls, 0, 10, true);
                $list = [];
                foreach ($top as $url => $count) {
                    $list[] = ['path' => $url, 'count' => $count];
                }
                $stats['top_error_urls'] = $list;
            }

            // Additional: compute overall (bot + human) 4xx/5xx counts and top error URLs
            $globalCounts = ['4xx' => 0, '5xx' => 0];
            $globalErrorUrls = [];
            // Build SQL for global stats; optionally filter by path
            $sqlAll = "SELECT path, status_code FROM ux_visits WHERE ts >= :from";
            $paramsAll = [':from' => $from];
            if ($pathFilter !== '') {
                $sqlAll .= " AND path LIKE :path_filter";
                $paramsAll[':path_filter'] = '%' . $pathFilter . '%';
            }
            $stmtAll = $pdo->prepare($sqlAll);
            $stmtAll->execute($paramsAll);
            $rowsAll = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rowsAll as $rowAll) {
                $code = (int)($rowAll['status_code'] ?? 0);
                $category = (int)floor($code / 100);
                if ($category === 4) {
                    $globalCounts['4xx']++;
                    $pathX = (string)($rowAll['path'] ?? '');
                    if ($pathX !== '') {
                        if (!isset($globalErrorUrls[$pathX])) {
                            $globalErrorUrls[$pathX] = 0;
                        }
                        $globalErrorUrls[$pathX]++;
                    }
                } elseif ($category === 5) {
                    $globalCounts['5xx']++;
                    $pathX = (string)($rowAll['path'] ?? '');
                    if ($pathX !== '') {
                        if (!isset($globalErrorUrls[$pathX])) {
                            $globalErrorUrls[$pathX] = 0;
                        }
                        $globalErrorUrls[$pathX]++;
                    }
                }
            }
            $stats['status_counts_all'] = $globalCounts;
            if (!empty($globalErrorUrls)) {
                arsort($globalErrorUrls);
                $topAll = array_slice($globalErrorUrls, 0, 10, true);
                $listAll = [];
                foreach ($topAll as $u => $cnt) {
                    $listAll[] = ['path' => $u, 'count' => $cnt];
                }
                $stats['top_error_urls_all'] = $listAll;
            } else {
                $stats['top_error_urls_all'] = [];
            }

            // همچنین، لیست‌های تفکیک‌شده برای خطاهای ۴xx و ۵xx بسازید. این کار بعد از محاسبه لیست کلی انجام می‌شود تا
            // نسخه‌های قبلی همچنان با کلید top_error_urls_all کار کنند. ابتدا آرایه‌های کمکی ایجاد می‌کنیم.
            $stats['top_error_urls_all_4xx'] = [];
            $stats['top_error_urls_all_5xx'] = [];
            $globalErrorUrls4 = [];
            $globalErrorUrls5 = [];
            foreach ($rowsAll as $rowAll) {
                $code = (int)($rowAll['status_code'] ?? 0);
                $category = (int)floor($code / 100);
                $pathX = '';
                if (isset($rowAll['path'])) {
                    $pathX = (string)$rowAll['path'];
                    // تلاش برای خواناتر کردن مسیر با decode کردن URL
                    $decoded = rawurldecode($pathX);
                    if ($decoded !== false && $decoded !== '') {
                        $pathX = $decoded;
                    }
                }
                if ($category === 4) {
                    if ($pathX !== '') {
                        if (!isset($globalErrorUrls4[$pathX])) {
                            $globalErrorUrls4[$pathX] = 0;
                        }
                        $globalErrorUrls4[$pathX]++;
                    }
                } elseif ($category === 5) {
                    if ($pathX !== '') {
                        if (!isset($globalErrorUrls5[$pathX])) {
                            $globalErrorUrls5[$pathX] = 0;
                        }
                        $globalErrorUrls5[$pathX]++;
                    }
                }
            }
            if (!empty($globalErrorUrls4)) {
                arsort($globalErrorUrls4);
                $top4 = array_slice($globalErrorUrls4, 0, 10, true);
                foreach ($top4 as $u => $cnt) {
                    $stats['top_error_urls_all_4xx'][] = ['path' => $u, 'count' => $cnt];
                }
                // If full lists are requested, add the entire list to the stats array
                if ($includeLists) {
                    $stats['error_urls_all_4xx_full'] = [];
                    foreach ($globalErrorUrls4 as $u => $cnt) {
                        $stats['error_urls_all_4xx_full'][] = ['path' => $u, 'count' => $cnt];
                    }
                }
            }
            if (!empty($globalErrorUrls5)) {
                arsort($globalErrorUrls5);
                $top5 = array_slice($globalErrorUrls5, 0, 10, true);
                foreach ($top5 as $u => $cnt) {
                    $stats['top_error_urls_all_5xx'][] = ['path' => $u, 'count' => $cnt];
                }
                // Add full list of 5xx errors when enabled
                if ($includeLists) {
                    $stats['error_urls_all_5xx_full'] = [];
                    foreach ($globalErrorUrls5 as $u => $cnt) {
                        $stats['error_urls_all_5xx_full'][] = ['path' => $u, 'count' => $cnt];
                    }
                }
            }

        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            // suppress logs for missing ux_visits table (handled gracefully)
            if (strpos($msg, 'no such table: ux_visits') === false) {
                error_log('UxGatewayAnalytics getBotStats failed: ' . $msg);
            }
        }

        // Store the computed statistics in Redis for subsequent requests. Use the same
        // cache key composition as earlier. Do not cache if TTL <= 0 or Redis
        // connection is not available. Any errors during caching are suppressed.
        if ($ttl > 0 && $redis instanceof \Redis) {
            try {
                $cacheKey = 'ux_analytics:botstats:' . sha1('ua:' . $uaFilter . '|path:' . $pathFilter . '|full:' . ($includeLists ? '1' : '0'));
                $lastKey  = $cacheKey . ':last';
                $redis->setex($cacheKey, $ttl, json_encode($stats));
                // Record the time of this computation to control precompute intervals
                $redis->set($lastKey, time());
            } catch (\Throwable $e) {
                // ignore caching errors
            }
        }

        return $stats;
    }
}