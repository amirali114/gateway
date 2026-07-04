<?php
/**
 * آمار بازدیدکنندگان واقعی (غیر ربات) در ۲۴ ساعت اخیر بر اساس ux_visit_log.json
 *
 * خروجی:
 *  - total_24h       : مجموع هیت‌ها
 *  - unique_ips_24h  : تعداد IP یکتا (نزدیک به مفهوم «بازدیدکننده»)
 */
function ux_get_human_stats_24h(): array
{
    // Optimized (no per-hit SQLite logging): compute last-24h human stats from Redis
    // buckets produced by ux_log_human_visit() in gateway.php.
    global $config;
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
            if ($redis instanceof Redis) {
                $now = time();
                $curBucket = (int)floor($now / 3600);

                // Sum hits across last 24 hour-buckets.
                $hitsKeys = [];
                $hllKeys  = [];
                for ($b = $curBucket; $b > $curBucket - 24; $b--) {
                    $hitsKeys[] = 'ux_human:hits:' . $b;
                    $hllKeys[]  = 'ux_human:uniq:' . $b;
                }

                $totalHits = 0;
                $redis->multi(Redis::PIPELINE);
                foreach ($hitsKeys as $k) {
                    $redis->get($k);
                }
                $vals = $redis->exec();
                if (is_array($vals)) {
                    foreach ($vals as $v) {
                        $totalHits += (int)$v;
                    }
                }

                // Approx. unique IPs via HyperLogLog union.
                $uniqueIps = 0;
                if (method_exists($redis, 'pfMerge') && method_exists($redis, 'pfCount')) {
                    $tmpKey = 'ux_human:uniq_tmp:' . $curBucket;
                    // Merge is fast and done only on admin-panel refresh.
                    $redis->pfMerge($tmpKey, $hllKeys);
                    $redis->expire($tmpKey, 60);
                    $uniqueIps = (int)$redis->pfCount($tmpKey);
                } elseif (method_exists($redis, 'pfCount')) {
                    // Fallback (over-counts across buckets, but better than 0)
                    foreach ($hllKeys as $k) {
                        $uniqueIps += (int)$redis->pfCount($k);
                    }
                }

                return [
                    'total_24h'      => $totalHits,
                    'unique_ips_24h' => $uniqueIps,
                ];
            }
        } catch (Throwable $e) {
            // fall through
        }
    }

    // Redis not available (or disabled) -> return zeros (we don't write per-hit SQLite anymore).
    return [
        'total_24h'      => 0,
        'unique_ips_24h' => 0,
    ];
}

// Ensure storage functions (such as ux_get_smart_decisions) are available when this
// file is executed directly (for example, during AJAX requests). If the function
// is undefined, include the storage module. This prevents fatal errors like
// "Call to undefined function ux_get_smart_decisions()" when requesting
// `ux_admin_panel.php?ux_ajax=smart-decisions` directly.
if (!function_exists('ux_get_smart_decisions')) {
    require_once __DIR__ . '/ux_storage.php';

// Latency-based smart queue helpers
if (!function_exists('ux_latency_get_window_stats') && is_file(__DIR__ . '/ux_latency.php')) {
    require_once __DIR__ . '/ux_latency.php';
}


// Smart Queue modules (optional)
if (is_file(__DIR__ . '/ux_smart_modules.php')) {
    require_once __DIR__ . '/ux_smart_modules.php';
}
}

/**
 * Convert config values (which may be stored as arrays) into a textarea-friendly
 * newline-separated string.
 *
 * This avoids PHP warnings like "Array to string conversion" when rendering
 * textarea fields.
 */
function ux_cfg_lines($val): string
{
    if (is_array($val)) {
        $parts = [];
        foreach ($val as $v) {
            if (is_array($v) || is_object($v)) {
                continue;
            }
            $parts[] = (string)$v;
        }
        return implode("\n", $parts);
    }
    if ($val === null) {
        return '';
    }
    if (is_bool($val)) {
        return $val ? '1' : '0';
    }
    return (string)$val;
}

/**
 * Base URL helper for loading local assets in standalone mode.
 *
 * The gateway can be deployed either under the site root or in a subdirectory.
 * We compute the base URL from the current script path so assets can be loaded
 * reliably without relying on WordPress helpers (plugins_url/esc_url).
 */
if (!function_exists('ux_gateway_base_url')) {
    function ux_gateway_base_url(): string
    {
        // Gateway directory name (e.g. /unixsee_campaign_gateway)
        $gateway_dir = '/' . trim(basename(__DIR__), '/');

        // Current script directory (e.g. /unixsee_campaign_gateway)
        $script_dir = isset($_SERVER['SCRIPT_NAME']) ? dirname((string)$_SERVER['SCRIPT_NAME']) : '';

        if ($script_dir === '/' || $script_dir === '\\' || $script_dir === '') {
            // Executed from site root
            $base = $gateway_dir;
        } else {
            // Executed from gateway/admin entry points
            $base = rtrim($script_dir, '/');
        }

        return $base;
    }
}

/**
 * محاسبه آمار ربات‌ها در ۲۴ ساعت اخیر بر اساس جدول bot_logs در SQLite.
 * این تابع مجموع درخواست‌های ربات‌ها، تعداد درخواست‌های موفق و نرخ موفقیت
 * را محاسبه می‌کند. همچنین خلاصه‌ای از فعالیت ربات‌های مختلف و نمودار
 * زمانی ساده‌ای را بر اساس ساعت فراهم می‌سازد.
 *
 * خروجی:
 *  - total_24h      : مجموع درخواست‌های ربات در ۲۴ ساعت اخیر
 *  - success_24h    : تعداد درخواست‌های موفق (کد وضعیت ۲۰۰–۲۹۹)
 *  - success_rate   : درصد موفقیت
 *  - recent_bots    : لیستی از ربات‌ها با تعداد هیت و نرخ موفقیت
 *  - timeline       : آرایه‌ای از ساعت و تعداد هیت موفق/ناموفق برای رسم نمودار
 *  - bots_detail    : جزئیات هر ربات (همان recent_bots)
 *  - health         : ارزیابی ساده سلامت بر اساس نرخ موفقیت
 *  - allow_ip_hits_total : تعداد درخواست‌هایی که از IPهای مجاز (در bot_allow_rules) آمده‌اند
 *  - allow_ip_detail     : جزئیات هیت‌های IPهای مجاز
 */
function ux_get_bot_stats_sql(array $config): array
{
    try {
        $pdo = ux_storage_pdo();
        $now = time();
        $from = $now - 86400; // 24h
        // بارگذاری تمامی لاگ‌های ۲۴ ساعت اخیر
        $stmt = $pdo->prepare("SELECT timestamp, ip, user_agent, bot_name, result, path FROM bot_logs WHERE timestamp >= :from");
        $stmt->execute([':from' => $from]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total = 0;
        $success = 0;
        $bots = [];
        $timeline = [];
        $allowIpHits = [];
        $allowRules = isset($config['bot_allow_rules']) && is_array($config['bot_allow_rules'])
            ? $config['bot_allow_rules']
            : [];

        foreach ($logs as $row) {
            $total++;
            $status = (int)($row['result'] ?? 0);
            if ($status >= 200 && $status < 300) {
                $success++;
            }
            // تشخیص نام ربات از ستون bot_name یا از User-Agent
            $botName = (string)($row['bot_name'] ?? '');
            if ($botName === '') {
                $botName = ux_detect_bot_name($row['user_agent'] ?? '');
            }
            if ($botName === '' || $botName === null) {
                $botName = 'unknown';
            }
            if (!isset($bots[$botName])) {
                // مقداردهی اولیه برای هر ربات. علاوه بر هیت و موفق/ناموفق،
                // فیلدهای دیگر مانند unique_paths، timeouts، آخرین مشاهده و آخرین مسیر نیز نگهداری می‌شوند.
                $bots[$botName] = [
                    'hits'        => 0,
                    'success'     => 0,
                    'fail'        => 0,
                    'unique_paths'=> [],
                    'timeouts'    => 0,
                    'last_ts'     => 0,
                    'last_path'   => '',
                ];
            }
            $bots[$botName]['hits']++;
            if ($status >= 200 && $status < 300) {
                $bots[$botName]['success']++;
            } else {
                $bots[$botName]['fail']++;
            }
            // ثبت مسیر در لیست صفحات یکتا در صورتی که مسیر تعریف شده باشد
            $pathVal = (string)($row['path'] ?? '');
            if ($pathVal !== '') {
                $bots[$botName]['unique_paths'][$pathVal] = true;
            }
            // افزایش شمارنده تایم‌اوت برای کدهای 408 یا 5xx
            if ($status === 408 || ($status >= 500 && $status < 600)) {
                $bots[$botName]['timeouts']++;
            }
            // به‌روزرسانی آخرین زمان و مسیر در صورتی که رکورد جدیدتر باشد
            $tsVal = (int)($row['timestamp'] ?? 0);
            if ($tsVal > $bots[$botName]['last_ts']) {
                $bots[$botName]['last_ts']   = $tsVal;
                $bots[$botName]['last_path'] = $pathVal;
            }
            // Timeline: استفاده از ساعت (0-23) به عنوان کلید
            $hour = (int)date('G', (int)$row['timestamp']);
            if (!isset($timeline[$hour])) {
                $timeline[$hour] = ['hour' => $hour, 'total' => 0, 'success' => 0, 'fail' => 0];
            }
            $timeline[$hour]['total']++;
            if ($status >= 200 && $status < 300) {
                $timeline[$hour]['success']++;
            } else {
                $timeline[$hour]['fail']++;
            }
            // بررسی IPهای مجاز
            if (!empty($allowRules)) {
                $ip = (string)($row['ip'] ?? '');
                foreach ($allowRules as $rule) {
                    $rule = trim($rule);
                    if ($rule === '') {
                        continue;
                    }
                    if (stripos($rule, 'ip:') === 0) {
                        $cidr = trim(substr($rule, 3));
                        if ($cidr !== '' && ux_match_ip_cidr($cidr, $ip)) {
                            if (!isset($allowIpHits[$ip])) {
                                $allowIpHits[$ip] = 0;
                            }
                            $allowIpHits[$ip]++;
                        }
                    }
                }
            }
        }

        /*
         * ساخت آرایه جزئیات ربات‌ها
         * برای هر ربات اطلاعات زیر محاسبه می‌شود:
         * - name           : نام ربات (مثلاً googlebot)
         * - hits           : تعداد کل درخواست‌های ثبت شده
         * - success        : تعداد درخواست‌های موفق (کدهای 2xx)
         * - fail           : تعداد درخواست‌های ناموفق (دیگر کدها)
         * - unique_paths   : تعداد صفحات یکتای مشاهده شده توسط ربات
         * - timeouts       : تعداد درخواست‌هایی که منجر به timeout یا خطای 5xx شده‌اند
         * - last_seen_human: مدت زمان گذشته از آخرین بازدید، به صورت انسانی (مثلاً «۳ ساعت و ۱۲ دقیقه پیش»)
         * - last_path      : آخرین مسیری که توسط ربات بازدید شده است
         */
        $botsDetail = [];
        $nowTs = time();
        foreach ($bots as $name => $data) {
            $hits    = isset($data['hits']) ? (int)$data['hits'] : 0;
            $succ    = isset($data['success']) ? (int)$data['success'] : 0;
            $fail    = isset($data['fail']) ? (int)$data['fail'] : 0;
            // تعداد صفحات یکتا از طریق شمارش unique_paths
            $uniqPaths = 0;
            if (isset($data['unique_paths']) && is_array($data['unique_paths'])) {
                $uniqPaths = count($data['unique_paths']);
            }
            // تعداد تایم‌اوت‌ها
            $timeouts = isset($data['timeouts']) ? (int)$data['timeouts'] : 0;
            // زمان آخرین مشاهده (به ثانیه)
            $lastSeenTs = isset($data['last_ts']) ? (int)$data['last_ts'] : 0;
            $lastSeenHuman = '';
            if ($lastSeenTs > 0) {
                $diff = $nowTs - $lastSeenTs;
                // تبدیل مدت زمان به رشته خوانا
                $lastSeenHuman = ux_format_duration($diff) . ' پیش';
            }
            // مسیر آخر
            $lastPath = isset($data['last_path']) ? (string)$data['last_path'] : '';
            // پرکردن آرایه خروجی با فیلدهایی که UI انتظار دارد
            $botsDetail[] = [
                'name'            => $name,
                'hits'            => $hits,
                'success'         => $succ,
                'fail'            => $fail,
                'unique_paths'    => $uniqPaths,
                'timeouts'        => $timeouts,
                'last_seen_human' => $lastSeenHuman,
                'last_path'       => $lastPath,
            ];
        }
        // مرتب‌سازی بر اساس تعداد هیت نزولی
        usort($botsDetail, function($a, $b) {
            return $b['hits'] <=> $a['hits'];
        });

        // Recent bots: تنها نام ربات‌ها را شامل می‌شود تا با نسخه قبلی سازگار باشد
        $recentBots = array_map(function ($item) {
            return $item['name'];
        }, $botsDetail);

        // تبدیل timeline به آرایه مرتب ساعتی (0 تا 23)
        ksort($timeline);
        $timelineArray = [];
        foreach ($timeline as $hour => $item) {
            $timelineArray[] = [
                'hour'    => (int)$hour,
                'total'   => (int)$item['total'],
                'success' => (int)$item['success'],
                'fail'    => (int)$item['fail'],
            ];
        }

        $total_24h    = (int)$total;
        $success_24h  = (int)$success;
        $success_rate = $total_24h > 0 ? round(($success_24h / $total_24h) * 100, 2) : 0;

        // تعیین سلامت بر اساس نرخ موفقیت
        $healthStatus = 'normal';
        if ($success_rate < 50) {
            $healthStatus = 'warning';
        }
        $health = [
            'score'  => $success_rate,
            'status' => $healthStatus,
        ];

        // آماده کردن خروجی
        return [
            'total_24h'           => $total_24h,
            'success_24h'         => $success_24h,
            'success_rate'        => $success_rate,
            'recent_bots'         => $recentBots,
            'health'              => $health,
            'timeline'            => $timelineArray,
            'bots_detail'         => $botsDetail,
            'allow_ip_hits_total' => array_sum($allowIpHits),
            'allow_ip_detail'     => $allowIpHits,
        ];
    } catch (Throwable $e) {
        error_log('ux_get_bot_stats_sql failed: ' . $e->getMessage());
        return [
            'total_24h'           => 0,
            'success_24h'         => 0,
            'success_rate'        => 0,
            'recent_bots'         => [],
            'health'              => ['score' => 0, 'status' => 'unknown'],
            'timeline'            => [],
            'bots_detail'         => [],
            'allow_ip_hits_total' => 0,
            'allow_ip_detail'     => [],
        ];
    }
}

/**
 * دریافت جزئیات آخرین درخواست‌های ربات‌ها یا IP خاص از جدول bot_logs.
 * این تابع حداکثر ۲۰۰۰ رکورد را می‌خواند اما فقط ۳۰ مورد اخیر را در خروجی
 * نمایش می‌دهد تا صفحه پنل سنگین نشود.
 *
 * @param array $config پیکربندی کلی
 * @param string|null $botName نام ربات (در صورت فیلتر)
 * @param string|null $ipFilter فیلتر بر اساس IP
 * @return array
 */
function ux_get_bot_detail_sql(array $config, ?string $botName = null, ?string $ipFilter = null): array
{
    try {
        $pdo = ux_storage_pdo();
        // ساخت شرط‌های فیلتر
        $where  = [];
        $params = [];
        if ($botName !== null && $botName !== '') {
            $where[] = 'bot_name = :bot';
            $params[':bot'] = $botName;
        }
        if ($ipFilter !== null && $ipFilter !== '') {
            $where[] = 'ip = :ip';
            $params[':ip'] = $ipFilter;
        }
        $sql = 'SELECT timestamp, ip, user_agent, path, result, bot_name FROM bot_logs';
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY timestamp DESC LIMIT 2000';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total    = 0;
        $success  = 0;
        $timeouts = 0;
        $paths    = [];
        $items    = [];

        foreach ($rows as $row) {
            $total++;
            $status = (int)($row['result'] ?? 0);
            if ($status >= 200 && $status < 300) {
                $success++;
            } elseif ($status === 408 || ($status >= 500 && $status < 600)) {
                $timeouts++;
            }
            $path = (string)($row['path'] ?? '');
            if ($path !== '') {
                $paths[$path] = true;
            }
            if (count($items) < 30) {
                $items[] = [
                    'ts'     => (int)$row['timestamp'],
                    'time'   => date('Y-m-d H:i', (int)$row['timestamp']),
                    'ip'     => (string)($row['ip'] ?? ''),
                    'status' => $status,
                    'path'   => $path,
                    'ua'     => (string)($row['user_agent'] ?? ''),
                ];
            }
        }
        return [
            'total'        => $total,
            'success'      => $success,
            'timeouts'     => $timeouts,
            'unique_paths' => count($paths),
            'items'        => $items,
        ];
    } catch (Throwable $e) {
        error_log('ux_get_bot_detail_sql failed: ' . $e->getMessage());
        return [
            'total'        => 0,
            'success'      => 0,
            'timeouts'     => 0,
            'unique_paths' => 0,
            'items'        => [],
        ];
    }
}




function ux_admin_panel($config_file, $config) {
    ux_require_login($config);

    // R1 hardening: make CSRF available before any AJAX branch.
    if (empty($_SESSION['ux_csrf'])) {
        try {
            $_SESSION['ux_csrf'] = bin2hex(random_bytes(16));
        } catch (Throwable $e) {
            $_SESSION['ux_csrf'] = md5(uniqid('ux_csrf', true));
        }
    }

    $ux_require_ajax_post_csrf = function (): void {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = (string)($_POST['csrf'] ?? '');
        if (!hash_equals((string)($_SESSION['ux_csrf'] ?? ''), $csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token', 'توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
    };
        $media_width_desktop = isset($config['media_width_desktop'])
            ? (int)$config['media_width_desktop']
            : (isset($config['media_width']) ? (int)$config['media_width'] : 60);

        $media_width_mobile = isset($config['media_width_mobile'])
            ? (int)$config['media_width_mobile']
            : (isset($config['media_width']) ? (int)$config['media_width'] : 90);

        $media_align = $config['media_align'] ?? 'center';

    // فلش‌مسج فقط پس از ریدایرکت بعد از POST نمایش داده می‌شود
    $message = '';
    if (!empty($_SESSION['ux_flash_message'])) {
        $message = $_SESSION['ux_flash_message'];
        unset($_SESSION['ux_flash_message']);
    }

    // پاسخ JSON برای لایو استت‌های پنل (بدون رفرش کل صفحه)
    if (($_GET['ux_ajax'] ?? '') === 'live') {
        $active_sessions = ux_get_active_sessions();
        $queue_sessions  = ux_get_queue_sessions();

        $inside_count = is_array($active_sessions) ? count($active_sessions) : 0; // داخل سایت
        $queue_count  = is_array($queue_sessions)  ? count($queue_sessions)  : 0; // در صف

        $max_active_cfg = isset($config['max_active_users']) ? (int)$config['max_active_users'] : 0;
        $usage_percent  = 0;

        if ($max_active_cfg > 0) {
            $usage_percent = (int) round(($inside_count / max(1, $max_active_cfg)) * 100);
            if ($usage_percent < 0) { $usage_percent = 0; }
            if ($usage_percent > 100) { $usage_percent = 100; }
        }

        $server_info = ux_get_server_load_info();
        $avg_wait    = ux_get_average_wait_time();
        // مجموع بازدیدکننده «واقعی» در ۲۴ ساعت اخیر (فقط کاربران غیر ربات)
        $human_stats_live      = ux_get_human_stats_24h();

        // وضعیت صف هوشمند (smart_queue)
        $smart_enabled     = (($config['mode'] ?? 'maintenance') === 'smart_queue');
        $smart_current_cap = null;
        $smart_min_cap     = null;

        if ($smart_enabled && $max_active_cfg > 0) {
            $state_file = __DIR__ . '/ux_dynamic_state.json';
            if (is_file($state_file)) {
                $state_json = @file_get_contents($state_file);
                $state_arr  = json_decode($state_json, true);
                if (is_array($state_arr) && isset($state_arr['current_cap'])) {
                    $smart_current_cap = (int) $state_arr['current_cap'];
                }
            }
            $smart_min_cap = (int) max(1, round($max_active_cfg * 0.4));
        }


        $total_visits_24h_live = isset($human_stats_live['unique_ips_24h'])
           ? (int)$human_stats_live['unique_ips_24h']
           : (int)($human_stats_live['total_24h'] ?? 0);

        
        // Latency window stats (p95 + 5xx error-rate)
        $lat_live = ['p95_ms' => null, 'samples' => 0, 'err5xx_pct' => null];
        if (function_exists('ux_latency_get_window_stats')) {
            try { $lat_live = ux_latency_get_window_stats($config); } catch (Throwable $e) { /* ignore */ }
        }

header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            // برای سازگاری با نسخه‌های قبلی
            'active_count'       => $inside_count,

            // مقادیر جدید
            'inside_count'       => $inside_count,
            'queue_count'        => $queue_count,
            'avg_wait_seconds'   => $avg_wait,
            'avg_wait_human'     => $avg_wait ? ux_format_duration($avg_wait) : null,

            'max_active'         => $max_active_cfg,
            'usage_percent'      => $usage_percent,
            'mode'               => $config['mode'] ?? 'maintenance',

            // Smart queue (اگر فعال باشد)
            'smart_enabled'      => $smart_enabled,
            'smart_current_cap'  => $smart_current_cap,
            'smart_min_cap'      => $smart_min_cap,

            // فشار سرور
            'server_load'        => $server_info['percent']        ?? null, // CPU درصدی
            'server_load1'       => $server_info['load1']          ?? null, // Load AVG 1min
            'server_load5'       => $server_info['load5']          ?? null, // 5min
            'server_load15'      => $server_info['load15']         ?? null, // 15min
            'server_ram_percent' => $server_info['memory_percent'] ?? null,
            'server_disk_percent'=> $server_info['disk_percent']   ?? null,

            // Visits
            'total_visits_24h'   => $total_visits_24h_live,

            // Latency health (rolling window)
            'lat_p95_ms'         => (is_array($lat_live) ? ($lat_live['p95_ms'] ?? null) : null),
            'lat_samples'        => (is_array($lat_live) ? (int)($lat_live['samples'] ?? 0) : 0),
            'err5xx_pct'         => (is_array($lat_live) ? ($lat_live['err5xx_pct'] ?? null) : null),

        ]);
        exit;
    }



    if (($_GET['ux_ajax'] ?? '') === 'smart-history') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }

        $range = $_GET['range'] ?? '24h';
        $seconds = 86400; // 24h
        if ($range === '7d') {
            $seconds = 7 * 86400;
        } elseif ($range === '30d') {
            $seconds = 30 * 86400;
        }

        $now    = time();
        $from   = $now - $seconds;
        $points = [];

        try {
            $pdo = ux_storage_pdo();
            $stmt = $pdo->prepare("
                SELECT ts, cpu_percent, mem_percent, active_count, queue_count, base_max, cap, lat_p95_ms, err5xx_pct, lat_samples
                FROM ux_smart_history
                WHERE ts >= :from
                ORDER BY ts ASC
            ");
            $stmt->execute([':from' => $from]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (is_array($rows)) {
                $points = $rows;
            }
        } catch (Throwable $e) {
            error_log('ux_admin smart-history failed: ' . $e->getMessage());
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'now'    => $now,
            'range'  => $range,
            'points' => $points,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (($_GET['ux_ajax'] ?? '') === 'bot-stats') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        // آمار ربات‌ها را از جدول bot_logs می‌خوانیم (نسخه اصلی)
        $stats = ux_get_bot_stats_sql($config);
        // آمار تکمیلی از جدول ux_visits برای نمایش خطاها و وضعیت کدها
        // Retrieve optional filters from query parameters to pass into analytics
        $uaFilter   = isset($_GET['bot']) ? trim((string)$_GET['bot']) : '';
        $pathFilter = isset($_GET['path']) ? trim((string)$_GET['path']) : '';

        // تلاش برای کش کردن آمار آنالیتیکس در ردیس (برای کاهش بار محاسباتی)
        $analytics = [];
        $cacheKey = null;
        // اگر ردیس فعال است، از ترکیب فیلترها یک کلید منحصر به فرد بسازیم
        if (!empty($config['redis_enabled'])) {
            // استفاده از md5 بر اساس فیلترها برای جلوگیری از طول زیاد کلید
            $keyStr   = 'bot:' . $uaFilter . '|path:' . $pathFilter;
            $cacheKey = 'ux_bot_stats:' . md5($keyStr);
            $redis    = null;
            // تلاش برای اتصال به ردیس
            if (function_exists('ux_redis_client')) {
                try {
                    $redis = ux_redis_client();
                } catch (Throwable $e) {
                    $redis = null;
                }
            }
            if ($redis) {
                try {
                    $cached = $redis->get($cacheKey);
                    if ($cached) {
                        $analytics = json_decode($cached, true);
                    }
                } catch (Throwable $e) {
                    // نادیده گرفتن خطاهای اتصال به ردیس
                    $analytics = [];
                }
            }
        }
        // اگر آمار از کش در دسترس نبود، آن‌ها را محاسبه و ذخیره کن
        if (empty($analytics)) {
            if (!class_exists('UxGatewayAnalytics')) {
                @require_once __DIR__ . '/core/Gateway/GatewayAnalytics.php';
            }
            if (class_exists('UxGatewayAnalytics')) {
                try {
                    $filters = [];
                    if ($uaFilter !== '') {
                        $filters['ua'] = $uaFilter;
                    }
                    if ($pathFilter !== '') {
                        $filters['path'] = $pathFilter;
                    }
                    $analytics = UxGatewayAnalytics::getBotStats($config, $filters);
                    // ذخیره در ردیس برای استفادهٔ بعدی (با زمان انقضا)
                    if ($cacheKey && isset($redis) && $redis && is_array($analytics)) {
                        try {
                            $redis->setex($cacheKey, 60, json_encode($analytics));
                        } catch (Throwable $e) {
                            // خطا را نادیده بگیر و ادامه بده
                        }
                    }
                } catch (Throwable $e) {
                    error_log('UxGatewayAnalytics::getBotStats failed: ' . $e->getMessage());
                }
            }
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'total_24h'           => $stats['total_24h'],
            'success_24h'         => $stats['success_24h'],
            'success_rate'        => $stats['success_rate'],
            'recent_bots'         => $stats['recent_bots'],
            'health'              => $stats['health'],
            'timeline'            => $stats['timeline'],
            'bots_detail'         => $stats['bots_detail'],
            'allow_ip_hits_total' => $stats['allow_ip_hits_total'],
            'allow_ip_detail'     => $stats['allow_ip_detail'],
            'status_counts'       => isset($analytics['status_counts']) ? $analytics['status_counts'] : null,
            'top_error_urls'      => isset($analytics['top_error_urls']) ? $analytics['top_error_urls'] : null,
            // Overall error statistics (bots + humans)
            'status_counts_all'   => isset($analytics['status_counts_all']) ? $analytics['status_counts_all'] : null,
            'top_error_urls_all'  => isset($analytics['top_error_urls_all']) ? $analytics['top_error_urls_all'] : null,
            // Separate lists for 4xx and 5xx errors across all visitors
            'top_error_urls_all_4xx' => isset($analytics['top_error_urls_all_4xx']) ? $analytics['top_error_urls_all_4xx'] : null,
            'top_error_urls_all_5xx' => isset($analytics['top_error_urls_all_5xx']) ? $analytics['top_error_urls_all_5xx'] : null,
            'generated_at'        => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (($_GET['ux_ajax'] ?? '') === 'smart-decisions') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        $range = $_GET['range'] ?? '24h';
        $seconds = 86400; // 24h
        if ($range === '7d') {
            $seconds = 7 * 86400;
        } elseif ($range === '30d') {
            $seconds = 30 * 86400;
        }
        $now  = time();
        $from = $now - $seconds;
        $decisions = [];
        try {
            $decisions = ux_get_smart_decisions($from);
        } catch (Throwable $e) {
            error_log('ux_admin smart-decisions failed: ' . $e->getMessage());
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'decisions' => $decisions,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }


    if (($_GET['ux_ajax'] ?? '') === 'bot-detail') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }

        $botName = isset($_GET['bot']) ? (string)$_GET['bot'] : null;
        $ip      = isset($_GET['ip']) ? (string)$_GET['ip'] : null;

        // جزئیات ربات یا آی‌پی را از دیتابیس می‌خوانیم
        $detail = ux_get_bot_detail_sql($config, $botName, $ip);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'bot'          => $botName,
            'ip'           => $ip,
            'total'        => $detail['total'],
            'success'      => $detail['success'],
            'timeouts'     => $detail['timeouts'],
            'unique_paths' => $detail['unique_paths'],
            'items'        => $detail['items'],
            'generated_at' => date('c'),
        ]);
        exit;
    }

    // آمار و عملیات ردیس
    if (($_GET['ux_ajax'] ?? '') === 'redis-stats') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 48;
        // نمونه‌برداری و ثبت وضعیت فعلی ردیس (در صورت فعال بودن)
        if (function_exists('ux_log_redis_stat')) {
            try {
                ux_log_redis_stat();
            } catch (Throwable $e) {
                error_log('ux_log_redis_stat ajax failed: ' . $e->getMessage());
            }
        }
        $stats = [];
        if (function_exists('ux_get_redis_stats')) {
            try {
                $stats = ux_get_redis_stats($limit);
            } catch (Throwable $e) {
                error_log('ux_get_redis_stats ajax failed: ' . $e->getMessage());
            }
        }
        $health   = function_exists('ux_get_redis_health_metrics') ? ux_get_redis_health_metrics() : [];
        $prefix   = function_exists('ux_get_redis_prefix_metrics') ? ux_get_redis_prefix_metrics() : [];
        $commands = function_exists('ux_get_redis_command_load_metrics') ? ux_get_redis_command_load_metrics() : [];

        // Lightweight Gateway RPS metrics (Redis per-second counters)
        $gateway = [];
        if (function_exists('ux_metrics_get_series')) {
            try {
                $req60   = ux_metrics_get_series('req', 60);
                $allow60 = ux_metrics_get_series('allow', 60);
                $queue60 = ux_metrics_get_series('queue', 60);

                $now = time();
                $curReq   = (int)($req60[$now] ?? 0);
                $curAllow = (int)($allow60[$now] ?? 0);
                $curQueue = (int)($queue60[$now] ?? 0);

                $sumLastN = function(array $series, int $n, int $nowTs): int {
                    $s = 0;
                    for ($t = $nowTs - $n + 1; $t <= $nowTs; $t++) {
                        $s += (int)($series[$t] ?? 0);
                    }
                    return $s;
                };

                $avg10 = $sumLastN($req60, 10, $now) / 10.0;
                $avg60 = $sumLastN($req60, 60, $now) / 60.0;

                $ops = isset($health['ops_per_sec']) ? (int)$health['ops_per_sec'] : 0;
                $opsPerReq = null;
                // avoid misleading huge numbers when RPS is near zero
                if ($avg10 >= 1.0) {
                    $opsPerReq = $ops / $avg10;
                }

                $gateway = [
                    'now' => $now,
                    'rps_now' => $curReq,
                    'avg10' => $avg10,
                    'avg60' => $avg60,
                    'ops_per_req' => $opsPerReq,
                    'allow_now' => $curAllow,
                    'queue_now' => $curQueue,
                ];
            } catch (Throwable $e) {
                $gateway = [];
            }
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'stats' => $stats,
            'health' => $health,
            'prefix' => $prefix,
            'commands' => $commands,
            'gateway' => $gateway,
            'generated_at' => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (($_GET['ux_ajax'] ?? '') === 'redis-flush') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        $success = false;
        if (function_exists('ux_flush_redis_cache')) {
            try {
                $success = ux_flush_redis_cache();
            } catch (Throwable $e) {
                error_log('ux_flush_redis_cache ajax failed: ' . $e->getMessage());
            }
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => (bool) $success,
            'generated_at' => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ایجاد فایل بک‌آپ از تنظیمات و پایگاه داده
    if (($_GET['ux_ajax'] ?? '') === 'backup') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        if (!function_exists('ux_admin_perform_backup')) {
            // Define backup helper locally
            function ux_admin_perform_backup(): array {
                try {
                    // Ensure necessary functions are available
                    $configFile = __DIR__ . '/ux_config.php';
                    // Determine database paths via helpers if available
                    $dbPath       = function_exists('ux_storage_db_path') ? ux_storage_db_path() : (__DIR__ . '/ux_campaign.sqlite');
                    $analyticsPath= function_exists('ux_storage_analytics_db_path') ? ux_storage_analytics_db_path() : (__DIR__ . '/ux_analytics.sqlite');
                    $timestamp    = date('Ymd_His');
                    $zipName      = 'ux_backup_' . $timestamp . '.zip';
                    $uploadDir    = __DIR__ . '/assets/uploads';
                    // Ensure upload directory exists
                    if (!is_dir($uploadDir)) {
                        @mkdir($uploadDir, 0755, true);
                    }
                    $zipPath = $uploadDir . '/' . $zipName;
                    $zip     = new ZipArchive();
                    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                        return ['success' => false, 'message' => 'Failed to create backup file'];
                    }
                    if (is_file($configFile)) {
                        $zip->addFile($configFile, basename($configFile));
                    }
                    if ($dbPath && is_file($dbPath)) {
                        $zip->addFile($dbPath, basename($dbPath));
                    }
                    if ($analyticsPath && is_file($analyticsPath) && $analyticsPath !== $dbPath) {
                        $zip->addFile($analyticsPath, basename($analyticsPath));
                    }
                    $zip->close();
                    // Construct relative URL for download
                    $url = 'assets/uploads/' . $zipName;
                    return ['success' => true, 'url' => $url, 'message' => ux_t('backup_success', 'فایل پشتیبان با موفقیت ایجاد شد.')];
                } catch (Throwable $e) {
                    return ['success' => false, 'message' => $e->getMessage()];
                }
            }
        }
        $result = ux_admin_perform_backup();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ریست کامل تنظیمات به مقادیر پیش‌فرض و حذف داده‌های هوشمند
    if (($_GET['ux_ajax'] ?? '') === 'reset') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        if (!function_exists('ux_admin_perform_reset')) {
            function ux_admin_perform_reset(): array {
                try {
                    // Reset configuration to defaults
                    $defaults = function_exists('ux_default_config') ? ux_default_config() : [];
                    // Ensure retention keys exist in defaults
                    if (!isset($defaults['smart_history_retention_days'])) {
                        $defaults['smart_history_retention_days'] = 90;
                    }
                    if (!isset($defaults['smart_decisions_retention_days'])) {
                        $defaults['smart_decisions_retention_days'] = 90;
                    }
                    $configFile = __DIR__ . '/ux_config.php';
                    if (!empty($defaults)) {
                        ux_save_config($configFile, $defaults);
                    }
                    // Remove smart history and decisions from SQLite
                    if (function_exists('ux_storage_pdo')) {
                        try {
                            $pdo = ux_storage_pdo();
                            $pdo->exec('DELETE FROM ux_smart_history;');
                            $pdo->exec('DELETE FROM smart_decisions;');
                        } catch (Throwable $e) {
                            // ignore deletion errors
                        }
                    }
                    return ['success' => true, 'message' => ux_t('reset_success', 'ریست تنظیمات و داده‌ها انجام شد.')];
                } catch (Throwable $e) {
                    return ['success' => false, 'message' => $e->getMessage()];
                }
            }
        }
        $result = ux_admin_perform_reset();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ریست داده‌های آنالیتیک (ux_visits, ux_redis_stats) بدون تغییر در تنظیمات و پایگاه داده اصلی
    if (($_GET['ux_ajax'] ?? '') === 'reset_analytics') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        if (!function_exists('ux_admin_perform_reset_analytics')) {
            function ux_admin_perform_reset_analytics(): array {
                try {
                    // Only operate if analytics database is accessible
                    if (function_exists('ux_storage_analytics_pdo')) {
                        $apdo = ux_storage_analytics_pdo();
                        try {
                            // Clear tables related to analytics statistics
                            $apdo->exec('DELETE FROM ux_visits;');
                            $apdo->exec('DELETE FROM ux_redis_stats;');
                        } catch (Throwable $e) {
                            // log but continue
                        }
                    }
                    return ['success' => true, 'message' => ux_t('reset_analytics_success', 'داده‌های آنالیز با موفقیت ریست شدند.')];
                } catch (Throwable $e) {
                    return ['success' => false, 'message' => $e->getMessage()];
                }
            }
        }
        $result = ux_admin_perform_reset_analytics();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ریست کامل پایگاه داده کمپین (به جز تنظیمات) و حذف صف، بازدیدها و تصمیمات
    if (($_GET['ux_ajax'] ?? '') === 'reset_db') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        if (!function_exists('ux_admin_perform_reset_db')) {
            function ux_admin_perform_reset_db(): array {
                try {
                    // Remove user sessions, queue and related analytics from SQLite
                    if (function_exists('ux_storage_pdo')) {
                        try {
                            $pdo = ux_storage_pdo();
                            // Delete from core tables (sessions, queue, etc.)
                            $pdo->exec('DELETE FROM ux_sessions;');
                            $pdo->exec('DELETE FROM ux_queue;');
                            $pdo->exec('DELETE FROM ux_wait_times;');
                            $pdo->exec('DELETE FROM ux_smart_history;');
                            $pdo->exec('DELETE FROM smart_decisions;');
                            $pdo->exec('DELETE FROM visits;');
                            $pdo->exec('DELETE FROM bot_logs;');
                            $pdo->exec('DELETE FROM login_attempts;');
                        } catch (Throwable $e) {
                            // ignore deletion errors
                        }
                    }
                    // Additionally clear analytics tables if they exist (for completeness)
                    if (function_exists('ux_storage_analytics_pdo')) {
                        try {
                            $apdo = ux_storage_analytics_pdo();
                            $apdo->exec('DELETE FROM ux_visits;');
                            $apdo->exec('DELETE FROM ux_redis_stats;');
                        } catch (Throwable $e) {
                            // ignore deletion errors
                        }
                    }
                    return ['success' => true, 'message' => ux_t('reset_db_success', 'پایگاه داده با موفقیت ریست شد.')];
                } catch (Throwable $e) {
                    return ['success' => false, 'message' => $e->getMessage()];
                }
            }
        }
        $result = ux_admin_perform_reset_db();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ایمپورت بک‌آپ از طریق AJAX (دریافت فایل ZIP و بازگرداندن داده‌ها)
    if (($_GET['ux_ajax'] ?? '') === 'import') {
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        if (!function_exists('ux_admin_perform_import')) {
            function ux_admin_perform_import(): array {
                try {
                    // Only allow POST with a file
                    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
                        return ['success' => false, 'message' => ux_t('import_invalid_request','درخواست نامعتبر')];
                    }
                    $file = $_FILES['backup_file'] ?? null;
                    if (!$file || !is_array($file) || ($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                        return ['success' => false, 'message' => ux_t('import_no_file','فایل بک‌آپ انتخاب نشده یا در آپلود مشکل وجود دارد.')];
                    }
                    $tmpName = (string)$file['tmp_name'];
                    if (!is_file($tmpName) || !filesize($tmpName)) {
                        return ['success' => false, 'message' => ux_t('import_no_file','فایل بک‌آپ انتخاب نشده یا در آپلود مشکل وجود دارد.')];
                    }
                    // Validate CSRF token
                    $csrfToken = $_POST['csrf'] ?? '';
                    if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
                        return ['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')];
                    }
                    $zip = new ZipArchive();
                    if ($zip->open($tmpName) !== true) {
                        return ['success' => false, 'message' => ux_t('import_invalid_zip','فایل انتخاب‌شده یک آرشیو معتبر نیست.')];
                    }
                    $configBuffer     = null;
                    $dbBuffer         = null;
                    $analyticsBuffer  = null;
                    for ($i = 0; $i < $zip->numFiles; $i++) {
                        $name = $zip->getNameIndex($i);
                        if (!$name) continue;
                        $base = basename($name);
                        if ($base === 'ux_config.php') {
                            $configBuffer = $zip->getFromIndex($i);
                        } elseif ($base === 'ux_campaign.sqlite') {
                            $dbBuffer = $zip->getFromIndex($i);
                        } elseif ($base === 'ux_analytics.sqlite') {
                            $analyticsBuffer = $zip->getFromIndex($i);
                        }
                    }
                    if ($configBuffer === null && $dbBuffer === null && $analyticsBuffer === null) {
                        $zip->close();
                        return ['success' => false, 'message' => ux_t('import_missing_files','فایل بک‌آپ شامل فایل‌های مورد نیاز نیست.')];
                    }
                    // Import files
                    if ($configBuffer !== null) {
                        $configDest = __DIR__ . '/ux_config.php';
                        @file_put_contents($configDest, $configBuffer);
                    }
                    if ($dbBuffer !== null) {
                        $dbDest = function_exists('ux_storage_db_path') ? ux_storage_db_path() : (__DIR__ . '/ux_campaign.sqlite');
                        @file_put_contents($dbDest, $dbBuffer);
                    }
                    if ($analyticsBuffer !== null) {
                        $anDest = function_exists('ux_storage_analytics_db_path') ? ux_storage_analytics_db_path() : (__DIR__ . '/ux_analytics.sqlite');
                        @file_put_contents($anDest, $analyticsBuffer);
                    }
                    $zip->close();
                    return ['success' => true, 'message' => ux_t('import_success','بک‌آپ با موفقیت ایمپورت شد.')];
                } catch (Throwable $e) {
                    return ['success' => false, 'message' => $e->getMessage()];
                }
            }
        }
        $result = ux_admin_perform_import();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Add an IP to the blocked list via AJAX
    if (($_GET['ux_ajax'] ?? '') === 'block_ip') {
        // Clear any buffered output
        if (ob_get_length()) {@ob_end_clean();}
        // Only POST is allowed
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = $_POST['csrf'] ?? '';
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $ip = trim((string)($_POST['ip'] ?? ''));
        if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_ip','آی‌پی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        // Load current configuration
        $cfgBlock = $config;
        $blocked  = isset($cfgBlock['blocked_ips']) && is_array($cfgBlock['blocked_ips']) ? $cfgBlock['blocked_ips'] : [];
        if (!in_array($ip, $blocked, true)) {
            $blocked[] = $ip;
            $cfgBlock['blocked_ips'] = $blocked;
            ux_save_config($config_file, $cfgBlock);
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Remove an IP from the blocked list via AJAX
    if (($_GET['ux_ajax'] ?? '') === 'unblock_ip') {
        // Clear any buffered output
        if (ob_get_length()) {@ob_end_clean();}
        // Only POST is allowed
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = $_POST['csrf'] ?? '';
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $ip = trim((string)($_POST['ip'] ?? ''));
        if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_ip','آی‌پی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $cfgBlock = $config;
        $blocked  = isset($cfgBlock['blocked_ips']) && is_array($cfgBlock['blocked_ips']) ? $cfgBlock['blocked_ips'] : [];
        if (!empty($blocked)) {
            $newList = [];
            foreach ($blocked as $existing) {
                if ((string)$existing !== $ip) {
                    $newList[] = $existing;
                }
            }
            $cfgBlock['blocked_ips'] = $newList;
            ux_save_config($config_file, $cfgBlock);
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    
    // Bot Blocks (DB) - Add manual block (IP/UA) via AJAX
    if (($_GET['ux_ajax'] ?? '') === 'bot_block_add') {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = $_POST['csrf'] ?? '';
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $type  = trim((string)($_POST['type'] ?? 'ip'));
        $value = trim((string)($_POST['value'] ?? ''));
        $reason = trim((string)($_POST['reason'] ?? 'manual'));
        $ttlSeconds = isset($_POST['ttl_seconds']) ? (int)$_POST['ttl_seconds'] : 0;

        if (!in_array($type, ['ip','ua'], true)) {
            $type = 'ip';
        }
        if ($type === 'ip') {
            if ($value === '' || !filter_var($value, FILTER_VALIDATE_IP)) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(['success' => false, 'message' => ux_t('error_invalid_ip','آی‌پی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            // UA: accept UA hash (64-hex) or full UA string
            if ($value === '') {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(['success' => false, 'message' => ux_t('error_invalid_ua','User-Agent نامعتبر است.')], JSON_UNESCAPED_UNICODE);
                exit;
            }
            if (preg_match('/^[a-f0-9]{64}$/i', $value)) {
                $value = strtolower($value);
            } else {
                $value = function_exists('ux_ua_hash') ? ux_ua_hash($value) : hash('sha256', $value);
            }
        }

        try {
            $pdo = ux_storage_pdo();
            ux_storage_migrate($pdo);
            $id = function_exists('ux_bot_block_create') ? ux_bot_block_create($pdo, $type, $value, $reason, 'manual', ($ttlSeconds > 0 ? $ttlSeconds : null)) : 0;

            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Throwable $e) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Bot Blocks (DB) - Unblock (deactivate) via AJAX
    if (($_GET['ux_ajax'] ?? '') === 'bot_block_unblock') {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = $_POST['csrf'] ?? '';
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $pdo = ux_storage_pdo();
            ux_storage_migrate($pdo);
            $ok = function_exists('ux_bot_block_unblock') ? ux_bot_block_unblock($pdo, $id) : false;

            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => (bool)$ok], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Throwable $e) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Bot Blocks (DB) - Export blocks as JSON/CSV
    if (($_GET['ux_ajax'] ?? '') === 'bot_blocks_export') {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = (string)($_GET['csrf'] ?? '');
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', $csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $type   = strtolower(trim((string)($_GET['type'] ?? 'both')));
        $source = strtolower(trim((string)($_GET['source'] ?? 'both')));
        $scope  = strtolower(trim((string)($_GET['scope'] ?? 'active')));
        $format = strtolower(trim((string)($_GET['format'] ?? 'json')));

        if (!in_array($type, ['ip','ua','both'], true)) { $type = 'both'; }
        if (!in_array($source, ['auto','manual','both'], true)) { $source = 'both'; }
        if (!in_array($scope, ['active','all'], true)) { $scope = 'active'; }
        if (!in_array($format, ['json','csv'], true)) { $format = 'json'; }

        try {
            $pdo = ux_storage_pdo();
            ux_storage_migrate($pdo);

            $rows = function_exists('ux_bot_blocks_export_rows')
                ? ux_bot_blocks_export_rows($pdo, [
                    'type' => $type,
                    'source' => $source,
                    'active_only' => ($scope !== 'all'),
                ])
                : [];

            // Audit
            if (function_exists('ux_admin_audit_log')) {
                ux_admin_audit_log($pdo, 'bot_blocks_export', [
                    'type' => $type,
                    'source' => $source,
                    'scope' => $scope,
                    'format' => $format,
                    'count' => is_array($rows) ? count($rows) : 0,
                ]);
            }

            $tsLabel = date('Ymd_His');
            if ($format === 'csv') {
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="bot_blocks_' . $tsLabel . '.csv"');
                $out = fopen('php://output', 'w');
                // UTF-8 BOM for Excel compatibility
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, ['type','value','source','reason','expires_at','active','created_at']);
                if (is_array($rows)) {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            (string)($r['type'] ?? ''),
                            (string)($r['value'] ?? ''),
                            (string)($r['source'] ?? ''),
                            (string)($r['reason'] ?? ''),
                            (string)($r['expires_at'] ?? ''),
                            (string)($r['active'] ?? ''),
                            (string)($r['created_at'] ?? ''),
                        ]);
                    }
                }
                fclose($out);
                exit;
            }

            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="bot_blocks_' . $tsLabel . '.json"');
            echo json_encode(is_array($rows) ? $rows : [], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        } catch (Throwable $e) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // Bot Blocks (DB) - Import blocks from JSON (upsert by type,value) as manual blocks
    if (($_GET['ux_ajax'] ?? '') === 'bot_blocks_import') {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $csrfToken = $_POST['csrf'] ?? '';
        if (!hash_equals($_SESSION['ux_csrf'] ?? '', (string)$csrfToken)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_token','توکن امنیتی نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $payload = '';
        if (!empty($_FILES['file']) && is_array($_FILES['file']) && !empty($_FILES['file']['tmp_name'])) {
            $tmp = (string)($_FILES['file']['tmp_name'] ?? '');
            if ($tmp !== '' && is_file($tmp)) {
                $payload = (string)@file_get_contents($tmp);
            }
        }
        if ($payload === '') {
            $payload = (string)($_POST['json'] ?? '');
        }
        $payload = trim($payload);
        if ($payload === '') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('import_empty','فایل/محتوا خالی است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $decoded = json_decode($payload, true);
        if ($decoded === null) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('import_invalid_json','JSON نامعتبر است.')], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $items = [];
        if (is_array($decoded) && array_keys($decoded) === range(0, count($decoded) - 1)) {
            $items = $decoded;
        } elseif (is_array($decoded) && isset($decoded['items']) && is_array($decoded['items'])) {
            $items = $decoded['items'];
        } elseif (is_array($decoded) && isset($decoded['data']) && is_array($decoded['data'])) {
            $items = $decoded['data'];
        }
        if (!is_array($items)) {
            $items = [];
        }
        if (empty($items)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('import_no_items','هیچ رکوردی برای Import پیدا نشد.')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $pdo = ux_storage_pdo();
            ux_storage_migrate($pdo);

            $res = function_exists('ux_bot_blocks_import_rows')
                ? ux_bot_blocks_import_rows($pdo, $items, ['default_reason' => 'import'])
                : ['added' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => ['import_not_supported']];

            if (function_exists('ux_admin_audit_log')) {
                ux_admin_audit_log($pdo, 'bot_blocks_import', [
                    'added' => (int)($res['added'] ?? 0),
                    'updated' => (int)($res['updated'] ?? 0),
                    'skipped' => (int)($res['skipped'] ?? 0),
                    'errors_count' => is_array($res['errors'] ?? null) ? count($res['errors']) : 0,
                    'file_name' => (string)($_FILES['file']['name'] ?? ''),
                ]);
            }

            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => true,
                'added' => (int)($res['added'] ?? 0),
                'updated' => (int)($res['updated'] ?? 0),
                'skipped' => (int)($res['skipped'] ?? 0),
                'errors' => $res['errors'] ?? [],
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Throwable $e) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // UA Bank list (AJAX) - server-side pagination + filters
    if (in_array(($_GET['ux_ajax'] ?? ''), ['ua-bank-list', 'ua_bank_list'], true)) {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 25;
        $page = max(1, $page);
        $perPage = max(5, min(100, $perPage));
        $offset = ($page - 1) * $perPage;

        $sort = strtolower(trim((string)($_GET['sort'] ?? 'last_seen')));
        $dir  = strtolower(trim((string)($_GET['dir'] ?? 'desc')));
        $classification = trim((string)($_GET['classification'] ?? ''));
        $minHits = isset($_GET['min_hits']) && $_GET['min_hits'] !== '' ? (int)$_GET['min_hits'] : null;
        $minScore = isset($_GET['min_score']) && $_GET['min_score'] !== '' ? (int)$_GET['min_score'] : null;
        $maxScore = isset($_GET['max_score']) && $_GET['max_score'] !== '' ? (int)$_GET['max_score'] : null;
        $q = trim((string)($_GET['q'] ?? ''));

        $lastFrom = isset($_GET['last_seen_from']) && $_GET['last_seen_from'] !== '' ? (int)$_GET['last_seen_from'] : null;
        $lastTo   = isset($_GET['last_seen_to']) && $_GET['last_seen_to'] !== '' ? (int)$_GET['last_seen_to'] : null;

        $blockedStatus = strtolower(trim((string)($_GET['blocked_status'] ?? 'all')));
        if (!in_array($blockedStatus, ['all', 'blocked', 'not_blocked'], true)) {
            $blockedStatus = 'all';
        }

        // Load blocked UA hashes map (active blocks)
        $blockedMap = [];
        try {
            $pdoMain = ux_storage_pdo();
            ux_storage_migrate($pdoMain);
            $stmt = $pdoMain->prepare(
                "SELECT id, value, created_at FROM bot_blocks WHERE active = 1 AND type = 'ua' ORDER BY created_at DESC"
            );
            $stmt->execute();
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $h = strtolower((string)($r['value'] ?? ''));
                if ($h !== '' && preg_match('/^[a-f0-9]{64}$/', $h) && !isset($blockedMap[$h])) {
                    $blockedMap[$h] = (int)($r['id'] ?? 0);
                }
            }
        } catch (Throwable $e) {
            $blockedMap = [];
        }
        $blockedHashes = array_keys($blockedMap);
        $hashFilter = null;
        $hashFilterMode = 'in';
        if ($blockedStatus === 'blocked') {
            $hashFilter = $blockedHashes;
            $hashFilterMode = 'in';
        } elseif ($blockedStatus === 'not_blocked') {
            $hashFilter = $blockedHashes;
            $hashFilterMode = 'not_in';
        }

        $data = function_exists('ux_ua_bank_list_advanced')
            ? ux_ua_bank_list_advanced([
                'limit' => $perPage,
                'offset' => $offset,
                'sort' => $sort,
                'dir' => $dir,
                'classification' => $classification,
                'min_hits' => $minHits,
                'min_score' => $minScore,
                'max_score' => $maxScore,
                'last_seen_from' => $lastFrom,
                'last_seen_to' => $lastTo,
                'search' => $q,
                'hash_filter' => $hashFilter,
                'hash_filter_mode' => $hashFilterMode,
            ])
            : ['rows' => [], 'total' => 0];

        $rows = is_array($data['rows'] ?? null) ? $data['rows'] : [];
        foreach ($rows as &$row) {
            $h = strtolower((string)($row['ua_hash'] ?? ''));
            $row['blocked'] = isset($blockedMap[$h]);
            $row['block_id'] = isset($blockedMap[$h]) ? (int)$blockedMap[$h] : 0;
        }
        unset($row);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'page' => $page,
            'per_page' => $perPage,
            'total' => (int)($data['total'] ?? 0),
            'rows' => $rows,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Top suspicious IPs/UAs (AJAX) - real data from DB
    if (($_GET['ux_ajax'] ?? '') === 'top_suspicious') {
        if (ob_get_length()) {@ob_end_clean();}
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => ux_t('error_invalid_request', 'درخواست نامعتبر')], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $range = strtolower(trim((string)($_GET['range'] ?? '1h')));
        $ranges = [
            '10m' => 600,
            '1h'  => 3600,
            '24h' => 86400,
            '7d'  => 604800,
        ];
        if (!isset($ranges[$range])) {
            $range = '1h';
        }
        $since = time() - (int)$ranges[$range];

        $limit = (int)($_GET['limit'] ?? 20);
        if ($limit < 5) { $limit = 5; }
        if ($limit > 50) { $limit = 50; }

        try {
            // Analytics DB for request counts
            $pdoA = function_exists('ux_storage_analytics_pdo') ? ux_storage_analytics_pdo() : null;
            if (!($pdoA instanceof PDO)) {
                // fallback
                $pdoA = ux_storage_pdo();
            }
            if (function_exists('ux_storage_analytics_migrate')) {
                try { ux_storage_analytics_migrate($pdoA); } catch (Throwable $e) { /* ignore */ }
            }

            // Campaign DB for strikes/blocks/scores
            $pdo = ux_storage_pdo();
            ux_storage_migrate($pdo);

            // Top IPs (bots only)
            $ipRows = [];
            try {
                $stmt = $pdoA->prepare(
                    "SELECT ip, COUNT(*) AS req_count, MAX(ts) AS last_seen\n" .
                    "FROM ux_visits\n" .
                    "WHERE ts >= :since AND is_bot = 1\n" .
                    "GROUP BY ip\n" .
                    "ORDER BY req_count DESC, last_seen DESC\n" .
                    "LIMIT " . (int)$limit
                );
                $stmt->execute([':since' => $since]);
                $ipRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!is_array($ipRows)) { $ipRows = []; }
            } catch (Throwable $e) {
                $ipRows = [];
            }

            // Top UAs (bots only)
            $uaRows = [];
            try {
                $stmt = $pdoA->prepare(
                    "SELECT ua, COUNT(*) AS req_count, MAX(ts) AS last_seen\n" .
                    "FROM ux_visits\n" .
                    "WHERE ts >= :since AND is_bot = 1 AND ua != ''\n" .
                    "GROUP BY ua\n" .
                    "ORDER BY req_count DESC, last_seen DESC\n" .
                    "LIMIT " . (int)$limit
                );
                $stmt->execute([':since' => $since]);
                $uaRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!is_array($uaRows)) { $uaRows = []; }
            } catch (Throwable $e) {
                $uaRows = [];
            }

            // Build sets
            $ips = [];
            foreach ($ipRows as $r) {
                $ip = (string)($r['ip'] ?? '');
                if ($ip !== '') { $ips[$ip] = true; }
            }
            $ips = array_keys($ips);

            $uaHashToUa = [];
            foreach ($uaRows as $r) {
                $ua = (string)($r['ua'] ?? '');
                if ($ua === '') continue;
                $h = function_exists('ux_ua_hash') ? ux_ua_hash($ua) : hash('sha256', $ua);
                $uaHashToUa[$h] = $ua;
            }
            $uaHashes = array_keys($uaHashToUa);

            // Strikes counts (time window)
            $ipStrikes = [];
            if (!empty($ips)) {
                $ph = [];
                $params = [':since' => $since];
                foreach ($ips as $i => $ip) {
                    $k = ':ip' . (int)$i;
                    $ph[] = $k;
                    $params[$k] = $ip;
                }
                $sql = "SELECT value, COUNT(*) AS c FROM bot_strikes WHERE type='ip' AND ts >= :since AND value IN (" . implode(',', $ph) . ") GROUP BY value";
                try {
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, ($k === ':since') ? PDO::PARAM_INT : PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $ipStrikes[(string)($row['value'] ?? '')] = (int)($row['c'] ?? 0);
                    }
                } catch (Throwable $e) {
                    $ipStrikes = [];
                }
            }

            $uaStrikes = [];
            if (!empty($uaHashes)) {
                $ph = [];
                $params = [':since' => $since];
                foreach ($uaHashes as $i => $h) {
                    $k = ':ua' . (int)$i;
                    $ph[] = $k;
                    $params[$k] = $h;
                }
                $sql = "SELECT value, COUNT(*) AS c FROM bot_strikes WHERE type='ua' AND ts >= :since AND value IN (" . implode(',', $ph) . ") GROUP BY value";
                try {
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, ($k === ':since') ? PDO::PARAM_INT : PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $uaStrikes[(string)($row['value'] ?? '')] = (int)($row['c'] ?? 0);
                    }
                } catch (Throwable $e) {
                    $uaStrikes = [];
                }
            }

            // Scores for IPs
            $ipScores = [];
            if (!empty($ips)) {
                $ph = [];
                $params = [];
                foreach ($ips as $i => $ip) {
                    $k = ':sip' . (int)$i;
                    $ph[] = $k;
                    $params[$k] = $ip;
                }
                $sql = "SELECT ip, score, last_seen FROM bot_scores WHERE ip IN (" . implode(',', $ph) . ")";
                try {
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $ipScores[(string)($row['ip'] ?? '')] = [
                            'score' => isset($row['score']) ? (int)$row['score'] : null,
                            'last_seen' => isset($row['last_seen']) ? (int)$row['last_seen'] : null,
                        ];
                    }
                } catch (Throwable $e) {
                    $ipScores = [];
                }
            }

            // UA stats (classification/score)
            $uaStats = [];
            if (!empty($uaHashes) && function_exists('ux_storage_analytics_pdo')) {
                try {
                    $pdoUA = ux_storage_analytics_pdo();
                    if (function_exists('ux_storage_analytics_migrate')) {
                        ux_storage_analytics_migrate($pdoUA);
                    }
                    $ph = [];
                    $params = [];
                    foreach ($uaHashes as $i => $h) {
                        $k = ':h' . (int)$i;
                        $ph[] = $k;
                        $params[$k] = $h;
                    }
                    $sql = "SELECT ua_hash, last_score, classification FROM ua_stats WHERE ua_hash IN (" . implode(',', $ph) . ")";
                    $stmt = $pdoUA->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $uaStats[(string)($row['ua_hash'] ?? '')] = [
                            'score' => isset($row['last_score']) ? (int)$row['last_score'] : null,
                            'classification' => (string)($row['classification'] ?? ''),
                        ];
                    }
                } catch (Throwable $e) {
                    $uaStats = [];
                }
            }

            // Active blocks mapping (for quick actions)
            $ipBlocks = [];
            if (!empty($ips)) {
                $ph = [];
                $params = [];
                foreach ($ips as $i => $ip) {
                    $k = ':bip' . (int)$i;
                    $ph[] = $k;
                    $params[$k] = $ip;
                }
                $sql = "SELECT id, value, source, expires_at, created_at FROM bot_blocks WHERE active=1 AND type='ip' AND value IN (" . implode(',', $ph) . ") ORDER BY created_at DESC";
                try {
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $v = (string)($row['value'] ?? '');
                        if ($v !== '' && !isset($ipBlocks[$v])) {
                            $ipBlocks[$v] = [
                                'id' => (int)($row['id'] ?? 0),
                                'source' => (string)($row['source'] ?? ''),
                                'expires_at' => isset($row['expires_at']) ? (int)$row['expires_at'] : null,
                            ];
                        }
                    }
                } catch (Throwable $e) {
                    $ipBlocks = [];
                }
            }

            $uaBlocks = [];
            if (!empty($uaHashes)) {
                $ph = [];
                $params = [];
                foreach ($uaHashes as $i => $h) {
                    $k = ':bua' . (int)$i;
                    $ph[] = $k;
                    $params[$k] = $h;
                }
                $sql = "SELECT id, value, source, expires_at, created_at FROM bot_blocks WHERE active=1 AND type='ua' AND value IN (" . implode(',', $ph) . ") ORDER BY created_at DESC";
                try {
                    $stmt = $pdo->prepare($sql);
                    foreach ($params as $k => $v) {
                        $stmt->bindValue($k, $v, PDO::PARAM_STR);
                    }
                    $stmt->execute();
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $v = strtolower((string)($row['value'] ?? ''));
                        if ($v !== '' && !isset($uaBlocks[$v])) {
                            $uaBlocks[$v] = [
                                'id' => (int)($row['id'] ?? 0),
                                'source' => (string)($row['source'] ?? ''),
                                'expires_at' => isset($row['expires_at']) ? (int)$row['expires_at'] : null,
                            ];
                        }
                    }
                } catch (Throwable $e) {
                    $uaBlocks = [];
                }
            }

            // Thresholds for classification (fallback)
            $badTh  = isset($config['bot_score_bad_threshold']) ? (int)$config['bot_score_bad_threshold'] : 25;
            $goodTh = isset($config['bot_score_good_threshold']) ? (int)$config['bot_score_good_threshold'] : 70;

            $outIps = [];
            foreach ($ipRows as $r) {
                $ip = (string)($r['ip'] ?? '');
                if ($ip === '') continue;
                $req = (int)($r['req_count'] ?? 0);
                $ls  = (int)($r['last_seen'] ?? 0);
                $score = null;
                if (isset($ipScores[$ip]) && is_array($ipScores[$ip])) {
                    $score = isset($ipScores[$ip]['score']) ? (int)$ipScores[$ip]['score'] : null;
                }
                $class = '';
                if ($score !== null) {
                    if ($score <= $badTh) {
                        $class = 'bad';
                    } elseif ($score >= $goodTh) {
                        $class = 'good';
                    } else {
                        $class = 'suspicious';
                    }
                }
                $blocked = isset($ipBlocks[$ip]);
                $outIps[] = [
                    'ip' => $ip,
                    'req_count' => $req,
                    'strikes_count' => (int)($ipStrikes[$ip] ?? 0),
                    'last_seen' => $ls,
                    'score' => $score,
                    'classification' => $class,
                    'blocked' => $blocked,
                    'block_id' => $blocked ? (int)($ipBlocks[$ip]['id'] ?? 0) : 0,
                    'block_source' => $blocked ? (string)($ipBlocks[$ip]['source'] ?? '') : '',
                    'expires_at' => $blocked ? ($ipBlocks[$ip]['expires_at'] ?? null) : null,
                ];
            }

            $outUas = [];
            foreach ($uaRows as $r) {
                $ua = (string)($r['ua'] ?? '');
                if ($ua === '') continue;
                $h = function_exists('ux_ua_hash') ? ux_ua_hash($ua) : hash('sha256', $ua);
                $req = (int)($r['req_count'] ?? 0);
                $ls  = (int)($r['last_seen'] ?? 0);
                $score = null;
                $class = '';
                if (isset($uaStats[$h])) {
                    $score = $uaStats[$h]['score'] ?? null;
                    $class = (string)($uaStats[$h]['classification'] ?? '');
                }
                $blocked = isset($uaBlocks[$h]);
                $outUas[] = [
                    'ua_hash' => $h,
                    'ua' => $ua,
                    'req_count' => $req,
                    'strikes_count' => (int)($uaStrikes[$h] ?? 0),
                    'last_seen' => $ls,
                    'score' => $score,
                    'classification' => $class,
                    'blocked' => $blocked,
                    'block_id' => $blocked ? (int)($uaBlocks[$h]['id'] ?? 0) : 0,
                    'block_source' => $blocked ? (string)($uaBlocks[$h]['source'] ?? '') : '',
                    'expires_at' => $blocked ? ($uaBlocks[$h]['expires_at'] ?? null) : null,
                ];
            }

            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => true,
                'range' => $range,
                'since' => $since,
                'ips' => $outIps,
                'uas' => $outUas,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Throwable $e) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

// دستی محاسبه کردن آمار و ذخیره کردن در کش ردیس
    if (($_GET['ux_ajax'] ?? '') === 'analytics-precompute') {
        $ux_require_ajax_post_csrf();
        // Clean any previous output to ensure valid JSON response
        if (ob_get_length()) {
            @ob_end_clean();
        }
        // Attempt to recompute analytics and cache the results.  This uses the current
        // configuration loaded above and caches according to analytics settings.
        $success   = false;
        $message   = '';
        try {
            // Ensure the class is loaded
            if (class_exists('UxGatewayAnalytics')) {
                \UxGatewayAnalytics::getBotStats($config, []);
                $success = true;
            }
        } catch (Throwable $e) {
            error_log('analytics precompute ajax failed: ' . $e->getMessage());
            $message = $e->getMessage();
        }
        if ($success) {
            $message = ux_t('analytics_precompute_success', 'آمار با موفقیت محاسبه شد');
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => (bool) $success,
            'message' => $message,
            'generated_at' => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

if (empty($_SESSION['ux_csrf'])) {
        try {
            $_SESSION['ux_csrf'] = bin2hex(random_bytes(16));
        } catch (Exception $e) {
            $_SESSION['ux_csrf'] = md5(uniqid('ux_csrf', true));
        }
    }
    $csrf = $_SESSION['ux_csrf'];

    // تخلیه کامل صف
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['ux_action'] ?? '') === 'clear_sessions') {
        if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
            $message = ux_t('error_invalid_token', 'خطا: توکن امنیتی نامعتبر است.');
        } else {
            ux_save_active_sessions([]);
            $_SESSION['ux_flash_message'] = ux_t('message_active_queue_cleared', 'صف کاربران فعال با موفقیت خالی شد.');
            ux_panel_redirect();
        }
    }

    // ایمپورت بک‌آپ
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['ux_action'] ?? '') === 'import_backup') {
        if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
            $message = ux_t('error_invalid_token', 'خطا: توکن امنیتی نامعتبر است.');
        } else {
            // بررسی فایل ارسالی
            $file = $_FILES['backup_file'] ?? null;
            if (!$file || !is_array($file) || ($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                $message = ux_t('import_no_file', 'خطا: فایل بک‌آپ انتخاب نشده یا در آپلود مشکل وجود دارد.');
            } else {
                $tmpName = (string)$file['tmp_name'];
                if (!is_file($tmpName) || !filesize($tmpName)) {
                    $message = ux_t('import_no_file', 'خطا: فایل بک‌آپ انتخاب نشده یا در آپلود مشکل وجود دارد.');
                } else {
                    $zip = new ZipArchive();
                    if ($zip->open($tmpName) !== true) {
                        $message = ux_t('import_invalid_zip', 'خطا: فایل انتخاب‌شده یک آرشیو معتبر نیست.');
                    } else {
                        $configBuffer  = null;
                        $dbBuffer      = null;
                        $analyticsBuffer = null;
                        for ($i = 0; $i < $zip->numFiles; $i++) {
                            $name = $zip->getNameIndex($i);
                            if (!$name) continue;
                            $base = basename($name);
                            if ($base === 'ux_config.php') {
                                $configBuffer = $zip->getFromIndex($i);
                            } elseif ($base === 'ux_campaign.sqlite') {
                                $dbBuffer = $zip->getFromIndex($i);
                            } elseif ($base === 'ux_analytics.sqlite') {
                                $analyticsBuffer = $zip->getFromIndex($i);
                            }
                        }
                        if ($configBuffer === null && $dbBuffer === null && $analyticsBuffer === null) {
                            $message = ux_t('import_missing_files', 'خطا: فایل بک‌آپ شامل فایل‌های مورد نیاز نیست.');
                            $zip->close();
                        } else {
                            try {
                                // بازیابی کانفیگ
                                if ($configBuffer !== null) {
                                    $configDest = __DIR__ . '/ux_config.php';
                                    @file_put_contents($configDest, $configBuffer);
                                }
                                // بازیابی پایگاه اصلی
                                if ($dbBuffer !== null) {
                                    $dbDest = function_exists('ux_storage_db_path') ? ux_storage_db_path() : (__DIR__ . '/ux_campaign.sqlite');
                                    @file_put_contents($dbDest, $dbBuffer);
                                }
                                // بازیابی پایگاه آنالیتیکس
                                if ($analyticsBuffer !== null) {
                                    $anDest = function_exists('ux_storage_analytics_db_path') ? ux_storage_analytics_db_path() : (__DIR__ . '/ux_analytics.sqlite');
                                    @file_put_contents($anDest, $analyticsBuffer);
                                }
                                $zip->close();
                                // پاکسازی پیام و ریدایرکت برای نمایش پیام موفقیت
                                $_SESSION['ux_flash_message'] = ux_t('import_success', 'بک‌آپ با موفقیت ایمپورت شد.');
                                ux_panel_redirect();
                            } catch (Throwable $e) {
                                $zip->close();
                                $message = ux_t('import_failed', 'خطا در ایمپورت بک‌آپ:') . ' ' . $e->getMessage();
                            }
                        }
                    }
                }
            }
        }
    }

    // ذخیره تنظیمات
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['ux_action'] ?? '') === 'save_settings') {
        if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
            $message = ux_t('error_invalid_token', 'خطا: توکن امنیتی نامعتبر است.');
        } else {
            $cfg = $config;

            $cfg['enabled']          = !empty($_POST['enabled']);
            $cfg['mode']             = in_array($_POST['mode'] ?? 'maintenance', ['maintenance','whitelist','queue','smart_queue'], true) ? $_POST['mode'] : 'maintenance';
            $cfg['wp_index']         = trim($_POST['wp_index'] ?? 'index-wp.php');
            $cfg['timezone']         = trim($_POST['timezone'] ?? 'Asia/Tehran');
            $cfg['max_active_users'] = max(1, (int)($_POST['max_active_users'] ?? 200));

            // ---- Redis settings ----
            // Save Redis connection details from the settings form. These settings
            // determine whether sessions and queue data are stored in Redis or
            // fallback to SQLite. If redis_enabled is not checked, the other
            // parameters will be ignored. Values from previous configuration
            // are used as defaults when form fields are left blank.
            $cfg['redis_enabled']  = !empty($_POST['redis_enabled']);
            // Hostname or IP of the Redis server
            $cfg['redis_host']     = trim($_POST['redis_host'] ?? ($cfg['redis_host'] ?? '127.0.0.1'));
            // Port number for Redis
            $cfg['redis_port']     = (int)($_POST['redis_port'] ?? ($cfg['redis_port'] ?? 6379));
            // Redis database index (0–15)
            $cfg['redis_db']       = (int)($_POST['redis_db'] ?? ($cfg['redis_db'] ?? 0));
            // Password for authenticating with Redis (can be empty)
            $cfg['redis_password'] = trim($_POST['redis_password'] ?? ($cfg['redis_password'] ?? ''));

            // مشخصات سرور
            $cfg['server_cpu_cores']    = max(1, (int)($_POST['server_cpu_cores'] ?? ($cfg['server_cpu_cores'] ?? 4)));
            $cfg['server_cpu_threads']  = max(1, (int)($_POST['server_cpu_threads'] ?? ($cfg['server_cpu_threads'] ?? 8)));
            $cfg['server_cpu_freq_ghz'] = (float)($_POST['server_cpu_freq_ghz'] ?? ($cfg['server_cpu_freq_ghz'] ?? 3.20));
            $cfg['server_cpu_model']    = trim($_POST['server_cpu_model'] ?? ($cfg['server_cpu_model'] ?? ''));
            $cfg['server_ram_gb']       = max(1, (int)($_POST['server_ram_gb'] ?? ($cfg['server_ram_gb'] ?? 1)));

            // ---- Analytics caching and precompute settings ----
            // Cache TTL in seconds.  Minimum value is 1 second.  A higher value
            // reduces database load but may cause slightly stale analytics to be displayed.
            $cfg['analytics_cache_ttl'] = max(1, (int)($_POST['analytics_cache_ttl'] ?? ($cfg['analytics_cache_ttl'] ?? 60)));
            // Whether to include full error lists in the cached analytics payload.  When
            // enabled, the complete list of 4xx and 5xx URLs is stored in Redis.
            $cfg['analytics_cache_include_lists'] = !empty($_POST['analytics_cache_include_lists']);
            // Enable or disable precompute of analytics in the background.
            $cfg['analytics_precompute_enabled'] = !empty($_POST['analytics_precompute_enabled']);
            // Interval in seconds between successive precompute runs.  Must be >=1.
            $cfg['analytics_precompute_interval'] = max(1, (int)($_POST['analytics_precompute_interval'] ?? ($cfg['analytics_precompute_interval'] ?? 60)));
            $cfg['server_disk_gb']      = max(1, (int)($_POST['server_disk_gb'] ?? ($cfg['server_disk_gb'] ?? 1)));


            // زمان بیکاری کاربر در صف (دقیقه → ثانیه)
            $idle_min_post = (int)($_POST['session_lifetime'] ?? 2);
            if ($idle_min_post < 1) $idle_min_post = 1;
            $cfg['session_lifetime'] = $idle_min_post * 60;
            // Poll interval for live stats (milliseconds). Minimum 500ms to avoid flooding the server.
            $poll_interval_ms = (int)($_POST['live_poll_interval_ms'] ?? ($config['live_poll_interval_ms'] ?? 3000));
            if ($poll_interval_ms < 500) {
                $poll_interval_ms = 500;
            }
            $cfg['live_poll_interval_ms'] = $poll_interval_ms;

            // ---------- ذخیره تنظیمات صف هوشمند ----------
            // اهداف مصرف CPU، حافظه و دیسک (بین 1 تا 100)
            $cpu_target_post  = (float)($_POST['smart_target_cpu']  ?? ($cfg['smart_target_cpu']  ?? 75));
            $mem_target_post  = (float)($_POST['smart_target_mem']  ?? ($cfg['smart_target_mem']  ?? 80));
            $disk_target_post = (float)($_POST['smart_target_disk'] ?? ($cfg['smart_target_disk'] ?? 70));
            // محدود کردن به بازه 1 تا 100
            $cpu_target_post  = max(1, min(100, $cpu_target_post));
            $mem_target_post  = max(1, min(100, $mem_target_post));
            $disk_target_post = max(1, min(100, $disk_target_post));
            $cfg['smart_target_cpu']  = $cpu_target_post;
            $cfg['smart_target_mem']  = $mem_target_post;
            $cfg['smart_target_disk'] = $disk_target_post;

            // حداکثر اتصالات به ازای هر کاربر فعال
            $conn_max_post = (float)($_POST['smart_max_conn_per_user'] ?? ($cfg['smart_max_conn_per_user'] ?? 3));
            if ($conn_max_post < 1) { $conn_max_post = 1; }
            $cfg['smart_max_conn_per_user'] = $conn_max_post;

            // فعال سازی پیش‌بینی مصرف
            $cfg['smart_prediction_enabled'] = !empty($_POST['smart_prediction_enabled']);
            // ضریب یادگیری alpha
            $alpha_post = isset($_POST['smart_prediction_alpha']) ? (float)$_POST['smart_prediction_alpha'] : ($cfg['smart_prediction_alpha'] ?? 0.5);
            if ($alpha_post < 0.01) { $alpha_post = 0.01; }
            if ($alpha_post > 1.0) { $alpha_post = 1.0; }
            $cfg['smart_prediction_alpha'] = $alpha_post;

            // ذخیره گزینه ثبت تصمیم بدون تغییر ظرفیت
            $cfg['smart_log_no_change'] = !empty($_POST['smart_log_no_change']);

            // فاصله بازمحاسبه ظرفیت صف هوشمند
            $intv = (int)($_POST['smart_update_interval_seconds'] ?? ($cfg['smart_update_interval_seconds'] ?? 10));
            if ($intv < 1) { $intv = 10; }
            if ($intv > 60) { $intv = 60; }
            $cfg['smart_update_interval_seconds'] = $intv;

            // ---------- Latency-based smart settings ----------
            $cfg['latency_smart_enabled']  = !empty($_POST['latency_smart_enabled']);
            $cfg['latency_record_enabled'] = !empty($_POST['latency_record_enabled']);

            $win = (int)($_POST['latency_window_seconds'] ?? ($cfg['latency_window_seconds'] ?? 60));
            if ($win < 30) { $win = 30; }
            if ($win > 600) { $win = 600; }
            $cfg['latency_window_seconds'] = $win;

            $rate = (float)($_POST['latency_sample_rate'] ?? ($cfg['latency_sample_rate'] ?? 0.05));
            if ($rate < 0) { $rate = 0; }
            if ($rate > 1) { $rate = 1; }
            $cfg['latency_sample_rate'] = $rate;

            $minS = (int)($_POST['latency_min_samples'] ?? ($cfg['latency_min_samples'] ?? 30));
            if ($minS < 5) { $minS = 5; }
            if ($minS > 5000) { $minS = 5000; }
            $cfg['latency_min_samples'] = $minS;

            $tgt = (int)($_POST['latency_p95_target_ms'] ?? ($cfg['latency_p95_target_ms'] ?? 900));
            if ($tgt < 50) { $tgt = 50; }
            if ($tgt > 60000) { $tgt = 60000; }
            $cfg['latency_p95_target_ms'] = $tgt;

            $hard = (int)($_POST['latency_p95_hard_ms'] ?? ($cfg['latency_p95_hard_ms'] ?? 2500));
            if ($hard < $tgt) { $hard = $tgt; }
            if ($hard > 120000) { $hard = 120000; }
            $cfg['latency_p95_hard_ms'] = $hard;

            $err = (float)($_POST['latency_err_rate_high_pct'] ?? ($cfg['latency_err_rate_high_pct'] ?? 2.0));
            if ($err < 0) { $err = 0; }
            if ($err > 100) { $err = 100; }
            $cfg['latency_err_rate_high_pct'] = $err;


            // ماژول‌های صف هوشمند
            $cfg['smart_modules_auto_enable'] = !empty($_POST['smart_modules_auto_enable']);

            $enabledCsv = trim((string)($_POST['smart_modules_enabled_csv'] ?? ''));
            $disabledCsv = trim((string)($_POST['smart_modules_disabled_csv'] ?? ''));
            $parseCsv = function(string $csv): array {
                if ($csv === '') return [];
                $parts = preg_split('/[\s,]+/u', $csv, -1, PREG_SPLIT_NO_EMPTY);
                $out = [];
                if (is_array($parts)) {
                    foreach ($parts as $p) {
                        $p = trim((string)$p);
                        if ($p !== '') $out[] = $p;
                    }
                }
                return array_values(array_unique($out));
            };
            $cfg['smart_modules_enabled'] = $parseCsv($enabledCsv);
            $cfg['smart_modules_disabled'] = $parseCsv($disabledCsv);

            $cfg['page_cache_ttl']   = max(0, (int)($_POST['page_cache_ttl'] ?? ($config['page_cache_ttl'] ?? 15)));

            $cfg['page_title']       = trim($_POST['page_title'] ?? '');
            $cfg['page_subtitle']    = trim($_POST['page_subtitle'] ?? '');
            // اگر فیلدی به اسم media_url در فرم وجود داشت، از همان استفاده کن
            // در غیر این صورت مقدار قبلی را نگه می‌داریم (برای حالتی که فقط آپلود داریم)
            if (array_key_exists('media_url', $_POST)) {
                $cfg['media_url'] = trim($_POST['media_url']);
            } else {
                $cfg['media_url'] = $config['media_url'] ?? '';
            }
            // عرض تصویر روی دسکتاپ و موبایل (درصد)
            $mw_desktop = (int)($_POST['media_width_desktop'] ?? 60);
            $mw_mobile  = (int)($_POST['media_width_mobile'] ?? 90);

            // محدود کردن به بازه منطقی ۱۰ تا ۱۰۰ درصد
            if ($mw_desktop < 10) $mw_desktop = 10;
            if ($mw_desktop > 100) $mw_desktop = 100;
            if ($mw_mobile < 10)  $mw_mobile  = 10;
            if ($mw_mobile > 100) $mw_mobile  = 100;

            $cfg['media_width_desktop'] = $mw_desktop;
            $cfg['media_width_mobile']  = $mw_mobile;

            // تراز تصویر
            $align = $_POST['media_align'] ?? 'center';
            if (!in_array($align, ['left','center','right'], true)) {
                $align = 'center';
            }
            $cfg['media_align'] = $align;

            // اگر ادمین فایلی انتخاب کرده باشد، آن را در پوشه‌ی مخصوص ذخیره می‌کنیم
            if (!empty($_FILES['media_upload']['tmp_name']) && is_uploaded_file($_FILES['media_upload']['tmp_name'])) {
                $uploadError = $_FILES['media_upload']['error'] ?? UPLOAD_ERR_OK;

                if ($uploadError === UPLOAD_ERR_OK) {
                    // حداکثر ۸ مگابایت
                    $maxSize = 8 * 1024 * 1024;
                    if (($_FILES['media_upload']['size'] ?? 0) <= $maxSize) {

                        $ext = strtolower(pathinfo($_FILES['media_upload']['name'], PATHINFO_EXTENSION));
                        $allowed = ['jpg','jpeg','png','gif','webp'];

                        if (in_array($ext, $allowed, true)) {
                            // مسیر پوشه‌ی ذخیره‌سازی در خود گیت‌وی
                            $uploadRoot = __DIR__ . '/assets/uploads';
                            if (!is_dir($uploadRoot)) {
                                @mkdir($uploadRoot, 0755, true);
                            }

                            if (is_dir($uploadRoot) && is_writable($uploadRoot)) {
                                $basename   = 'media_' . date('Ymd_His') . '_' . mt_rand(1000, 9999) . '.' . $ext;
                                $targetPath = $uploadRoot . '/' . $basename;

                                if (@move_uploaded_file($_FILES['media_upload']['tmp_name'], $targetPath)) {
                                    // ساختن URL عمومی بر اساس دامنه‌ی فعلی و مسیر gateway.php
                                    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                                    $host   = $_SERVER['HTTP_HOST'] ?? '';
                                    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/'); // مثل /unixsee_campaign_gateway
                                    $publicPath = $scriptDir . '/assets/uploads/' . $basename;

                                    $cfg['media_url'] = $host !== ''
                                        ? $scheme . '://' . $host . $publicPath
                                        : $publicPath;
                                }
                            }
                        }
                    }
                }
            }

            $cfg['primary_color']    = trim($_POST['primary_color'] ?? '#ff6a00');
            $cfg['bg_color']         = trim($_POST['bg_color'] ?? '#050816');
            $cfg['primary_color']    = trim($_POST['primary_color'] ?? '#ff6a00');
            $cfg['bg_color']         = trim($_POST['bg_color'] ?? '#050816');
            $cfg['theme_css_url']    = trim($_POST['theme_css_url'] ?? '');
            $cfg['body_font_family'] = trim($_POST['body_font_family'] ?? '');
            $cfg['persian_font_file'] = trim($_POST['persian_font_file'] ?? '');
            $cfg['title_font_size']  = trim($_POST['title_font_size'] ?? '22px');
            $cfg['subtitle_font_size'] = trim($_POST['subtitle_font_size'] ?? '14px');

            // تنظیمات تصویر / GIF
            $cfg['media_width']    = trim($_POST['media_width'] ?? '100%');
            $cfg['media_align']    = in_array($_POST['media_align'] ?? 'center', ['center','right','left'], true)
                                      ? $_POST['media_align']
                                      : 'center';
            $cfg['media_bg_color'] = trim($_POST['media_bg_color'] ?? '');
            $cfg['media_radius']   = trim($_POST['media_radius'] ?? '20px');

            // افکت‌های گرافیکی
            $cfg['enable_glow'] = !empty($_POST['enable_glow']);
            $cfg['glow_color']  = trim($_POST['glow_color'] ?? $cfg['primary_color']);
            $shadow_style_post  = $_POST['shadow_style'] ?? 'trend-soft';
            $allowed_shadow_styles = ['none','trend-soft','trend-deep','soft-float'];
            $cfg['shadow_style'] = in_array($shadow_style_post, $allowed_shadow_styles, true)
                ? $shadow_style_post
                : 'trend-soft';

            $cfg['show_countdown']   = !empty($_POST['show_countdown']);
            $cfg['countdown_target'] = trim($_POST['countdown_target'] ?? '');

            // تنظیمات رفرش خودکار و دکمه بررسی
            $cfg['auto_retry_enabled']   = !empty($_POST['auto_retry_enabled']);
            $cfg['auto_retry_interval']  = max(10, (int)($_POST['auto_retry_interval'] ?? 30)); // حداقل ۱۰ ثانیه
            $cfg['retry_button_enabled'] = !empty($_POST['retry_button_enabled']);
            $cfg['retry_button_text']    = trim($_POST['retry_button_text'] ?? '🔄 بررسی وضعیت ورود');

            $cfg['admin_username']   = trim($_POST['admin_username'] ?? $config['admin_username']);
            $new_pass                = trim($_POST['admin_password'] ?? '');
            if ($new_pass !== '') {
                // ذخیره رمز پنل؛ اگر رمز جدید وارد شده باشد آن را ذخیره می‌کنیم
                // برای امنیت بیشتر می‌توان از password_hash استفاده کرد. در صورتی که
                // رمز فعلی هش شده باشد، مقدار جدید نیز هش می‌شود.
                if (preg_match('/^\$2[aby]\$/', (string)$new_pass)) {
                    // اگر کاربر از قبل هش را وارد کرده باشد، مستقیم ذخیره می‌شود
                    $cfg['admin_password'] = $new_pass;
                } else {
                    // هش کردن رمز جدید با bcrypt
                    $cfg['admin_password'] = password_hash($new_pass, PASSWORD_DEFAULT);
                }
            }

            // به‌روزرسانی محدودیت تلاش لاگین و زمان قفل
            $cfg['max_login_attempts'] = max(1, (int)($_POST['max_login_attempts'] ?? ($config['max_login_attempts'] ?? 5)));
            $cfg['lock_minutes']       = max(1, (int)($_POST['lock_minutes']       ?? ($config['lock_minutes']       ?? 15)));

            // تنظیمات نگهداری تاریخچه و تصمیم‌ها
            // حداقل ۳۰ روز برای جلوگیری از پاک شدن ناخواسته داده‌ها
            $historyDays  = (int)($_POST['smart_history_retention_days']  ?? ($config['smart_history_retention_days']  ?? 90));
            $decisionDays = (int)($_POST['smart_decisions_retention_days'] ?? ($config['smart_decisions_retention_days'] ?? 90));
            if ($historyDays < 30) {
                $historyDays = 30;
            }
            if ($decisionDays < 30) {
                $decisionDays = 30;
            }
            $cfg['smart_history_retention_days']   = $historyDays;
            $cfg['smart_decisions_retention_days'] = $decisionDays;

            $always_ips_raw  = trim($_POST['always_allow_ips'] ?? '');
            $allowed_ips_raw = trim($_POST['allowed_ips'] ?? '');
            $bypass_paths_raw= trim($_POST['bypass_paths'] ?? '');
            $include_paths_raw = trim($_POST['include_paths'] ?? '');

            $cfg['always_allow_ips'] = array_filter(array_map('trim', preg_split('/\R+/', $always_ips_raw)), 'strlen');
            $cfg['allowed_ips']      = array_filter(array_map('trim', preg_split('/\R+/', $allowed_ips_raw)), 'strlen');
            $cfg['bypass_paths']     = array_filter(array_map('trim', preg_split('/\R+/', $bypass_paths_raw)), 'strlen');

            $scope_post   = $_POST['gateway_scope'] ?? ($config['gateway_scope'] ?? 'site');
            $allowed_scopes = ['site','include_paths'];
            $cfg['gateway_scope'] = in_array($scope_post, $allowed_scopes, true) ? $scope_post : 'site';
            $cfg['include_paths'] = array_filter(array_map('trim', preg_split('/\R+/', $include_paths_raw)), 'strlen');

            $cfg['panel_token'] = trim($_POST['panel_token'] ?? $config['panel_token']);

            $cfg['custom_html']   = $_POST['custom_html'] ?? '';
            $cfg['brand_tagline'] = trim($_POST['brand_tagline'] ?? ($config['brand_tagline'] ?? ''));
            $cfg['footer_text']   = trim($_POST['footer_text']   ?? ($config['footer_text']   ?? ''));

            $theme_mode = $_POST['theme_mode'] ?? 'glass';
            $cfg['theme_mode'] = in_array($theme_mode, ['dark','light','glass','blackfriday'], true) ? $theme_mode : 'glass';

            
            // تنظیمات مربوط به SEO و ربات‌های موتور جستجو
            $cfg['allow_search_bots'] = !empty($_POST['allow_search_bots']);

            $bot_agents_raw = trim($_POST['bot_user_agents'] ?? '');
            if ($bot_agents_raw === '') {
                // اگر خالی بود، از مقدار فعلی یا پیش‌فرض استفاده می‌کنیم
                $default_cfg = ux_default_config();
                $cfg['bot_user_agents'] = $config['bot_user_agents'] ?? $default_cfg['bot_user_agents'];
            } else {
                $cfg['bot_user_agents'] = array_filter(
                    array_map('trim', preg_split('/\R+/', $bot_agents_raw)),
                    'strlen'
                );
            }

            $allow_rules_raw = trim($_POST['bot_allow_rules'] ?? '');
            if ($allow_rules_raw === '') {
                $cfg['bot_allow_rules'] = [];
            } else {
                $cfg['bot_allow_rules'] = array_filter(
                    array_map('trim', preg_split('/\R+/', $allow_rules_raw)),
                    'strlen'
                );
            }

            $deny_rules_raw = trim($_POST['bot_deny_rules'] ?? '');
            if ($deny_rules_raw === '') {
                $cfg['bot_deny_rules'] = [];
            } else {
                $cfg['bot_deny_rules'] = array_filter(
                    array_map('trim', preg_split('/\R+/', $deny_rules_raw)),
                    'strlen'
                );
            }

            $cfg['gateway_indexable'] = !empty($_POST['gateway_indexable']);

            // ------------------------------
            // Bot Intelligence (Scoring + DNS validation)
            // ------------------------------
            $cfg['bot_scoring_enabled'] = !empty($_POST['bot_scoring_enabled']);
            $cfg['bot_scoring_use_redis'] = !empty($_POST['bot_scoring_use_redis']);
            $cfg['bot_scoring_log_level'] = (int)($_POST['bot_scoring_log_level'] ?? ($config['bot_scoring_log_level'] ?? 1));
            if ($cfg['bot_scoring_log_level'] < 0) {
                $cfg['bot_scoring_log_level'] = 0;
            }
            if ($cfg['bot_scoring_log_level'] > 2) {
                $cfg['bot_scoring_log_level'] = 2;
            }

            $badActionPost = $_POST['bot_bad_action'] ?? ($config['bot_bad_action'] ?? 'block');
            $cfg['bot_bad_action'] = in_array($badActionPost, ['block','queue'], true) ? $badActionPost : 'block';

            $cfg['bot_score_initial'] = (int)($_POST['bot_score_initial'] ?? ($config['bot_score_initial'] ?? 50));
            $cfg['bot_score_good_threshold'] = (int)($_POST['bot_score_good_threshold'] ?? ($config['bot_score_good_threshold'] ?? 80));
            $cfg['bot_score_bad_threshold'] = (int)($_POST['bot_score_bad_threshold'] ?? ($config['bot_score_bad_threshold'] ?? 25));

            // Sanity clamp
            $cfg['bot_score_initial'] = max(0, min(100, $cfg['bot_score_initial']));
            $cfg['bot_score_good_threshold'] = max(0, min(100, $cfg['bot_score_good_threshold']));
            $cfg['bot_score_bad_threshold'] = max(0, min(100, $cfg['bot_score_bad_threshold']));

            $cfg['bot_score_fast_path'] = isset($_POST['bot_score_fast_path']);

            $cfg['bot_score_no_js_penalty'] = (int)($_POST['bot_score_no_js_penalty'] ?? ($config['bot_score_no_js_penalty'] ?? 0));
            if ($cfg['bot_score_no_js_penalty'] < 0) { $cfg['bot_score_no_js_penalty'] = 0; }
            if ($cfg['bot_score_no_js_penalty'] > 100) { $cfg['bot_score_no_js_penalty'] = 100; }

            $cfg['bot_score_suspicious_ua_penalty'] = (int)($_POST['bot_score_suspicious_ua_penalty'] ?? ($config['bot_score_suspicious_ua_penalty'] ?? 25));
            if ($cfg['bot_score_suspicious_ua_penalty'] < 0) { $cfg['bot_score_suspicious_ua_penalty'] = 0; }
            if ($cfg['bot_score_suspicious_ua_penalty'] > 100) { $cfg['bot_score_suspicious_ua_penalty'] = 100; }

            $hardBadTh = (int)($_POST['bot_score_hard_bad_threshold'] ?? ($config['bot_score_hard_bad_threshold'] ?? 0));
            $hardBadTh = max(0, min(100, $hardBadTh));
            // Keep hard threshold <= bad threshold (semantic: "worse than bad")
            if ($hardBadTh > (int)$cfg['bot_score_bad_threshold']) {
                $hardBadTh = (int)$cfg['bot_score_bad_threshold'];
            }
            $cfg['bot_score_hard_bad_threshold'] = $hardBadTh;

            // Decay half life (seconds)
            $cfg['bot_score_decay_half_life_seconds'] = max(60, (int)($_POST['bot_score_decay_half_life_seconds'] ?? ($config['bot_score_decay_half_life_seconds'] ?? 3600)));

            // Rate model (UI: window/max) -> internal EWMA knobs
            $cfg['bot_score_rate_enabled'] = isset($_POST['bot_score_rate_enabled']);

            $rateWinPost = (float)($_POST['bot_score_rate_window'] ?? ($config['bot_score_rate_window'] ?? ($config['bot_rate_half_life_seconds'] ?? 10.0)));
            if ($rateWinPost < 1) { $rateWinPost = 1; }
            if ($rateWinPost > 600) { $rateWinPost = 600; }
            $cfg['bot_score_rate_window'] = (int)round($rateWinPost);
            $cfg['bot_rate_half_life_seconds'] = $rateWinPost;

            $rateMaxPost = (float)($_POST['bot_score_rate_max'] ?? ($config['bot_score_rate_max'] ?? ($config['bot_score_rate_threshold'] ?? 120)));
            if ($rateMaxPost < 10) { $rateMaxPost = 10; }
            $cfg['bot_score_rate_max'] = (int)round($rateMaxPost);
            $cfg['bot_score_rate_threshold'] = $rateMaxPost;
$cfg['bot_cookie_enabled'] = !empty($_POST['bot_cookie_enabled']);
            $cookieName = trim((string)($_POST['bot_cookie_name'] ?? ($config['bot_cookie_name'] ?? 'ux_bm')));
            if ($cookieName === '') {
                $cookieName = 'ux_bm';
            }
            // cookie name should be safe ASCII
            $cookieName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $cookieName);
            $cfg['bot_cookie_name'] = $cookieName;
            // Cookie TTL (seconds): allow 0 (= session cookie) and clamp to a sane upper bound
            $ttlPost = (int)($_POST['bot_cookie_ttl_seconds'] ?? ($config['bot_cookie_ttl_seconds'] ?? 7200));
            if ($ttlPost < 0) {
                $ttlPost = 0;
            }
            // Avoid accidental multi-year TTLs (roughly 1 year)
            if ($ttlPost > 31536000) {
                $ttlPost = 31536000;
            }
            $cfg['bot_cookie_ttl_seconds'] = $ttlPost;
            $cfg['bot_cookie_weight'] = (float)($_POST['bot_cookie_weight'] ?? ($config['bot_cookie_weight'] ?? 0.25));
            if ($cfg['bot_cookie_weight'] < 0) {
                $cfg['bot_cookie_weight'] = 0;
            }
            if ($cfg['bot_cookie_weight'] > 0.6) {
                $cfg['bot_cookie_weight'] = 0.6;
            }

// Penalize clients that do not retain cookies (optional)
            $cfg['bot_score_missing_cookie_penalty'] = (int)($_POST['bot_score_missing_cookie_penalty'] ?? ($config['bot_score_missing_cookie_penalty'] ?? 0));
            if ($cfg['bot_score_missing_cookie_penalty'] < 0) { $cfg['bot_score_missing_cookie_penalty'] = 0; }
            if ($cfg['bot_score_missing_cookie_penalty'] > 100) { $cfg['bot_score_missing_cookie_penalty'] = 100; }

            // DNS validation
            $cfg['bot_dns_validation_enabled'] = !empty($_POST['bot_dns_validation_enabled']);
            $dnsModePost = $_POST['bot_dns_validation_mode'] ?? ($config['bot_dns_validation_mode'] ?? 'balanced');
            $cfg['bot_dns_validation_mode'] = in_array($dnsModePost, ['off','balanced','strict'], true) ? $dnsModePost : 'balanced';
            $cfg['bot_dns_cache_ttl_seconds'] = max(300, (int)($_POST['bot_dns_cache_ttl_seconds'] ?? ($config['bot_dns_cache_ttl_seconds'] ?? 21600)));

            // Suspicious UA patterns
            $suspRaw = trim((string)($_POST['bot_score_suspicious_uas'] ?? ''));
            if ($suspRaw === '') {
                // Allow admin to clear the list (do not auto-restore defaults)
                $cfg['bot_score_suspicious_uas'] = [];
            } else {
                $cfg['bot_score_suspicious_uas'] = array_values(array_filter(
                    array_map('trim', preg_split('/\R+/', $suspRaw)),
                    'strlen'
                ));
            }


            // Auto-Block (Strikes-based) settings
            $cfg['auto_block_enabled'] = isset($_POST['auto_block_enabled']);
            $cfg['auto_block_mode'] = (int)($_POST['auto_block_mode'] ?? 2);
            if ($cfg['auto_block_mode'] < 1 || $cfg['auto_block_mode'] > 3) { $cfg['auto_block_mode'] = 2; }

            $cfg['auto_block_target'] = (string)($_POST['auto_block_target'] ?? 'ip');
            if (!in_array($cfg['auto_block_target'], ['ip','ua'], true)) { $cfg['auto_block_target'] = 'ip'; }

            $cfg['auto_block_strikes'] = max(2, (int)($_POST['auto_block_strikes'] ?? 5));
            $cfg['auto_block_window_seconds'] = max(60, (int)($_POST['auto_block_window_seconds'] ?? 600));
            $cfg['auto_block_ttl_seconds'] = max(60, (int)($_POST['auto_block_ttl_seconds'] ?? 3600));

            $ttl1 = max(60, (int)($_POST['auto_block_escalation_1'] ?? 3600));
            $ttl2 = max(60, (int)($_POST['auto_block_escalation_2'] ?? 21600));
            $ttl3 = max(60, (int)($_POST['auto_block_escalation_3'] ?? 86400));
            $cfg['auto_block_escalation_ladder_seconds'] = [$ttl1, $ttl2, $ttl3];

            $cfg['auto_block_exempt_verified_bots'] = isset($_POST['auto_block_exempt_verified_bots']);

            // UA / Traffic Intelligence settings
            $cfg['ua_bank_enabled'] = isset($_POST['ua_bank_enabled']);
            $cfg['traffic_intel_enabled'] = isset($_POST['traffic_intel_enabled']);
            $cfg['traffic_intel_net_sample_interval'] = max(1, (int)($_POST['traffic_intel_net_sample_interval'] ?? 5));
            $cfg['traffic_intel_interface'] = trim((string)($_POST['traffic_intel_interface'] ?? ''));
            $cfg['traffic_intel_chart_minutes'] = max(10, (int)($_POST['traffic_intel_chart_minutes'] ?? 120));

            // Preserve blocked IPs from existing configuration so they are not lost on save
            if (isset($config['blocked_ips']) && is_array($config['blocked_ips'])) {
                $cfg['blocked_ips'] = $config['blocked_ips'];
            }

            ux_save_config($config_file, $cfg);
            ux_clear_page_cache();
        $_SESSION['ux_flash_message'] = ux_t('message_settings_saved', 'تنظیمات با موفقیت ذخیره شد.');
            ux_panel_redirect();
        }
    }

    $config = ux_load_config($config_file);
    $csrf   = $_SESSION['ux_csrf'];
    $is_enabled = !empty($config['enabled']);
    $mode_label = [
        'maintenance' => 'Maintenance / صفحه کمپین',
        'whitelist'   => 'Whitelist (فقط آی‌پی‌های مجاز)',
        'queue'       => 'صف انتظار (محدودیت کاربران همزمان)',
        'smart_queue' => 'صف هوشمند (بر اساس لود سرور)'
    ][$config['mode'] ?? 'maintenance'] ?? 'Maintenance';

    $idle_minutes = max(1, (int)round(($config['session_lifetime'] ?? 120) / 60));

// فونت فارسی انتخاب‌شده برای پنل ادمین
$fonts_dir = __DIR__ . '/assets/fonts';
$persian_font_file = $config['persian_font_file'] ?? '';
if (!is_string($persian_font_file)) {
    $persian_font_file = '';
}
if ($persian_font_file !== '' && !is_file($fonts_dir . '/' . $persian_font_file)) {
    $persian_font_file = '';
}
// پیش‌فرض: تلاش برای استفاده از Estedad
if ($persian_font_file === '') {
    foreach (['Estedad-VF.woff2', 'Estedad-VF.woff', 'kalameh-regular.woff2', 'kalameh-regular.woff', 'kalameh-regular.ttf'] as $candidate) {
        if (is_file($fonts_dir . '/' . $candidate)) {
            $persian_font_file = $candidate;
            break;
        }
    }
}

$persian_font_src = '';
$persian_font_format = '';
if ($persian_font_file !== '') {
    $ext = strtolower(pathinfo($persian_font_file, PATHINFO_EXTENSION));
    if ($ext === 'ttf') {
        $persian_font_format = 'truetype';
    } elseif ($ext === 'otf') {
        $persian_font_format = 'opentype';
    } elseif (in_array($ext, ['woff','woff2','eot'], true)) {
        $persian_font_format = $ext;
    }
    $persian_font_src = $persian_font_file;
}

    ?>

    <!doctype html>
    <html lang="<?php echo htmlspecialchars($GLOBALS['ux_lang'] ?? 'fa', ENT_QUOTES, 'UTF-8'); ?>"
          dir="<?php echo ux_is_rtl_lang($GLOBALS['ux_lang'] ?? 'fa') ? 'rtl' : 'ltr'; ?>">
    <head>
        <meta charset="UTF-8">
        <title><?php echo htmlspecialchars(ux_t('panel_brand', 'Unixsee Campaign Gateway'), ENT_QUOTES, 'UTF-8'); ?></title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <?php
            $ux_cfg_ver = @filemtime($config_file) ?: time();
            $ux_css_ver = @filemtime(__DIR__ . '/assets/css/ux-admin-panel.css') ?: $ux_cfg_ver;
        ?>
        <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/css/ux-fonts.css.php?v=' . $ux_cfg_ver, ENT_QUOTES, 'UTF-8'); ?>">
        <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/css/ux-admin-panel.css?v=' . $ux_css_ver, ENT_QUOTES, 'UTF-8'); ?>">
        <!-- Load Chart.js locally (no external CDN) -->
        <script src="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/vendor/chartjs/chart.umd.min.js', ENT_QUOTES, 'UTF-8'); ?>"></script>
    </head>
    <body>
    <?php
// محاسبه تعداد کاربران فعال الان
$ux_live_sessions = ux_get_active_sessions();
$ux_config = $config;
// فرض می‌کنیم $ux_live_sessions آرایه‌ی سشن‌های فعاله؛
// اگه نبود یا خالی بود، صفر در نظر می‌گیریم.
$active_count = (isset($ux_live_sessions) && is_array($ux_live_sessions))
    ? count($ux_live_sessions)
    : 0;

// حداکثر کاربران مجاز، از تنظیمات (اگه تعریف شده باشه)
$max_active_cfg = isset($ux_config['max_active_users'])
    ? (int)$ux_config['max_active_users']
    : 0;

// مسیر لوگوی گیف تیم (اگر فایل logo.gif در پوشه assets موجود باشد)
$logo_path = is_file(__DIR__ . '/assets/logo.gif') ? 'assets/logo.gif' : '';
?>

    <div class="ux-shell">
        <!-- Anchor for monitoring section; clicking the "Monitoring" menu will scroll here -->
        <div id="sec-monitoring"></div>
        <div class="ux-header">
            <?php
            // Build language switch links while preserving existing GET parameters (e.g., ux_panel)
            $qsBase = $_GET;
            unset($qsBase['ux_lang']);

            $qsFa = http_build_query($qsBase + ['ux_lang' => 'fa']);
            $qsEn = http_build_query($qsBase + ['ux_lang' => 'en']);

            $curLang = $GLOBALS['ux_lang'] ?? 'fa';
            ?>
            <div class="ux-lang-switch">
                <a href="?<?php echo htmlspecialchars($qsFa, ENT_QUOTES, 'UTF-8'); ?>"
                   class="<?php echo $curLang === 'fa' ? 'active' : ''; ?>">
                    <?php echo htmlspecialchars(ux_t('lang_fa'), ENT_QUOTES, 'UTF-8'); ?>
                </a>
                <span>|</span>
                <a href="?<?php echo htmlspecialchars($qsEn, ENT_QUOTES, 'UTF-8'); ?>"
                   class="<?php echo $curLang === 'en' ? 'active' : ''; ?>">
                    <?php echo htmlspecialchars(ux_t('lang_en'), ENT_QUOTES, 'UTF-8'); ?>
                </a>
            </div>
        </div>

        <div class="ux-main-card">
            <div class="ux-pills">
                <div class="ux-pill <?php echo $is_enabled ? 'on' : 'off'; ?>">
                    <?php echo htmlspecialchars(ux_t('gateway_status_label', 'Gateway status:'), ENT_QUOTES, 'UTF-8'); ?>
                    <?php echo $is_enabled
                        ? htmlspecialchars(ux_t('status_enabled', 'Enabled'), ENT_QUOTES, 'UTF-8')
                        : htmlspecialchars(ux_t('status_disabled', 'Disabled'), ENT_QUOTES, 'UTF-8'); ?>
                </div>
                <div class="ux-pill">
                    <?php echo htmlspecialchars(ux_t('current_mode_label', 'Current mode:'), ENT_QUOTES, 'UTF-8'); ?>
                    <?php
                        $modeKey = $config['mode'] ?? 'maintenance';
                        // Use previously computed $mode_label as fallback if translation not found
                        echo htmlspecialchars(ux_t('mode_' . $modeKey, $mode_label), ENT_QUOTES, 'UTF-8');
                    ?>
                </div>
                <div class="ux-pill">
                    <?php echo htmlspecialchars(ux_t('active_now_label', 'کاربران فعال الان:'), ENT_QUOTES, 'UTF-8'); ?>
                    <span id="ux-header-active-count"><?php echo (int)$active_count; ?></span>
                    <?php if ($max_active_cfg > 0): ?>
                        / <span id="ux-header-max-active"><?php echo $max_active_cfg; ?></span>
                    <?php endif; ?>
                </div>
                <?php if (!empty($logo_path)): ?>
                    <div class="ux-status-logo">
                        <img src="<?php echo htmlspecialchars($logo_path, ENT_QUOTES, 'UTF-8'); ?>" alt="Team logo">
                    </div>
                <?php endif; ?>
            </div>

            <?php
                $usage_percent = 0;
                if ($max_active_cfg > 0) {
                    $usage_percent = (int) round(($active_count / max(1, $max_active_cfg)) * 100);
                    if ($usage_percent < 0) { $usage_percent = 0; }
                    if ($usage_percent > 100) { $usage_percent = 100; }
                }

                // بار اول هم یک مقدار تقریبی از فشار سرور نشان می‌دهیم
                $server_info = ux_get_server_load_info();

                $server_load_percent = $server_info['percent'] ?? null; // CPU%
                $server_load1        = $server_info['load1']   ?? null;
                $server_load5        = $server_info['load5']   ?? null;
                $server_load15       = $server_info['load15']  ?? null;

                $server_ram_percent  = $server_info['memory_percent'] ?? null;  // (اگر خواستی بعداً استفاده کنی)
                $server_disk_percent = $server_info['disk_percent']   ?? null;

                // مجموع بازدیدکننده در ۲۴ ساعت اخیر (فقط کاربران واقعی؛ بدون ربات‌ها)
                $human_stats      = ux_get_human_stats_24h();
                $total_visits_24h = isset($human_stats['unique_ips_24h'])
                   ? (int)$human_stats['unique_ips_24h']
                   : (int)($human_stats['total_24h'] ?? 0);

                // Compute sizes of the main campaign and analytics databases (formatted in MB)
                $campaignDbPath = function_exists('ux_storage_db_path') ? ux_storage_db_path() : (__DIR__ . '/ux_campaign.sqlite');
                $analyticsDbPath = function_exists('ux_storage_analytics_db_path') ? ux_storage_analytics_db_path() : (__DIR__ . '/ux_analytics.sqlite');
                $campaignDbSize  = (is_file($campaignDbPath) && filesize($campaignDbPath) > 0)
                    ? number_format(filesize($campaignDbPath) / 1048576, 2) . ' MB'
                    : '0 MB';
                $analyticsDbSize = (is_file($analyticsDbPath) && filesize($analyticsDbPath) > 0)
                    ? number_format(filesize($analyticsDbPath) / 1048576, 2) . ' MB'
                    : '0 MB';
            ?>

            <div class="ux-live-traffic">
                <div class="ux-live-header">
                    <?php
                        /*
                         * The live-mode pill previously displayed the current smart queue label twice
                         * (once in the header pills and once here). To avoid redundancy in the UI,
                         * the pill output is removed entirely. Only the usage percentage is shown when
                         * the maximum active configuration is greater than zero.
                         */
                    ?>
                    <?php if ($max_active_cfg > 0): ?>
                        <span class="ux-live-usage-label">
                            <?php echo htmlspecialchars(ux_t('usage_label', 'استفاده از ظرفیت:'), ENT_QUOTES, 'UTF-8'); ?>
                            <strong id="ux-live-usage-percent"><?php echo $usage_percent; ?>%</strong>
                        </span>
                    <?php endif; ?>
                </div>
                <div class="ux-live-grid">
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_inside', 'کاربران داخل سایت الان'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-inside-count"><?php echo (int) $active_count; ?></div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_inside', 'در حال مشاهده سایت'), ENT_QUOTES, 'UTF-8'); ?></div>
                    </div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_queue', 'کاربران در صف الان'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-queue-count">0</div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_queue', 'در انتظار ورود'), ENT_QUOTES, 'UTF-8'); ?></div>
                    </div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_total_visits', 'مجموع بازدیدکننده در ۲۴ ساعت اخیر'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-total-visits"><?php echo (int) $total_visits_24h; ?></div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_total_visits', 'بر اساس زمان رسمی ایران'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-db-info">
                            <span><?php echo htmlspecialchars(ux_t('db_size_label_campaign','Campaign DB'), ENT_QUOTES, 'UTF-8'); ?>: <?php echo htmlspecialchars($campaignDbSize, ENT_QUOTES, 'UTF-8'); ?></span>
                            <span><?php echo htmlspecialchars(ux_t('db_size_label_analytics','Analytics DB'), ENT_QUOTES, 'UTF-8'); ?>: <?php echo htmlspecialchars($analyticsDbSize, ENT_QUOTES, 'UTF-8'); ?></span>
                            <button id="ux-widget-reset-db-btn" class="ux-db-reset-btn">
                                <?php echo htmlspecialchars(ux_t('reset_db_button','ریست دیتابیس'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                            <button id="ux-widget-reset-analytics-btn" class="ux-db-reset-btn">
                                <?php echo htmlspecialchars(ux_t('reset_analytics_button','ریست آنالیز'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                    </div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_max_active', 'حداکثر ظرفیت مجاز'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-max-active"><?php echo (int) $max_active_cfg; ?></div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_max_active', 'کاربر همزمان مجاز'), ENT_QUOTES, 'UTF-8'); ?></div>
                    
                        <div class="ux-live-metric-sub" id="ux-live-smart-cap">&nbsp;</div>
</div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_system_load', 'فشار سیستم (CPU / RAM / Disk)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-server-load">
                            <?php
                            if (isset($server_load1) && $server_load1 !== null) {
                                echo htmlspecialchars(number_format((float)$server_load1, 1), ENT_QUOTES, 'UTF-8');
                            } else {
                                echo '–';
                            }
                            ?>
                        </div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_system_load', 'بر اساس وضعیت لحظه‌ای سیستم'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-resource-bars">
                            <div class="ux-resource-row">
                                <span class="ux-resource-label">CPU</span>
                                <div class="ux-resource-bar">
                                    <div class="ux-resource-fill" id="ux-cpu-bar"></div>
                                </div>
                                <span class="ux-resource-value" id="ux-cpu-percent">–</span>
                            </div>
                            <div class="ux-resource-row">
                                <span class="ux-resource-label">RAM</span>
                                <div class="ux-resource-bar">
                                    <div class="ux-resource-fill" id="ux-ram-bar"></div>
                                </div>
                                <span class="ux-resource-value" id="ux-ram-percent">–</span>
                            </div>
                            <div class="ux-resource-row">
                                <span class="ux-resource-label">Disk</span>
                                <div class="ux-resource-bar">
                                    <div class="ux-resource-fill" id="ux-disk-bar"></div>
                                </div>
                                <span class="ux-resource-value" id="ux-disk-percent">–</span>
                            </div>
                            <?php if ($server_load1 !== null): ?>
                        <div class="ux-live-metric-sub" style="margin-top:6px; font-size:11px; opacity:0.85;">
                            Load AVG (۱ / ۵ / ۱۵ دقیقه):
                            <strong>
                                <span id="ux-loadavg-1">
                                    <?php echo htmlspecialchars(number_format((float)$server_load1, 1), ENT_QUOTES, 'UTF-8'); ?>
                                </span>
                                /
                                <span id="ux-loadavg-5">
                                    <?php echo htmlspecialchars(number_format((float)$server_load5, 1), ENT_QUOTES, 'UTF-8'); ?>
                                </span>
                                /
                                <span id="ux-loadavg-15">
                                    <?php echo htmlspecialchars(number_format((float)$server_load15, 1), ENT_QUOTES, 'UTF-8'); ?>
                                </span>
                            </strong>
                        </div>
                        <?php endif; ?>

                        </div>
                    </div>
                    <!-- میانگین زمان انتظار که به ردیف پایینی منتقل شده است -->
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_avg_wait', 'میانگین زمان انتظار'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-avg-wait">–</div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_avg_wait', 'بر حسب ثانیه (تقریبی)'), ENT_QUOTES, 'UTF-8'); ?></div>
                    </div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_p95_latency', 'p95 Latency (ms)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-lat-p95">–</div>
                        <div class="ux-live-metric-sub" id="ux-live-lat-samples"><?php echo htmlspecialchars(ux_t('live_sub_p95_latency', 'نمونه‌ها: – در پنجره زمانی'), ENT_QUOTES, 'UTF-8'); ?></div>
                    </div>
                    <div class="ux-live-metric">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_err5xx', '5xx Error Rate (%)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-live-err5xx">–</div>
                        <div class="ux-live-metric-sub"><?php echo htmlspecialchars(ux_t('live_sub_err5xx', 'در پنجره زمانی (Rolling)'), ENT_QUOTES, 'UTF-8'); ?></div>
                    </div>

                    <div class="ux-live-metric ux-live-metric-wide">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('live_label_live_traffic', 'ترافیک لحظه‌ای گیت‌وی'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-bar">
                            <div class="ux-live-bar-fill" id="ux-live-bar-fill" style="width:<?php echo $usage_percent; ?>%;"></div>
                        </div>
                        <div class="ux-live-metric-sub" id="ux-live-traffic-note">
                            <?php
                                if ($usage_percent < 60) {
                                    echo htmlspecialchars(ux_t('live_traffic_note_normal', 'وضعیت ترافیک پایدار و عادی است.'), ENT_QUOTES, 'UTF-8');
                                } elseif ($usage_percent < 90) {
                                    echo htmlspecialchars(ux_t('live_traffic_note_near', 'نزدیک به سقف ظرفیت – آماده‌باش.'), ENT_QUOTES, 'UTF-8');
                                } else {
                                    echo htmlspecialchars(ux_t('live_traffic_note_over', 'در آستانه‌ی ظرفیت! پیشنهاد می‌شود سقف را افزایش دهید یا مدت حضور را کاهش دهید.'), ENT_QUOTES, 'UTF-8');
                                }
                            ?>
                        </div>
                    </div>
                
            <div class="ux-bot-widget ux-live-metric-wide ux-bot-widget-inline">
                <div class="ux-bot-header">
                    <div><?php echo htmlspecialchars(ux_t('bot_status_title', 'وضعیت ربات‌های موتور جستجو'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <span class="ux-bot-pill">
                        <span id="ux-bot-health-label"><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></span>
                    </span>
                </div>
                <!-- Filters for bot stats: choose specific bot and path substring -->
                <div class="ux-bot-filters" style="margin-top:6px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    <label for="ux-bot-filter" style="font-size:12px;"><?php echo htmlspecialchars(ux_t('bot_filter_label', 'فیلتر ربات'), ENT_QUOTES, 'UTF-8'); ?>:</label>
                    <select id="ux-bot-filter" style="font-size:12px; padding:2px 4px;">
                        <option value=""><?php echo htmlspecialchars(ux_t('all_bots_option', 'همه'), ENT_QUOTES, 'UTF-8'); ?></option>
                        <?php
                        // Populate select options from bot_user_agents config if available
                        if (isset($config['bot_user_agents']) && is_array($config['bot_user_agents'])) {
                            foreach ($config['bot_user_agents'] as $ua) {
                                $uaStr = trim((string)$ua);
                                if ($uaStr === '') continue;
                                echo '<option value="' . htmlspecialchars($uaStr, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($uaStr, ENT_QUOTES, 'UTF-8') . '</option>';
                            }
                        }
                        ?>
                    </select>
                    <label for="ux-path-filter" style="font-size:12px;"><?php echo htmlspecialchars(ux_t('path_filter_label', 'فیلتر مسیر'), ENT_QUOTES, 'UTF-8'); ?>:</label>
                    <input type="text" id="ux-path-filter" style="font-size:12px; padding:2px 4px;" placeholder="<?php echo htmlspecialchars(ux_t('path_filter_placeholder','عبارت مسیر'), ENT_QUOTES, 'UTF-8'); ?>" />
                </div>
                <div class="ux-bot-grid">
                    <div>
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_total_visits', 'بازدید کل در ۲۴ ساعت اخیر'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-bot-total">–</div>

                        <div class="ux-live-metric-label" style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('bot_success_rate', 'نرخ موفقیت (پاسخ ۲۰۰)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-live-metric-value" id="ux-bot-success-rate">–</div>
                    </div>
                    <div>
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_report', 'گزارش ربات‌ها'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <ul class="ux-bot-list" id="ux-bot-list">
                            <li><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></li>
                        </ul>
                    </div>
                    <div class="ux-bot-chart-wrap">
                        <!-- Replace SVG with canvas for Chart.js -->
                        <canvas id="ux-bot-chart" class="ux-bot-chart" height="60"></canvas>
                        <!-- Legend will be handled by Chart.js -->
                    </div>
                    <!-- Error report for bots: 4xx/5xx counts and top error URLs -->
                    <div>
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_error_report','گزارش خطاهای ربات‌ها'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-bot-error-summary">
                            <span class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_4xx_errors_label','خطاهای ۴xx'), ENT_QUOTES, 'UTF-8'); ?>:</span>
                            <span class="ux-live-metric-value" id="ux-bot-4xx-count">–</span>
                            <span class="ux-live-metric-label" style="margin-left:10px;"><?php echo htmlspecialchars(ux_t('bot_5xx_errors_label','خطاهای ۵xx'), ENT_QUOTES, 'UTF-8'); ?>:</span>
                            <span class="ux-live-metric-value" id="ux-bot-5xx-count">–</span>
                        </div>
                        <ul class="ux-bot-error-list" id="ux-bot-error-list">
                            <li><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></li>
                        </ul>
                    </div>

                    <!-- Error report for all visitors (bots + humans): 4xx/5xx counts and top error URLs -->
                    <div style="margin-top:12px;">
                        <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('all_error_report','گزارش خطاهای کاربران'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-all-error-summary">
                            <span class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('all_4xx_errors_label','خطاهای ۴xx'), ENT_QUOTES, 'UTF-8'); ?>:</span>
                            <span class="ux-live-metric-value" id="ux-all-4xx-count" style="cursor:pointer;">–</span>
                            <span class="ux-live-metric-label" style="margin-left:10px;"><?php echo htmlspecialchars(ux_t('all_5xx_errors_label','خطاهای ۵xx'), ENT_QUOTES, 'UTF-8'); ?>:</span>
                            <span class="ux-live-metric-value" id="ux-all-5xx-count" style="cursor:pointer;">–</span>
                        </div>
                        <ul class="ux-all-error-list" id="ux-all-error-list">
                            <li><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- Close the live grid so that subsequent cards are not constrained to one column -->
            </div><!-- .ux-live-grid -->

            <?php
                // ------------------------------
                // Bot Intelligence Dashboard (Admin-only)
                // ------------------------------
                $ux_bot_intel = [
                    'tracked_ips' => 0,
                    'avg_score' => null,
                    'suspicious_24h' => 0,
                    'blocked_24h' => 0,
                    'verified_24h' => 0,
                    'top_low' => [],
                    'timeline_labels' => [],
                    'timeline_suspicious' => [],
                    'timeline_avg_score' => [],
                ];
                try {
                    $pdo = ux_storage_pdo();
                    // Summary metrics
                    $row = $pdo->query("SELECT COUNT(*) AS c, AVG(score) AS a FROM bot_scores")->fetch(PDO::FETCH_ASSOC);
                    if (is_array($row)) {
                        $ux_bot_intel['tracked_ips'] = (int)($row['c'] ?? 0);
                        $ux_bot_intel['avg_score'] = isset($row['a']) ? (float)$row['a'] : null;
                    }

                    $since = time() - 86400;
                    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM bot_logs WHERE timestamp >= :since AND classification IN ('suspicious','block','dns_fake_bot')");
                    $stmt->execute([':since' => $since]);
                    $ux_bot_intel['suspicious_24h'] = (int)($stmt->fetchColumn() ?: 0);

                    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM bot_logs WHERE timestamp >= :since AND (classification = 'block' OR result = 403)");
                    $stmt->execute([':since' => $since]);
                    $ux_bot_intel['blocked_24h'] = (int)($stmt->fetchColumn() ?: 0);

                    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM bot_logs WHERE timestamp >= :since AND classification = 'search_bot_bypass'");
                    $stmt->execute([':since' => $since]);
                    $ux_bot_intel['verified_24h'] = (int)($stmt->fetchColumn() ?: 0);

                    // Top low-score IPs
                    $stmt = $pdo->query("SELECT ip, score, last_seen, rate_estimate, user_agent FROM bot_scores ORDER BY score ASC, last_seen DESC LIMIT 15");
                    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    if (is_array($rows)) {
                        $ux_bot_intel['top_low'] = $rows;
                    }

                    // Timeline (hourly)
                    $since = time() - 86400;
                    $stmt = $pdo->prepare(
                        "SELECT (timestamp / 3600) * 3600 AS h, COUNT(*) AS c\n" .
                        "FROM bot_logs\n" .
                        "WHERE timestamp >= :since AND classification IN ('suspicious','block','dns_fake_bot')\n" .
                        "GROUP BY h ORDER BY h ASC"
                    );
                    $stmt->execute([':since' => $since]);
                    $suspByHour = [];
                    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!is_array($r)) {
                            break;
                        }
                        $h = (int)($r['h'] ?? 0);
                        $suspByHour[$h] = (int)($r['c'] ?? 0);
                    }
                    $stmt = $pdo->prepare(
                        "SELECT (timestamp / 3600) * 3600 AS h, AVG(score) AS a\n" .
                        "FROM bot_logs\n" .
                        "WHERE timestamp >= :since AND score IS NOT NULL\n" .
                        "GROUP BY h ORDER BY h ASC"
                    );
                    $stmt->execute([':since' => $since]);
                    $avgByHour = [];
                    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!is_array($r)) {
                            break;
                        }
                        $h = (int)($r['h'] ?? 0);
                        $avgByHour[$h] = isset($r['a']) ? (float)$r['a'] : null;
                    }

                    // Merge hours (union keys)
                    $hours = array_unique(array_merge(array_keys($suspByHour), array_keys($avgByHour)));
                    sort($hours);
                    foreach ($hours as $h) {
                        $ux_bot_intel['timeline_labels'][] = date('H:i', (int)$h);
                        $ux_bot_intel['timeline_suspicious'][] = $suspByHour[$h] ?? 0;
                        $ux_bot_intel['timeline_avg_score'][] = isset($avgByHour[$h]) ? round((float)$avgByHour[$h], 1) : null;
                    }
                } catch (Throwable $e) {
                    // ignore
                }
            ?>

            <div class="ux-card" style="margin-top:16px;width:100%;grid-column:1/-1;">
                <div class="ux-card-header">
                    <div class="ux-card-title"><?php echo htmlspecialchars(ux_t('bot_intel_dash_title','Bot Intelligence Dashboard'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-card-subtitle"><?php echo htmlspecialchars(ux_t('bot_intel_dash_sub','رفتار مشکوک، امتیازها و IPهای کم‌امتیاز (۲۴ ساعت اخیر)'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="ux-card-body">
                    <div class="ux-live-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                        <div class="ux-live-metric">
                            <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_intel_tracked_ips','IPهای رصد‌شده'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-live-metric-value"><?php echo (int)$ux_bot_intel['tracked_ips']; ?></div>
                        </div>
                        <div class="ux-live-metric">
                            <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_intel_avg_score','میانگین امتیاز'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-live-metric-value"><?php echo ($ux_bot_intel['avg_score'] === null) ? '–' : htmlspecialchars((string)round((float)$ux_bot_intel['avg_score'], 1), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-live-metric">
                            <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_intel_suspicious_24h','رخدادهای مشکوک (۲۴h)'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-live-metric-value"><?php echo (int)$ux_bot_intel['suspicious_24h']; ?></div>
                        </div>
                        <div class="ux-live-metric">
                            <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_intel_blocked_24h','Blockها (۲۴h)'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-live-metric-value"><?php echo (int)$ux_bot_intel['blocked_24h']; ?></div>
                        </div>
                        <div class="ux-live-metric">
                            <div class="ux-live-metric-label"><?php echo htmlspecialchars(ux_t('bot_intel_verified_24h','عبور ربات‌های مجاز (۲۴h)'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-live-metric-value"><?php echo (int)$ux_bot_intel['verified_24h']; ?></div>
                        </div>
                    </div>

                    <div class="ux-row" style="margin-top:14px;">
                        <div class="ux-col-2">
                            <canvas id="ux-bot-intel-chart" style="width:100%;max-height:240px;"></canvas>
                            <div class="ux-help" style="margin-top:6px;">
                                <?php echo htmlspecialchars(ux_t('bot_intel_chart_help','نمودار: تعداد رخدادهای مشکوک و میانگین امتیاز (بر حسب ساعت).'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        </div>
                        <div class="ux-col-2">
                            <div class="ux-live-metric-label" style="margin-bottom:8px;">
                                <?php echo htmlspecialchars(ux_t('bot_intel_top_low','Top IPهای کم‌امتیاز'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                            <div style="overflow:auto;max-height:260px;border:1px solid rgba(148,163,184,0.18);border-radius:10px;">
                                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                                    <thead>
                                        <tr style="position:sticky;top:0;background:rgba(2,6,23,0.85);backdrop-filter: blur(8px);">
                                            <th style="text-align:left;padding:8px;direction:ltr;">IP</th>
                                            <th style="text-align:center;padding:8px;">Score</th>
                                            <th style="text-align:center;padding:8px;">RPM</th>
                                            <th style="text-align:center;padding:8px;">Last</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    <?php if (!empty($ux_bot_intel['top_low']) && is_array($ux_bot_intel['top_low'])): ?>
                                        <?php foreach ($ux_bot_intel['top_low'] as $r): ?>
                                            <tr style="border-top:1px solid rgba(148,163,184,0.12);">
                                                <td style="padding:8px;direction:ltr;white-space:nowrap;">
                                                    <?php echo htmlspecialchars((string)($r['ip'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td style="padding:8px;text-align:center;">
                                                    <?php echo htmlspecialchars((string)($r['score'] ?? '–'), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td style="padding:8px;text-align:center;">
                                                    <?php
                                                        $rpm = isset($r['rate_estimate']) ? (float)$r['rate_estimate'] : 0;
                                                        echo htmlspecialchars((string)round($rpm, 1), ENT_QUOTES, 'UTF-8');
                                                    ?>
                                                </td>
                                                <td style="padding:8px;text-align:center;white-space:nowrap;">
                                                    <?php
                                                        $ls = isset($r['last_seen']) ? (int)$r['last_seen'] : 0;
                                                        echo $ls > 0 ? htmlspecialchars(date('H:i', $ls), ENT_QUOTES, 'UTF-8') : '–';
                                                    ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr><td colspan="4" style="padding:10px;opacity:0.75;">
                                            <?php echo htmlspecialchars(ux_t('bot_intel_empty','هنوز داده‌ای ثبت نشده است.'), ENT_QUOTES, 'UTF-8'); ?>
                                        </td></tr>
                                    <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
            (function(){
                try {
                    var ctx = document.getElementById('ux-bot-intel-chart');
                    if (!ctx || typeof Chart === 'undefined') return;
                    var labels = <?php echo json_encode($ux_bot_intel['timeline_labels'], JSON_UNESCAPED_UNICODE); ?>;
                    var suspicious = <?php echo json_encode($ux_bot_intel['timeline_suspicious']); ?>;
                    var avgScore = <?php echo json_encode($ux_bot_intel['timeline_avg_score']); ?>;
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: <?php echo json_encode(ux_t('bot_intel_chart_suspicious','مشکوک')); ?>,
                                    data: suspicious,
                                    yAxisID: 'y',
                                    tension: 0.3,
                                    pointRadius: 0,
                                },
                                {
                                    label: <?php echo json_encode(ux_t('bot_intel_chart_avg_score','میانگین امتیاز')); ?>,
                                    data: avgScore,
                                    yAxisID: 'y1',
                                    tension: 0.3,
                                    pointRadius: 0,
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: { legend: { display: true } },
                            scales: {
                                y: { beginAtZero: true, position: 'left' },
                                y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
                            }
                        }
                    });
                } catch (e) {
                    // ignore
                }
            })();
            </script>

            <!-- Top Suspicious Actors (real DB) -->
            <div class="ux-card" id="ux-top-suspicious-card" style="margin-top:16px;width:100%;grid-column:1/-1;">
                <div class="ux-card-header">
                    <div class="ux-card-title"><?php echo htmlspecialchars(ux_t('top_suspicious_title','Top Suspicious Actors'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-card-subtitle"><?php echo htmlspecialchars(ux_t('top_suspicious_sub','Top IPs و UAs در بازه انتخابی (داده واقعی از DB)'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="ux-card-body">
                    <div class="ux-history-range" id="ux-top-suspicious-range" style="margin-bottom:10px;align-items:center">
                        <button type="button" class="ux-history-btn" data-range="10m">10m</button>
                        <button type="button" class="ux-history-btn ux-history-btn-active" data-range="1h">1h</button>
                        <button type="button" class="ux-history-btn" data-range="24h">24h</button>
                        <button type="button" class="ux-history-btn" data-range="7d">7d</button>
                        <span style="flex:1 1 auto"></span>
                        <label class="ux-label" style="margin:0;opacity:.85"><?php echo htmlspecialchars(ux_t('limit','Limit'), ENT_QUOTES, 'UTF-8'); ?></label>
                        <select id="ux-top-suspicious-limit" class="ux-input" style="width:auto">
                            <option value="10">10</option>
                            <option value="20" selected>20</option>
                            <option value="50">50</option>
                        </select>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:12px;">
                        <div class="ux-table-scroll">
                            <div style="padding:10px;font-weight:600;opacity:.9;">
                                <?php echo htmlspecialchars(ux_t('top_ips','Top IPs'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                            <table class="seo-table" style="margin:0;border-top:1px solid rgba(148,163,184,0.18);">
                                <thead>
                                    <tr>
                                        <th style="direction:ltr"><?php echo htmlspecialchars(ux_t('ip','IP'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('hits','Hits'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('strikes','Strikes'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('last_seen','Last Seen'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('score','Score'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('class','Class'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('action','Action'), ENT_QUOTES, 'UTF-8'); ?></th>
                                    </tr>
                                </thead>
                                <tbody id="ux-top-ips-body">
                                    <tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('loading','Loading...'), ENT_QUOTES, 'UTF-8'); ?></td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="ux-table-scroll">
                            <div style="padding:10px;font-weight:600;opacity:.9;">
                                <?php echo htmlspecialchars(ux_t('top_uas','Top UAs'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                            <table class="seo-table" style="margin:0;border-top:1px solid rgba(148,163,184,0.18);">
                                <thead>
                                    <tr>
                                        <th><?php echo htmlspecialchars(ux_t('ua','UA'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('hits','Hits'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('strikes','Strikes'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('last_seen','Last Seen'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('score','Score'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('class','Class'), ENT_QUOTES, 'UTF-8'); ?></th>
                                        <th><?php echo htmlspecialchars(ux_t('action','Action'), ENT_QUOTES, 'UTF-8'); ?></th>
                                    </tr>
                                </thead>
                                <tbody id="ux-top-uas-body">
                                    <tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('loading','Loading...'), ENT_QUOTES, 'UTF-8'); ?></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="ux-help" style="margin-top:8px">
                        <?php echo htmlspecialchars(ux_t('top_suspicious_help','داده‌ها از DB استخراج می‌شوند. Action سریع: Block/Unblock (Manual).'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                </div>
            </div>

            <script>
            (function(){
                const csrf = <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>;

        // Cookie smoothing weight slider sync (0..0.6)
        (function(){
            const r = document.getElementById('ux-cookie-weight-range');
            const num = document.getElementById('ux-cookie-weight-number');
            const out = document.getElementById('ux-cookie-weight-value');
            if (!r || !num) return;

            function clampW(v){
                let w = parseFloat(String(v ?? '0'));
                if (!isFinite(w) || w < 0) w = 0;
                if (w > 0.6) w = 0.6;
                // Keep 2 decimals
                w = Math.round(w * 100) / 100;
                return w;
            }

            function syncFromRange(){
                let pct = parseInt(String(r.value || '0'), 10);
                if (!isFinite(pct) || pct < 0) pct = 0;
                if (pct > 60) pct = 60;
                const w = clampW(pct / 100.0);
                const s = w.toFixed(2);
                num.value = s;
                if (out) out.textContent = s;
            }

            function syncFromNumber(){
                const w = clampW(num.value);
                const pct = Math.round(w * 100);
                r.value = String(Math.max(0, Math.min(60, pct)));
                const s = w.toFixed(2);
                num.value = s;
                if (out) out.textContent = s;
            }

            r.addEventListener('input', syncFromRange);
            r.addEventListener('change', syncFromRange);
            num.addEventListener('input', syncFromNumber);
            num.addEventListener('change', syncFromNumber);
            syncFromNumber();
        })();
                const card = document.getElementById('ux-top-suspicious-card');
                const rangeWrap = document.getElementById('ux-top-suspicious-range');
                const ipsBody = document.getElementById('ux-top-ips-body');
                const uasBody = document.getElementById('ux-top-uas-body');
                const limitSel = document.getElementById('ux-top-suspicious-limit');
                if (!card || !rangeWrap || !ipsBody || !uasBody) return;

                let currentRange = '1h';
                let currentLimit = (limitSel && limitSel.value) ? String(limitSel.value) : '20';

                function escHtml(s){
                    return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
                }
                function fmtTs(ts){
                    ts = Number(ts || 0);
                    if (!ts) return '—';
                    const d = new Date(ts * 1000);
                    return d.toLocaleString();
                }

                function renderIps(rows){
                    if (!Array.isArray(rows) || rows.length === 0) {
                        ipsBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('no_data','No data'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                        return;
                    }
                    ipsBody.innerHTML = rows.map(r => {
                        const ip = r.ip || '';
                        const hits = Number(r.req_count || 0);
                        const strikes = Number(r.strikes_count || 0);
                        const lastSeen = fmtTs(r.last_seen);
                        const score = (r.score === null || typeof r.score === 'undefined') ? '—' : String(r.score);
                        const cls = r.classification || '';
                        const blocked = !!r.blocked;
                        const action = blocked
                            ? '<button type="button" class="ux-btn ux-btn-danger" data-unblock-id="' + String(r.block_id || 0) + '"><?php echo htmlspecialchars(ux_t('unblock','Unblock'), ENT_QUOTES, 'UTF-8'); ?></button>'
                            : '<button type="button" class="ux-btn ux-btn-primary" data-block-type="ip" data-block-value="' + escHtml(ip) + '"><?php echo htmlspecialchars(ux_t('block','Block'), ENT_QUOTES, 'UTF-8'); ?></button>';
                        return ''
                            + '<tr>'
                            + '<td style="direction:ltr;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;white-space:nowrap;">' + escHtml(ip) + '</td>'
                            + '<td>' + hits + '</td>'
                            + '<td>' + strikes + '</td>'
                            + '<td>' + escHtml(lastSeen) + '</td>'
                            + '<td>' + escHtml(score) + '</td>'
                            + '<td>' + escHtml(cls || '—') + '</td>'
                            + '<td>' + action + '</td>'
                            + '</tr>';
                    }).join('');
                }

                function renderUas(rows){
                    if (!Array.isArray(rows) || rows.length === 0) {
                        uasBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('no_data','No data'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                        return;
                    }
                    uasBody.innerHTML = rows.map(r => {
                        const ua = r.ua || '';
                        const h = r.ua_hash || '';
                        const hits = Number(r.req_count || 0);
                        const strikes = Number(r.strikes_count || 0);
                        const lastSeen = fmtTs(r.last_seen);
                        const score = (r.score === null || typeof r.score === 'undefined') ? '—' : String(r.score);
                        const cls = r.classification || '';
                        const blocked = !!r.blocked;
                        const action = blocked
                            ? '<button type="button" class="ux-btn ux-btn-danger" data-unblock-id="' + String(r.block_id || 0) + '"><?php echo htmlspecialchars(ux_t('unblock','Unblock'), ENT_QUOTES, 'UTF-8'); ?></button>'
                            : '<button type="button" class="ux-btn ux-btn-primary" data-block-type="ua" data-block-value="' + escHtml(h) + '"><?php echo htmlspecialchars(ux_t('block','Block'), ENT_QUOTES, 'UTF-8'); ?></button>';
                        return ''
                            + '<tr>'
                            + '<td style="max-width:520px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + escHtml(ua) + '">'
                            +   '<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; opacity:.8; font-size:12px">' + escHtml(h) + '</div>'
                            +   escHtml(ua)
                            + '</td>'
                            + '<td>' + hits + '</td>'
                            + '<td>' + strikes + '</td>'
                            + '<td>' + escHtml(lastSeen) + '</td>'
                            + '<td>' + escHtml(score) + '</td>'
                            + '<td>' + escHtml(cls || '—') + '</td>'
                            + '<td>' + action + '</td>'
                            + '</tr>';
                    }).join('');
                }

                async function load(range){
                    currentRange = String(range || '1h');

                    if (limitSel) { currentLimit = String(limitSel.value || currentLimit || '20'); }

                    // highlight active
                    rangeWrap.querySelectorAll('button[data-range]').forEach(b => {
                        const r = b.getAttribute('data-range');
                        if (r === currentRange) b.classList.add('ux-history-btn-active');
                        else b.classList.remove('ux-history-btn-active');
                    });

                    ipsBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('loading','Loading...'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                    uasBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('loading','Loading...'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';

                    try {
                        const res = await fetch(location.pathname + '?ux_ajax=top_suspicious&range=' + encodeURIComponent(currentRange) + '&limit=' + encodeURIComponent(currentLimit), { credentials: 'same-origin' });
                        const js = await res.json().catch(()=>null);
                        if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                        renderIps(js.ips || []);
                        renderUas(js.uas || []);
                    } catch (e) {
                        console.error(e);
                        ipsBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('error','Error'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                        uasBody.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('error','Error'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                    }
                }

                rangeWrap.addEventListener('click', function(ev){
                    const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-range]') : null;
                    if (!btn) return;
                    const r = btn.getAttribute('data-range') || '1h';
                    load(r);
                });

                if (limitSel) {
                    limitSel.addEventListener('change', function(){
                        load(currentRange);
                    });
                }

                card.addEventListener('click', async function(ev){
                    const btn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
                    if (!btn) return;
                    const unblockId = btn.getAttribute('data-unblock-id');
                    const bType = btn.getAttribute('data-block-type');
                    const bValue = btn.getAttribute('data-block-value');

                    if (unblockId && unblockId !== '0') {
                        if (!confirm(<?php echo json_encode(ux_t('confirm_unblock','Unblock?'), JSON_UNESCAPED_UNICODE); ?>)) return;
                        const p = new URLSearchParams();
                        p.set('csrf', csrf);
                        p.set('id', String(unblockId));
                        try {
                            const res = await fetch(location.pathname + '?ux_ajax=bot_block_unblock', {
                                method: 'POST',
                                headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                                body: p.toString(),
                                credentials: 'same-origin'
                            });
                            const js = await res.json().catch(()=>null);
                            if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                            await load(currentRange);
                        } catch (e) {
                            alert(e && e.message ? e.message : 'Failed');
                        }
                    }

                    if (bType && bValue) {
                        const reasonDefault = (bType === 'ip') ? 'dash_top_ip' : 'dash_top_ua';
                        const reason = prompt(<?php echo json_encode(ux_t('prompt_block_reason','Reason for block?'), JSON_UNESCAPED_UNICODE); ?>, reasonDefault);
                        const p = new URLSearchParams();
                        p.set('csrf', csrf);
                        p.set('type', String(bType));
                        p.set('value', String(bValue));
                        if (reason) p.set('reason', String(reason));
                        try {
                            const res = await fetch(location.pathname + '?ux_ajax=bot_block_add', {
                                method: 'POST',
                                headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                                body: p.toString(),
                                credentials: 'same-origin'
                            });
                            const js = await res.json().catch(()=>null);
                            if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                            await load(currentRange);
                        } catch (e) {
                            alert(e && e.message ? e.message : 'Failed');
                        }
                    }
                });

                // initial load
                load(currentRange);
            })();
            </script>

            <!-- گزارش تحلیلی صف هوشمند -->
            <!--
                The smart analytics card should span the full width available. When the surrounding
                container uses a grid layout (e.g. ux-live-grid), a lone card can end up occupying
                only a single grid column which leaves empty space beside it. To ensure the
                analytics card takes up the entire row regardless of the parent layout, we
                explicitly set grid-column to span all columns. We also keep width:100% to
                override any default card widths.
            -->
            <div class="ux-card" style="margin-top:16px;width:100%;grid-column:1/-1;">
                <div class="ux-card-header">
                    <div class="ux-card-title">
                        <?php echo htmlspecialchars(ux_t('smart_analytics_title', 'گزارش تحلیلی صف هوشمند'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                    <div class="ux-card-subtitle">
                        <?php echo htmlspecialchars(ux_t('smart_analytics_subtitle', 'نمودار ظرفیت، کاربران و CPU در بازه‌های زمانی مختلف'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                </div>
                <div class="ux-card-body">
                    <div class="ux-history-range">
                        <button type="button" class="ux-history-btn ux-history-btn-active" data-range="24h">
                            <?php echo htmlspecialchars(ux_t('smart_range_24h', '۲۴ ساعت اخیر'), ENT_QUOTES, 'UTF-8'); ?>
                        </button>
                        <button type="button" class="ux-history-btn" data-range="7d">
                            <?php echo htmlspecialchars(ux_t('smart_range_7d', '۷ روز اخیر'), ENT_QUOTES, 'UTF-8'); ?>
                        </button>
                        <button type="button" class="ux-history-btn" data-range="30d">
                            <?php echo htmlspecialchars(ux_t('smart_range_30d', '۳۰ روز اخیر'), ENT_QUOTES, 'UTF-8'); ?>
                        </button>
                    </div>
                    <div class="ux-history-chart-wrapper">
                        <canvas id="ux-smart-history-chart"></canvas>
                        <div class="ux-history-chart-empty" id="ux-smart-history-empty">
                            <?php echo htmlspecialchars(ux_t('smart_history_empty', 'برای این بازه زمانی هنوز داده‌ای ثبت نشده است.'), ENT_QUOTES, 'UTF-8'); ?>
                        </div>
                    </div>
                    <div class="ux-history-legend">
                        <span class="ux-history-legend-item ux-history-legend-cap">
                            ■ <?php echo htmlspecialchars(ux_t('smart_legend_cap', 'ظرفیت صف هوشمند'), ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                        <span class="ux-history-legend-item ux-history-legend-active">
                            ■ <?php echo htmlspecialchars(ux_t('smart_legend_active', 'کاربران داخل سایت'), ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                        <span class="ux-history-legend-item ux-history-legend-cpu">
                            ■ <?php echo htmlspecialchars(ux_t('smart_legend_cpu', 'CPU (تقریبی)'), ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                        <span class="ux-history-legend-item ux-history-legend-decisions">
                            ■ <?php echo htmlspecialchars(ux_t('smart_legend_decisions', 'تصمیمات'), ENT_QUOTES, 'UTF-8'); ?>
                        </span>
                    </div>
                    <div class="ux-history-summary">
                        <span><?php echo htmlspecialchars(ux_t('max_capacity_label','حداکثر ظرفیت در بازه'), ENT_QUOTES, 'UTF-8'); ?>: <strong id="ux-max-capacity">&ndash;</strong></span>
                        <span style="margin-left:10px;"><?php echo htmlspecialchars(ux_t('max_active_label','حداکثر کاربران همزمان'), ENT_QUOTES, 'UTF-8'); ?>: <strong id="ux-max-active">&ndash;</strong></span>
                        <span style="margin-left:10px;"><?php echo htmlspecialchars(ux_t('avg_active_label','میانگین کاربران همزمان'), ENT_QUOTES, 'UTF-8'); ?>: <strong id="ux-avg-active">&ndash;</strong></span>
                        <span style="margin-left:10px;"><?php echo htmlspecialchars(ux_t('avg_cpu_per_user_label','میانگین CPU به ازای هر کاربر'), ENT_QUOTES, 'UTF-8'); ?>: <strong id="ux-avg-cpu-per-user">&ndash;</strong></span>
                    </div>
                    <!-- Smart queue capacity formula display -->
                    <div class="ux-smart-formula" style="margin-top:8px;font-size:13px;color:#8ca9b5;direction:rtl;">
                        <?php echo htmlspecialchars(ux_t('smart_formula_desc','فرمول ظرفیت صف هوشمند: \u200cmin(حداکثر ظرفیت، max(حداقل ظرفیت، ((هدف CPU / مصرف CPU) \u00D7 (هدف RAM / مصرف RAM) \u00D7 (هدف دیسک / مصرف دیسک)) \u00D7 کاربران فعال))'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                    <!-- Smart Queue Decisions section embedded within the analytics card -->
                    <div class="ux-smart-decisions-section" style="margin-top:16px;">
                        <div class="ux-card-title"><?php echo htmlspecialchars(ux_t('smart_decisions_title','تصمیمات هوشمند صف'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-card-subtitle"><?php echo htmlspecialchars(ux_t('smart_decisions_subtitle','لیست تغییرات ظرفیت و دلیل آن‌ها در بازهٔ انتخابی'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div id="ux-smart-decisions-empty" class="ux-smart-decisions-empty-message"><?php echo htmlspecialchars(ux_t('smart_decisions_empty','هیچ تصمیمی برای این بازه وجود ندارد.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <table id="ux-smart-decisions-table" class="ux-smart-decisions-table"></table>
                    </div>
                </div>
            </div>
</div>

</div>
            </div>

<!-- Removed redundant Smart Decisions Card -->
<!-- The smart queue decisions section is now embedded within the analytics card above. -->

<!-- کارت آمار کش ردیس -->
<?php if (!empty($config['redis_enabled'])): ?>
    <div class="ux-card ux-redis-monitor" style="margin-top:16px;width:100%;grid-column:1/-1;">
        <div class="ux-card-body">
            <!-- Toolbar -->
            <div class="ux-redis-toolbar">
                <div class="ux-redis-titlegroup">
                    <div class="ux-redis-title"><?php echo htmlspecialchars(ux_t('redis_monitor_title','مانیتورینگ ردیس و گیت‌وی'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-redis-subtitle"><?php echo htmlspecialchars(ux_t('redis_monitor_subtitle','نمایش زندهٔ وضعیت Redis و گیت‌وی برای تصمیم‌گیری سریع (موبایل/دسکتاپ).'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>

                <div class="ux-redis-actions">
                    <div class="ux-redis-action">
                        <label class="ux-redis-action-label" for="ux-redis-refresh-interval"><?php echo htmlspecialchars(ux_t('redis_refresh_interval_label','بازه بروزرسانی'), ENT_QUOTES, 'UTF-8'); ?></label>
                        <select id="ux-redis-refresh-interval" class="ux-input ux-redis-select" aria-label="<?php echo htmlspecialchars(ux_t('redis_refresh_interval_label','بازه بروزرسانی'), ENT_QUOTES, 'UTF-8'); ?>">
                            <option value="5000">5s</option>
                            <option value="10000">10s</option>
                            <option value="30000" selected>30s</option>
                            <option value="60000">60s</option>
                        </select>
                    </div>

                    <button type="button" id="ux-redis-refresh-now" class="ux-btn">
                        <span class="ux-btn-label"><?php echo htmlspecialchars(ux_t('redis_refresh_now','بروزرسانی'), ENT_QUOTES, 'UTF-8'); ?></span>
                    </button>

                    <button type="button" id="ux-redis-flush" class="ux-btn danger">
                        <span class="ux-btn-label"><?php echo htmlspecialchars(ux_t('redis_flush_cache','پاکسازی کش'), ENT_QUOTES, 'UTF-8'); ?></span>
                    </button>
                </div>
            </div>

            <!-- KPI GRID -->
            <div class="ux-redis-kpi-grid">

                <!-- Gateway Hero -->
                <div class="ux-kpi-card ux-span-12 ux-kpi-hero">
                    <div class="ux-kpi-head">
                        <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('gateway_kpi_title','گیت‌وی (RPS)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="ux-kpi-pill" id="ux-redis-health-status">–</div>
                    </div>

                    <div class="ux-kpi-hero-grid">
                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_rps_now_label','RPS لحظه‌ای'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-rps-now" dir="ltr">–</div>
                        </div>
                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_rps_avg10_label','میانگین ۱۰ث'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-rps-avg10" dir="ltr">–</div>
                        </div>
                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_rps_avg60_label','میانگین ۶۰ث'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-rps-avg60" dir="ltr">–</div>
                        </div>
                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_ops_per_req_label','Ops/Req'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-ops-req" dir="ltr">–</div>
                            <div class="ux-mini-sub"><?php echo htmlspecialchars(ux_t('redis_global_ops_note','Ops/sec مربوط به کل Redis است (همه DBها).'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>

                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_allow_now_label','ورودی مجاز'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-allow" dir="ltr">–</div>
                        </div>
                        <div class="ux-mini-kpi">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_queue_now_label','ورودی صف'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value" id="ux-gw-queue" dir="ltr">–</div>
                        </div>

                        <div class="ux-mini-kpi ux-mini-kpi-wide">
                            <div class="ux-mini-label"><?php echo htmlspecialchars(ux_t('gateway_rps_label','خلاصه'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-mini-value ux-mini-value-small" id="ux-gateway-rps-badge" dir="ltr">–</div>
                        </div>
                    </div>

                    <div class="ux-kpi-foot">
                        <div class="ux-help" id="ux-redis-health-msg"></div>
                    </div>
                </div>

                <!-- Redis Used Memory -->
                <div class="ux-kpi-card ux-span-3">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_memory_usage_label','حافظه مصرف شده'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-memory" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_cache_title','وضعیت کش ردیس'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>

                <!-- Redis Hit Ratio -->
                <div class="ux-kpi-card ux-span-3">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_hit_ratio_label','نسبت هیت'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-hit-ratio" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_cache_subtitle','Memory usage and hit ratio'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>

                <!-- Redis Latency -->
                <div class="ux-kpi-card ux-span-3">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_health_latency_label','تاخیر (Ping)'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-health-latency" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_health_title','سلامت ردیس'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>

                <!-- Redis Ops -->
                <div class="ux-kpi-card ux-span-3">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_health_ops_label','عملیات/ثانیه'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-health-ops" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_health_clients_label','کلاینت‌ها'), ENT_QUOTES, 'UTF-8'); ?>: <span id="ux-redis-health-clients" dir="ltr">–</span></div>
                </div>

                <!-- Memory pressure (used/max) -->
                <div class="ux-kpi-card ux-span-4">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_health_memory_pressure','فشار حافظه'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value ux-kpi-value-small" id="ux-redis-health-memory" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_health_role_label','نقش'), ENT_QUOTES, 'UTF-8'); ?>: <span id="ux-redis-health-role" dir="ltr">–</span></div>
                </div>

                <!-- Script keys -->
                <div class="ux-kpi-card ux-span-4">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_prefix_keys_label','کلیدهای اسکریپت'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-prefix-keys" dir="ltr">–</div>
                    <div class="ux-kpi-sub" id="ux-redis-prefix-note"></div>
                </div>

                <!-- TTL -->
                <div class="ux-kpi-card ux-span-4">
                    <div class="ux-kpi-label"><?php echo htmlspecialchars(ux_t('redis_prefix_expires_label','درصد TTL‌دار'), ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ux-kpi-value" id="ux-redis-prefix-expires" dir="ltr">–</div>
                    <div class="ux-kpi-sub"><?php echo htmlspecialchars(ux_t('redis_prefix_avg_ttl_label','میانگین TTL'), ENT_QUOTES, 'UTF-8'); ?>: <span id="ux-redis-prefix-avgttl" dir="ltr">–</span> • <?php echo htmlspecialchars(ux_t('redis_prefix_memory_label','حافظه (تخمینی)'), ENT_QUOTES, 'UTF-8'); ?>: <span id="ux-redis-prefix-memory" dir="ltr">–</span></div>
                </div>

            </div>

            <!-- Panels -->
            <div class="ux-redis-panels">
                <div class="ux-panel-card">
                    <div class="ux-panel-head">
                        <div>
                            <div class="ux-panel-title"><?php echo htmlspecialchars(ux_t('redis_chart_title','نمودار حافظه و نسبت هیت'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-panel-sub"><?php echo htmlspecialchars(ux_t('redis_chart_subtitle','آخرین نقاط نمونه‌برداری شده (نمایش روند).'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                    <div class="ux-panel-body">
                        <div class="ux-chart-wrap"><canvas id="ux-redis-chart"></canvas></div>
                    </div>
                </div>

                <details class="ux-panel-card ux-panel-details" id="ux-redis-diag">
                    <summary class="ux-panel-summary">
                        <span><?php echo htmlspecialchars(ux_t('redis_diagnostics_title','جزئیات و دیباگ'), ENT_QUOTES, 'UTF-8'); ?></span>
                        <span class="ux-panel-summary-sub"><?php echo htmlspecialchars(ux_t('redis_diagnostics_hint','برای مشاهده بار دستورات و زمان‌بندی باز کنید.'), ENT_QUOTES, 'UTF-8'); ?></span>
                    </summary>

                    <div class="ux-panel-body">
                        <div class="ux-diag-head">
                            <div class="ux-diag-title"><?php echo htmlspecialchars(ux_t('redis_command_load_title','بار دستورات'), ENT_QUOTES, 'UTF-8'); ?></div>
                            <div class="ux-diag-meta" id="ux-redis-command-dt"></div>
                        </div>

                        <div class="ux-table-wrap">
                            <table id="ux-redis-command-table" class="ux-table"></table>
                        </div>

                        <div class="ux-help ux-diag-footnote">
                            <?php echo htmlspecialchars(ux_t('redis_diag_note','نکته: این جدول برای دیباگ است. برای تصمیم‌گیری لحظه‌ای، KPIهای بالا را مبنا قرار دهید.'), ENT_QUOTES, 'UTF-8'); ?>
                        </div>
                    </div>
                </details>
            </div>

        </div>
    </div>
<?php endif; ?>

            <?php
            // Removed duplicate navigation tabs here. The navigation tabs
            // are now rendered within the ux-tabs-container that sits above the
            // settings form. Removing this prevents the tabs from appearing
            // a second time below the Redis card.
            ?>

            <?php if ($message): ?>
                <div id="ux-message" class="ux-message <?php echo (strpos($message,'خطا') === 0) ? 'error' : 'success'; ?>">
                    <?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?>
                </div>
                <script>
                    (function() {
                        var el = document.getElementById('ux-message');
                        if (!el) return;
                        setTimeout(function () {
                            el.classList.add('ux-message-hide');
                        }, 3500);
                    })();
                </script>

            <?php endif; ?>
            <script>
                (function () {
                    function modeLabel(mode) {
                        // Return translated labels for each gateway mode using PHP translations
                        if (mode === 'queue') {
                            return <?php echo json_encode(ux_t('mode_queue_label', 'حالت صف انتظار (Queue)')); ?>;
                        }
                        if (mode === 'maintenance') {
                            return <?php echo json_encode(ux_t('mode_maintenance_label', 'حالت کمپین / Maintenance')); ?>;
                        }
                        if (mode === 'whitelist') {
                            return <?php echo json_encode(ux_t('mode_whitelist_label', 'حالت دسترسی محدود (Whitelist)')); ?>;
                        }
                        // Added case for smart_queue: return the proper translated label
                        if (mode === 'smart_queue') {
                            return <?php echo json_encode(ux_t('mode_smart_queue_label', 'Smart queue mode (based on server load)')); ?>;
                        }
                        return <?php echo json_encode(ux_t('mode_unknown_label', 'حالت نامشخص')); ?>;
                    }
                    function trafficNote(p) {
                        // Traffic status notes translated via PHP
                        if (p < 60) {
                            return <?php echo json_encode(ux_t('traffic_status_normal', 'وضعیت ترافیک پایدار و عادی است.')); ?>;
                        }
                        if (p < 90) {
                            return <?php echo json_encode(ux_t('traffic_status_near_limit', 'نزدیک به سقف ظرفیت – آماده‌باش.')); ?>;
                        }
                        return <?php echo json_encode(ux_t('traffic_status_critical', 'در آستانه‌ی ظرفیت! پیشنهاد می‌شود سقف را افزایش دهید یا مدت حضور را کاهش دهید.')); ?>;
                    }

                    function applyStats(data) {
                        if (!data) return;
                        var insideEl     = document.getElementById('ux-live-inside-count');
                        var queueEl      = document.getElementById('ux-live-queue-count');
                        var avgWaitEl    = document.getElementById('ux-live-avg-wait');
                        var maxEl        = document.getElementById('ux-live-max-active');
                        var smartCapEl   = document.getElementById('ux-live-smart-cap');
                        var pctEl        = document.getElementById('ux-live-usage-percent');
                        var barEl        = document.getElementById('ux-live-bar-fill');
                        var modeEl       = document.getElementById('ux-live-mode-label');
                        var noteEl       = document.getElementById('ux-live-traffic-note');
                        var headerActive = document.getElementById('ux-header-active-count');
                        var headerMax    = document.getElementById('ux-header-max-active');
                        var serverEl     = document.getElementById('ux-live-server-load');

                        var cpuBar      = document.getElementById('ux-cpu-bar');
                        var ramBar      = document.getElementById('ux-ram-bar');
                        var diskBar     = document.getElementById('ux-disk-bar');
                        var cpuText     = document.getElementById('ux-cpu-percent');
                        var ramText     = document.getElementById('ux-ram-percent');
                        var diskText    = document.getElementById('ux-disk-percent');

                        // New metric: total visits in last 24h
                        var totalVisitsEl = document.getElementById('ux-live-total-visits');

                        // Latency health
                        var latP95El     = document.getElementById('ux-live-lat-p95');
                        var latSamplesEl = document.getElementById('ux-live-lat-samples');
                        var err5xxEl     = document.getElementById('ux-live-err5xx');

                        var inside = null;
                        if (typeof data.inside_count !== 'undefined' && data.inside_count !== null) {
                            inside = data.inside_count;
                        } else if (typeof data.active_count !== 'undefined' && data.active_count !== null) {
                            // سازگاری با نسخه‌های قدیمی API
                            inside = data.active_count;
                        }

                        if (insideEl && inside !== null) {
                            insideEl.textContent = inside;
                        }
                        if (queueEl && typeof data.queue_count !== 'undefined') {
                            queueEl.textContent = data.queue_count;
                        }
                        if (avgWaitEl) {
                            if (typeof data.avg_wait_seconds !== 'undefined' && data.avg_wait_seconds !== null) {
                                avgWaitEl.textContent = data.avg_wait_seconds + ' ' + <?php echo json_encode(ux_t('seconds_short_label', 'ثانیه')); ?>;
                            } else if (typeof data.avg_wait_human !== 'undefined' && data.avg_wait_human) {
                                avgWaitEl.textContent = data.avg_wait_human;
                            } else {
                                avgWaitEl.textContent = '–';
                            }
                        }
                        if (totalVisitsEl && typeof data.total_visits_24h !== 'undefined') {
                            totalVisitsEl.textContent = data.total_visits_24h;
                        }

                        // p95 latency + 5xx error-rate
                        if (latP95El) {
                            if (typeof data.lat_p95_ms !== 'undefined' && data.lat_p95_ms !== null) {
                                latP95El.textContent = parseInt(data.lat_p95_ms, 10) + ' ms';
                            } else {
                                latP95El.textContent = '–';
                            }
                        }
                        if (latSamplesEl) {
                            var n = (typeof data.lat_samples !== 'undefined') ? parseInt(data.lat_samples || 0, 10) : 0;
                            if (!isNaN(n) && n > 0) {
                                latSamplesEl.textContent = <?php echo json_encode(ux_t('live_sub_samples_prefix','نمونه‌ها:')); ?> + ' ' + n;
                            } else {
                                latSamplesEl.textContent = <?php echo json_encode(ux_t('live_sub_samples_prefix','نمونه‌ها:')); ?> + ' –';
                            }
                        }
                        if (err5xxEl) {
                            if (typeof data.err5xx_pct !== 'undefined' && data.err5xx_pct !== null) {
                                var ep = parseFloat(data.err5xx_pct);
                                err5xxEl.textContent = !isNaN(ep) ? (Math.round(ep * 100) / 100).toFixed(2) + '%' : '–';
                            } else {
                                err5xxEl.textContent = '–';
                            }
                        }
                        if (maxEl && typeof data.max_active !== 'undefined') {
                            maxEl.textContent = data.max_active;
                        }
                        if (headerActive && inside !== null) {
                            headerActive.textContent = inside;
                        }
                        if (headerMax && typeof data.max_active !== 'undefined') {
                            headerMax.textContent = data.max_active;
                        }
                        if (smartCapEl && typeof data.smart_enabled !== 'undefined') {
                            if (data.smart_enabled && typeof data.smart_current_cap !== 'undefined' && data.smart_current_cap !== null) {
                                var baseCap = (typeof data.max_active !== 'undefined') ? data.max_active : '';
                                var txt = 'ظرفیت لحظه‌ای صف هوشمند: ' + data.smart_current_cap;
                                if (baseCap) {
                                    txt += ' / ' + baseCap;
                                }
                                smartCapEl.textContent = txt;
                            } else {
                                smartCapEl.textContent = '';
                            }
                        }
                        if (serverEl && typeof data.server_load1 !== 'undefined' && data.server_load1 !== null) {
                        var v = parseFloat(data.server_load1);
                        if (!isNaN(v)) {
                            serverEl.textContent = v.toFixed(1);   // مثلاً 1.6
                        } else {
                            serverEl.textContent = '–';
                        }
                        } else if (serverEl) {
                        serverEl.textContent = '–';
                       }

                        function applyPercent(barEl, textEl, value) {
                            if (!barEl || !textEl) return;
                            if (value === null || typeof value === 'undefined') {
                                barEl.style.width = '0%';
                                textEl.textContent = '–';
                                return;
                            }
                            var p = value;
                            if (p < 0) p = 0;
                            if (p > 100) p = 100;
                            barEl.style.width = p + '%';
                            textEl.textContent = p + '%';
                        }
                        // عناصر مربوط به Load AVG پایین ویجت
                        var load1El  = document.getElementById('ux-loadavg-1');
                        var load5El  = document.getElementById('ux-loadavg-5');
                        var load15El = document.getElementById('ux-loadavg-15');

                        // عدد بزرگ بالا: Load AVG یک دقیقه (اگر همین‌جا هندل می‌کنی)
                        if (serverEl && typeof data.server_load1 !== 'undefined' && data.server_load1 !== null) {
                            var v = parseFloat(data.server_load1);
                            serverEl.textContent = !isNaN(v) ? v.toFixed(1) : '–';
                        } else if (serverEl) {
                            serverEl.textContent = '–';
                        }

                        // به‌روزرسانی سه عدد پایین (۱ / ۵ / ۱۵ دقیقه)
                        if (load1El && typeof data.server_load1 !== 'undefined' && data.server_load1 !== null) {
                            var l1 = parseFloat(data.server_load1);
                            if (!isNaN(l1)) load1El.textContent = l1.toFixed(1);
                        }
                        if (load5El && typeof data.server_load5 !== 'undefined' && data.server_load5 !== null) {
                            var l5 = parseFloat(data.server_load5);
                            if (!isNaN(l5)) load5El.textContent = l5.toFixed(1);
                        }
                        if (load15El && typeof data.server_load15 !== 'undefined' && data.server_load15 !== null) {
                            var l15 = parseFloat(data.server_load15);
                            if (!isNaN(l15)) load15El.textContent = l15.toFixed(1);
                        }

                        applyPercent(cpuBar, cpuText, (typeof data.server_load !== 'undefined' ? data.server_load : null));
                        applyPercent(ramBar, ramText, data.server_ram_percent);
                        applyPercent(diskBar, diskText, data.server_disk_percent);
                        if (pctEl && typeof data.usage_percent !== 'undefined') {
                            pctEl.textContent = data.usage_percent + '%';
                        }
                        if (barEl && typeof data.usage_percent !== 'undefined') {
                            var p = data.usage_percent;
                            if (p < 0) p = 0;
                            if (p > 100) p = 100;
                            barEl.style.width = p + '%';
                        }
                        if (modeEl && typeof data.mode !== 'undefined') {
                            modeEl.textContent = modeLabel(data.mode);
                        }
                        if (noteEl && typeof data.usage_percent !== 'undefined') {
                            noteEl.textContent = trafficNote(data.usage_percent);
                        }
                    }


                    function buildSmartHistoryUrl(range) {
                        var href = window.location.href;
                        href = href.replace(/(#.*)$/g, '').replace(/(&ux_ajax=[^&]*)/g, '');
                        var sep = href.indexOf('?') === -1 ? '?' : '&';
                        if (!range) {
                            range = '24h';
                        }
                    return href + sep + 'ux_ajax=smart-history&range=' + encodeURIComponent(range);
                    }

                    // نگه‌داری نمونهٔ نمودار صف هوشمند برای بروزرسانی داده‌ها بدون ساخت مجدد
                    var uxSmartChart = null;
                    // expose chart instance globally for decision dataset updates
                    window.uxSmartChart = null;



                    function applySmartHistory(data) {
                        // نسخه قدیمی applySmartHistory غیر فعال شده است؛ بدنه این تابع دیگر اجرا نمی‌شود
                        return;
                        var emptyEl = document.getElementById('ux-smart-history-empty');
                        if (!canvas) {
                            return;
                        }
                        var ctx = canvas.getContext ? canvas.getContext('2d') : null;
                        if (!ctx) {
                            if (emptyEl) {
                                emptyEl.style.display = 'flex';
                            }
                            return;
                        }

                        // ذخیره داده‌های تاریخچه در متغیر سراسری
                        window.uxSmartHistoryPoints = (data && data.points) ? data.points : [];
                        if (!data || !data.points || !data.points.length) {
                            // هیچ داده‌ای برای این بازه وجود ندارد
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            if (emptyEl) {
                                emptyEl.style.display = 'flex';
                            }
                            return;
                        }

                        if (emptyEl) {
                            emptyEl.style.display = 'none';
                        }

                        var points = data.points;
                        var width  = canvas.width  = canvas.clientWidth || canvas.width;
                        var height = canvas.height = canvas.clientHeight || 140;

                        var minTs = points[0].ts;
                        var maxTs = points[points.length - 1].ts;
                        if (maxTs <= minTs) {
                            maxTs = minTs + 60;
                        }

                        var maxCap    = 0;
                        var maxActive = 0;
                        var maxCpu    = 0;

                        points.forEach(function (p) {
                            var cap    = parseInt(p.cap || 0, 10);
                            var active = parseInt(p.active_count || 0, 10);
                            var cpu    = parseInt(p.cpu_percent || 0, 10);

                            if (cap > maxCap) maxCap = cap;
                            if (active > maxActive) maxActive = active;
                            if (cpu > maxCpu) maxCpu = cpu;
                        });

                        if (maxCap < 1) maxCap = 1;
                        if (maxActive < 1) maxActive = 1;
                        if (maxCpu < 1) maxCpu = 1;

                        var paddingLeft   = 24;
                        var paddingRight  = 8;
                        var paddingTop    = 8;
                        var paddingBottom = 16;

                        var plotWidth  = width  - paddingLeft - paddingRight;
                        var plotHeight = height - paddingTop  - paddingBottom;

                        if (plotWidth < 10 || plotHeight < 10) {
                            plotWidth  = Math.max(plotWidth, 10);
                            plotHeight = Math.max(plotHeight, 10);
                        }

                        ctx.clearRect(0, 0, width, height);

                        // پس‌زمینه
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);

                        // خطوط شبکه عمودی ساده
                        ctx.strokeStyle = '#e5e7eb';
                        ctx.lineWidth   = 1;
                        ctx.beginPath();
                        var steps = Math.min(points.length, 6);
                        for (var i = 0; i <= steps; i++) {
                            var t = minTs + (i * (maxTs - minTs) / Math.max(1, steps));
                            var x = paddingLeft + ((t - minTs) / (maxTs - minTs)) * plotWidth;
                            ctx.moveTo(x, paddingTop);
                            ctx.lineTo(x, paddingTop + plotHeight);
                        }
                        ctx.stroke();

                        function sx(ts) {
                            return paddingLeft + ((ts - minTs) / (maxTs - minTs)) * plotWidth;
                        }

                        function syCap(v) {
                            return paddingTop + plotHeight - (v / maxCap) * plotHeight;
                        }

                        function syActive(v) {
                            return paddingTop + plotHeight - (v / maxActive) * plotHeight;
                        }

                        function syCpu(v) {
                            return paddingTop + plotHeight - (v / maxCpu) * plotHeight;
                        }

                        function drawLine(getY, color) {
                            ctx.beginPath();
                            points.forEach(function (p, idx) {
                                var x = sx(p.ts);
                                var y = getY(p);
                                if (idx === 0) {
                                    ctx.moveTo(x, y);
                                } else {
                                    ctx.lineTo(x, y);
                                }
                            });
                            ctx.strokeStyle = color;
                            ctx.lineWidth   = 1.4;
                            ctx.stroke();
                        }

                        // ظرفیت (سبز)، کاربران داخل (آبی)، CPU (قرمز)
                        drawLine(function (p) { return syCap(parseInt(p.cap || 0, 10)); }, '#16a34a');
                        drawLine(function (p) { return syActive(parseInt(p.active_count || 0, 10)); }, '#1d4ed8');
                        drawLine(function (p) { return syCpu(parseInt(p.cpu_percent || 0, 10)); }, '#dc2626');
                    }

                    // بازنویسی تابع applySmartHistory برای استفاده از Chart.js و تم تیره
                    function applySmartHistory(data) {
                        var canvas = document.getElementById('ux-smart-history-chart');
                        var emptyEl = document.getElementById('ux-smart-history-empty');
                        if (!canvas || !canvas.getContext) {
                            if (emptyEl) emptyEl.style.display = 'flex';
                            return;
                        }
                        if (!data || !data.points || !data.points.length) {
                            if (uxSmartChart) {
                                uxSmartChart.destroy();
                                uxSmartChart = null;
                                window.uxSmartChart = null;
                            }
                            if (emptyEl) emptyEl.style.display = 'flex';
                            return;
                        }
                        if (emptyEl) emptyEl.style.display = 'none';

                        var labels     = [];
                        var capData    = [];
                        var activeData = [];
                        var cpuData    = [];
                        var latData    = [];
                        var minTs      = null;
                        var maxTs      = null;

                        data.points.forEach(function (p) {
                            var tsUnix = parseInt(p.ts || 0, 10);
                            var tsMs   = tsUnix * 1000;
                            var dt     = new Date(tsMs);
                            var h      = dt.getHours().toString().padStart(2, '0');
                            var m      = dt.getMinutes().toString().padStart(2, '0');
                            labels.push(h + ':' + m);
                            capData.push(parseInt(p.cap || 0, 10));
                            activeData.push(parseInt(p.active_count || 0, 10));
                            cpuData.push(parseInt(p.cpu_percent || 0, 10));
                            // Latency p95 (ms)
                            if (typeof p.lat_p95_ms !== 'undefined' && p.lat_p95_ms !== null) {
                                latData.push(parseInt(p.lat_p95_ms, 10));
                            } else {
                                latData.push(null);
                            }
                            if (minTs === null || tsUnix < minTs) minTs = tsUnix;
                            if (maxTs === null || tsUnix > maxTs) maxTs = tsUnix;
                        });

                        // ذخیره minTs و maxTs در خصیصه‌های canvas برای پلاگین خطوط تصمیم
                        canvas._minTs = minTs;
                        canvas._maxTs = maxTs;

                        // محاسبه حداکثر ظرفیت و حداکثر کاربران همزمان و نمایش در خلاصه
                        // محاسبه بیشینه‌ها و میانگین‌ها
                        var maxCapVal    = 0;
                        var maxActiveVal = 0;
                        var sumCap       = 0;
                        var sumActive    = 0;
                        var sumCpu       = 0;
                        for (var i = 0; i < capData.length; i++) {
                            var cVal = capData[i];
                            var aVal = activeData[i];
                            var cpuVal = cpuData[i];
                            if (cVal > maxCapVal) maxCapVal = cVal;
                            if (aVal > maxActiveVal) maxActiveVal = aVal;
                            sumCap    += cVal;
                            sumActive += aVal;
                            sumCpu    += cpuVal;
                        }
                        var avgCapVal    = capData.length > 0 ? sumCap / capData.length : 0;
                        var avgActiveVal = activeData.length > 0 ? sumActive / activeData.length : 0;
                        var avgCpuVal    = cpuData.length > 0 ? sumCpu / cpuData.length : 0;
                        var avgCpuPerUser = (avgActiveVal > 0) ? (avgCpuVal / avgActiveVal) : 0;
                        // به‌روزرسانی المان‌های خلاصه
                        var capEl         = document.getElementById('ux-max-capacity');
                        var actEl         = document.getElementById('ux-max-active');
                        var avgActEl      = document.getElementById('ux-avg-active');
                        var avgCpuUserEl  = document.getElementById('ux-avg-cpu-per-user');
                        if (capEl) capEl.textContent = maxCapVal;
                        if (actEl) actEl.textContent = maxActiveVal;
                        if (avgActEl) avgActEl.textContent = (avgActiveVal > 0 ? (Math.round(avgActiveVal * 10) / 10) : 0);
                        if (avgCpuUserEl) avgCpuUserEl.textContent = (avgCpuPerUser > 0 ? (Math.round(avgCpuPerUser * 10) / 10) : 0) + '%';

                        var ctx = canvas.getContext('2d');
                        // تعریف و ثبت پلاگین خطوط تصمیم در صورت نیاز
                        // پیش‌فرض: خطوط تصمیم مخفی هستند مگر این که در آینده صراحتاً فعال شود.
                        if (typeof window.uxShowDecisionLines === 'undefined') {
                            window.uxShowDecisionLines = false;
                        }
                        if (!window.decisionLinesPlugin) {
                            window.decisionLinesPlugin = {
                                id: 'decisionLines',
                                afterDraw: function (chart) {
                                    var decisions = window.uxSmartDecisions || [];
                                    if (!decisions || !decisions.length) return;
                                    var minTs = chart.canvas._minTs;
                                    var maxTs = chart.canvas._maxTs;
                                    if (!minTs || !maxTs || minTs === maxTs) return;
                                    var chartArea = chart.chartArea;
                                    var left  = chartArea.left;
                                    var right = chartArea.right;
                                    var top   = chartArea.top;
                                    var bottom= chartArea.bottom;
                                    var range = maxTs - minTs;
                                    var ctx2  = chart.ctx;
                                    // If decision lines display is disabled, skip drawing them.
                                    if (!window.uxShowDecisionLines) {
                                        return;
                                    }
                                    decisions.forEach(function (dec) {
                                        var ts = parseInt(dec.ts || dec.timestamp || 0, 10);
                                        if (ts < minTs || ts > maxTs) return;
                                        var ratio = (ts - minTs) / range;
                                        var x = left + ratio * (right - left);
                                        ctx2.save();
                                        // Use semi-transparent dashed lines for decision markers
                                        ctx2.strokeStyle = 'rgba(250, 204, 21, 0.4)';
                                        ctx2.lineWidth   = 1;
                                        // Define a dash pattern: dash length, gap length
                                        ctx2.setLineDash([4, 4]);
                                        ctx2.beginPath();
                                        ctx2.moveTo(x, top);
                                        ctx2.lineTo(x, bottom);
                                        ctx2.stroke();
                                        // Reset dash pattern to solid for subsequent draws
                                        ctx2.setLineDash([]);
                                        ctx2.restore();
                                    });
                                }
                            };
                            if (typeof Chart !== 'undefined' && Chart.register) {
                                Chart.register(window.decisionLinesPlugin);
                            }
                        }
                        if (uxSmartChart) {
                            // keep global reference in sync (used by updateDecisionDataset)
                            window.uxSmartChart = uxSmartChart;
                            uxSmartChart.data.labels = labels;
                            uxSmartChart.data.datasets[0].data = capData;
                            uxSmartChart.data.datasets[1].data = activeData;
                            uxSmartChart.data.datasets[2].data = cpuData;
                            // Reset decisions dataset if it exists; this dataset (index 3) holds decision markers
                            if (uxSmartChart.data.datasets.length > 3) {
                                uxSmartChart.data.datasets[3].data = [];
                                uxSmartChart.data.datasets[3].pointBackgroundColor = [];
                            }
                            // After updating main datasets, update decision markers if available
                            if (typeof window.updateDecisionDataset === 'function') {
                                window.updateDecisionDataset();
                            }
                            uxSmartChart.update();
                        } else {
                            uxSmartChart = new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: labels,
                                    datasets: [
                                        {
                                            label: <?php echo json_encode(ux_t('smart_legend_cap', 'ظرفیت صف هوشمند')); ?>,
                                            data: capData,
                                            borderColor: '#22c55e',
                                            backgroundColor: 'rgba(34,197,94,0.2)',
                                            fill: false,
                                            tension: 0.3,
                                            pointRadius: 0,
                                        },
                                        {
                                            label: <?php echo json_encode(ux_t('smart_legend_active', 'کاربران داخل سایت')); ?>,
                                            data: activeData,
                                            borderColor: '#2563eb',
                                            backgroundColor: 'rgba(37,99,235,0.2)',
                                            fill: false,
                                            tension: 0.3,
                                            pointRadius: 0,
                                        },
                                        {
                                            label: <?php echo json_encode(ux_t('smart_legend_cpu', 'CPU (تقریبی)')); ?>,
                                            data: cpuData,
                                            borderColor: '#dc2626',
                                            backgroundColor: 'rgba(220,38,38,0.2)',
                                            fill: false,
                                            tension: 0.3,
                                            pointRadius: 0,
                                        },
                                        // Scatter dataset for smart queue decisions. Empty data will be populated later.
                                        {
                                            label: <?php echo json_encode(ux_t('smart_legend_decisions', 'تصمیمات')); ?>,
                                            data: [],
                                            type: 'scatter',
                                            borderColor: '#facc15',
                                            backgroundColor: [],
                                            pointRadius: 5,
                                            pointHoverRadius: 6,
                                            showLine: false,
                                            yAxisID: 'decision',
                                        },
                                    ],
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        // Hide built-in legend because we show our own legend below the chart
                                        legend: { display: false }
                                    },
                                    layout: {
                                        // Remove default padding to utilize full card width in both LTR and RTL modes
                                        padding: { left: 0, right: 0, top: 0, bottom: 0 }
                                    },
                                    scales: {
                                        x: {
                                            ticks: {
                                                color: '#cbd5e1',
                                                font: { size: 8 },
                                            },
                                            grid: {
                                                color: 'rgba(203,213,225,0.1)',
                                            },
                                        },
                                        y: {
                                            ticks: {
                                                color: '#cbd5e1',
                                                font: { size: 8 },
                                            },
                                            grid: {
                                                color: 'rgba(203,213,225,0.1)',
                                            },
                                        },
                                        // Hidden axis for decision markers to prevent them from affecting main scale
                                        yLatency: {
                                            position: 'right',
                                            ticks: {
                                                color: '#cbd5e1',
                                                font: { size: 8 },
                                            },
                                            grid: {
                                                drawOnChartArea: false,
                                            },
                                        },
                                        decision: {
                                            display: false,
                                            min: 0,
                                            max: 1,
                                        },
                                    },
                                    plugins: {
                                        legend: {
                                            display: true,
                                            labels: {
                                                color: '#cbd5e1',
                                                font: { size: 9 },
                                                usePointStyle: true,
                                                boxWidth: 6,
                                                boxHeight: 6,
                                            },
                                            position: 'bottom',
                                        },
                                        tooltip: {
                                            enabled: true,
                                            backgroundColor: 'rgba(15,23,42,0.9)',
                                            borderColor: 'rgba(148,163,184,0.3)',
                                            borderWidth: 1,
                                            titleColor: '#f5f5f5',
                                            bodyColor: '#f5f5f5',
                                            displayColors: false,
                                            bodyFont: { size: 10 },
                                            titleFont: { size: 10 },
                                            callbacks: {
                                                label: function (context) {
                                                    var label = context.dataset.label || '';
                                                    if (label) label += ': ';
                                                    label += context.parsed.y;
                                                    return label;
                                                },
                                            },
                                        },
                                    },
                                    animation: {
                                        duration: 600,
                                        easing: 'easeOutQuart',
                                    },
                                },
                            });
                            // keep global reference in sync (used by updateDecisionDataset)
                            window.uxSmartChart = uxSmartChart;
                            // After creating chart, update decision markers (if any loaded)
                            if (typeof window.updateDecisionDataset === 'function') {
                                window.updateDecisionDataset();
                            }
                        }
                    }

                    function fetchSmartHistory(range) {
                        var canvas  = document.getElementById('ux-smart-history-chart');
                        var emptyEl = document.getElementById('ux-smart-history-empty');
                        if (!canvas) return;

                        if (emptyEl) {
                            emptyEl.style.display = 'flex';
                        }

                        var url = buildSmartHistoryUrl(range);
                        try {
                            fetch(url, { credentials: 'same-origin' })
                                .then(function (res) {
                                    if (!res.ok) return null;
                                    return res.json();
                                })
                                .then(function (data) {
                                    applySmartHistory(data || { points: [] });
                                })
                                .catch(function () {
                                    applySmartHistory({ points: [] });
                                });
                        } catch (e) {
                            applySmartHistory({ points: [] });
                        }
                    }

                    // Functions for smart queue decisions
                    var reasonMap = {
                        'cpu_high': <?php echo json_encode(ux_t('smart_reason_cpu_high','فشار CPU/RAM بسیار بالا')); ?>,
                        'cpu_medium': <?php echo json_encode(ux_t('smart_reason_cpu_medium','فشار CPU/RAM متوسط')); ?>,
                        'cpu_low': <?php echo json_encode(ux_t('smart_reason_cpu_low','فشار CPU/RAM پایین')); ?>,
                        'cool_server': <?php echo json_encode(ux_t('smart_reason_cool_server','سرور خنک')); ?>,
                        'trend_up': <?php echo json_encode(ux_t('smart_reason_trend_up','روند صعودی (CPU و کاربران)')); ?>,
                        'decrease': <?php echo json_encode(ux_t('smart_reason_decrease','کاهش ظرفیت')); ?>,
                        'increase': <?php echo json_encode(ux_t('smart_reason_increase','افزایش ظرفیت')); ?>,
                        'enforce_min': <?php echo json_encode(ux_t('smart_reason_enforce_min','اجبار حداقل ظرفیت')); ?>,
                        'enforce_max': <?php echo json_encode(ux_t('smart_reason_enforce_max','اجبار حداکثر ظرفیت')); ?>
                        ,'lat_insufficient': <?php echo json_encode(ux_t('smart_reason_lat_insufficient','نمونه کافی Latency نیست')); ?>
                        ,'lat_hard': <?php echo json_encode(ux_t('smart_reason_lat_hard','p95 بحرانی (کاهش تهاجمی)')); ?>
                        ,'lat_high': <?php echo json_encode(ux_t('smart_reason_lat_high','p95 بالاتر از هدف')); ?>
                        ,'lat_good': <?php echo json_encode(ux_t('smart_reason_lat_good','Latency عالی (اجازه افزایش آرام)')); ?>
                        ,'err_high': <?php echo json_encode(ux_t('smart_reason_err_high','نرخ خطای 5xx بالا')); ?>
                        ,'err_hard': <?php echo json_encode(ux_t('smart_reason_err_hard','نرخ خطای 5xx بحرانی')); ?>
                    };

                    /*
                     * Helper to update the scatter dataset for decision markers in the smart history chart.
                     * Reads global `uxSmartDecisions` (set by applySmartDecisions) and populates
                     * the fourth dataset (index 3) of `uxSmartChart` with time-stamped points. Each point
                     * has a constant y value (0.5) on the hidden 'decision' axis. Colors are assigned
                     * based on decision reason: green (increase), red (decrease), orange (high CPU),
                     * purple (low CPU / cool server), and yellow (other).
                     */
                    window.updateDecisionDataset = function () {
                        if (!window.uxSmartChart || !window.uxSmartDecisions) return;
                        var ds = window.uxSmartChart.data.datasets;
                        if (!ds || ds.length < 4) return;
                        var scatter = ds[3];
                        scatter.data = [];
                        scatter.pointBackgroundColor = [];
                        window.uxSmartDecisions.forEach(function(dec) {
                            var ts = dec.ts || dec.timestamp || 0;
                            var dt = new Date(ts * 1000);
                            var h  = dt.getHours().toString().padStart(2, '0');
                            var m  = dt.getMinutes().toString().padStart(2, '0');
                            var label = h + ':' + m;
                            var reasons = dec.reason ? dec.reason.split(',') : [];
                            var color = '#facc15';
                            if (reasons.indexOf('increase') !== -1) {
                                color = '#22c55e';
                            } else if (reasons.indexOf('decrease') !== -1) {
                                color = '#dc2626';
                            } else if (reasons.indexOf('cpu_high') !== -1 || reasons.indexOf('cpu_medium') !== -1) {
                                color = '#f97316';
                            } else if (reasons.indexOf('cpu_low') !== -1 || reasons.indexOf('cool_server') !== -1) {
                                color = '#a855f7';
                            }
                            scatter.data.push({ x: label, y: 0.5 });
                            scatter.pointBackgroundColor.push(color);
                        });
                    };

                    function applySmartDecisions(data) {
                        var emptyEl = document.getElementById('ux-smart-decisions-empty');
                        var table   = document.getElementById('ux-smart-decisions-table');
                        if (!emptyEl || !table) return;
                        if (!data || !data.decisions || !data.decisions.length) {
                            emptyEl.style.display = 'flex';
                            table.innerHTML = '';
                            return;
                        }
                        emptyEl.style.display = 'none';
                        // ذخیره تصمیمات در متغیر سراسری برای پلاگین نمودار
                        window.uxSmartDecisions = [];
                        var html = '<thead><tr>' +
                            '<th>' + <?php echo json_encode(ux_t('smart_decisions_time','زمان')); ?> + '</th>' +
                            '<th>' + <?php echo json_encode(ux_t('smart_decisions_prev','ظرفیت قبلی')); ?> + '</th>' +
                            '<th>' + <?php echo json_encode(ux_t('smart_decisions_new','ظرفیت جدید')); ?> + '</th>' +
                            '<th>' + <?php echo json_encode(ux_t('smart_decisions_reason','دلیل')); ?> + '</th>' +
                            '</tr></thead><tbody>';
                        data.decisions.forEach(function(dec) {
                            /*
                             * Use the provided timestamp from the server (`ts`) when available.
                             * Older records may include `timestamp` instead. If both are
                             * unavailable the value will be zero (epoch). Using only
                             * `timestamp` previously resulted in a constant 03:30 display
                             * because 0×1000 ms converted to local time (UTC+3:30) yields 03:30.
                             */
                            var tsVal = dec.ts || dec.timestamp || 0;
                            var dt    = new Date(tsVal * 1000);
                            var h     = dt.getHours().toString().padStart(2, '0');
                            var m     = dt.getMinutes().toString().padStart(2, '0');

                            /*
                             * Reason codes are stored in the `reasons` column as a comma‑separated
                             * string. Check `reasons` first and fall back to `reason` to
                             * support legacy data. Splitting on commas yields individual codes
                             * which are mapped to localized labels using `reasonMap`.
                             */
                            var rawReasons = dec.reasons || dec.reason || '';
                            var reasonCodes = rawReasons ? rawReasons.split(',') : [];
                            var reasonText  = reasonCodes.map(function(code) {
                                return reasonMap[code] || code;
                            }).join(', ');

                            html += '<tr>' +
                                '<td>' + h + ':' + m + '</td>' +
                                '<td>' + (dec.prev_cap || 0) + '</td>' +
                                '<td>' + (dec.new_cap || 0) + '</td>' +
                                '<td class="reason">' + reasonText + '</td>' +
                                '</tr>';
                            // اضافه کردن به لیست تصمیمات برای نمودار
                            window.uxSmartDecisions.push({
                                ts: tsVal,
                                prev_cap: dec.prev_cap || 0,
                                new_cap: dec.new_cap || 0,
                                reason: rawReasons
                            });
                        });
                        html += '</tbody>';
                        table.innerHTML = html;
                        // پس از به‌روزرسانی تصمیمات، اگر نمودار وجود داشته باشد، آن را به‌روز کن تا خطوط تصمیم نمایش داده شود
                        if (window.uxSmartChart) {
                            // همچنین داده‌های تصمیم را در دیتاست scatter نمودار بروزرسانی می‌کنیم
                            if (typeof window.updateDecisionDataset === 'function') {
                                window.updateDecisionDataset();
                            }
                            window.uxSmartChart.update();
                        }
                    }

                    function fetchSmartDecisions(range) {
                        var url = buildSmartHistoryUrl(range).replace('smart-history','smart-decisions');
                        fetch(url, { credentials: 'same-origin' })
                            .then(function (res) {
                                if (!res || !res.ok) return null;
                                return res.json();
                            })
                            .then(function (data) {
                                applySmartDecisions(data || { decisions: [] });
                            })
                            .catch(function () {
                                applySmartDecisions({ decisions: [] });
                            });
                    }

                    function initSmartHistory() {
                        var rangeButtons = document.querySelectorAll('.ux-history-btn');
                        if (!rangeButtons || !rangeButtons.length) {
                            return;
                        }

                        function setActive(btn) {
                            rangeButtons.forEach(function (b) {
                                b.classList.remove('ux-history-btn-active');
                            });
                            if (btn) {
                                btn.classList.add('ux-history-btn-active');
                            }
                        }

                        rangeButtons.forEach(function (btn) {
                            btn.addEventListener('click', function () {
                                var range = btn.getAttribute('data-range') || '24h';
                                setActive(btn);
                                // ذخیره دامنه برای بروزرسانی دوره‌ای
                                window.uxSmartHistoryRange = range;
                                fetchSmartHistory(range);
                                fetchSmartDecisions(range);
                            });
                        });

                        // بارگذاری اولیه ۲۴ ساعت اخیر
                        var first = document.querySelector('.ux-history-btn[data-range="24h"]') || rangeButtons[0];
                        if (first) {
                            setActive(first);
                            var initialRange = first.getAttribute('data-range') || '24h';
                            // ذخیره دامنه اولیه
                            window.uxSmartHistoryRange = initialRange;
                            fetchSmartHistory(initialRange);
                            fetchSmartDecisions(initialRange);
                            // شروع بروزرسانی دوره‌ای (هر 30 ثانیه)
                            setInterval(function () {
                                var range = window.uxSmartHistoryRange || initialRange;
                                fetchSmartHistory(range);
                                fetchSmartDecisions(range);
                            }, 30000);
                        }
                    }

function buildUrl() {
                        var href = window.location.href;
                        href = href.replace(/(#.*)$/g, '').replace(/(&ux_ajax=[^&]*)/g, '');
                        var sep = href.indexOf('?') === -1 ? '?' : '&';
                        return href + sep + 'ux_ajax=live';
                    }

                    function buildBotUrl() {
                        var href = window.location.href;
                        href = href.replace(/(#.*)$/g, '').replace(/(&ux_ajax=[^&]*)/g, '');
                        var sep = href.indexOf('?') === -1 ? '?' : '&';
                        var params = [];
                        params.push('ux_ajax=bot-stats');
                        // get selected bot filter
                        var botSel = document.getElementById('ux-bot-filter');
                        if (botSel && botSel.value) {
                            params.push('bot=' + encodeURIComponent(botSel.value));
                        }
                        // get path filter
                        var pathInput = document.getElementById('ux-path-filter');
                        if (pathInput && pathInput.value) {
                            params.push('path=' + encodeURIComponent(pathInput.value));
                        }
                        return href + sep + params.join('&');
                    }

                    function applyBotStats(data) {
                        var totalEl  = document.getElementById('ux-bot-total');
                        var rateEl   = document.getElementById('ux-bot-success-rate');
                        var listEl   = document.getElementById('ux-bot-list');
                        var healthEl = document.getElementById('ux-bot-health-label');
                        var chartEl  = document.getElementById('ux-bot-chart');

                            if (!data) {
                                if (healthEl) healthEl.textContent = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;
                                return;
                            }

                        if (totalEl && typeof data.total_24h !== 'undefined') {
                            totalEl.textContent = data.total_24h;
                        }
                        if (rateEl && typeof data.success_rate !== 'undefined') {
                            rateEl.textContent = data.success_rate + '%';
                        }

                        // به‌روزرسانی شمارنده‌های خطا و لیست URLهای خطا برای ربات‌ها
                        var err4El  = document.getElementById('ux-bot-4xx-count');
                        var err5El  = document.getElementById('ux-bot-5xx-count');
                        var errList = document.getElementById('ux-bot-error-list');
                        if (err4El && data.status_counts && typeof data.status_counts['4xx'] !== 'undefined') {
                            err4El.textContent = data.status_counts['4xx'];
                        }
                        if (err5El && data.status_counts && typeof data.status_counts['5xx'] !== 'undefined') {
                            err5El.textContent = data.status_counts['5xx'];
                        }
                        if (errList) {
                            errList.innerHTML = '';
                            if (Array.isArray(data.top_error_urls) && data.top_error_urls.length) {
                                data.top_error_urls.forEach(function (item) {
                                    var li = document.createElement('li');
                                    if (item && item.path) {
                                        li.textContent = item.path + ' (' + item.count + ')';
                                    } else if (typeof item === 'string') {
                                        li.textContent = item;
                                    } else {
                                        li.textContent = '';
                                    }
                                    errList.appendChild(li);
                                });
                            } else {
                                var li = document.createElement('li');
                                li.textContent = <?php echo json_encode(ux_t('no_important_bot_errors','خطای مهمی وجود ندارد.')); ?>;
                                errList.appendChild(li);
                            }
                        }

                        // Update global error counters and lists (bot + human)
                        var err4AllEl  = document.getElementById('ux-all-4xx-count');
                        var err5AllEl  = document.getElementById('ux-all-5xx-count');
                        var errListAll = document.getElementById('ux-all-error-list');
                        if (err4AllEl && data.status_counts_all && typeof data.status_counts_all['4xx'] !== 'undefined') {
                            err4AllEl.textContent = data.status_counts_all['4xx'];
                        }
                        if (err5AllEl && data.status_counts_all && typeof data.status_counts_all['5xx'] !== 'undefined') {
                            err5AllEl.textContent = data.status_counts_all['5xx'];
                        }
                        if (errListAll) {
                            // Clear previous list
                            errListAll.innerHTML = '';
                            // Populate global error lists for 4xx and 5xx errors
                            if (typeof data.top_error_urls_all_4xx !== 'undefined') {
                                window.uxAllErrorList4xx = Array.isArray(data.top_error_urls_all_4xx) ? data.top_error_urls_all_4xx : [];
                            } else {
                                window.uxAllErrorList4xx = [];
                            }
                            if (typeof data.top_error_urls_all_5xx !== 'undefined') {
                                window.uxAllErrorList5xx = Array.isArray(data.top_error_urls_all_5xx) ? data.top_error_urls_all_5xx : [];
                            } else {
                                window.uxAllErrorList5xx = [];
                            }
                            // Determine total error counts
                            var totalErrorsAll = 0;
                            if (data.status_counts_all) {
                                var c4 = data.status_counts_all['4xx'] || 0;
                                var c5 = data.status_counts_all['5xx'] || 0;
                                totalErrorsAll = c4 + c5;
                            }
                            if (totalErrorsAll > 0) {
                                // Show hint to click counters for details
                                var li = document.createElement('li');
                                li.textContent = <?php echo json_encode(ux_t('click_to_view_errors','برای مشاهدهٔ فهرست خطاها روی شمارنده کلیک کنید.')); ?>;
                                errListAll.appendChild(li);
                            } else {
                                var li = document.createElement('li');
                                li.textContent = <?php echo json_encode(ux_t('no_important_errors','خطای مهمی وجود ندارد.')); ?>;
                                errListAll.appendChild(li);
                            }
                        }
                        // پس از به‌روزرسانی لیست خطاهای سراسری، اطمینان از ثبت رویدادهای مودال خطا
                        try {
                            uxInitErrorModalOnce();
                        } catch (e) {
                            // ignore if not yet defined
                        }

                        function iconClassForBot(name) {
                            var n = (name || '').toLowerCase();
                            if (n.indexOf('google') !== -1) return 'ux-bot-icon-google';
                            if (n.indexOf('bing') !== -1)   return 'ux-bot-icon-bing';
                            if (n.indexOf('yandex') !== -1) return 'ux-bot-icon-yandex';
                            if (n.indexOf('baidu') !== -1)  return 'ux-bot-icon-baidu';
                            if (n.indexOf('duck') !== -1)   return 'ux-bot-icon-duck';
                            return 'ux-bot-icon-other';
                        }

                        // گزارش تفکیکی ربات‌ها (top 15) + آمار IPهای Allow شده
                        if (listEl) {
                            uxInitBotModalOnce();
                            listEl.innerHTML = '';

                            if (Array.isArray(data.bots_detail) && data.bots_detail.length) {
                                data.bots_detail.slice(0, 15).forEach(function (bot) {
                                    var li = document.createElement('li');
                                    li.className = 'ux-bot-row';
                                    li.setAttribute('data-kind', 'bot');
                                    if (bot && bot.name) {
                                        li.setAttribute('data-bot', bot.name);
                                    }

                                    var icon = document.createElement('span');
                                    icon.className = 'ux-bot-icon ' + iconClassForBot(bot.name);
                                    li.appendChild(icon);

                                    var textWrap = document.createElement('div');
                                    textWrap.className = 'ux-bot-row-text';

                                    var nameEl = document.createElement('div');
                                    nameEl.className = 'ux-bot-row-name';
                                    nameEl.textContent = bot.name;
                                    textWrap.appendChild(nameEl);

                                    var metaParts = [];
                                    if (typeof bot.unique_paths === 'number') {
                                        metaParts.push(bot.unique_paths + ' ' + <?php echo json_encode(ux_t('unique_pages_label', 'صفحه یکتا')); ?>);
                                    }
                                    if (typeof bot.hits === 'number') {
                                        metaParts.push(bot.hits + ' ' + <?php echo json_encode(ux_t('hits_label', 'hit')); ?>);
                                    }
                                    if (typeof bot.success === 'number') {
                                        metaParts.push(<?php echo json_encode(ux_t('success_label', 'موفق')); ?> + ': ' + bot.success);
                                    }
                                    if (typeof bot.timeouts === 'number' && bot.timeouts > 0) {
                                        metaParts.push(bot.timeouts + ' timeout');
                                    }

                                    if (metaParts.length) {
                                        var metaEl = document.createElement('div');
                                        metaEl.className = 'ux-bot-row-meta';
                                        metaEl.textContent = metaParts.join(' • ');
                                        textWrap.appendChild(metaEl);
                                    }

                                    // tooltip: last visit and last URL
                                    var tipParts = [];
                                    if (bot.last_seen_human) {
                                        tipParts.push(<?php echo json_encode(ux_t('last_visit_label', 'آخرین بازدید: ')); ?> + bot.last_seen_human);
                                    }
                                    if (bot.last_path) {
                                        tipParts.push(<?php echo json_encode(ux_t('last_url_label', 'آخرین URL: ')); ?> + bot.last_path);
                                    }
                                    if (tipParts.length) {
                                        li.title = tipParts.join(' — ');
                                    }

                                    li.appendChild(textWrap);
                                    listEl.appendChild(li);
                                });
                            } else if (Array.isArray(data.recent_bots) && data.recent_bots.length) {
                                data.recent_bots.forEach(function (name) {
                                    var li = document.createElement('li');
                                    li.textContent = name;
                                    listEl.appendChild(li);
                                });
                            }

                            // آمار IPهای Allow شده
                            if (Array.isArray(data.allow_ip_detail) && data.allow_ip_detail.length) {
                                var sep = document.createElement('li');
                                sep.className = 'ux-bot-separator';
                                sep.textContent = <?php echo json_encode(ux_t('allow_ips_recent_label', 'IPهای Allow شده (۲۴ ساعت اخیر)')); ?>;
                                listEl.appendChild(sep);

                                data.allow_ip_detail.slice(0, 8).forEach(function (item) {
                                    var li = document.createElement('li');
                                    li.className = 'ux-bot-row';
                                    li.setAttribute('data-kind', 'ip');
                                    if (item && item.ip) {
                                        li.setAttribute('data-ip', item.ip);
                                    }

                                    var ipSpan = document.createElement('span');
                                    ipSpan.className = 'ux-bot-ip';
                                    ipSpan.textContent = item.ip || '';
                                    li.appendChild(ipSpan);

                                    var meta = [];
                                    if (typeof item.hits === 'number') {
                                        meta.push(item.hits + ' hit');
                                    }
                                    if (Array.isArray(item.bots) && item.bots.length) {
                                        meta.push(item.bots.join(', '));
                                    }

                                    if (meta.length) {
                                        var metaSpan = document.createElement('span');
                                        metaSpan.className = 'ux-bot-ip-meta';
                                        metaSpan.textContent = meta.join(' • ');
                                        li.appendChild(metaSpan);
                                    }

                                    var ipTipParts = [];
                                    if (item.last_seen_human) {
                                        ipTipParts.push('آخرین بازدید: ' + item.last_seen_human);
                                    }
                                    if (item.last_path) {
                                        ipTipParts.push('آخرین URL: ' + item.last_path);
                                    }
                                    if (ipTipParts.length) {
                                        li.title = ipTipParts.join(' — ');
                                    }

                                    listEl.appendChild(li);
                                });
                            }

                            if (!listEl.children.length) {
                                var liEmpty = document.createElement('li');
                                liEmpty.textContent = <?php echo json_encode(ux_t('no_entries', 'داده‌ای ثبت نشده است.')); ?>;
                                listEl.appendChild(liEmpty);
                            }
                        }

                        // نمودار زمانی ۲۴ ساعت گذشته — با استفاده از Chart.js
                        if (chartEl && Array.isArray(data.timeline) && data.timeline.length) {
                            var labels = [];
                            var totalData = [];
                            var successData = [];
                            // برچسب‌ها را به سادگی با شماره‌های پی‌درپی تولید می‌کنیم
                            data.timeline.forEach(function (b, idx) {
                                labels.push(String(idx + 1));
                                totalData.push(typeof b.total === 'number' ? b.total : 0);
                                successData.push(typeof b.success === 'number' ? b.success : 0);
                            });

                            // اگر نمودار قبلی وجود دارد، داده‌ها را به‌روزرسانی کن
                            if (chartEl._chart) {
                                var ch = chartEl._chart;
                                ch.data.labels = labels;
                                if (ch.data.datasets && ch.data.datasets.length >= 2) {
                                    ch.data.datasets[0].data = totalData;
                                    ch.data.datasets[1].data = successData;
                                }
                                ch.update();
                            } else {
                                // ساخت نمودار جدید
                                var ctx = chartEl.getContext('2d');
                                chartEl._chart = new Chart(ctx, {
                                    type: 'line',
                                    data: {
                                        labels: labels,
                                        datasets: [
                                            {
                                                label: <?php echo json_encode(ux_t('label_views', 'بازدید')); ?>,
                                                data: totalData,
                                                borderColor: '#f97316',
                                                backgroundColor: 'rgba(249,115,22,0.2)',
                                                fill: true,
                                                tension: 0.3,
                                                pointRadius: 0,
                                            },
                                            {
                                                label: <?php echo json_encode(ux_t('label_success', 'موفق')); ?>,
                                                data: successData,
                                                borderColor: '#22c55e',
                                                backgroundColor: 'rgba(34,197,94,0.2)',
                                                fill: true,
                                                tension: 0.3,
                                                pointRadius: 0,
                                            },
                                        ],
                                    },
                                    options: {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            x: {
                                                display: false,
                                            },
                                            y: {
                                                display: false,
                                            },
                                        },
                                        plugins: {
                                            legend: {
                                                display: true,
                                                labels: {
                                                    color: '#cbd5e1',
                                                    font: {
                                                        size: 9,
                                                    },
                                                    usePointStyle: true,
                                                    boxHeight: 6,
                                                    boxWidth: 6,
                                                },
                                                position: 'bottom',
                                            },
                                            tooltip: {
                                                enabled: true,
                                                backgroundColor: 'rgba(15,23,42,0.9)',
                                                borderColor: 'rgba(148,163,184,0.3)',
                                                borderWidth: 1,
                                                titleColor: '#f5f5f5',
                                                bodyColor: '#f5f5f5',
                                                displayColors: false,
                                                bodyFont: {
                                                    size: 10,
                                                },
                                                titleFont: {
                                                    size: 10,
                                                },
                                                callbacks: {
                                                    label: function (context) {
                                                        var label = context.dataset.label || '';
                                                        if (label) label += ': ';
                                                        label += context.formattedValue;
                                                        return label;
                                                    },
                                                },
                                            },
                                        },
                                    },
                                });
                            }
                        } else if (chartEl) {
                            // اگر داده‌ای نیست، نمودار قبلی را پاک کن
                            if (chartEl._chart) {
                                chartEl._chart.destroy();
                                chartEl._chart = null;
                            }
                        }

                        // Health pill: server may return either a string (legacy)
                        // or an object like {status:"normal|warning|...", score:<success_rate>}.
                        if (healthEl) {
                            var label = <?php echo json_encode(ux_t('status_unknown', 'نامشخص')); ?>;
                            var cls = '';

                            var hs = (typeof data !== 'undefined' && data) ? data.health : null;
                            var status = '';
                            var score = null;

                            if (hs && typeof hs === 'object') {
                                status = String(hs.status || '');
                                if (typeof hs.score === 'number' && isFinite(hs.score)) {
                                    score = hs.score;
                                }
                            } else if (typeof hs === 'string') {
                                status = hs;
                            }

                            status = (status || '').toLowerCase();

                            if (status === 'good' || status === 'ok' || status === 'normal') {
                                label = <?php echo json_encode(ux_t('status_ok', 'سالم')); ?>;
                                cls = 'ux-bot-health-good';
                            } else if (status === 'warning') {
                                label = <?php echo json_encode(ux_t('status_warning', 'هشدار')); ?>;
                                cls = 'ux-bot-health-warning';
                            } else if (status === 'bad' || status === 'down') {
                                label = <?php echo json_encode(ux_t('status_bad', 'ناسالم')); ?>;
                                cls = 'ux-bot-health-bad';
                            } else if (status === 'no_data' || status === 'nodata') {
                                label = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;
                            }

                            // Add a helpful tooltip with score when available
                            if (score !== null) {
                                healthEl.title = 'success_rate: ' + String(score) + '%';
                            } else {
                                healthEl.title = '';
                            }

                            healthEl.textContent = label;
                            healthEl.classList.remove('ux-bot-health-good','ux-bot-health-warning','ux-bot-health-bad');
                            if (cls) {
                                healthEl.classList.add(cls);
                            }
                        }
                    }
                    

                        // --- Popup modal برای جزییات ربات / IP ---
                        var botModalInitiated = false;
                        // حالت اولیه برای مودال خطا (لیست خطاها)
                        var errorModalInitiated = false;
                        // base URL سایت برای لینک‌دار کردن مسیرها در مودال بات‌ها
                        var UX_BOT_BASE_URL = <?php echo json_encode(rtrim($config['site_url'] ?? '/', '/')); ?> || '';

                        // helper ساده برای escape کردن HTML
                        function uxEscapeHtml(str) {
                          if (str === null || str === undefined) return '';
                          return String(str)
                             .replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;')
                             .replace(/'/g, '&#039;');
                        }

                        function uxOpenBotModal(kind, id) {
                            var backdrop = document.getElementById('ux-bot-modal-backdrop');
                            var titleEl  = document.getElementById('ux-bot-modal-title');
                            var summaryEl= document.getElementById('ux-bot-modal-summary');
                            var rowsBody = document.getElementById('ux-bot-modal-rows');
                            if (!backdrop || !titleEl || !summaryEl || !rowsBody) return;

                            backdrop.style.display = 'flex';
                            backdrop.setAttribute('aria-hidden', 'false');

                            if (kind === 'bot') {
                                titleEl.textContent = <?php echo json_encode(ux_t('bot_details_prefix', 'جزییات ربات: ')); ?> + id;
                            } else if (kind === 'ip') {
                                titleEl.textContent = <?php echo json_encode(ux_t('ip_details_prefix', 'جزییات IP: ')); ?> + id;
                            } else {
                                titleEl.textContent = <?php echo json_encode(ux_t('visit_details_title', 'جزییات بازدید')); ?>;
                            }

                                summaryEl.textContent = <?php echo json_encode(ux_t('loading_text', 'در حال بارگذاری…')); ?>;
                                rowsBody.innerHTML = '<tr><td colspan="4">' + <?php echo json_encode(ux_t('loading_text', 'در حال بارگذاری…')); ?> + '</td></tr>';

                            var params = [];
                            params.push('ux_ajax=bot-detail');
                            if (kind === 'bot') {
                            params.push('bot=' + encodeURIComponent(id));
                            } else if (kind === 'ip') {
                            params.push('ip=' + encodeURIComponent(id));
                            }

                            // مثل buildLiveUrl: کوئری فعلی (از جمله ux-panel=1) را نگه می‌داریم
                            var href = window.location.href;
                            href = href.replace(/(#.*)$/g, '').replace(/(&ux_ajax=[^&]*)/g, '');
                            var sep = href.indexOf('?') === -1 ? '?' : '&';
                            var url = href + sep + params.join('&');

                            fetch(url, {credentials:'same-origin'})
                                .then(function (res) { return res.json(); })
                                .then(function (json) {
                                    if (!json || !Array.isArray(json.items)) {
                            summaryEl.textContent = <?php echo json_encode(ux_t('no_data_found', 'داده‌ای یافت نشد.')); ?>;
                            rowsBody.innerHTML = '<tr><td colspan="4">' + <?php echo json_encode(ux_t('no_data_found', 'داده‌ای یافت نشد.')); ?> + '</td></tr>';
                                        return;
                                    }

                                    var total    = json.total || 0;
                                    var success  = json.success || 0;
                                    var timeouts = json.timeouts || 0;
                                    var unique   = json.unique_paths || 0;

                                    summaryEl.innerHTML = ''
                                        + '<strong>' + total + '</strong> درخواست'
                                        + '، <strong>' + success + '</strong> موفق'
                                        + (timeouts ? '، ' + timeouts + ' timeout' : '')
                                        + '، ' + unique + ' URL یکتا در لاگ.';

                                    if (!json.items.length) {
                            rowsBody.innerHTML = '<tr><td colspan="4">' + <?php echo json_encode(ux_t('no_requests_in_log', 'هیچ درخواستی در لاگ ثبت نشده است.')); ?> + '</td></tr>';
                                        return;
                                    }

                                    var html = '';
                                        json.items.forEach(function (row) {
                                            var t   = row.time || '';
                                            var ip  = row.ip || '';
                                            var st  = (typeof row.status === 'number') ? row.status : '';
                                            var p   = row.path || '/';

                                            // تلاش برای خواناتر کردن URL (فارسی‌ها را از حالت %.. در می‌آوریم)
                                            var displayPath = p;
                                            try {
                                                displayPath = decodeURIComponent(p);
                                            } catch (e) {
                                                // اگر مشکلی در decode بود، همان مقدار خام را نمایش بده
                                                displayPath = p;
                                            }

                                            // ساختن URL کامل با دامنه سایت
                                            var base = UX_BOT_BASE_URL || '';
                                            if (base && base.slice(-1) === '/') {
                                                base = base.slice(0, -1);
                                            }
                                            var rel  = p.charAt(0) === '/' ? p : '/' + p;
                                            var full = base + rel;

                                            html += '<tr>'
                                                + '<td>' + uxEscapeHtml(t) + '</td>'
                                                + '<td class="ux-bot-modal-ip">' + uxEscapeHtml(ip) + '</td>'
                                                + '<td>' + uxEscapeHtml(st) + '</td>'
                                                + '<td class="ux-bot-modal-path">'
                                                    + '<a href="' + uxEscapeHtml(full) + '" target="_blank" rel="noopener">'
                                                    + uxEscapeHtml(displayPath || '/')
                                                    + '</a>'
                                                + '</td>'
                                                + '</tr>';
                                        });

                                    rowsBody.innerHTML = html;
                                })["catch"](function () {
                                    summaryEl.textContent = <?php echo json_encode(ux_t('fetch_error', 'خطا در دریافت داده‌ها.')); ?>;
                                    rowsBody.innerHTML = '<tr><td colspan="4">' + <?php echo json_encode(ux_t('fetch_error', 'خطا در دریافت داده‌ها.')); ?> + '</td></tr>';
                                });
                        }

                        function uxCloseBotModal() {
                           var backdrop = document.getElementById('ux-bot-modal-backdrop');
                           if (!backdrop) return;
                           backdrop.style.display = 'none';
                           backdrop.setAttribute('aria-hidden', 'true');
                        }

                        // اکسپورت به فضای global برای onclick دکمه X
                        window.uxCloseBotModal = uxCloseBotModal;

                        // ---------- Error modal (4xx / 5xx lists) ----------
                        /**
                         * نمایش مودال خطا و پر کردن آن با لیست URLها.
                         * @param {string} type Type of error list to display ('4xx' or '5xx')
                         */
                        function uxOpenErrorModal(type) {
                            var backdrop = document.getElementById('ux-error-modal-backdrop');
                            var titleEl  = document.getElementById('ux-error-modal-title');
                            var summaryEl= document.getElementById('ux-error-modal-summary');
                            var rowsBody = document.getElementById('ux-error-modal-rows');
                            if (!backdrop || !titleEl || !summaryEl || !rowsBody) return;

                            // Determine the list and labels
                            var list = [];
                            var totalHits = 0;
                            if (type === '4xx') {
                                list = Array.isArray(window.uxAllErrorList4xx) ? window.uxAllErrorList4xx : [];
                                titleEl.textContent = <?php echo json_encode(ux_t('error_list_title_4xx', 'لیست خطاهای ۴xx')); ?>;
                            } else if (type === '5xx') {
                                list = Array.isArray(window.uxAllErrorList5xx) ? window.uxAllErrorList5xx : [];
                                titleEl.textContent = <?php echo json_encode(ux_t('error_list_title_5xx', 'لیست خطاهای ۵xx')); ?>;
                            } else {
                                list = [];
                                titleEl.textContent = '';
                            }

                            // Compute total hits and unique URL count
                            var uniqueCount = 0;
                            list.forEach(function (item) {
                                if (item && typeof item.count === 'number') {
                                    totalHits += item.count;
                                    uniqueCount++;
                                }
                            });

                            // Build summary text: number of URLs and total hits
                            summaryEl.innerHTML = ''
                                + '<strong>' + uniqueCount + '</strong> '
                                + <?php echo json_encode(ux_t('unique_pages_label', 'unique pages')); ?> + ' — '
                                + '<strong>' + totalHits + '</strong> '
                                + <?php echo json_encode(ux_t('hits_label', 'hit')); ?>;

                            // Build rows
                            if (!list || list.length === 0) {
                                rowsBody.innerHTML = '<tr><td colspan="2">' + <?php echo json_encode(ux_t('no_important_errors','خطای مهمی وجود ندارد.')); ?> + '</td></tr>';
                            } else {
                                var html = '';
                                list.forEach(function (item) {
                                    var p = item.path || '';
                                    var hits = (typeof item.count === 'number') ? item.count : 0;
                                    var displayPath = p;
                                    try {
                                        displayPath = decodeURIComponent(p);
                                    } catch (e) {
                                        displayPath = p;
                                    }
                                    // Build full URL with site base (if provided)
                                    var base = UX_BOT_BASE_URL || '';
                                    if (base && base.slice(-1) === '/') {
                                        base = base.slice(0, -1);
                                    }
                                    var rel = (p && p.charAt(0) === '/') ? p : '/' + p;
                                    var full = base + rel;
                                    html += '<tr>'
                                        + '<td class="ux-error-modal-path">'
                                        + '<a href="' + uxEscapeHtml(full) + '" target="_blank" rel="noopener">'
                                        + uxEscapeHtml(displayPath || '/') + '</a></td>'
                                        + '<td>' + uxEscapeHtml(String(hits)) + '</td>'
                                        + '</tr>';
                                });
                                rowsBody.innerHTML = html;
                            }

                            // Show modal
                            backdrop.style.display = 'flex';
                            backdrop.setAttribute('aria-hidden', 'false');
                        }

                        /**
                         * بستن مودال خطا.
                         */
                        function uxCloseErrorModal() {
                            var backdrop = document.getElementById('ux-error-modal-backdrop');
                            if (!backdrop) return;
                            backdrop.style.display = 'none';
                            backdrop.setAttribute('aria-hidden', 'true');
                        }

                        // Expose globally for inline onclick usage
                        window.uxCloseErrorModal = uxCloseErrorModal;

                        /**
                         * یک بار پس از بارگذاری، event های لازم برای کلیک روی شمارنده خطاها را اضافه می‌کند.
                         */
                        function uxInitErrorModalOnce() {
                            if (errorModalInitiated) return;
                            errorModalInitiated = true;
                            // Click outside to close
                            var backdrop = document.getElementById('ux-error-modal-backdrop');
                            var closeBtn = document.getElementById('ux-error-modal-close');
                            if (closeBtn) {
                                closeBtn.addEventListener('click', function () {
                                    uxCloseErrorModal();
                                });
                            }
                            if (backdrop) {
                                backdrop.addEventListener('click', function (ev) {
                                    if (ev.target === backdrop) {
                                        uxCloseErrorModal();
                                    }
                                });
                            }
                            // Attach click on counters
                            var err4AllEl = document.getElementById('ux-all-4xx-count');
                            var err5AllEl = document.getElementById('ux-all-5xx-count');
                            if (err4AllEl) {
                                err4AllEl.addEventListener('click', function () {
                                    // Only open if there is at least one error
                                    if (window.uxAllErrorList4xx && window.uxAllErrorList4xx.length) {
                                        uxOpenErrorModal('4xx');
                                    }
                                });
                            }
                            if (err5AllEl) {
                                err5AllEl.addEventListener('click', function () {
                                    if (window.uxAllErrorList5xx && window.uxAllErrorList5xx.length) {
                                        uxOpenErrorModal('5xx');
                                    }
                                });
                            }
                        }

                        function uxInitBotModalOnce() {
                            if (botModalInitiated) return;
                            botModalInitiated = true;

                            var backdrop = document.getElementById('ux-bot-modal-backdrop');
                            var closeBtn = document.getElementById('ux-bot-modal-close');
                            if (closeBtn) {
                                closeBtn.addEventListener('click', function () {
                                    uxCloseBotModal();
                                });
                            }
                            if (backdrop) {
                                backdrop.addEventListener('click', function (ev) {
                                    if (ev.target === backdrop) {
                                        uxCloseBotModal();
                                    }
                                });
                            }

                            var listEl = document.getElementById('ux-bot-list');
                            if (listEl) {
                                listEl.addEventListener('click', function (ev) {
                                    var row = ev.target.closest('li.ux-bot-row');
                                    if (!row) return;
                                    var kind = row.getAttribute('data-kind');
                                    var bot  = row.getAttribute('data-bot');
                                    var ip   = row.getAttribute('data-ip');
                                    if (kind === 'bot' && bot) {
                                        uxOpenBotModal('bot', bot);
                                    } else if (kind === 'ip' && ip) {
                                        uxOpenBotModal('ip', ip);
                                    }
                                });
                            }
                        }

                        // بعد از هر بار رندر لیست، اطمینان از فعال بودن کلیک‌ها
                        // رویدادهای مودال ربات و مودال خطا درون applyBotStats مدیریت می‌شوند.

function pollBot() {
                        var url = buildBotUrl();
                        try {
                            fetch(url, { credentials: 'same-origin' })
                                .then(function (r) {
                                    if (!r.ok) return null;
                                    return r.json();
                                })
                                .then(function (data) {
                                    applyBotStats(data);
                                })
                                .catch(function () {});
                        } catch (e) {}
                    }


                    function poll() {
                        var url = buildUrl();
                        try {
                            fetch(url, { credentials: 'same-origin' })
                                .then(function (r) {
                                    if (!r.ok) return null;
                                    return r.json();
                                })
                                .then(function (data) {
                                    applyStats(data);
                                })
                                .catch(function () {});
                        } catch (e) {
                            // اگر fetch در مرورگر پشتیبانی نشود، آپدیت زنده انجام نمی‌شود
                        }
                    }

                    // هر چند میلی‌ثانیه که در تنظیمات مشخص شده آمار زنده را بروزرسانی می‌کند
                    var livePollInterval = <?php echo (int)($config['live_poll_interval_ms'] ?? 3000); ?>;
                    if (!livePollInterval || livePollInterval < 500) {
                        livePollInterval = 3000;
                    }
                    setInterval(function () {
                        poll();
                        pollBot();
                    }, livePollInterval);
                    // اولین فراخوانی بلافاصله
                    poll();
                    pollBot();
                    initSmartHistory();
                    // Initialize error modal once on page load so that click handlers
                    // are attached even before any bot stats are returned.
                    try {
                        uxInitErrorModalOnce();
                    } catch (e) {
                        // function may not be defined yet; ignore
                    }
                    // When filter controls change, re-fetch bot stats immediately
                    (function () {
                        var botSel  = document.getElementById('ux-bot-filter');
                        var pathIn  = document.getElementById('ux-path-filter');
                        if (botSel) {
                            botSel.addEventListener('change', function () {
                                pollBot();
                            });
                        }
                        if (pathIn) {
                            var timer = null;
                            pathIn.addEventListener('input', function () {
                                // Debounce to reduce load on typing
                                if (timer) clearTimeout(timer);
                                timer = setTimeout(function () {
                                    pollBot();
                                }, 500);
                            });
                        }
                    })();

                    // بروزرسانی دوره‌ای نمودار صف هوشمند بدون نیاز به رفرش صفحه
                    // هر ۳۰ ثانیه یک بار، داده‌های جدید را دریافت کرده و Chart.js را به‌روزرسانی می‌کند.
                    setInterval(function () {
                        try {
                            var activeBtn = document.querySelector('.ux-history-btn.ux-history-btn-active');
                            var range = activeBtn ? activeBtn.getAttribute('data-range') || '24h' : '24h';
                            fetchSmartHistory(range);
                        } catch (e) {
                            // اگر مرورگر از fetch پشتیبانی نکند یا خطا داشته باشد، نادیده می‌گیریم
                        }
                    }, 30000);

                    // مدیریت دکمهٔ «محاسبهٔ آمار اکنون»
                    (function () {
                        var preBtn = document.getElementById('ux-precompute-btn');
                        var preMsg = document.getElementById('ux-precompute-message');
                        if (preBtn) {
                            var originalLabel = preBtn.textContent;
                            preBtn.addEventListener('click', function () {
                                // Disable button to prevent multiple clicks
                                if (preBtn.classList.contains('ux-disabled')) return;
                                preBtn.classList.add('ux-disabled');
                                // Show loading indicator
                                var loadingText = <?php echo json_encode(ux_t('loading_text', 'در حال بارگذاری…')); ?>;
                                preBtn.textContent = loadingText;
                                fetch('?ux_ajax=analytics-precompute', {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                                    .then(function (r) {
                                        if (!r || !r.ok) return null;
                                        return r.json();
                                    })
                                    .then(function (data) {
                                        preBtn.classList.remove('ux-disabled');
                                        preBtn.textContent = originalLabel;
                                        if (preMsg && data && typeof data.message === 'string') {
                                            preMsg.textContent = data.message;
                                        }
                                        // Refresh bot stats to reflect recomputed data
                                        try {
                                            pollBot();
                                        } catch (e) {}
                                    })
                                    .catch(function () {
                                        preBtn.classList.remove('ux-disabled');
                                        preBtn.textContent = originalLabel;
                                    });
                            });
                        }
                    })();
                })();
            </script>



            
            <div id="ux-bot-modal-backdrop" class="ux-bot-modal-backdrop" aria-hidden="true">
                <div class="ux-bot-modal">
                    <div class="ux-bot-modal-header">
                <div class="ux-bot-modal-title" id="ux-bot-modal-title"><?php echo htmlspecialchars(ux_t('bot_details_title', 'جزییات ربات'), ENT_QUOTES, 'UTF-8'); ?></div>
                <button
                 type="button"
                 class="ux-bot-modal-close"
                 id="ux-bot-modal-close"
                 aria-label="<?php echo htmlspecialchars(ux_t('btn_close', 'بستن'), ENT_QUOTES, 'UTF-8'); ?>"
                 onclick="uxCloseBotModal();"
                >×</button>

                    </div>
                    <div class="ux-bot-modal-summary" id="ux-bot-modal-summary">
                        <?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?>
                    </div>
                    <div class="ux-bot-modal-list">
                        <table class="ux-bot-modal-table">
                            <thead>
                                <tr>
                                    <th><?php echo htmlspecialchars(ux_t('label_time', 'زمان'), ENT_QUOTES, 'UTF-8'); ?></th>
                                    <th>IP</th>
                                    <th><?php echo htmlspecialchars(ux_t('label_status', 'وضعیت'), ENT_QUOTES, 'UTF-8'); ?></th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody id="ux-bot-modal-rows">
                                <tr>
                                    <td colspan="4"><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        <!-- Error modal for 4xx/5xx lists -->
        <div id="ux-error-modal-backdrop" class="ux-error-modal-backdrop" aria-hidden="true">
            <div class="ux-error-modal">
                <div class="ux-error-modal-header">
                    <div class="ux-error-modal-title" id="ux-error-modal-title"></div>
                    <button
                        type="button"
                        class="ux-error-modal-close"
                        id="ux-error-modal-close"
                        aria-label="<?php echo htmlspecialchars(ux_t('btn_close', 'بستن'), ENT_QUOTES, 'UTF-8'); ?>"
                        onclick="uxCloseErrorModal();"
                    >×</button>
                </div>
                <div class="ux-error-modal-summary" id="ux-error-modal-summary"></div>
                <div class="ux-error-modal-list">
                    <table class="ux-error-modal-table">
                        <thead>
                            <tr>
                                <th><?php echo htmlspecialchars(ux_t('label_url','URL'), ENT_QUOTES, 'UTF-8'); ?></th>
                                <th><?php echo htmlspecialchars(ux_t('label_hits','تعداد'), ENT_QUOTES, 'UTF-8'); ?></th>
                            </tr>
                        </thead>
                        <tbody id="ux-error-modal-rows">
                            <tr><td colspan="2"><?php echo htmlspecialchars(ux_t('loading_text', 'در حال بارگذاری…'), ENT_QUOTES, 'UTF-8'); ?></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Persist bot filter and path filter in localStorage and auto-refresh stats on change -->
        <script>
document.addEventListener('DOMContentLoaded', function() {
            var botSel = document.getElementById('ux-bot-filter');
            var pathInput = document.getElementById('ux-path-filter');
            var storedBot = localStorage.getItem('ux_selected_bot');
            if (botSel && storedBot !== null) {
                botSel.value = storedBot;
            }
            var storedPath = localStorage.getItem('ux_selected_path');
            if (pathInput && storedPath !== null) {
                pathInput.value = storedPath;
            }

            // پس از بازگردانی فیلترها از localStorage، آمار را به‌روزرسانی می‌کنیم
            if (typeof pollBot === 'function') {
                pollBot();
            }
            if (botSel) {
                botSel.addEventListener('change', function() {
                    localStorage.setItem('ux_selected_bot', botSel.value || '');
                    if (typeof pollBot === 'function') {
                        pollBot();
                    }
                });
            }
            if (pathInput) {
                var inputTimeout;
                pathInput.addEventListener('input', function() {
                    clearTimeout(inputTimeout);
                    localStorage.setItem('ux_selected_path', pathInput.value || '');
                    inputTimeout = setTimeout(function() {
                        if (typeof pollBot === 'function') {
                            pollBot();
                        }
                    }, 400);
                });
            }
        });
        </script>

<!-- فرم اصلی تنظیمات -->
            <form id="ux-settings-form" method="post" enctype="multipart/form-data">
                <input type="hidden" name="ux_action" value="save_settings">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">

                <!-- Begin settings layout -->
                <div class="ux-settings-layout">
                    <div class="ux-settings-nav">
                        <div class="ux-tabs-container">
                            <div class="ux-tabs">
                        <!-- Monitoring / dashboard tab -->
                        <a href="#sec-monitoring"><?php echo htmlspecialchars(ux_t('tab_monitoring', 'Monitoring'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-gateway"><?php echo htmlspecialchars(ux_t('tab_status_mode', 'وضعیت و حالت کار'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-ips"><?php echo htmlspecialchars(ux_t('tab_ips', 'دسترسی / استثناها'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <!-- SEO and search bots tab -->
                        <a href="#sec-seo"><?php echo htmlspecialchars(ux_t('seo_title', 'SEO و ربات‌های موتور جستجو'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-design"><?php echo htmlspecialchars(ux_t('tab_design', 'ظاهر کمپین'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-countdown"><?php echo htmlspecialchars(ux_t('tab_countdown', 'شمارش معکوس'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-html"><?php echo htmlspecialchars(ux_t('tab_html', 'HTML / CTA'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-security"><?php echo htmlspecialchars(ux_t('tab_security', 'امنیت پنل'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-retention"><?php echo htmlspecialchars(ux_t('tab_retention', 'نگهداری و پشتیبان‌گیری'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <!-- Added Redis and Analytics settings tabs -->
                        <a href="#sec-redis"><?php echo htmlspecialchars(ux_t('tab_redis', 'تنظیمات ردیس'), ENT_QUOTES, 'UTF-8'); ?></a>
                        <a href="#sec-analytics"><?php echo htmlspecialchars(ux_t('tab_analytics', 'تنظیمات آنالیتیکس'), ENT_QUOTES, 'UTF-8'); ?></a>
                            </div><!-- .ux-tabs -->
                        </div><!-- .ux-tabs-container -->
                    </div><!-- .ux-settings-nav -->
                    <div class="ux-settings-content">

                <fieldset id="sec-gateway">
                    <legend><?php echo htmlspecialchars(ux_t('section_activation_mode', 'Activation & mode'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="enabled" value="1" <?php echo $is_enabled ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('enable_gateway_label', 'Enable unixsee campaign gateway'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('enable_gateway_help', 'Enable this option during heavy campaigns or high traffic.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>
                            <div class="ux-advanced-toggle">
                                <label>
                                    <input type="checkbox" id="ux-advanced-toggle">
                                    <?php echo htmlspecialchars(ux_t('show_advanced_design_settings', 'Show advanced design settings'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('mode_label', 'Mode'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <select name="mode">
                                <option value="maintenance" <?php echo $config['mode']==='maintenance'?'selected':''; ?>>
                                    <?php echo htmlspecialchars(ux_t('mode_maintenance', 'Maintenance / static campaign page'), ENT_QUOTES, 'UTF-8'); ?>
                                </option>
                                <option value="whitelist"   <?php echo $config['mode']==='whitelist'  ?'selected':''; ?>>
                                    <?php echo htmlspecialchars(ux_t('mode_whitelist', 'Whitelist (only allowed IPs)'), ENT_QUOTES, 'UTF-8'); ?>
                                </option>
                                <option value="queue"       <?php echo $config['mode']==='queue'      ?'selected':''; ?>>
                                    <?php echo htmlspecialchars(ux_t('mode_queue', 'Queue (limit concurrent users)'), ENT_QUOTES, 'UTF-8'); ?>
                                </option>
                                <option value="smart_queue" <?php echo $config['mode']==='smart_queue'?'selected':''; ?>>
                                    <?php echo htmlspecialchars(ux_t('mode_smart_queue', 'Queue – smart (based on server load)'), ENT_QUOTES, 'UTF-8'); ?>
                                </option>
                            </select>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('mode_help', 'In queue mode, only up to the max concurrent users can enter the site.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('max_active_users_label', 'حداکثر کاربران همزمان (Queue)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="max_active_users" min="1" value="<?php echo (int)$config['max_active_users']; ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('max_active_users_help', 'مثلاً ۱۵۰ تا ۳۰۰ نفر (برای فروش‌های خیلی سنگین).'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('idle_session_minutes_label', 'مدت بیکاری مجاز کاربر در صف (دقیقه)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="session_lifetime" min="1" value="<?php echo (int)$idle_minutes; ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('idle_session_minutes_help', 'اگر روی ۲ تا ۵ دقیقه بگذاری، کاربر بیکار بعد از آن از صف خارج می‌شود و جا برای نفر جدید باز می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <!-- تنظیم فاصله بروز رسانی آمار زنده -->
                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('live_poll_interval_label', 'فاصله بروزرسانی آمار زنده (میلی‌ثانیه)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="live_poll_interval_ms" min="500" value="<?php echo (int)($config['live_poll_interval_ms'] ?? 3000); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('live_poll_interval_help', 'زمان بین درخواست‌های متوالی برای بروزرسانی آمار کاربران و صف. مقدار کمتر باعث دقت بیشتر و بار بیشتر می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <!-- تنظیمات صف هوشمند: اهداف مصرف و پیش‌بینی -->
                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_target_cpu_label', 'هدف مصرف CPU برای صف هوشمند (درصد)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="smart_target_cpu" min="1" max="100" value="<?php echo htmlspecialchars($config['smart_target_cpu'] ?? 75, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_target_cpu_help', 'درصدی که الگوریتم صف هوشمند سعی می‌کند مصرف CPU را حول آن نگه دارد.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_target_mem_label', 'هدف مصرف حافظه برای صف هوشمند (درصد)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="smart_target_mem" min="1" max="100" value="<?php echo htmlspecialchars($config['smart_target_mem'] ?? 80, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_target_mem_help', 'درصدی که الگوریتم صف هوشمند سعی می‌کند مصرف حافظه را حول آن نگه دارد.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_target_disk_label', 'هدف مصرف دیسک برای صف هوشمند (درصد)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="smart_target_disk" min="1" max="100" value="<?php echo htmlspecialchars($config['smart_target_disk'] ?? 70, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_target_disk_help', 'حداکثر درصد اشغال دیسک که صف هوشمند به آن توجه می‌کند.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_max_conn_label', 'حداکثر اتصال به ازای هر کاربر فعال'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" step="0.1" name="smart_max_conn_per_user" min="1" value="<?php echo htmlspecialchars($config['smart_max_conn_per_user'] ?? 3, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_max_conn_help', 'اگر میانگین تعداد کانکشن هر کاربر بیشتر از این مقدار شود، ظرفیت کاهش می‌یابد.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_prediction_enabled_label', 'فعال‌سازی پیش‌بینی منابع'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="checkbox" name="smart_prediction_enabled" value="1" <?php echo !empty($config['smart_prediction_enabled']) ? 'checked' : ''; ?>>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_prediction_enabled_help', 'اگر فعال شود، از مدل میانگین نمایی برای پیش‌بینی مصرف CPU و حافظه استفاده می‌شود و ظرفیت بر اساس پیش‌بینی تنظیم می‌گردد.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:5px;">
                                <?php echo htmlspecialchars(ux_t('smart_prediction_alpha_label', 'ضریب یادگیری پیش‌بینی (alpha)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="smart_prediction_alpha" step="0.05" min="0.01" max="1" value="<?php echo htmlspecialchars($config['smart_prediction_alpha'] ?? 0.5, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_prediction_alpha_help', 'مقداری بین 0 و 1 که مشخص می‌کند نمونه‌های جدید چه وزنی در پیش‌بینی مصرف داشته باشند.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_log_no_change_label', 'ثبت تصمیم حتی بدون تغییر ظرفیت'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="checkbox" name="smart_log_no_change" value="1" <?php echo !empty($config['smart_log_no_change']) ? 'checked' : ''; ?>>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_log_no_change_help', 'اگر فعال باشد، حتی زمانی که ظرفیت تغییر نمی‌کند، یک تصمیم با دلیل "no_change" ثبت می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('wp_index_label', 'نام فایل index وردپرس'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="text" name="wp_index" value="<?php echo htmlspecialchars($config['wp_index'], ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('wp_index_help', 'معمولاً: index-wp.php (همان فایلی که index اصلی وردپرس را در آن ذخیره کرده‌ای).'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('timezone_label', 'TimeZone'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="text" name="timezone" value="<?php echo htmlspecialchars($config['timezone'], ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('timezone_help', 'مثل تنظیم وردپرس: Asia/Tehran'), ENT_QUOTES, 'UTF-8'); ?></div>
                        
                            <!-- Smart Queue Advanced: Update interval & Modules -->
                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_update_interval_label', 'فاصله بازمحاسبه ظرفیت صف هوشمند (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="smart_update_interval_seconds" min="1" max="60" value="<?php echo (int)($config['smart_update_interval_seconds'] ?? 10); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_update_interval_help', 'برای جلوگیری از فشار زیاد و نوسان، ظرفیت صف هوشمند فقط هر چند ثانیه یک‌بار محاسبه می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_modules_auto_enable_label', 'اجرای خودکار ماژول‌های صف هوشمند'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="checkbox" name="smart_modules_auto_enable" <?php echo !empty($config['smart_modules_auto_enable']) ? 'checked' : ''; ?>>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_modules_auto_enable_help', 'اگر روشن باشد، ماژول‌هایی که enabled=true دارند اجرا می‌شوند. اگر smart_modules_enabled را پر کنید، فقط همان‌ها اجرا می‌شوند.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <div style="margin-top:14px; padding:12px; border:1px solid rgba(148,163,184,0.18); border-radius:12px; background:rgba(15,23,42,0.25);">
                                <strong><?php echo htmlspecialchars(ux_t('latency_smart_title','هوشمندی بر اساس Latency (p95) و خطای 5xx'), ENT_QUOTES, 'UTF-8'); ?></strong>
                                <div class="ux-help" style="margin-top:6px;"><?php echo htmlspecialchars(ux_t('latency_smart_help','این حالت ظرفیت صف را بر اساس Tail Latency و نرخ خطای 5xx تنظیم می‌کند (Adaptive Concurrency).'), ENT_QUOTES, 'UTF-8'); ?></div>

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_smart_enabled_label','فعال‌سازی تصمیم‌گیری بر اساس Latency'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="checkbox" name="latency_smart_enabled" value="1" <?php echo !empty($config['latency_smart_enabled']) ? 'checked' : ''; ?>>

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_record_enabled_label','ثبت نمونه‌های Latency برای درخواست‌های عبوری'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="checkbox" name="latency_record_enabled" value="1" <?php echo !empty($config['latency_record_enabled']) ? 'checked' : ''; ?>>

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_window_seconds_label','پنجره زمانی (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" name="latency_window_seconds" min="30" max="600" value="<?php echo (int)($config['latency_window_seconds'] ?? 60); ?>">

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_sample_rate_label','نرخ نمونه‌برداری (0..1)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" step="0.01" name="latency_sample_rate" min="0" max="1" value="<?php echo htmlspecialchars($config['latency_sample_rate'] ?? 0.05, ENT_QUOTES, 'UTF-8'); ?>">

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_min_samples_label','حداقل نمونه برای تصمیم‌گیری'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" name="latency_min_samples" min="5" max="5000" value="<?php echo (int)($config['latency_min_samples'] ?? 30); ?>">

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_p95_target_ms_label','p95 هدف (ms)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" name="latency_p95_target_ms" min="50" max="60000" value="<?php echo (int)($config['latency_p95_target_ms'] ?? 900); ?>">

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_p95_hard_ms_label','p95 بحرانی (ms)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" name="latency_p95_hard_ms" min="50" max="120000" value="<?php echo (int)($config['latency_p95_hard_ms'] ?? 2500); ?>">

                                <label style="margin-top:10px;"><?php echo htmlspecialchars(ux_t('latency_err_rate_high_pct_label','آستانه خطای 5xx (%)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" step="0.1" name="latency_err_rate_high_pct" min="0" max="100" value="<?php echo htmlspecialchars($config['latency_err_rate_high_pct'] ?? 2.0, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>


                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_modules_enabled_label', 'لیست سفید ماژول‌ها (اختیاری)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <textarea name="smart_modules_enabled_csv" rows="2" placeholder="queue_growth,bot_pressure" style="width:100%;"><?php echo htmlspecialchars(is_array($config['smart_modules_enabled'] ?? null) ? implode(',', $config['smart_modules_enabled']) : '', ENT_QUOTES, 'UTF-8'); ?></textarea>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_modules_enabled_help', 'اگر این لیست پر باشد، فقط همین ماژول‌ها اجرا می‌شوند (با کاما جدا کنید).'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('smart_modules_disabled_label', 'لیست سیاه ماژول‌ها (اختیاری)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <textarea name="smart_modules_disabled_csv" rows="2" placeholder="some_module" style="width:100%;"><?php echo htmlspecialchars(is_array($config['smart_modules_disabled'] ?? null) ? implode(',', $config['smart_modules_disabled']) : '', ENT_QUOTES, 'UTF-8'); ?></textarea>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('smart_modules_disabled_help', 'این ماژول‌ها حتی اگر در لیست سفید باشند اجرا نمی‌شوند.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <?php if (function_exists('ux_smart_modules_list')): ?>
                                <?php $mods = ux_smart_modules_list(); ?>
                                <?php if (!empty($mods)): ?>
                                    <div style="margin-top:10px; padding:10px; border:1px solid rgba(0,0,0,0.08); border-radius:10px;">
                                        <strong><?php echo htmlspecialchars(ux_t('smart_modules_detected', 'ماژول‌های شناسایی‌شده:'), ENT_QUOTES, 'UTF-8'); ?></strong>
                                        <div class="ux-help" style="margin-top:6px;"><?php echo htmlspecialchars(ux_t('smart_modules_detected_help', 'برای اضافه کردن ماژول جدید، یک فایل PHP داخل پوشه smart_modules قرار دهید.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                        <ul style="margin:8px 0 0 18px;">
                                            <?php foreach ($mods as $m): ?>
                                                <li>
                                                    <code><?php echo htmlspecialchars($m['name'], ENT_QUOTES, 'UTF-8'); ?></code>
                                                    <span style="opacity:0.7;">(priority=<?php echo (int)$m['priority']; ?>)</span>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </div>
                                <?php endif; ?>
                            <?php endif; ?>

                    <div class="ux-row" style="margin-top:16px;">
                        <div class="ux-col-3">
                            <h3 class="ux-section-subtitle"><?php echo htmlspecialchars(ux_t('server_specs_title', 'مشخصات سرور'), ENT_QUOTES, 'UTF-8'); ?></h3>
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('server_specs_help', 'این مقادیر فقط برای نمایش و مانیتورینگ استفاده می‌شوند و روی عملکرد صف تأثیر مستقیم ندارند.'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('server_cores_label', 'تعداد Core'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="server_cpu_cores"
                                   value="<?php echo (int)($config['server_cpu_cores'] ?? 4); ?>">

                            <label style="margin-top:8px;">
                                <?php echo htmlspecialchars(ux_t('server_threads_label', 'تعداد Thread'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="server_cpu_threads"
                                   value="<?php echo (int)($config['server_cpu_threads'] ?? 8); ?>">
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('server_cpu_freq_label', 'فرکانس CPU (GHz)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" step="0.01" name="server_cpu_freq_ghz"
                                   value="<?php echo htmlspecialchars($config['server_cpu_freq_ghz'] ?? 3.20, ENT_QUOTES, 'UTF-8'); ?>">

                            <label style="margin-top:8px;">
                                <?php echo htmlspecialchars(ux_t('server_cpu_model_label', 'مدل CPU'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="text" name="server_cpu_model"
                                   value="<?php echo htmlspecialchars($config['server_cpu_model'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('server_ram_label', 'مقدار RAM (GB)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="server_ram_gb"
                                   value="<?php echo (int)($config['server_ram_gb'] ?? 16); ?>">

                            <label style="margin-top:8px;">
                                <?php echo htmlspecialchars(ux_t('server_disk_label', 'مقدار Disk (GB)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="number" name="server_disk_gb"
                                   value="<?php echo (int)($config['server_disk_gb'] ?? 256); ?>">
                        </div>
                    </div>
</div>
                    </div>
                </fieldset>

                <fieldset id="sec-ips">
                    <legend><?php echo htmlspecialchars(ux_t('access_exceptions_title', 'دسترسی / استثناها (آی‌پی و مسیر)'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-2">
                            <label><?php echo htmlspecialchars(ux_t('always_allowed_ips_label', 'آی‌پی‌های همیشه مجاز'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <textarea name="always_allow_ips" dir="ltr"><?php
                                echo htmlspecialchars(implode("\n", (array)$config['always_allow_ips']), ENT_QUOTES, 'UTF-8');
                            ?></textarea>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('always_allowed_ips_help', 'هر آی‌پی در یک خط. این آی‌پی‌ها حتی هنگام Queue و Maintenance هم سایت اصلی را می‌بینند (بهتر است آی‌پی خودت را اینجا اضافه کنی).'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-2">
                            <label><?php echo htmlspecialchars(ux_t('whitelist_ips_label', 'آی‌پی‌های مجاز در حالت Whitelist'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <textarea name="allowed_ips" dir="ltr"><?php
                                echo htmlspecialchars(implode("\n", (array)$config['allowed_ips']), ENT_QUOTES, 'UTF-8');
                            ?></textarea>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('whitelist_ips_help', 'فقط وقتی حالت کاری روی Whitelist باشد از این لیست استفاده می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('always_allowed_paths_label', 'مسیرهای همیشه مجاز (درگاه، وب‌هوک و ...)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <textarea name="bypass_paths" dir="ltr"><?php
                                echo htmlspecialchars(implode("\n", (array)$config['bypass_paths']), ENT_QUOTES, 'UTF-8');
                            ?></textarea>
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('always_allowed_paths_help', 'هر خط یک بخش از URL. هر صفحه‌ای که آدرسش شامل این بخش‌ها باشد، از گیت‌وی عبور نمی‌کند و مستقیم وارد وردپرس می‌شود.'), ENT_QUOTES, 'UTF-8'); ?><br>
                                <?php echo htmlspecialchars(ux_t('always_allowed_paths_example', 'مثال برای ووکامرس:'), ENT_QUOTES, 'UTF-8'); ?><br>
                                <code>/wc-api/</code><br>
                                <code>/checkout/order-received/</code><br>
                                <code>/checkout/order-pay/</code><br>
                                <code>?wc-ajax=checkout</code>
                            </div>

                        <div class="ux-row" style="margin-top:18px;">
                            <div class="ux-col-2">
                                <label><?php echo htmlspecialchars(ux_t('gateway_scope_label', 'حوزه اجرای گیت‌وی'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <select name="gateway_scope">
                                    <option value="site" <?php echo (($config['gateway_scope'] ?? 'site') === 'site') ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('gateway_scope_site_option', 'روی کل سایت (پیش‌فرض)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                    <option value="include_paths" <?php echo (($config['gateway_scope'] ?? 'site') === 'include_paths') ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('gateway_scope_include_option', 'فقط روی مسیرهای مشخص‌شده'), ENT_QUOTES, 'UTF-8'); ?></option>
                                </select>
                                <div class="ux-help">
                                    <?php echo htmlspecialchars(ux_t('gateway_scope_help', 'اگر «فقط روی مسیرهای مشخص‌شده» را انتخاب کنید، گیت‌وی فقط روی URLهای زیر اعمال می‌شود و بقیهٔ صفحات مستقیماً وارد وردپرس می‌شوند.'), ENT_QUOTES, 'UTF-8'); ?>
                                </div>
                            </div>
                            <div class="ux-col-2">
                                <label><?php echo htmlspecialchars(ux_t('include_paths_label', 'مسیرهایی که زیر گیت‌وی هستند (Include paths)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <textarea name="include_paths" dir="ltr"><?php
                                    echo htmlspecialchars(implode("\n", (array)($config['include_paths'] ?? [])), ENT_QUOTES, 'UTF-8');
                                ?></textarea>
                                <div class="ux-help">
                                    <?php echo htmlspecialchars(ux_t('include_paths_help', 'هر خط یک مسیر یا بخش از آدرس URL است که باید تحت کنترل گیت‌وی باشد.'), ENT_QUOTES, 'UTF-8'); ?><br>
                                    <?php echo htmlspecialchars(ux_t('include_paths_example', 'مثال:'), ENT_QUOTES, 'UTF-8'); ?><br>
                                    <code>/product/my-special-product</code><br>
                                    <code>/shop/black-friday</code>
                                </div>
                            </div>
                        </div>

                        <div class="ux-row" style="margin-top:18px;">
                            <div class="ux-col-3">
                                <label><?php echo htmlspecialchars(ux_t('page_cache_ttl_label', 'مدت کش صفحه کمپین (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <input type="number" name="page_cache_ttl"
                                       value="<?php echo (int)($config['page_cache_ttl'] ?? 15); ?>">
                                <div class="ux-help">
                                    <?php echo htmlspecialchars(ux_t('page_cache_ttl_help', 'اگر بزرگ‌تر از ۰ باشد، خروجی صفحه کمپین/صف انتظار برای همین مدت کش می‌شود تا فشار روی PHP و وردپرس در ترافیک بالا کمتر شود.'), ENT_QUOTES, 'UTF-8'); ?>
                                </div>
                            </div>
                        </div>

                        </div>
                    </div>
                    <!-- analytics precompute row removed from this section -->
                </fieldset>

                <fieldset id="sec-seo" class="ux-settings-section">
    <legend><?php echo ux_t('seo_and_bots', 'SEO و ربات‌های موتور جستجو'); ?></legend>

    <?php
    // Prepare Bot Blocks + UA Bank + Traffic data for this section
    $ux_now = time();
    $ux_db_blocks = [];
    $ux_active_ip_blocks = [];
    $ux_active_ua_blocks = [];
    $ux_active_ip_ids = [];
    $ux_active_ua_ids = [];

    try {
        $ux_blocks_pdo = ux_storage_pdo();
        ux_storage_migrate($ux_blocks_pdo);
        if (function_exists('ux_bot_blocks_cleanup_expired')) {
            ux_bot_blocks_cleanup_expired($ux_blocks_pdo);
        }

        $ux_db_blocks = $ux_blocks_pdo->query("SELECT * FROM bot_blocks ORDER BY active DESC, created_at DESC LIMIT 500")->fetchAll(PDO::FETCH_ASSOC);

        $rows = $ux_blocks_pdo->query("SELECT id, value FROM bot_blocks WHERE active = 1 AND type = 'ip'")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $ux_active_ip_blocks[(string)$r['value']] = true;
            $ux_active_ip_ids[(string)$r['value']] = (int)$r['id'];
        }
        $rows = $ux_blocks_pdo->query("SELECT id, value FROM bot_blocks WHERE active = 1 AND type = 'ua'")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $ux_active_ua_blocks[(string)$r['value']] = true;
            $ux_active_ua_ids[(string)$r['value']] = (int)$r['id'];
        }
    } catch (Throwable $e) {
        // ignore
    }

    // UA Bank list is loaded via AJAX (server-side pagination/filters)
    $ux_ua_rows = [];

    $ux_traffic_minutes = (int)($config['traffic_intel_chart_minutes'] ?? 120);
    if ($ux_traffic_minutes < 10) { $ux_traffic_minutes = 120; }
    $ux_traffic = function_exists('ux_traffic_minute_compute') ? ux_traffic_minute_compute($ux_traffic_minutes) : ['series'=>[],'from'=>0,'to'=>0];

    $ux_net_samples = function_exists('ux_net_samples_list') ? ux_net_samples_list(180) : [];
    ?>

    <div class="seo-bots-grid">

        <!-- Core toggles (2-column) -->
        <div class="seo-card">
            <h3><?php echo ux_t('allow_search_bots', 'Allow Search Bots'); ?></h3>
            <label class="ux-switch">
                <input type="checkbox" name="allow_search_bots" <?php echo !empty($config['allow_search_bots']) ? 'checked' : ''; ?>>
                <span class="ux-slider"></span>
                <span class="ux-switch-label"><?php echo ux_t('allow_search_bots_desc', 'اجازه عبور به ربات‌های موتور جستجو (در صورت تایید قوانین/تایید DNS)'); ?></span>
            </label>
            <div class="ux-help">
                <?php echo ux_t('allow_search_bots_help', 'برای جلوگیری از سئو-کِلینگ در حالت‌های Queue/Maintenance، ربات‌های معتبر را عبور دهید.'); ?>
            </div>
        </div>

        <div class="seo-card">
            <h3><?php echo ux_t('gateway_indexable', 'Indexable / Noindex'); ?></h3>
            <label class="ux-label"><?php echo ux_t('gateway_indexable_label', 'نمایش تگ‌های Robots'); ?></label>
            <select name="gateway_indexable" class="ux-input">
                <option value="1" <?php echo !empty($config['gateway_indexable']) ? 'selected' : ''; ?>><?php echo ux_t('indexable_yes', 'Indexable'); ?></option>
                <option value="0" <?php echo empty($config['gateway_indexable']) ? 'selected' : ''; ?>><?php echo ux_t('indexable_no', 'Noindex'); ?></option>
            </select>
            <div class="ux-help">
                <?php echo ux_t('gateway_indexable_help', 'در صورت Noindex، صفحه کمپین/صف با robots=noindex ارسال می‌شود.'); ?>
            </div>
        </div>

        <!-- Full width textareas -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('bot_user_agents', 'User-Agent Allow List'); ?></h3>
            <label class="ux-label"><?php echo ux_t('bot_user_agents_label', 'لیست ربات‌های مجاز (هر خط یک الگو)'); ?></label>
	            <textarea name="bot_user_agents" rows="7" class="ux-textarea" placeholder="Googlebot&#10;Bingbot"><?php echo htmlspecialchars(ux_cfg_lines($config['bot_user_agents'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
            <div class="ux-help">
                <?php echo ux_t('bot_user_agents_help', 'این لیست فقط با Allow Search Bots فعال می‌شود.'); ?>
            </div>
        </div>

        <div class="seo-card full-width">
            <h3><?php echo ux_t('bot_allow_rules', 'Allow Rules'); ?></h3>
            <label class="ux-label"><?php echo ux_t('bot_allow_rules_label', 'قوانین اجازه (هر خط: pattern)'); ?></label>
	            <textarea name="bot_allow_rules" rows="5" class="ux-textarea" placeholder="Googlebot: /product/&#10;Bingbot: /blog/"><?php echo htmlspecialchars(ux_cfg_lines($config['bot_allow_rules'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
        </div>

        <div class="seo-card full-width">
            <h3><?php echo ux_t('bot_deny_rules', 'Deny Rules'); ?></h3>
            <label class="ux-label"><?php echo ux_t('bot_deny_rules_label', 'قوانین منع (هر خط: pattern)'); ?></label>
	            <textarea name="bot_deny_rules" rows="5" class="ux-textarea" placeholder="* : /wp-admin/&#10;* : /xmlrpc.php"><?php echo htmlspecialchars(ux_cfg_lines($config['bot_deny_rules'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
        </div>

        <div class="seo-card full-width">
            <h3><?php echo ux_t('bot_score_suspicious_uas', 'Suspicious UA Patterns'); ?></h3>
            <label class="ux-label"><?php echo ux_t('bot_score_suspicious_uas_label', 'الگوهای UA مشکوک (هر خط یک الگو)'); ?></label>
	            <textarea name="bot_score_suspicious_uas" rows="5" class="ux-textarea" placeholder="python-requests&#10;curl&#10;httpclient"><?php echo htmlspecialchars(ux_cfg_lines($config['bot_score_suspicious_uas'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
        </div>

        <!-- Security controls (2-column) -->
        <div class="seo-card">
            <h3><?php echo ux_t('dns_validation', 'DNS Verification'); ?></h3>

            <label class="ux-switch">
                <input type="checkbox" name="bot_dns_validation_enabled" <?php echo !empty($config['bot_dns_validation_enabled']) ? 'checked' : ''; ?>>
                <span class="ux-slider"></span>
                <span class="ux-switch-label"><?php echo ux_t('dns_validation_enabled', 'فعال'); ?></span>
            </label>

            <label class="ux-label" style="margin-top:10px"><?php echo ux_t('dns_validation_mode', 'Mode'); ?></label>
            <select name="bot_dns_validation_mode" class="ux-input">
                <option value="off" <?php echo (($config['bot_dns_validation_mode'] ?? 'balanced') === 'off') ? 'selected' : ''; ?>>off</option>
                <option value="balanced" <?php echo (($config['bot_dns_validation_mode'] ?? 'balanced') === 'balanced') ? 'selected' : ''; ?>>balanced</option>
                <option value="strict" <?php echo (($config['bot_dns_validation_mode'] ?? 'balanced') === 'strict') ? 'selected' : ''; ?>>strict</option>
            </select>

            <div class="ux-help">
                <?php echo ux_t('dns_validation_help', 'برای ربات‌های موتور جستجو Reverse+Forward DNS را بررسی می‌کند.'); ?>
            </div>
        </div>

        <div class="seo-card">
            <h3><?php echo ux_t('cookie_smoothing', 'Cookie Smoothing'); ?></h3>

            <label class="ux-switch">
                <input type="checkbox" name="bot_cookie_enabled" <?php echo !empty($config['bot_cookie_enabled']) ? 'checked' : ''; ?>>
                <span class="ux-slider"></span>
                <span class="ux-switch-label"><?php echo ux_t('cookie_smoothing_enabled', 'فعال'); ?></span>
            </label>

            <div class="ux-row" style="margin-top:10px">
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('cookie_name', 'Cookie Name'); ?></label>
                    <input type="text" name="bot_cookie_name" class="ux-input" value="<?php echo htmlspecialchars((string)($config['bot_cookie_name'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('cookie_ttl', 'TTL (sec)'); ?></label>
                    <input type="number" name="bot_cookie_ttl_seconds" class="ux-input" value="<?php echo (int)($config['bot_cookie_ttl_seconds'] ?? 7200); ?>" min="0">
                </div>
            </div>            <?php
                $cw = (float)($config['bot_cookie_weight'] ?? 0.25);
                if ($cw < 0.0) { $cw = 0.0; }
                if ($cw > 0.6) { $cw = 0.6; }
                $cwPct = (int)round($cw * 100.0); // 0..60
            ?>

            <label class="ux-label" style="margin-top:10px"><?php echo ux_t('cookie_weight', 'Weight'); ?> <span style="opacity:.75">(0..0.6)</span></label>
            <div class="ux-row" style="margin-top:6px; align-items:center">
                <div class="ux-col" style="max-width:220px">
                    <input type="number" name="bot_cookie_weight" id="ux-cookie-weight-number" class="ux-input" value="<?php echo htmlspecialchars(number_format($cw, 2, '.', ''), ENT_QUOTES, 'UTF-8'); ?>" min="0" max="0.6" step="0.01">
                </div>
                <div class="ux-col" style="flex:1">
                    <input type="range" id="ux-cookie-weight-range" min="0" max="60" step="1" value="<?php echo $cwPct; ?>" class="ux-range">
                </div>
            </div>

            <div class="ux-row" style="margin-top:10px">
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('cookie_missing_penalty', 'No-cookie penalty'); ?> <span style="opacity:.75">(0..100)</span></label>
                    <input type="number" name="bot_score_missing_cookie_penalty" class="ux-input" value="<?php echo (int)($config['bot_score_missing_cookie_penalty'] ?? 0); ?>" min="0" max="100">
                </div>
            </div>

            <div class="ux-help">
                <?php echo ux_t('cookie_smoothing_help', 'Penalize clients that do not retain cookies'); ?>
                <div style="margin-top:6px;opacity:.9">
                    <?php echo ux_t('cookie_weight', 'Weight'); ?>: <strong id="ux-cookie-weight-value" style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"><?php echo htmlspecialchars(number_format($cw, 2, '.', ''), ENT_QUOTES, 'UTF-8'); ?></strong>
                </div>
            </div>
        </div>

        <!-- Bot Intelligence -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('bot_intelligence', 'Bot Intelligence'); ?></h3>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="bot_scoring_enabled" <?php echo !empty($config['bot_scoring_enabled']) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('bot_scoring_enabled', 'فعال'); ?></span>
                    </label>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('bot_bad_action', 'Bad Action'); ?></label>
                    <select name="bot_bad_action" class="ux-input">
                        <option value="queue" <?php echo (($config['bot_bad_action'] ?? 'queue') === 'queue') ? 'selected' : ''; ?>>queue</option>
                        <option value="block" <?php echo (($config['bot_bad_action'] ?? 'queue') === 'block') ? 'selected' : ''; ?>>block</option>
                    </select>
                </div>
            </div>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('bad_threshold', 'Bad Threshold'); ?></label>
                    <input type="number" name="bot_score_bad_threshold" class="ux-input" value="<?php echo (int)($config['bot_score_bad_threshold'] ?? 0); ?>">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('good_threshold', 'Good Threshold'); ?></label>
                    <input type="number" name="bot_score_good_threshold" class="ux-input" value="<?php echo (int)($config['bot_score_good_threshold'] ?? 0); ?>">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('hard_bad_threshold', 'Hard Bad Threshold'); ?></label>
                    <input type="number" name="bot_score_hard_bad_threshold" class="ux-input" value="<?php echo (int)($config['bot_score_hard_bad_threshold'] ?? 0); ?>">
                </div>
            </div>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="bot_score_fast_path" <?php echo !empty($config['bot_score_fast_path']) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('fast_path', 'Fast Path'); ?></span>
                    </label>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('no_js_penalty', 'No-JS Penalty'); ?></label>
                    <input type="number" name="bot_score_no_js_penalty" class="ux-input" value="<?php echo (int)($config['bot_score_no_js_penalty'] ?? 0); ?>">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('suspicious_ua_penalty', 'Suspicious UA Penalty'); ?></label>
                    <input type="number" name="bot_score_suspicious_ua_penalty" class="ux-input" value="<?php echo (int)($config['bot_score_suspicious_ua_penalty'] ?? 0); ?>">
                </div>
            </div>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="bot_score_rate_enabled" <?php echo (!array_key_exists('bot_score_rate_enabled', $config) || !empty($config['bot_score_rate_enabled'])) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('rate_limit_enabled', 'Rate Limit Enabled'); ?></span>
                    </label>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('rate_window', 'Rate Window (sec)'); ?></label>
                    <input type="number" name="bot_score_rate_window" class="ux-input" value="<?php echo (int)($config['bot_score_rate_window'] ?? (int)round((float)($config['bot_rate_half_life_seconds'] ?? 10.0))); ?>">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('rate_max', 'Rate Max'); ?></label>
                    <input type="number" name="bot_score_rate_max" class="ux-input" value="<?php echo (int)($config['bot_score_rate_max'] ?? (int)round((float)($config['bot_score_rate_threshold'] ?? 120))); ?>">
                </div>
            </div>

            <div class="ux-help">
                <?php echo ux_t('bot_intel_help', 'پیشنهاد: برای جلوگیری از False Positive، Auto-Block را strikes-based نگه دارید.'); ?>
            </div>
        </div>

        <!-- Auto-Block -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('auto_block', 'Auto-Block (Strikes-based)'); ?></h3>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="auto_block_enabled" <?php echo !empty($config['auto_block_enabled']) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('auto_block_enabled', 'فعال'); ?></span>
                    </label>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('auto_block_mode', 'Mode'); ?></label>
                    <select name="auto_block_mode" class="ux-input">
                        <option value="1" <?php echo ((int)($config['auto_block_mode'] ?? 2) === 1) ? 'selected' : ''; ?>>Aggressive</option>
                        <option value="2" <?php echo ((int)($config['auto_block_mode'] ?? 2) === 2) ? 'selected' : ''; ?>>Balanced</option>
                        <option value="3" <?php echo ((int)($config['auto_block_mode'] ?? 2) === 3) ? 'selected' : ''; ?>>Safe</option>
                    </select>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('auto_block_target', 'Target'); ?></label>
                    <select name="auto_block_target" class="ux-input">
                        <option value="ip" <?php echo (($config['auto_block_target'] ?? 'ip') === 'ip') ? 'selected' : ''; ?>>IP</option>
                        <option value="ua" <?php echo (($config['auto_block_target'] ?? 'ip') === 'ua') ? 'selected' : ''; ?>>UA (hash)</option>
                    </select>
                </div>
            </div>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('strikes', 'Strikes'); ?></label>
                    <input type="number" name="auto_block_strikes" class="ux-input" value="<?php echo (int)($config['auto_block_strikes'] ?? 5); ?>" min="2">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('window_seconds', 'Window (sec)'); ?></label>
                    <input type="number" name="auto_block_window_seconds" class="ux-input" value="<?php echo (int)($config['auto_block_window_seconds'] ?? 600); ?>" min="60">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('base_ttl', 'Base TTL (sec)'); ?></label>
                    <input type="number" name="auto_block_ttl_seconds" class="ux-input" value="<?php echo (int)($config['auto_block_ttl_seconds'] ?? 3600); ?>" min="60">
                </div>
            </div>

            <?php
            $ladder = $config['auto_block_escalation_ladder_seconds'] ?? [3600, 21600, 86400];
            if (!is_array($ladder)) { $ladder = [3600,21600,86400]; }
            $ladder = array_values($ladder);
            $l1 = (int)($ladder[0] ?? 3600);
            $l2 = (int)($ladder[1] ?? 21600);
            $l3 = (int)($ladder[2] ?? 86400);
            ?>

            <div class="ux-row">
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('escalation_1', 'TTL #1 (sec)'); ?></label>
                    <input type="number" name="auto_block_escalation_1" class="ux-input" value="<?php echo $l1; ?>" min="60">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('escalation_2', 'TTL #2 (sec)'); ?></label>
                    <input type="number" name="auto_block_escalation_2" class="ux-input" value="<?php echo $l2; ?>" min="60">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('escalation_3', 'TTL #3 (sec)'); ?></label>
                    <input type="number" name="auto_block_escalation_3" class="ux-input" value="<?php echo $l3; ?>" min="60">
                </div>
            </div>

            <label class="ux-switch">
                <input type="checkbox" name="auto_block_exempt_verified_bots" <?php echo !empty($config['auto_block_exempt_verified_bots']) ? 'checked' : ''; ?>>
                <span class="ux-slider"></span>
                <span class="ux-switch-label"><?php echo ux_t('exempt_verified_bots', 'ربات‌های تایید شده (Reverse+Forward DNS) از Auto-Block مستثنی باشند'); ?></span>
            </label>

            <div class="ux-help">
                <?php echo ux_t('auto_block_help', 'Auto-Block بلافاصله بلاک نمی‌کند؛ ابتدا Strike جمع می‌کند و سپس TTL به صورت پلکانی افزایش می‌یابد.'); ?>
            </div>
        </div>

        <!-- Blocks management -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('active_blocks', 'Active Blocks (DB: Auto/Manual)'); ?></h3>

            <div class="seo-toolbar">
                <strong><?php echo ux_t('manual_block', 'Manual Block'); ?>:</strong>
                <select id="ux-bot-block-type" class="ux-input" style="width:auto">
                    <option value="ip">IP</option>
                    <option value="ua">UA (hash یا متن UA)</option>
                </select>
                <input id="ux-bot-block-value" type="text" class="ux-input" placeholder="IP یا UA / UA hash">
                <input id="ux-bot-block-reason" type="text" class="ux-input" placeholder="Reason (اختیاری)">
                <input id="ux-bot-block-ttl" type="number" class="ux-input" placeholder="TTL (sec - اختیاری)" style="width:180px">
                <button type="button" class="ux-btn ux-btn-primary" id="ux-add-bot-block-btn"><?php echo ux_t('add_block', 'Add'); ?></button>
                <button type="button" class="ux-btn" id="ux-blocks-export-open"><?php echo ux_t('export_blocks','Export Blocks'); ?></button>
                <button type="button" class="ux-btn" id="ux-blocks-import-open"><?php echo ux_t('import_blocks','Import Blocks'); ?></button>
                <span id="ux-blocks-exportimport-status" style="opacity:.8"></span>
            </div>

            <!-- Export / Import panels (hidden by default) -->
            <div id="ux-blocks-export-panel" style="display:none; margin-top:10px; border:1px solid rgba(255,255,255,0.10); border-radius:10px; padding:10px;">
                <div class="seo-toolbar" style="margin:0">
                    <strong><?php echo ux_t('export_blocks','Export Blocks'); ?>:</strong>
                    <label class="ux-label" style="margin:0"><?php echo ux_t('type','Type'); ?></label>
                    <select id="ux-blocks-export-type" class="ux-input" style="width:auto">
                        <option value="both"><?php echo ux_t('both','both'); ?></option>
                        <option value="ip">IP</option>
                        <option value="ua">UA</option>
                    </select>
                    <label class="ux-label" style="margin:0"><?php echo ux_t('source','Source'); ?></label>
                    <select id="ux-blocks-export-source" class="ux-input" style="width:auto">
                        <option value="both"><?php echo ux_t('both','both'); ?></option>
                        <option value="auto">auto</option>
                        <option value="manual">manual</option>
                    </select>
                    <label class="ux-label" style="margin:0"><?php echo ux_t('scope','Scope'); ?></label>
                    <select id="ux-blocks-export-scope" class="ux-input" style="width:auto">
                        <option value="active"><?php echo ux_t('active_only','Active only'); ?></option>
                        <option value="all"><?php echo ux_t('all','All'); ?></option>
                    </select>
                    <label class="ux-label" style="margin:0"><?php echo ux_t('format','Format'); ?></label>
                    <select id="ux-blocks-export-format" class="ux-input" style="width:auto">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                    </select>
                    <button type="button" class="ux-btn ux-btn-primary" id="ux-blocks-export-download"><?php echo ux_t('download','Download'); ?></button>
                    <button type="button" class="ux-btn" id="ux-blocks-export-close"><?php echo ux_t('close','Close'); ?></button>
                </div>
                <div class="ux-help" style="margin-top:6px">
                    <?php echo ux_t('export_blocks_help','خروجی شامل: type,value,source,reason,expires_at,active,created_at'); ?>
                </div>
            </div>

            <div id="ux-blocks-import-panel" style="display:none; margin-top:10px; border:1px solid rgba(255,255,255,0.10); border-radius:10px; padding:10px;">
                <div class="seo-toolbar" style="margin:0">
                    <strong><?php echo ux_t('import_blocks','Import Blocks'); ?>:</strong>
                    <input id="ux-blocks-import-file" type="file" class="ux-input" accept="application/json,.json">
                    <button type="button" class="ux-btn ux-btn-primary" id="ux-blocks-import-run"><?php echo ux_t('import','Import'); ?></button>
                    <button type="button" class="ux-btn" id="ux-blocks-import-close"><?php echo ux_t('close','Close'); ?></button>
                    <span id="ux-blocks-import-status" style="opacity:.8"></span>
                </div>
                <div class="ux-help" style="margin-top:6px">
                    <?php echo ux_t('import_blocks_help','Import به‌صورت پیش‌فرض به عنوان source=manual ثبت می‌شود (برای ایزوله‌بودن از Auto).'); ?>
                </div>
            </div>

            <table class="seo-table" style="margin-top:12px">
                <thead>
                    <tr>
                        <th><?php echo ux_t('type','Type'); ?></th>
                        <th><?php echo ux_t('value','Value'); ?></th>
                        <th><?php echo ux_t('source','Source'); ?></th>
                        <th><?php echo ux_t('expires','Expires'); ?></th>
                        <th><?php echo ux_t('hits','Hits'); ?></th>
                        <th><?php echo ux_t('reason','Reason'); ?></th>
                        <th><?php echo ux_t('action','Action'); ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php if (empty($ux_db_blocks)): ?>
                    <tr><td colspan="7" style="opacity:.7"><?php echo ux_t('no_blocks','هیچ بلاکی در دیتابیس ثبت نشده است.'); ?></td></tr>
                <?php else: ?>
                    <?php foreach ($ux_db_blocks as $b): ?>
                        <?php
                        $isActive = !empty($b['active']);
                        $src = (string)($b['source'] ?? 'manual');
                        $exp = isset($b['expires_at']) && (int)$b['expires_at'] > 0 ? (int)$b['expires_at'] : 0;
                        $expStr = $exp > 0 ? date('Y-m-d H:i:s', $exp) : '—';
                        $remStr = '—';
                        if ($exp > 0) {
                            $rem = $exp - $ux_now;
                            if ($rem < 0) $rem = 0;
                            if ($rem < 3600) $remStr = ceil($rem/60) . 'm';
                            elseif ($rem < 86400) $remStr = round($rem/3600, 1) . 'h';
                            else $remStr = round($rem/86400, 1) . 'd';
                            $expStr .= ' (' . $remStr . ')';
                        }
                        ?>
                        <tr data-block-row="<?php echo (int)$b['id']; ?>" style="<?php echo $isActive ? '' : 'opacity:.6'; ?>">
                            <td><span class="seo-badge"><?php echo htmlspecialchars((string)($b['type'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></span></td>
                            <td style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"><?php echo htmlspecialchars((string)($b['value'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                            <td>
                                <span class="seo-badge <?php echo $src === 'auto' ? 'auto' : 'manual'; ?>">
                                    <?php echo htmlspecialchars($src, ENT_QUOTES, 'UTF-8'); ?>
                                </span>
                                <?php if (!$isActive): ?><span class="seo-badge inactive"><?php echo ux_t('inactive','inactive'); ?></span><?php endif; ?>
                            </td>
                            <td><?php echo htmlspecialchars($expStr, ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo (int)($b['hits'] ?? 0); ?></td>
                            <td style="max-width:520px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="<?php echo htmlspecialchars((string)($b['reason'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                <?php echo htmlspecialchars((string)($b['reason'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                            </td>
                            <td>
                                <?php if ($isActive): ?>
                                    <button type="button" class="ux-btn ux-btn-danger ux-bot-block-unblock" data-block-id="<?php echo (int)$b['id']; ?>">
                                        <?php echo ux_t('unblock','Unblock'); ?>
                                    </button>
                                <?php else: ?>
                                    —
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>

            <div class="ux-help" style="margin-top:14px">
                <?php echo ux_t('legacy_blocked_ips_help', 'نکته: لیست blocked_ips (قدیمی) در فایل کانفیگ جداست و Auto-Block به آن دست نمی‌زند.'); ?>
            </div>

            <!-- Legacy blocked IPs (config file) -->
            <div style="margin-top:10px">
                <details>
                    <summary style="cursor:pointer"><?php echo ux_t('legacy_blocked_ips', 'Legacy blocked_ips (config)'); ?></summary>
                    <div class="seo-toolbar" style="margin-top:10px">
                        <input id="ux-legacy-block-ip" type="text" class="ux-input" placeholder="IP">
                        <button type="button" class="ux-btn ux-btn-danger" id="ux-legacy-block-ip-btn"><?php echo ux_t('block','Block'); ?></button>
                    </div>
                    <?php if (empty($config['blocked_ips'])): ?>
                        <div style="opacity:.7; margin-top:10px"><?php echo ux_t('no_legacy_blocks','خالی است.'); ?></div>
                    <?php else: ?>
                        <table class="seo-table" style="margin-top:10px">
                            <thead>
                            <tr>
                                <th><?php echo ux_t('ip','IP'); ?></th>
                                <th><?php echo ux_t('action','Action'); ?></th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php foreach ((array)$config['blocked_ips'] as $ipBlocked): ?>
                                <tr>
                                    <td style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"><?php echo htmlspecialchars($ipBlocked, ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td>
                                        <button type="button" class="ux-btn ux-btn-danger ux-unblock-ip-btn" data-ip="<?php echo htmlspecialchars($ipBlocked, ENT_QUOTES, 'UTF-8'); ?>">
                                            <?php echo ux_t('unblock','Unblock'); ?>
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </details>
            </div>
        </div>

        <!-- Traffic & Bandwidth -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('traffic_intel', 'Traffic & Bandwidth Intelligence'); ?></h3>

            <div class="ux-row" style="align-items:center">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="traffic_intel_enabled" <?php echo !empty($config['traffic_intel_enabled']) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('traffic_intel_enabled', 'فعال'); ?></span>
                    </label>
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('net_iface','Interface'); ?></label>
                    <input type="text" name="traffic_intel_interface" class="ux-input" value="<?php echo htmlspecialchars((string)($config['traffic_intel_interface'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" placeholder="eth0">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('net_interval','Sample Interval (sec)'); ?></label>
                    <input type="number" name="traffic_intel_net_sample_interval" class="ux-input" value="<?php echo (int)($config['traffic_intel_net_sample_interval'] ?? 5); ?>" min="1">
                </div>
                <div class="ux-col">
                    <label class="ux-label"><?php echo ux_t('chart_minutes','Chart Minutes'); ?></label>
                    <input type="number" name="traffic_intel_chart_minutes" class="ux-input" value="<?php echo (int)($config['traffic_intel_chart_minutes'] ?? 120); ?>" min="10">
                </div>
            </div>

            <div class="ux-chart-box" style="margin-top:12px">
                <div class="ux-chart-title"><?php echo htmlspecialchars(ux_t('traffic_chart_title','Traffic (req/min)'), ENT_QUOTES, 'UTF-8'); ?></div>
                <canvas id="ux-traffic-chart"></canvas>
            </div>

            <div class="ux-chart-box" style="margin-top:12px">
                <div class="ux-chart-title"><?php echo htmlspecialchars(ux_t('bandwidth_chart_title','Bandwidth (KB/s)'), ENT_QUOTES, 'UTF-8'); ?></div>
                <canvas id="ux-net-chart"></canvas>
            </div>

            <div class="ux-help">
                <?php echo ux_t('traffic_help', 'ترافیک دقیقه‌ای از دیتابیس آنالیتیکس ساخته می‌شود. پهنای‌باند از /proc/net/dev هر 5 ثانیه نمونه‌برداری می‌شود.'); ?>
            </div>
        </div>

<!-- UA Intelligence Bank -->
        <div class="seo-card full-width">
            <h3><?php echo ux_t('ua_bank', 'UA Intelligence Bank'); ?></h3>

            <div class="ux-row" style="align-items:center;gap:10px;flex-wrap:wrap">
                <div class="ux-col">
                    <label class="ux-switch">
                        <input type="checkbox" name="ua_bank_enabled" <?php echo !empty($config['ua_bank_enabled']) ? 'checked' : ''; ?>>
                        <span class="ux-slider"></span>
                        <span class="ux-switch-label"><?php echo ux_t('ua_bank_enabled', 'فعال'); ?></span>
                    </label>
                </div>
            </div>

                        <!-- Filters (server-side) -->
            <div class="seo-toolbar" style="margin-top:10px" id="ux-ua-main-toolbar">
                <label class="ux-label" style="margin:0"><?php echo ux_t('classification','Classification'); ?></label>
                <select id="ux-ua-f-classification" class="ux-input" style="width:auto">
                    <option value=""><?php echo ux_t('all','All'); ?></option>
                    <option value="good"><?php echo ux_t('good','Good'); ?></option>
                    <option value="bad"><?php echo ux_t('bad','Bad'); ?></option>
                    <option value="suspicious"><?php echo ux_t('suspicious','Suspicious'); ?></option>
                </select>

                <label class="ux-label" style="margin:0"><?php echo ux_t('blocked_status','Blocked status'); ?></label>
                <select id="ux-ua-f-blocked" class="ux-input" style="width:auto">
                    <option value="all"><?php echo ux_t('all','All'); ?></option>
                    <option value="blocked"><?php echo ux_t('blocked','Blocked'); ?></option>
                    <option value="not_blocked"><?php echo ux_t('not_blocked','Not blocked'); ?></option>
                </select>

                <label class="ux-label" style="margin:0"><?php echo ux_t('search','Search'); ?></label>
                <input id="ux-ua-f-q" type="text" class="ux-input" placeholder="<?php echo ux_t('ua_search','Search UA / hash...'); ?>" style="min-width:240px">

                <label class="ux-label" style="margin:0"><?php echo ux_t('sort','Sort'); ?></label>
                <select id="ux-ua-sort" class="ux-input" style="width:auto">
                    <option value="last_seen"><?php echo ux_t('last_seen','Last seen'); ?></option>
                    <option value="hits"><?php echo ux_t('hits','Hits'); ?></option>
                    <option value="score"><?php echo ux_t('score','Score'); ?></option>
                </select>
                <select id="ux-ua-dir" class="ux-input" style="width:auto">
                    <option value="desc"><?php echo ux_t('desc','Desc'); ?></option>
                    <option value="asc"><?php echo ux_t('asc','Asc'); ?></option>
                </select>

                <label class="ux-label" style="margin:0"><?php echo ux_t('per_page','Per page'); ?></label>
                <select id="ux-ua-per-page" class="ux-input" style="width:auto">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>

                <button type="button" class="ux-btn" id="ux-ua-adv-toggle"><?php echo ux_t('advanced_filters','Advanced'); ?></button>
                <button type="button" class="ux-btn" id="ux-ua-refresh"><?php echo ux_t('refresh','Refresh'); ?></button>
                <span id="ux-ua-bank-status" style="opacity:.8"></span>
            </div>

            <div class="seo-toolbar" style="margin-top:10px;display:none" id="ux-ua-adv-toolbar">
                <label class="ux-label" style="margin:0"><?php echo ux_t('min_hits','Min hits'); ?></label>
                <input id="ux-ua-f-min-hits" type="number" class="ux-input" style="width:120px" min="0" placeholder="0">

                <label class="ux-label" style="margin:0"><?php echo ux_t('min_score','Min score'); ?></label>
                <input id="ux-ua-f-min-score" type="number" class="ux-input" style="width:120px" placeholder="">

                <label class="ux-label" style="margin:0"><?php echo ux_t('max_score','Max score'); ?></label>
                <input id="ux-ua-f-max-score" type="number" class="ux-input" style="width:120px" placeholder="">

                <label class="ux-label" style="margin:0"><?php echo ux_t('last_seen_from','Last seen from'); ?></label>
                <input id="ux-ua-f-from" type="datetime-local" class="ux-input" style="width:210px">

                <label class="ux-label" style="margin:0"><?php echo ux_t('last_seen_to','Last seen to'); ?></label>
                <input id="ux-ua-f-to" type="datetime-local" class="ux-input" style="width:210px">
            </div>

<table class="seo-table" style="margin-top:12px">
                <thead>
                    <tr>
                        <th><?php echo ux_t('ua','UA'); ?></th>
                        <th><?php echo ux_t('hits','Hits'); ?></th>
                        <th><?php echo ux_t('last_seen','Last Seen'); ?></th>
                        <th><?php echo ux_t('class','Class'); ?></th>
                        <th><?php echo ux_t('score','Score'); ?></th>
                        <th><?php echo ux_t('last_ip','Last IP'); ?></th>
                        <th><?php echo ux_t('block','Block'); ?></th>
                    </tr>
                </thead>
                <tbody id="ux-ua-bank-body">
                    <tr><td colspan="7" style="opacity:.7"><?php echo ux_t('loading','Loading...'); ?></td></tr>
                </tbody>
            </table>

            <div class="seo-toolbar" style="margin-top:10px;justify-content:space-between">
                <div>
                    <button type="button" class="ux-btn" id="ux-ua-prev"><?php echo ux_t('prev','Prev'); ?></button>
                    <button type="button" class="ux-btn" id="ux-ua-next"><?php echo ux_t('next','Next'); ?></button>
                    <span id="ux-ua-page-info" style="margin-inline-start:10px;opacity:.85"></span>
                </div>
                <div class="ux-help" style="margin:0">
                    <?php echo ux_t('ua_bank_help', 'برای بلاک دقیق (بدون آسیب به کاربران پشت NAT)، می‌توانید UA را بلاک کنید.'); ?>
                </div>
            </div>
        </div>

        

    </div>

    <script>
    (function(){
        const csrf = <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>;

        // Export / Import blocks (DB) - UI
        (function(){
            const exportOpen = document.getElementById('ux-blocks-export-open');
            const importOpen = document.getElementById('ux-blocks-import-open');
            const exportPanel = document.getElementById('ux-blocks-export-panel');
            const importPanel = document.getElementById('ux-blocks-import-panel');
            const topStatus = document.getElementById('ux-blocks-exportimport-status');

            function show(panel, on) {
                if (!panel) return;
                panel.style.display = on ? '' : 'none';
            }

            if (exportOpen && exportPanel) {
                exportOpen.addEventListener('click', function(){
                    show(exportPanel, exportPanel.style.display === 'none');
                    show(importPanel, false);
                    if (topStatus) topStatus.textContent = '';
                });
            }
            if (importOpen && importPanel) {
                importOpen.addEventListener('click', function(){
                    show(importPanel, importPanel.style.display === 'none');
                    show(exportPanel, false);
                    if (topStatus) topStatus.textContent = '';
                });
            }

            const exportClose = document.getElementById('ux-blocks-export-close');
            if (exportClose) exportClose.addEventListener('click', ()=>show(exportPanel,false));
            const importClose = document.getElementById('ux-blocks-import-close');
            if (importClose) importClose.addEventListener('click', ()=>show(importPanel,false));

            const exportDownload = document.getElementById('ux-blocks-export-download');
            if (exportDownload) {
                exportDownload.addEventListener('click', function(){
                    const type = (document.getElementById('ux-blocks-export-type')?.value || 'both');
                    const source = (document.getElementById('ux-blocks-export-source')?.value || 'both');
                    const scope = (document.getElementById('ux-blocks-export-scope')?.value || 'active');
                    const format = (document.getElementById('ux-blocks-export-format')?.value || 'json');
                    const url = location.pathname
                        + '?ux_ajax=bot_blocks_export'
                        + '&csrf=' + encodeURIComponent(csrf)
                        + '&type=' + encodeURIComponent(type)
                        + '&source=' + encodeURIComponent(source)
                        + '&scope=' + encodeURIComponent(scope)
                        + '&format=' + encodeURIComponent(format);
                    if (topStatus) topStatus.textContent = <?php echo json_encode(ux_t('downloading','Downloading...'), JSON_UNESCAPED_UNICODE); ?>;
                    window.location.href = url;
                });
            }

            const importRun = document.getElementById('ux-blocks-import-run');
            if (importRun) {
                importRun.addEventListener('click', async function(){
                    const fileInput = document.getElementById('ux-blocks-import-file');
                    const statusEl = document.getElementById('ux-blocks-import-status');
                    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
                    if (!file) {
                        alert(<?php echo json_encode(ux_t('select_json_file','Select a JSON file'), JSON_UNESCAPED_UNICODE); ?>);
                        return;
                    }
                    const fd = new FormData();
                    fd.append('csrf', csrf);
                    fd.append('file', file);
                    if (statusEl) statusEl.textContent = <?php echo json_encode(ux_t('importing','Importing...'), JSON_UNESCAPED_UNICODE); ?>;
                    try {
                        const res = await fetch(location.pathname + '?ux_ajax=bot_blocks_import', {
                            method: 'POST',
                            body: fd,
                            credentials: 'same-origin'
                        });
                        const js = await res.json().catch(()=>null);
                        if (!js || !js.success) {
                            throw new Error((js && js.message) ? js.message : 'Import failed');
                        }
                        const msg = 'Added: ' + (js.added||0) + ' | Updated: ' + (js.updated||0) + ' | Skipped: ' + (js.skipped||0);
                        if (statusEl) statusEl.textContent = msg;
                        if (Array.isArray(js.errors) && js.errors.length) {
                            console.warn('Import errors:', js.errors);
                        }
                        // Refresh blocks list
                        setTimeout(()=>location.reload(), 300);
                    } catch (e) {
                        if (statusEl) statusEl.textContent = '';
                        alert(e && e.message ? e.message : 'Import failed');
                    }
                });
            }
        })();

        // Add manual block (DB)
        const addBtn = document.getElementById('ux-add-bot-block-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async function(){
                const type = document.getElementById('ux-bot-block-type').value;
                const value = document.getElementById('ux-bot-block-value').value.trim();
                const reason = document.getElementById('ux-bot-block-reason').value.trim();
                const ttl = document.getElementById('ux-bot-block-ttl').value.trim();

                if (!value) { alert(<?php echo json_encode(ux_t('value_required','Value is required'), JSON_UNESCAPED_UNICODE); ?>); return; }

                const params = new URLSearchParams();
                params.set('csrf', csrf);
                params.set('type', type);
                params.set('value', value);
                if (reason) params.set('reason', reason);
                if (ttl) params.set('ttl_seconds', ttl);

                const res = await fetch(location.pathname + '?ux_ajax=bot_block_add', {
                    method: 'POST',
                    headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                    body: params.toString(),
                    credentials: 'same-origin'
                });
                const js = await res.json().catch(()=>null);
                if (!js || !js.success) {
                    alert(js && js.message ? js.message : 'Failed');
                    return;
                }
                location.reload();
            });
        }

        
        // Legacy block IP (config)
        const legacyBtn = document.getElementById('ux-legacy-block-ip-btn');
        if (legacyBtn) {
            legacyBtn.addEventListener('click', async function(){
                const ip = (document.getElementById('ux-legacy-block-ip').value || '').trim();
                if (!ip) { alert(<?php echo json_encode(ux_t('ip_required','IP is required'), JSON_UNESCAPED_UNICODE); ?>); return; }
                const formData = new FormData();
                formData.append('csrf', csrf);
                formData.append('ip', ip);
                const res = await fetch('?ux_ajax=block_ip', { method:'POST', body: formData, credentials:'same-origin' });
                const js = await res.json().catch(()=>null);
                if (!js || !js.success) {
                    alert(js && js.message ? js.message : 'Failed');
                    return;
                }
                location.reload();
            });
        }

        // Unblock buttons (DB)
        document.querySelectorAll('.ux-bot-block-unblock').forEach(btn => {
            btn.addEventListener('click', async function(){
                const id = this.getAttribute('data-block-id');
                if (!id) return;
                if (!confirm(<?php echo json_encode(ux_t('confirm_unblock','Unblock?'), JSON_UNESCAPED_UNICODE); ?>)) return;

                const params = new URLSearchParams();
                params.set('csrf', csrf);
                params.set('id', id);

                const res = await fetch(location.pathname + '?ux_ajax=bot_block_unblock', {
                    method: 'POST',
                    headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                    body: params.toString(),
                    credentials: 'same-origin'
                });
                const js = await res.json().catch(()=>null);
                if (!js || !js.success) {
                    alert(js && js.message ? js.message : 'Failed');
                    return;
                }
                location.reload();
            });
        });

        // UA Bank (server-side list + filters + pagination)
        (function(){
            const els = {
                body: document.getElementById('ux-ua-bank-body'),
                status: document.getElementById('ux-ua-bank-status'),
                pageInfo: document.getElementById('ux-ua-page-info'),
                prev: document.getElementById('ux-ua-prev'),
                next: document.getElementById('ux-ua-next'),
                refresh: document.getElementById('ux-ua-refresh'),
                perPage: document.getElementById('ux-ua-per-page'),
                sort: document.getElementById('ux-ua-sort'),
                dir: document.getElementById('ux-ua-dir'),
                fClass: document.getElementById('ux-ua-f-classification'),
                fMinHits: document.getElementById('ux-ua-f-min-hits'),
                fMinScore: document.getElementById('ux-ua-f-min-score'),
                fMaxScore: document.getElementById('ux-ua-f-max-score'),
                fFrom: document.getElementById('ux-ua-f-from'),
                fTo: document.getElementById('ux-ua-f-to'),
                fBlocked: document.getElementById('ux-ua-f-blocked'),
                fQ: document.getElementById('ux-ua-f-q'),
            };
            if (!els.body) return;

            // Advanced filters toggle (UI)
            const advToggle = document.getElementById('ux-ua-adv-toggle');
            const advBar = document.getElementById('ux-ua-adv-toolbar');
            if (advToggle && advBar) {
                const key = 'ux_ua_adv_open';
                const openInit = (localStorage.getItem(key) === '1');
                advBar.style.display = openInit ? '' : 'none';
                advToggle.classList.toggle('ux-btn-primary', openInit);
                advToggle.addEventListener('click', function(){
                    const isOpen = advBar.style.display !== 'none';
                    advBar.style.display = isOpen ? 'none' : '';
                    const nowOpen = !isOpen;
                    advToggle.classList.toggle('ux-btn-primary', nowOpen);
                    try { localStorage.setItem(key, nowOpen ? '1' : '0'); } catch (e) {}
                });
            }

            const state = { page: 1, per_page: 25, total: 0 };

            function escHtml(s){
                return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c] || c));
            }
            function fmtTs(ts){
                ts = Number(ts || 0);
                if (!ts) return '—';
                const d = new Date(ts * 1000);
                return d.toLocaleString();
            }
            function dtLocalToEpoch(input){
                const v = (input && input.value) ? String(input.value) : '';
                if (!v) return '';
                const d = new Date(v);
                if (isNaN(d.getTime())) return '';
                return String(Math.floor(d.getTime() / 1000));
            }

            function renderRows(rows){
                if (!Array.isArray(rows) || rows.length === 0) {
                    els.body.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('ua_bank_empty','هنوز UA ای ثبت نشده.'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                    return;
                }
                els.body.innerHTML = rows.map(r => {
                    const ua = r.ua || '';
                    const uaHash = r.ua_hash || '';
                    const hits = Number(r.hits || 0);
                    const lastSeen = fmtTs(r.last_seen);
                    const cls = r.classification || '';
                    const score = (r.last_score === null || typeof r.last_score === 'undefined') ? '—' : String(r.last_score);
                    const lastIp = r.last_ip || '';
                    const blocked = !!r.blocked;
                    const blockBtn = blocked
                        ? '<button type="button" class="ux-btn ux-btn-danger" data-ua-unblock="' + String(r.block_id || 0) + '"><?php echo htmlspecialchars(ux_t('unblock','Unblock'), ENT_QUOTES, 'UTF-8'); ?></button>'
                        : '<button type="button" class="ux-btn ux-btn-primary" data-ua-block="' + escHtml(uaHash) + '"><?php echo htmlspecialchars(ux_t('block','Block'), ENT_QUOTES, 'UTF-8'); ?></button>';
                    return ''
                        + '<tr>'
                        + '<td style="max-width:520px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + escHtml(ua) + '">'
                        +   '<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; opacity:.8; font-size:12px">' + escHtml(uaHash) + '</div>'
                        +   escHtml(ua)
                        + '</td>'
                        + '<td>' + hits + '</td>'
                        + '<td>' + escHtml(lastSeen) + '</td>'
                        + '<td>' + escHtml(cls) + '</td>'
                        + '<td>' + escHtml(score) + '</td>'
                        + '<td style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">' + escHtml(lastIp) + '</td>'
                        + '<td>' + blockBtn + '</td>'
                        + '</tr>';
                }).join('');
            }

            async function load(page){
                state.page = Math.max(1, Number(page || 1));
                state.per_page = Number(els.perPage && els.perPage.value ? els.perPage.value : 25) || 25;

                const params = new URLSearchParams();
                params.set('ux_ajax', 'ua-bank-list');
                params.set('page', String(state.page));
                params.set('per_page', String(state.per_page));
                params.set('sort', String(els.sort && els.sort.value ? els.sort.value : 'last_seen'));
                params.set('dir', String(els.dir && els.dir.value ? els.dir.value : 'desc'));
                if (els.fClass && els.fClass.value) params.set('classification', String(els.fClass.value));
                if (els.fMinHits && els.fMinHits.value) params.set('min_hits', String(els.fMinHits.value));
                if (els.fMinScore && els.fMinScore.value) params.set('min_score', String(els.fMinScore.value));
                if (els.fMaxScore && els.fMaxScore.value) params.set('max_score', String(els.fMaxScore.value));
                const lf = dtLocalToEpoch(els.fFrom); if (lf) params.set('last_seen_from', lf);
                const lt = dtLocalToEpoch(els.fTo); if (lt) params.set('last_seen_to', lt);
                if (els.fBlocked && els.fBlocked.value) params.set('blocked_status', String(els.fBlocked.value));
                if (els.fQ && els.fQ.value) params.set('q', String(els.fQ.value));

                if (els.status) els.status.textContent = <?php echo json_encode(ux_t('loading','Loading...'), JSON_UNESCAPED_UNICODE); ?>;
                try {
                    const res = await fetch(location.pathname + '?' + params.toString(), { credentials: 'same-origin' });
                    const js = await res.json().catch(() => null);
                    if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                    state.total = Number(js.total || 0);
                    renderRows(js.rows || []);
                    const totalPages = state.per_page ? Math.max(1, Math.ceil(state.total / state.per_page)) : 1;
                    if (els.pageInfo) {
                        els.pageInfo.textContent = <?php echo json_encode(ux_t('page','Page'), JSON_UNESCAPED_UNICODE); ?> + ' ' + state.page + ' / ' + totalPages + ' — ' + state.total + ' ' + <?php echo json_encode(ux_t('rows','rows'), JSON_UNESCAPED_UNICODE); ?>;
                    }
                    if (els.prev) els.prev.disabled = state.page <= 1;
                    if (els.next) els.next.disabled = state.page >= totalPages;
                    if (els.status) els.status.textContent = '';
                } catch (e) {
                    console.error(e);
                    if (els.status) els.status.textContent = '';
                    els.body.innerHTML = '<tr><td colspan="7" style="opacity:.7"><?php echo htmlspecialchars(ux_t('ua_bank_error','Error loading UA Bank'), ENT_QUOTES, 'UTF-8'); ?></td></tr>';
                }
            }

            // Pagination
            if (els.prev) els.prev.addEventListener('click', () => load(state.page - 1));
            if (els.next) els.next.addEventListener('click', () => load(state.page + 1));

            // Refresh
            if (els.refresh) els.refresh.addEventListener('click', () => load(1));

            // Filters
            const reloadOnChange = [els.sort, els.dir, els.perPage, els.fClass, els.fBlocked, els.fFrom, els.fTo];
            reloadOnChange.forEach(el => {
                if (!el) return;
                el.addEventListener('change', () => load(1));
            });
            const reloadOnInput = [els.fMinHits, els.fMinScore, els.fMaxScore];
            reloadOnInput.forEach(el => {
                if (!el) return;
                el.addEventListener('input', () => {
                    // avoid hammering the server too much
                    clearTimeout(el._uxT);
                    el._uxT = setTimeout(() => load(1), 250);
                });
            });
            if (els.fQ) {
                els.fQ.addEventListener('input', () => {
                    clearTimeout(els.fQ._uxT);
                    els.fQ._uxT = setTimeout(() => load(1), 300);
                });
            }

            // Block / Unblock actions (event delegation)
            els.body.addEventListener('click', async function(ev){
                const btn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
                if (!btn) return;
                const unblockId = btn.getAttribute('data-ua-unblock');
                const blockHash = btn.getAttribute('data-ua-block');

                if (unblockId && unblockId !== '0') {
                    if (!confirm(<?php echo json_encode(ux_t('confirm_unblock','Unblock?'), JSON_UNESCAPED_UNICODE); ?>)) return;
                    const p = new URLSearchParams();
                    p.set('csrf', csrf);
                    p.set('id', String(unblockId));
                    try {
                        const res = await fetch(location.pathname + '?ux_ajax=bot_block_unblock', {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: p.toString(),
                            credentials: 'same-origin'
                        });
                        const js = await res.json().catch(()=>null);
                        if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                        await load(state.page);
                    } catch (e) {
                        alert(e && e.message ? e.message : 'Failed');
                    }
                }

                if (blockHash) {
                    const reason = prompt(<?php echo json_encode(ux_t('prompt_block_reason','Reason for block?'), JSON_UNESCAPED_UNICODE); ?>, 'ua_manual_block');
                    const p = new URLSearchParams();
                    p.set('csrf', csrf);
                    p.set('type', 'ua');
                    p.set('value', String(blockHash));
                    if (reason) p.set('reason', String(reason));
                    try {
                        const res = await fetch(location.pathname + '?ux_ajax=bot_block_add', {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: p.toString(),
                            credentials: 'same-origin'
                        });
                        const js = await res.json().catch(()=>null);
                        if (!js || !js.success) throw new Error((js && js.message) ? js.message : 'Failed');
                        await load(state.page);
                    } catch (e) {
                        alert(e && e.message ? e.message : 'Failed');
                    }
                }
            });

            // Initial load
            load(1);
        })();

        // Charts
        const trafficSeries = <?php echo json_encode($ux_traffic['series'] ?? [], JSON_UNESCAPED_UNICODE); ?>;
        const netSamplesDesc = <?php echo json_encode($ux_net_samples ?? [], JSON_UNESCAPED_UNICODE); ?>;

        // Traffic chart (minute aggregation)
        const labels = [];
        const human = [];
        const bot = [];
        const blocked = [];
        (trafficSeries || []).forEach(r => {
            const ts = Number(r.minute_ts || r.ts || 0);
            if (!ts) return;
            const d = new Date(ts * 1000);
            labels.push(d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
            human.push(Number(r.human_req || 0));
            bot.push(Number(r.bot_req || 0));
            blocked.push(Number(r.blocked_req || 0));
        });

        const trafficCtx = document.getElementById('ux-traffic-chart');
        if (trafficCtx && window.Chart) {
            new Chart(trafficCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Human', data: human, tension: 0.2 },
                        { label: 'Bot', data: bot, tension: 0.2 },
                        { label: 'Blocked', data: blocked, tension: 0.2 },
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Network chart (/proc/net/dev sampling)
        const netSamples = (netSamplesDesc || []).slice().reverse(); // chronological
        const nLabels = [];
        const rx = [];
        const tx = [];
        netSamples.forEach(s => {
            const ts = Number(s.ts || 0);
            if (!ts) return;
            const d = new Date(ts * 1000);
            nLabels.push(d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}));
            rx.push(Number(s.rx_kbps || 0));
            tx.push(Number(s.tx_kbps || 0));
        });

        const netCtx = document.getElementById('ux-net-chart');
        if (netCtx && window.Chart) {
            new Chart(netCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: nLabels,
                    datasets: [
                        { label: 'RX (KB/s)', data: rx, tension: 0.2 },
                        { label: 'TX (KB/s)', data: tx, tension: 0.2 },
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    })();
    </script>
</fieldset>

                <fieldset id="sec-design">
                    <legend><?php echo htmlspecialchars(ux_t('appearance_legend', 'ظاهر صفحه کمپین / صف انتظار'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <?php
                        if (!isset($preview_url)) {
                            // پیش‌نمایش باید از طریق gateway.php فراخوانی شود؛
                            // زیرا admin.php حالت UX_ADMIN_ENTRY دارد و روتر اصلی را اجرا نمی‌کند.
                            $preview_token = $config['panel_token'] ?? 'unixsee-panel-12345';
                            // از فایل gateway.php در همین دایرکتوری استفاده کن تا روتر preview فعال شود
                            $preview_url   = 'gateway.php?ux_preview=' . rawurlencode($preview_token);
                        }
                    ?>

                    <div class="ux-row">
<div class="ux-col-2">
                            <label><?php echo htmlspecialchars(ux_t('preset_label', 'الگوی آماده (Preset)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <select name="preset_template" id="ux-preset-template">
                                <option value=""><?php echo htmlspecialchars(ux_t('preset_none_option', '— بدون تغییر (اختیاری) —'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="flash_sale"><?php echo htmlspecialchars(ux_t('preset_flash_sale_option', 'کمپین فروش ویژه / فلش‌سیل'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="maintenance"><?php echo htmlspecialchars(ux_t('preset_maintenance_option', 'حالت نگهداری و به‌روزرسانی'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="simple_info"><?php echo htmlspecialchars(ux_t('preset_simple_option', 'اطلاع‌رسانی ساده'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="black_friday"><?php echo htmlspecialchars(ux_t('preset_black_friday_option', 'بلک فرایدی / حراج بزرگ'), ENT_QUOTES, 'UTF-8'); ?></option>
                            </select>
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('preset_help', 'با انتخاب یک الگو، عنوان، متن و HTML پیشنهادی برای شما پر می‌شود (قبل از اعمال، از شما تأیید گرفته می‌شود).'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label style="margin-top:8px;">
                                <?php echo htmlspecialchars(ux_t('page_title_label', 'عنوان صفحه'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="text" name="page_title"
                                   value="<?php echo htmlspecialchars($config['page_title'], ENT_QUOTES, 'UTF-8'); ?>"
                                   placeholder="<?php echo htmlspecialchars(ux_t('page_title_placeholder', 'مثال: شما در صف ورود به کمپین بزرگ unixsee هستید'), ENT_QUOTES, 'UTF-8'); ?>">

                            <label>
                                <?php echo htmlspecialchars(ux_t('page_subtitle_label', 'متن توضیحات (چند خطی)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <textarea name="page_subtitle"
                                      placeholder="<?php echo htmlspecialchars(ux_t('page_subtitle_placeholder', 'مثال: به دلیل ترافیک بسیار بالا، ورود به صورت نوبتی انجام می‌شود.'), ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($config['page_subtitle'], ENT_QUOTES, 'UTF-8'); ?></textarea>
                        
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('media_url_help', 'می‌توانی گیف Maintenance یا بنر کمپین unixsee را اینجا قرار بدهی.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label><?php echo htmlspecialchars(ux_t('media_upload_label', 'آپلود تصویر یا GIF'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="file" name="media_upload" accept="image/*,image/gif">
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t(
                                    'media_upload_help',
                                    'اگر در این قسمت فایلی انتخاب کنی، بعد از ذخیره تنظیمات، فایل در خود پوشه‌ی گیت‌وی ذخیره می‌شود و لینک بالا (لینک تصویر یا GIF) به‌طور خودکار با آدرس جدید جایگزین می‌شود.'
                                ), ENT_QUOTES, 'UTF-8'); ?>
                            </div>

                            <?php if (!empty($config['media_url'])): ?>
                                <div class="ux-help" style="margin-top:4px">
                                    <?php echo htmlspecialchars(ux_t('media_current_file', 'فایل فعلی:'), ENT_QUOTES, 'UTF-8'); ?>
                                    <a href="<?php echo htmlspecialchars($config['media_url'], ENT_QUOTES, 'UTF-8'); ?>" target="_blank" rel="noopener"
                                    style="color:#93c5fd">
                                        <?php echo htmlspecialchars($config['media_url'], ENT_QUOTES, 'UTF-8'); ?>
                                    </a>
                                </div>
                            <?php endif; ?>
                            <?php if (!empty($config['media_url'])): ?>
                                <div style="margin-top:6px">
                                    <img src="<?php echo htmlspecialchars($config['media_url'], ENT_QUOTES, 'UTF-8'); ?>"
                                        alt="Preview"
                                        style="max-width:240px;border-radius:8px;border:1px solid rgba(148,163,184,0.4);">
                                </div>
                            <?php endif; ?>
                            <label><?php echo htmlspecialchars(ux_t('media_width_title', 'عرض تصویر / GIF'), ENT_QUOTES, 'UTF-8'); ?></label>
                                <div style="display:flex;gap:8px;flex-wrap:wrap">
                                    <div style="flex:1 1 120px">
                                        <div class="ux-help" style="margin-bottom:2px">
                                            <?php echo htmlspecialchars(ux_t('media_width_desktop_label', 'دسکتاپ (٪ از عرض صفحه)'), ENT_QUOTES, 'UTF-8'); ?>
                                        </div>
                                        <input type="number" min="10" max="100"
                                            name="media_width_desktop"
                                            value="<?php echo (int)$media_width_desktop; ?>">
                                    </div>
                                    <div style="flex:1 1 120px">
                                        <div class="ux-help" style="margin-bottom:2px">
                                            <?php echo htmlspecialchars(ux_t('media_width_mobile_label', 'موبایل (٪ از عرض صفحه)'), ENT_QUOTES, 'UTF-8'); ?>
                                        </div>
                                        <input type="number" min="10" max="100"
                                            name="media_width_mobile"
                                            value="<?php echo (int)$media_width_mobile; ?>">
                                    </div>
                                </div>

                                <div style="margin-top:8px">
                                    <div class="ux-help" style="margin-bottom:2px">
                                        <?php echo htmlspecialchars(ux_t('media_align_label', 'تراز تصویر'), ENT_QUOTES, 'UTF-8'); ?>
                                    </div>
                                    <select name="media_align">
                                        <option value="left"   <?php echo $media_align === 'left'   ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_left', 'چپ'), ENT_QUOTES, 'UTF-8'); ?></option>
                                        <option value="center" <?php echo $media_align === 'center' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_center', 'وسط'), ENT_QUOTES, 'UTF-8'); ?></option>
                                        <option value="right"  <?php echo $media_align === 'right'  ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_right', 'راست'), ENT_QUOTES, 'UTF-8'); ?></option>
                                    </select>
                                </div>

                            <input type="text" name="media_width"
                                   value="<?php echo htmlspecialchars($config['media_width'] ?? '100%', ENT_QUOTES, 'UTF-8'); ?>"
                                   placeholder="<?php echo htmlspecialchars(ux_t('media_width_placeholder', 'مثال: 100% یا 320px'), ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('media_width_help', 'اگر 100% بگذاری، تصویر عرض کارت را می‌گیرد؛ اگر مثلا 320px بگذاری، عرض ثابت خواهد بود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label><?php echo htmlspecialchars(ux_t('media_align_label', 'جایگاه تصویر'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <select name="media_align">
                                <?php $media_align = $config['media_align'] ?? 'center'; ?>
                                <option value="center" <?php echo $media_align === 'center' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_center_option', 'وسط'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="right"  <?php echo $media_align === 'right'  ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_right_option', 'راست'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="left"   <?php echo $media_align === 'left'   ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('media_align_left_option', 'چپ'), ENT_QUOTES, 'UTF-8'); ?></option>
                            </select>

                            <label><?php echo htmlspecialchars(ux_t('media_bg_color_label', 'پس‌زمینه مخصوص ناحیه تصویر'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="color" name="media_bg_color"
                                   value="<?php echo htmlspecialchars($config['media_bg_color'] ?? '#000000', ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('media_bg_color_help', 'اگر رنگی انتخاب کنی، پشت تصویر یک باکس جدا با همان رنگ ساخته می‌شود.'), ENT_QUOTES, 'UTF-8'); ?></div>

                            <label><?php echo htmlspecialchars(ux_t('media_radius_label', 'گردی گوشه‌های تصویر (px)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="media_radius"
                                   value="<?php echo htmlspecialchars($config['media_radius'] ?? '20px', ENT_QUOTES, 'UTF-8'); ?>"
                                   placeholder="<?php echo htmlspecialchars(ux_t('media_radius_placeholder', 'مثال: 20px'), ENT_QUOTES, 'UTF-8'); ?>">

                            <label style="margin-top:10px;">
                                <?php echo htmlspecialchars(ux_t('design_primary_color_label', 'رنگ اصلی'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="color" name="primary_color"
                                   value="<?php echo htmlspecialchars($config['primary_color'], ENT_QUOTES, 'UTF-8'); ?>">

                            <label>
                                <?php echo htmlspecialchars(ux_t('design_background_color_label', 'رنگ پس‌زمینه صفحه'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="color" name="bg_color"
                                   value="<?php echo htmlspecialchars($config['bg_color'], ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('design_background_help', 'برای تم‌های شیشه‌ای تیره، رنگ‌های نزدیک به #050816 بسیار مناسب هستند.'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>

                            <label>
                                <?php echo htmlspecialchars(ux_t('design_theme_label', 'تم صفحه'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <select name="theme_mode">
                                <option value="glass" <?php echo ($config['theme_mode'] ?? 'glass') === 'glass' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('theme_glass_option', 'شیشه‌ای (Glass / iOS)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="dark"  <?php echo ($config['theme_mode'] ?? 'glass') === 'dark'  ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('theme_dark_option', 'تیره (Dark)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="light" <?php echo ($config['theme_mode'] ?? 'glass') === 'light' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('theme_light_option', 'روشن (Light)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="blackfriday" <?php echo ($config['theme_mode'] ?? 'glass') === 'blackfriday' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('theme_blackfriday_option', 'بلک فرایدی (Black Friday)'), ENT_QUOTES, 'UTF-8'); ?></option>
                            </select>

                            <div class="ux-checkbox-inline" style="margin-top:10px;">
                                <input type="checkbox" name="enable_glow" value="1" <?php echo !empty($config['enable_glow']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('design_enable_glow_label', 'فعال‌سازی حاشیه نورانی (Glowing Borders)'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('design_enable_glow_help', 'استایل ترندی مثل کارت‌های iOS جدید.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>

                            <label>
                                <?php echo htmlspecialchars(ux_t('design_glow_color_label', 'رنگ Glow'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="color" name="glow_color"
                                   value="<?php echo htmlspecialchars($config['glow_color'] ?? $config['primary_color'], ENT_QUOTES, 'UTF-8'); ?>">

                            <label style="margin-top:8px;">
                                <?php echo htmlspecialchars(ux_t('design_shadow_type_label', 'نوع سایه (CSS Trend Shadows)'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <select name="shadow_style">
                                <?php $shadow_style = $config['shadow_style'] ?? 'trend-soft'; ?>
                                <option value="trend-soft" <?php echo $shadow_style === 'trend-soft' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('shadow_soft_option', 'نرم و مدرن (Soft Trend)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="trend-deep" <?php echo $shadow_style === 'trend-deep' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('shadow_deep_option', 'سایه عمیق (Deep Shadow)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="soft-float" <?php echo $shadow_style === 'soft-float' ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('shadow_float_option', 'شناور ملایم (Floating Card)'), ENT_QUOTES, 'UTF-8'); ?></option>
                                <option value="none"       <?php echo $shadow_style === 'none'       ? 'selected' : ''; ?>><?php echo htmlspecialchars(ux_t('shadow_none_option', 'بدون سایه ویژه'), ENT_QUOTES, 'UTF-8'); ?></option>
                            </select>
                        </div>
<div class="ux-col-3">
                            <div class="ux-preview-header">
                                <div>
                                    <div class="ux-section-title">
                                        <?php echo htmlspecialchars(ux_t('design_live_preview_title', 'پیش‌نمایش صفحه کمپین / صف انتظار'), ENT_QUOTES, 'UTF-8'); ?>
                                    </div>
                                    <div class="ux-help">
                                        <?php echo htmlspecialchars(ux_t('design_live_preview_help', 'همین‌جا همان چیزی را ببین که کاربر در صفحه کمپین می‌بیند.'), ENT_QUOTES, 'UTF-8'); ?>
                                    </div>
                                </div>
                                <div class="ux-preview-toolbar">
                                    <button type="button"
                                            class="ux-preview-device is-active"
                                            data-ux-preview-device="desktop">
                                        <?php echo htmlspecialchars(ux_t('preview_desktop', 'دسکتاپ'), ENT_QUOTES, 'UTF-8'); ?>
                                    </button>
                                    <button type="button"
                                            class="ux-preview-device"
                                            data-ux-preview-device="mobile">
                                        <?php echo htmlspecialchars(ux_t('preview_mobile', 'موبایل'), ENT_QUOTES, 'UTF-8'); ?>
                                    </button>
                                </div>
                            </div>

                            <div class="ux-preview-frame-wrap is-desktop" id="ux-preview-frame-wrap">
                                <iframe
                                    id="ux-preview-frame"
                                    class="ux-preview-frame"
                                    src="<?php echo htmlspecialchars($preview_url, ENT_QUOTES, 'UTF-8'); ?>"
                                    data-base-src="<?php echo htmlspecialchars($preview_url, ENT_QUOTES, 'UTF-8'); ?>"
                                    loading="lazy">
                                </iframe>
                            </div>

                            <button type="button" id="ux-preview-refresh" class="ux-preview-refresh-btn">
                                <?php echo htmlspecialchars(ux_t('preview_refresh', 'بروزرسانی پیش‌نمایش بعد از ذخیره تنظیمات'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
</div>

                    <div class="ux-advanced" style="margin-top:10px;">
                        <div class="ux-row">
                            <div class="ux-col-3">
                                <label>
                                    <?php echo htmlspecialchars(ux_t('design_persian_font_label', 'انتخاب فونت فارسی'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                                <select name="persian_font_file">
                                    <option value="">
                                        <?php echo htmlspecialchars(ux_t('design_persian_font_auto', 'پیش‌فرض (Estedad)'), ENT_QUOTES, 'UTF-8'); ?>
                                    </option>
                                    <?php
                                    $fonts_dir_dropdown = __DIR__ . '/assets/fonts';
                                    $font_options = [];
                                    if (is_dir($fonts_dir_dropdown)) {
                                        $dir_iterator = new DirectoryIterator($fonts_dir_dropdown);
                                        foreach ($dir_iterator as $font_file_info) {
                                            if ($font_file_info->isDot() || !$font_file_info->isFile()) {
                                                continue;
                                            }
                                            $ext = strtolower($font_file_info->getExtension());
                                            if (!in_array($ext, ['woff','woff2','ttf','otf','eot'], true)) {
                                                continue;
                                            }
                                            $font_options[] = $font_file_info->getFilename();
                                        }
                                    }
                                    sort($font_options, SORT_NATURAL | SORT_FLAG_CASE);
                                    foreach ($font_options as $font_file_name):
                                        $selected = ($config['persian_font_file'] ?? '') === $font_file_name ? 'selected' : '';
                                    ?>
                                        <option value="<?php echo htmlspecialchars($font_file_name, ENT_QUOTES, 'UTF-8'); ?>" <?php echo $selected; ?>>
                                            <?php echo htmlspecialchars($font_file_name, ENT_QUOTES, 'UTF-8'); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="ux-help">
                                    <?php echo htmlspecialchars(ux_t('design_persian_font_help', 'تمام فونت‌های موجود در پوشه assets/fonts به‌صورت خودکار در این لیست نمایش داده می‌شوند.'), ENT_QUOTES, 'UTF-8'); ?>
                                </p>
                            </div>
                        </div>

                        <div class="ux-row">
                            <div class="ux-col-3">
                                <label>
                                    <?php echo htmlspecialchars(ux_t('design_custom_font_label', 'font-family اختصاصی (اختیاری)'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                                <input type="text" name="body_font_family"
                                       value="<?php echo htmlspecialchars($config['body_font_family'], ENT_QUOTES, 'UTF-8'); ?>"
                                       placeholder="<?php echo htmlspecialchars(ux_t('design_custom_font_placeholder', 'مثال: \"IRANSans\", sans-serif'), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="ux-col-3">
                                <label>
                                    <?php echo htmlspecialchars(ux_t('design_title_font_size_label', 'سایز فونت عنوان'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                                <input type="text" name="title_font_size"
                                       value="<?php echo htmlspecialchars($config['title_font_size'], ENT_QUOTES, 'UTF-8'); ?>"
                                       placeholder="<?php echo htmlspecialchars(ux_t('design_title_font_size_placeholder', 'مثال: 24px'), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="ux-col-3">
                                <label>
                                    <?php echo htmlspecialchars(ux_t('design_subtitle_font_size_label', 'سایز فونت توضیحات'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                                <input type="text" name="subtitle_font_size"
                                       value="<?php echo htmlspecialchars($config['subtitle_font_size'], ENT_QUOTES, 'UTF-8'); ?>"
                                       placeholder="<?php echo htmlspecialchars(ux_t('design_subtitle_font_size_placeholder', 'مثال: 15px'), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                        </div>
                        <div class="ux-row" style="margin-top:8px;">
                            <div class="ux-col-3">
                                <label>
                                    <?php echo htmlspecialchars(ux_t('design_css_url_label', 'آدرس CSS قالب (اختیاری)'), ENT_QUOTES, 'UTF-8'); ?>
                                </label>
                                <input type="text" name="theme_css_url" dir="ltr"
                                       value="<?php echo htmlspecialchars($config['theme_css_url'], ENT_QUOTES, 'UTF-8'); ?>"
                                       placeholder="/wp-content/themes/.../style.css">
                                <div class="ux-help">
                                    <?php echo htmlspecialchars(ux_t('design_css_url_help', 'برای هماهنگ شدن فونت و استایل با قالب اصلی.'), ENT_QUOTES, 'UTF-8'); ?>
                                </div>
                            </div>
                        </div>
                    </div>
                
                    
                    

                </fieldset>

                <fieldset id="sec-countdown">
                    <legend><?php echo htmlspecialchars(ux_t('section_countdown', 'شمارش معکوس و ورود خودکار'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="show_countdown" value="1" <?php echo !empty($config['show_countdown']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('countdown_show_label', 'نمایش شمارش معکوس روی صفحه کمپین'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('countdown_show_help', 'برای کمپین‌های زمان‌دار (شروع یا پایان فروش ویژه).'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('countdown_target_label', 'زمان هدف (Countdown)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="countdown_target" dir="ltr" value="<?php echo htmlspecialchars($config['countdown_target'], ENT_QUOTES, 'UTF-8'); ?>" placeholder="YYYY-MM-DD HH:MM">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('countdown_target_help', 'مثال: 2025-11-20 18:00 – طبق تایم‌زون انتخاب‌شده.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>

                    <div class="ux-row" style="margin-top:8px;">
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="auto_retry_enabled" value="1" <?php echo !empty($config['auto_retry_enabled']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('auto_retry_label', 'تلاش خودکار برای ورود (رفرش خودکار صفحه)'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('auto_retry_help', 'در حالت Queue، هر چند ثانیه یک‌بار صفحه رفرش می‌شود تا وقتی ظرفیت آزاد شد، کاربر خودکار وارد سایت شود.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('auto_retry_interval_label', 'فاصله رفرش خودکار (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="auto_retry_interval" min="10" value="<?php echo (int)($config['auto_retry_interval'] ?? 30); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('auto_retry_interval_help', 'پیشنهادی: ۲۰ تا ۳۰ ثانیه. (کمتر از ۱۰ ثانیه مجاز نیست برای جلوگیری از فشار اضافی)'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="retry_button_enabled" value="1" <?php echo !empty($config['retry_button_enabled']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('show_retry_button_label', 'نمایش دکمه «بررسی وضعیت ورود»'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('show_retry_button_help', 'اگر فعال باشد، کاربر می‌تواند دستی روی دکمه کلیک کند و همین حالا دوباره تلاش کند.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>
                            <label style="margin-top:6px;">
                                <?php echo htmlspecialchars(ux_t('retry_button_text_label', 'متن دکمه بررسی'), ENT_QUOTES, 'UTF-8'); ?>
                            </label>
                            <input type="text" name="retry_button_text" value="<?php echo htmlspecialchars($config['retry_button_text'] ?? '🐀񑀠بررسی وضعیت ورود', ENT_QUOTES, 'UTF-8'); ?>">
                        </div>
                    </div>
                    <!-- End of countdown settings -->
                </fieldset>

                <fieldset id="sec-html">
                    <legend><?php echo htmlspecialchars(ux_t('section_html_brand', 'HTML سفارشی و متن‌های برند'), ENT_QUOTES, 'UTF-8'); ?></legend>

                    <label>
                        <?php echo htmlspecialchars(ux_t('brand_header_text_label', 'متن هدر صفحه (زیر دایره وضعیت)'), ENT_QUOTES, 'UTF-8'); ?>
                    </label>
                    <input type="text" name="brand_tagline"
                           value="<?php echo htmlspecialchars($config['brand_tagline'] ?? 'unixsee Campaign Gateway – محافظ هوشمند کمپین فروش', ENT_QUOTES, 'UTF-8'); ?>">

                    <label style="margin-top:6px;">
                        <?php echo htmlspecialchars(ux_t('brand_footer_text_label', 'متن فوتر صفحه'), ENT_QUOTES, 'UTF-8'); ?>
                    </label>
                    <input type="text" name="footer_text"
                           value="<?php echo htmlspecialchars($config['footer_text'] ?? 'قدرت‌گرفته از unixsee – طراحی و توسعه توسط Team unixsee', ENT_QUOTES, 'UTF-8'); ?>">

                    <label style="margin-top:8px;">
                        <?php echo htmlspecialchars(ux_t('custom_html_label', 'HTML سفارشی (CTA، شبکه‌های اجتماعی و …)'), ENT_QUOTES, 'UTF-8'); ?>
                    </label>
                    <textarea name="custom_html" rows="5" placeholder="<?php echo htmlspecialchars(ux_t('custom_html_placeholder', 'اینجا می‌توانی دکمه کانال تلگرام، اینستاگرام، خبرنامه و ... را وارد کنی.'), ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($config['custom_html'], ENT_QUOTES, 'UTF-8'); ?></textarea>
                </fieldset>

                <fieldset id="sec-security">
                    <legend><?php echo htmlspecialchars(ux_t('section_security_settings', 'تنظیمات امنیتی پنل'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('admin_username_label', 'نام کاربری پنل'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="admin_username" value="<?php echo htmlspecialchars($config['admin_username'], ENT_QUOTES, 'UTF-8'); ?>">
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('admin_password_label', 'رمز عبور پنل (برای تغییر، مقدار جدید را وارد کن)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="admin_password" value="">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('admin_password_help', 'اگر خالی بگذاری، رمز فعلی تغییر نمی‌کند.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('admin_path_label', 'مسیر پنل ادمین'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="panel_token" value="<?php echo htmlspecialchars($config['panel_token'], ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('admin_path_help', 'پنل ادمین اکنون از طریق مسیر ثابتی قابل دسترسی است:'), ENT_QUOTES, 'UTF-8'); ?><br>
                                <code>unixsee_campaign_gateway/admin.php</code>
                            </div>
                        </div>
                    </div>
                    <!-- نرخ ورود و قفل امنیتی -->
                    <div class="ux-row" style="margin-top:10px;">
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('setting_max_login_attempts', 'حداکثر تعداد تلاش ناموفق'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="max_login_attempts" min="1" value="<?php echo (int)($config['max_login_attempts'] ?? 5); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('max_login_attempts_help', 'تعداد تلاش‌های مجاز قبل از قفل شدن حساب.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('setting_lock_minutes', 'زمان قفل شدن (دقیقه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="lock_minutes" min="1" value="<?php echo (int)($config['lock_minutes'] ?? 15); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('lock_minutes_help', 'مدت زمان قفل حساب پس از اتمام تلاش‌های مجاز.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                </fieldset>

                <!-- Retention and backup settings section -->
                <fieldset id="sec-retention">
                    <legend><?php echo htmlspecialchars(ux_t('section_retention', 'تنظیمات نگهداری و بک‌آپ'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('history_retention_label','نگهداری تاریخچه (روز)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="smart_history_retention_days" min="30" value="<?php echo (int)($config['smart_history_retention_days'] ?? 90); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('history_retention_help','حداقل ۳۰ روز'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('decisions_retention_label','نگهداری تصمیم‌ها (روز)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="smart_decisions_retention_days" min="30" value="<?php echo (int)($config['smart_decisions_retention_days'] ?? 90); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('decisions_retention_help','حداقل ۳۰ روز'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                    <div class="ux-row" style="margin-top:10px;">
                        <div class="ux-col-3" style="margin-bottom:10px;">
                            <button type="button" id="ux-backup-btn" class="ux-btn">
                                <?php echo htmlspecialchars(ux_t('backup_button','بک‌آپ تنظیمات و داده‌ها'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                        <div class="ux-col-3" style="margin-bottom:10px;">
                            <button type="button" id="ux-reset-btn" class="ux-btn danger">
                                <?php echo htmlspecialchars(ux_t('reset_button','ریست تنظیمات و داده‌ها'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                        <div class="ux-col-3" style="margin-bottom:10px;">
                            <button type="button" id="ux-reset-analytics-btn" class="ux-btn danger">
                                <?php echo htmlspecialchars(ux_t('reset_analytics_button','ریست آنالیز'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                        <div class="ux-col-3" style="margin-bottom:10px;">
                            <button type="button" id="ux-reset-db-btn" class="ux-btn danger">
                                <?php echo htmlspecialchars(ux_t('reset_db_button','ریست دیتابیس'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                    </div>
                    <!-- Import backup controls (handled via AJAX to avoid nested forms) -->
                    <div class="ux-row" style="margin-top:10px;">
                        <div class="ux-col-6">
                            <label><?php echo htmlspecialchars(ux_t('import_label','بارگذاری فایل بک‌آپ (ZIP)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input id="ux-import-file" type="file" accept=".zip">
                            <!-- Hidden CSRF token for import -->
                            <input type="hidden" id="ux-import-csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
                            <button type="button" id="ux-import-btn" class="ux-btn" style="margin-top:6px;">
                                <?php echo htmlspecialchars(ux_t('import_button','ایمپورت بک‌آپ'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                    </div>
                </fieldset>

                <!-- Redis settings section -->
                <fieldset id="sec-redis">
                    <legend><?php echo htmlspecialchars(ux_t('section_redis', 'Redis settings'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="redis_enabled" value="1" <?php echo !empty($config['redis_enabled']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('redis_enabled_label', 'Enable Redis'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help"><?php echo htmlspecialchars(ux_t('redis_enabled_help', 'Use Redis to store sessions and queue for higher concurrency.'), ENT_QUOTES, 'UTF-8'); ?></div>
                                </div>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('redis_host_label', 'Redis host'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="redis_host" value="<?php echo htmlspecialchars($config['redis_host'] ?? '127.0.0.1', ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('redis_host_help', 'IP or hostname for Redis server.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('redis_port_label', 'Redis port'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="redis_port" value="<?php echo htmlspecialchars($config['redis_port'] ?? 6379, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('redis_port_help', 'Port number (default 6379).'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('redis_db_label', 'Redis database'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="redis_db" min="0" max="15" value="<?php echo htmlspecialchars($config['redis_db'] ?? 0, ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('redis_db_help', 'Database index (0-15).'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                    <div class="ux-row" style="margin-top:10px;">
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('redis_password_label', 'Redis password'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="text" name="redis_password" value="<?php echo htmlspecialchars($config['redis_password'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
                            <div class="ux-help"><?php echo htmlspecialchars(ux_t('redis_password_help', 'Leave empty if no password.'), ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                </fieldset>

                <!-- Analytics settings section -->
                <fieldset id="sec-analytics">
                    <legend><?php echo htmlspecialchars(ux_t('section_analytics', 'تنظیمات آنالیتیکس'), ENT_QUOTES, 'UTF-8'); ?></legend>
                    <div class="ux-row">
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('analytics_cache_ttl_label', 'مدت کش آمار آنالیتیکس (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="analytics_cache_ttl" min="1" value="<?php echo (int)($config['analytics_cache_ttl'] ?? 60); ?>">
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('analytics_cache_ttl_help', 'تعداد ثانیه‌هایی که آمار خطاها و ربات‌ها در ردیس ذخیره می‌شود؛ مقدار بیشتر بار پردازش را کاهش می‌دهد.'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="analytics_cache_include_lists" value="1" <?php echo !empty($config['analytics_cache_include_lists']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('analytics_cache_include_lists_label', 'ذخیره فهرست کامل خطاها'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help">
                                        <?php echo htmlspecialchars(ux_t('analytics_cache_include_lists_help', 'اگر فعال شود، فهرست کامل URLهای دارای خطای ۴xx و ۵xx در کش ذخیره می‌شود (ممکن است حافظه بیشتری مصرف شود).'), ENT_QUOTES, 'UTF-8'); ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <div class="ux-checkbox-inline">
                                <input type="checkbox" name="analytics_precompute_enabled" value="1" <?php echo !empty($config['analytics_precompute_enabled']) ? 'checked' : ''; ?>>
                                <div>
                                    <div><?php echo htmlspecialchars(ux_t('analytics_precompute_enabled_label', 'فعال‌سازی پیش‌محاسبه آمار'), ENT_QUOTES, 'UTF-8'); ?></div>
                                    <div class="ux-help">
                                        <?php echo htmlspecialchars(ux_t('analytics_precompute_enabled_help', 'اگر فعال باشد، آمار در فواصل زمانی مشخص محاسبه و در ردیس ذخیره می‌شود تا هنگام نمایش داشبورد نیازی به محاسبات سنگین نباشد.'), ENT_QUOTES, 'UTF-8'); ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ux-col-3">
                            <label><?php echo htmlspecialchars(ux_t('analytics_precompute_interval_label', 'بازهٔ پیش‌محاسبه (ثانیه)'), ENT_QUOTES, 'UTF-8'); ?></label>
                            <input type="number" name="analytics_precompute_interval" min="1" value="<?php echo (int)($config['analytics_precompute_interval'] ?? 60); ?>">
                            <div class="ux-help">
                                <?php echo htmlspecialchars(ux_t('analytics_precompute_interval_help', 'کمترین فاصله زمانی بین دو پیش‌محاسبهٔ متوالی وقتی این ویژگی فعال است.'), ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        </div>
                    </div>
                    <!-- Manual precompute button: Only show when Redis is enabled. This triggers a manual analytics precompute via AJAX. -->
                    <?php if (!empty($config['redis_enabled'])): ?>
                    <div class="ux-row" style="margin-top:15px;">
                        <div class="ux-col-3">
                            <button type="button" id="ux-precompute-btn" class="ux-btn">
                                <?php echo htmlspecialchars(ux_t('analytics_precompute_now', 'محاسبهٔ آمار اکنون'), ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        </div>
                        <div class="ux-col-9">
                            <span id="ux-precompute-message" class="ux-help" style="line-height:32px;"></span>
                        </div>
                    </div>
                    <?php endif; ?>
                </fieldset>

                <div class="ux-submit">
                    <button class="ux-btn" type="submit"><?php echo htmlspecialchars(ux_t('btn_save', 'ذخیره تنظیمات'), ENT_QUOTES, 'UTF-8'); ?></button>
                </div>

                <!-- End settings layout -->
                    </div><!-- .ux-settings-content -->
                </div><!-- .ux-settings-layout -->
            </form>

            <!-- فرم جدا برای تخلیه کامل صف کاربران فعال -->
            <form id="ux-clear-form" method="post" onsubmit="return confirm(<?php echo json_encode(ux_t('confirm_flush_active', 'تمام کاربران فعلی از صف خارج می‌شوند و ظرفیت آزاد می‌شود. مطمئنی؟')); ?>);" style="margin-top:10px;">
                <input type="hidden" name="ux_action" value="clear_sessions">
                <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">
                <div class="ux-submit">
                    <button class="ux-btn danger" type="submit"><?php echo htmlspecialchars(ux_t('btn_clear_active_queue', 'تخلیه کامل صف کاربران فعال'), ENT_QUOTES, 'UTF-8'); ?></button>
                </div>
            </form>

            <!-- Floating actions container for save and clear buttons -->
            <div class="ux-actions-floating">
                <!-- Save settings button with icon -->
                <button class="ux-btn" type="submit" form="ux-settings-form" title="<?php echo htmlspecialchars(ux_t('btn_save', 'ذخیره تنظیمات'), ENT_QUOTES, 'UTF-8'); ?>" aria-label="<?php echo htmlspecialchars(ux_t('btn_save', 'ذخیره تنظیمات'), ENT_QUOTES, 'UTF-8'); ?>">
                    <span class="ux-btn-icon">
                        <!-- Check/save icon -->
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                    </span>
                    <span class="ux-btn-label"><?php echo htmlspecialchars(ux_t('btn_save', 'ذخیره تنظیمات'), ENT_QUOTES, 'UTF-8'); ?></span>
                </button>
                <!-- Clear active queue button with icon -->
                <button class="ux-btn danger" type="submit" form="ux-clear-form" title="<?php echo htmlspecialchars(ux_t('btn_clear_active_queue', 'تخلیه کامل صف کاربران فعال'), ENT_QUOTES, 'UTF-8'); ?>" aria-label="<?php echo htmlspecialchars(ux_t('btn_clear_active_queue', 'تخلیه کامل صف کاربران فعال'), ENT_QUOTES, 'UTF-8'); ?>">
                    <span class="ux-btn-icon">
                        <!-- Trash icon -->
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M9 6V4h6v2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                    </span>
                    <span class="ux-btn-label"><?php echo htmlspecialchars(ux_t('btn_clear_active_queue', 'تخلیه کامل صف کاربران فعال'), ENT_QUOTES, 'UTF-8'); ?></span>
                </button>
            </div>

            <!-- Script to make the floating action box draggable on desktop and mobile -->
            <script>
            document.addEventListener('DOMContentLoaded', function () {
                var box = document.querySelector('.ux-actions-floating');
                if (!box) return;
                var dragging = false;
                var offsetX  = 0;
                var offsetY  = 0;

                function startDrag(e) {
                    // Do not start dragging if the interaction originates from within a button.
                    // This allows taps/clicks on the floating buttons to submit forms normally on mobile.
                    var target = e.target;
                    if (target && target.closest && target.closest('button')) {
                        return;
                    }
                    dragging = true;
                    var rect = box.getBoundingClientRect();
                    // Support both mouse and touch events
                    var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                    var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                    offsetX = clientX - rect.left;
                    offsetY = clientY - rect.top;
                    // Prevent default only when dragging is intended
                    e.preventDefault();
                }

                function doDrag(e) {
                    if (!dragging) return;
                    var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                    var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                    var x = clientX - offsetX;
                    var y = clientY - offsetY;
                    // Constrain within viewport
                    var maxX = window.innerWidth - box.offsetWidth;
                    var maxY = window.innerHeight - box.offsetHeight;
                    x = Math.max(0, Math.min(x, maxX));
                    y = Math.max(0, Math.min(y, maxY));
                    box.style.left   = x + 'px';
                    box.style.top    = y + 'px';
                    box.style.right  = 'auto';
                    box.style.bottom = 'auto';
                    box.style.position = 'fixed';
                }

                function endDrag() {
                    dragging = false;
                }

                box.addEventListener('mousedown', startDrag);
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', endDrag);

                box.addEventListener('touchstart', function (e) { startDrag(e); }, {passive:false});
                document.addEventListener('touchmove', function (e) { doDrag(e); }, {passive:false});
                document.addEventListener('touchend', endDrag);
            });
            </script>
        </div>
    </div>

    <script>
    (function() {
        // متغیرهای عمومی فرم
        var advToggle    = document.getElementById('ux-advanced-toggle');
        var primaryInput = document.querySelector('[name="primary_color"]');
        var bgInput      = document.querySelector('[name="bg_color"]');
        var glowInput    = document.querySelector('[name="glow_color"]');
        var themeSelect  = document.querySelector('[name="theme_mode"]');
        var tpl          = document.getElementById('ux-preset-template');

        // سوییچ تنظیمات پیشرفته + ذخیره در localStorage
        if (advToggle) {
            // وضعیت اولیه از localStorage
            try {
                var saved = localStorage.getItem('ux_show_advanced');
                if (saved === '1') {
                    advToggle.checked = true;
                    document.body.classList.add('ux-show-advanced');
                }
            } catch (e) {}

            advToggle.addEventListener('change', function() {
                if (this.checked) {
                    document.body.classList.add('ux-show-advanced');
                    try { localStorage.setItem('ux_show_advanced', '1'); } catch (e) {}
                } else {
                    document.body.classList.remove('ux-show-advanced');
                    try { localStorage.setItem('ux_show_advanced', '0'); } catch (e) {}
                }
            });
        }

        // وقتی تم عوض می‌شود، رنگ‌های پیش‌فرض همان تم پیشنهاد شود
        if (themeSelect && primaryInput && bgInput && glowInput) {
            themeSelect.addEventListener('change', function () {
                var v = this.value || 'glass';
                var confirmText = <?php echo json_encode(ux_t('confirm_theme_defaults', 'رنگ‌های پیش‌فرض این تم روی رنگ فعلی اعمال شود؟\nبعداً هم می‌توانی آن‌ها را دستی عوض کنی.')); ?>;
                if (!confirm(confirmText)) return;

                if (v === 'glass') {
                    primaryInput.value = '#ff6a00';
                    bgInput.value      = '#050816';
                    glowInput.value    = '#ff6a00';
                } else if (v === 'dark') {
                    primaryInput.value = '#ff5722';
                    bgInput.value      = '#050816';
                    glowInput.value    = '#ff5722';
                } else if (v === 'light') {
                    primaryInput.value = '#ff5722';
                    bgInput.value      = '#f5f5f5';
                    glowInput.value    = '#ff5722';
                } else if (v === 'blackfriday') {
                    primaryInput.value = '#ffc300';
                    bgInput.value      = '#000000';
                    glowInput.value    = '#ff1744';
                }
            });
        }

        // الگوهای آماده (Preset)
        if (tpl) {
            tpl.addEventListener('change', function() {
                if (!this.value) return;
                var presetConfirm = <?php echo json_encode(ux_t('confirm_preset_apply', 'با انتخاب این الگو، عنوان، متن توضیحات و HTML سفارشی با متن پیشنهادی جایگزین می‌شود. ادامه می‌دهی؟')); ?>;
                if (!confirm(presetConfirm)) {
                    this.value = '';
                    return;
                }
                var title       = document.querySelector('[name="page_title"]');
                var sub         = document.querySelector('[name="page_subtitle"]');
                var htmlBox     = document.querySelector('[name="custom_html"]');
                var primaryInput = document.querySelector('[name="primary_color"]');
                var bgInput      = document.querySelector('[name="bg_color"]');
                var glowInput    = document.querySelector('[name="glow_color"]');
                var themeSelect  = document.querySelector('[name="theme_mode"]');

                switch (this.value) {
                    case 'flash_sale':
                        if (title)   title.value = <?php echo json_encode(ux_t('preset_sale_queue_title', 'شما در صف ورود به جشن فروش ویژه unixsee هستید')); ?>;
                        if (sub)     sub.value   = <?php echo json_encode(ux_t('preset_sale_queue_sub', "در حال حاضر حجم ورود کاربران به کمپین بسیار بالاست و برای حفظ کیفیت سرویس، ورود به صورت نوبتی انجام می‌شود.\nاین صفحه را نبندید؛ به محض آزاد شدن ظرفیت، به‌صورت خودکار وارد فروش ویژه می‌شوید.")); ?>;
                        if (primaryInput) primaryInput.value = '#ff6a00';
                        if (bgInput)      bgInput.value      = '#050816';
                        if (glowInput)    glowInput.value    = '#ff6a00';
                        if (themeSelect)  themeSelect.value  = 'glass';
                        if (htmlBox) htmlBox.value = <?php echo json_encode(ux_t('preset_sale_queue_html', '<div style="margin-top:14px;">\n  <a href="#" target="_blank" class="ux-btn">عضویت در کانال اطلاع‌رسانی کمپین unixsee</a>\n  <p style="font-size:12px;opacity:0.8;margin-top:10px;">از طریق کانال، زمان دقیق شروع و لینک‌های ویژه کمپین را دریافت کنید.</p>\n</div>')); ?>;
                        break;
                    case 'maintenance':
                        if (title)   title.value = <?php echo json_encode(ux_t('preset_maintenance_title', 'سایت فروشگاه unixsee در حال به‌روزرسانی است')); ?>;
                        if (sub)     sub.value   = <?php echo json_encode(ux_t('preset_maintenance_sub', "برای ارتقای سرعت و کیفیت تجربه خرید شما، در حال انجام به‌روزرسانی‌های فنی هستیم.\nاین فرایند معمولاً چند دقیقه طول می‌کشد. لطفاً کمی بعد دوباره سر بزنید.")); ?>;
                        if (primaryInput) primaryInput.value = '#00bcd4';
                        if (bgInput)      bgInput.value      = '#050816';
                        if (glowInput)    glowInput.value    = '#00bcd4';
                        if (htmlBox) htmlBox.value = <?php echo json_encode(ux_t('preset_maintenance_html', '<p style="font-size:12px;opacity:0.8;margin-top:10px;">در صورت نیاز فوری، از طریق ایمیل پشتیبانی با ما در ارتباط باشید.</p>')); ?>;
                        break;
                    case 'simple_info':
                        if (title)   title.value = <?php echo json_encode(ux_t('preset_simple_title', 'لطفاً چند لحظه شکیبا باشید')); ?>;
                        if (sub)     sub.value   = <?php echo json_encode(ux_t('preset_simple_sub', "به دلیل حجم بالای ترافیک، به‌طور موقت ورود به سایت محدود شده است.\nبه‌زودی مجدداً در دسترس خواهیم بود.")); ?>;
                        if (primaryInput) primaryInput.value = '#ff9800';
                        if (bgInput)      bgInput.value      = '#050816';
                        if (glowInput)    glowInput.value    = '#ff9800';
                        if (htmlBox) htmlBox.value = <?php echo json_encode(ux_t('preset_simple_html', '')); ?>;
                        break;
                    case 'black_friday':
                        if (title)   title.value = <?php echo json_encode(ux_t('preset_blackfriday_title', 'Black Friday unixsee – شما در صف حراج بزرگ هستید')); ?>;
                        if (sub)     sub.value   = <?php echo json_encode(ux_t('preset_blackfriday_sub', "فروش ویژه بلک‌فرایدی unixsee همین حالا در حال برگزاری است.\nبرای جلوگیری از فشار روی سرورها، ورود به سایت به‌صورت نوبتی انجام می‌شود.\nاین صفحه را نبندید؛ به محض آزاد شدن ظرفیت، به‌طور خودکار وارد فروشگاه می‌شوید.")); ?>;
                        if (primaryInput) primaryInput.value = '#ffc300';
                        if (bgInput)      bgInput.value      = '#000000';
                        if (glowInput)    glowInput.value    = '#ff1744';
                        if (themeSelect)  themeSelect.value  = 'blackfriday';
                        if (htmlBox) htmlBox.value = <?php echo json_encode(ux_t('preset_blackfriday_html', '<div style="margin-top:14px;">\n  <a href="#" target="_blank" class="ux-btn">عضویت در کانال اطلاع‌رسانی حراج بلک‌فرایدی unixsee</a>\n  <p style="font-size:12px;opacity:0.8;margin-top:10px;">خبر شروع موج‌های بعدی تخفیف را همین‌جا اعلام می‌کنیم.</p>\n</div>')); ?>;
                        break;
                }
                this.value = '';
            });
        }

        // Live preview of campaign / waiting page
        (function () {
            var previewFrame = document.getElementById('ux-preview-frame');
            var previewWrap  = document.getElementById('ux-preview-frame-wrap');
            if (!previewFrame || !previewWrap) {
                return;
            }

            // محاسبه و اعمال اسکیل طوری که کل صفحه داخل فریم جا شود
            function applyScale() {
                try {
                    var doc  = previewFrame.contentDocument || previewFrame.contentWindow.document;
                    if (!doc) return;

                    var body = doc.body || doc.documentElement;
                    if (!body) return;

                    // ریست استایل‌های قبلی
                    body.style.transform       = '';
                    body.style.transformOrigin = '';
                    body.style.margin          = '';
                    body.style.overflow        = '';

                    // ابعاد طبیعی محتوا
                    var naturalWidth  = body.scrollWidth  || body.offsetWidth  || 1200;
                    var naturalHeight = body.scrollHeight || body.offsetHeight || 800;

                    // عرض قابل استفاده در باکس پیش‌نمایش
                    var wrapWidth = previewWrap.clientWidth;
                    if (!wrapWidth || wrapWidth <= 0) wrapWidth = naturalWidth;

                    // نسبت اسکیل فقط روی عرض؛ از ۱ بزرگ‌تر نمی‌کنیم
                    var scale = wrapWidth / naturalWidth;
                    if (!isFinite(scale) || scale <= 0) scale = 1;
                    if (scale > 1) scale = 1;

                    // مرکز کردن محتوا و جلوگیری از اسکرول داخلی
                    body.style.margin          = '0 auto';
                    body.style.transformOrigin = 'top center';
                    body.style.transform       = 'scale(' + scale + ')';
                    body.style.overflow        = 'hidden';

                    // تنظیم ارتفاع آی‌فریم بر اساس ارتفاع اسکیل‌شده
                    var scaledHeight = naturalHeight * scale;
                    previewFrame.style.height = scaledHeight + 'px';
                } catch (e) {
                    // در صورت خطا، نادیده می‌گیریم تا پنل خراب نشود
                }
            }

            function setMode(mode) {
                previewWrap.classList.remove('is-mobile', 'is-desktop');
                if (mode === 'mobile') {
                    previewWrap.classList.add('is-mobile');
                } else {
                    previewWrap.classList.add('is-desktop');
                }
                applyScale();
            }

            var deviceButtons = document.querySelectorAll('[data-ux-preview-device]');
            deviceButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    deviceButtons.forEach(function (b) { b.classList.remove('is-active'); });
                    btn.classList.add('is-active');
                    setMode(btn.getAttribute('data-ux-preview-device') || 'desktop');
                });
            });

            var refreshBtn = document.getElementById('ux-preview-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function () {
                    var baseSrc = previewFrame.getAttribute('data-base-src') || previewFrame.getAttribute('src');
                    if (!baseSrc) return;
                    var sep = baseSrc.indexOf('?') === -1 ? '?' : '&';
                    previewFrame.src = baseSrc + sep + '_=' + Date.now();
                });
            }

            // ریسایز پنجره مدیریت → اسکیل دوباره
            window.addEventListener('resize', function () {
                applyScale();
            });

            // بعد از لود شدن کامل آی‌فریم
            previewFrame.addEventListener('load', function () {
                // پس از لود اولیه، مقیاس را اعمال می‌کنیم
                applyScale();
            });

            // وقتی iframe از داخل (صفحه کمپین) سیگنال پایان لود می‌فرستد، مجدداً اسکیل را اعمال کن
            window.addEventListener('message', function(event) {
                try {
                    // برخی مرورگرها داده را مستقیماً و برخی در فیلد data.type می‌فرستند
                    var msg = event.data;
                    if (msg === 'ux-preview-loaded' || (msg && msg.type === 'ux-preview-loaded')) {
                        applyScale();
                    }
                } catch (e) {
                    // در صورت خطا، کاری انجام نمی‌دهیم
                }
            });

            // حالت پیش‌فرض
            setMode('desktop');
        })();

    })();
    </script>

    <!-- Redis stats chart and flush functionality -->
    <script>
    (function() {
        /**
         * Build the AJAX URL for fetching recent Redis statistics. The limit
         * parameter controls how many samples to return; here we fix it at 48
         * points (approximately 24h if sampled every 30 minutes).
         * @returns {string}
         */
        function buildRedisUrl() {
            return '?ux_ajax=redis-stats&limit=48';
        }

        /**
         * Build the AJAX URL for flushing the Redis database. This endpoint
         * triggers ux_flush_redis_cache() on the server and returns a JSON
         * response with a success flag.
         * @returns {string}
         */
        function buildRedisFlushUrl() {
            return '?ux_ajax=redis-flush';
        }

        /**
         * Update the on‑screen Redis metrics (used memory and hit ratio)
         * and redraw the chart using Chart.js. If no stats are available,
         * the memory and hit ratio values are replaced with the generic
         * "no data" message and any existing chart is destroyed.
         *
         * @param {Array} stats An array of objects with keys ts, used_memory,
         * hits, misses and keys, ordered chronologically.
         */
        function updateRedisStats(stats) {
            var memoryEl = document.getElementById('ux-redis-memory');
            var ratioEl  = document.getElementById('ux-redis-hit-ratio');
            var chartEl  = document.getElementById('ux-redis-chart');
            if (!memoryEl || !ratioEl || !chartEl) return;
            // If no data, show placeholder and destroy existing chart
            if (!Array.isArray(stats) || stats.length === 0) {
                var noData = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;
                memoryEl.textContent = noData;
                ratioEl.textContent  = noData;
                if (chartEl._chart) {
                    chartEl._chart.destroy();
                    chartEl._chart = null;
                }
                return;
            }
            // Latest sample determines current values
            var latest = stats[stats.length - 1];
            var usedMB = latest.used_memory / 1024 / 1024;
            var hits   = latest.hits;
            var misses = latest.misses;
            var ratio  = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 100;
            memoryEl.textContent = usedMB.toFixed(1) + ' MB';
            ratioEl.textContent  = ratio.toFixed(1) + '%';
            // Prepare arrays for chart data
            var labels    = [];
            var memData   = [];
            var ratioData = [];
            stats.forEach(function(row) {
                var date = new Date(row.ts * 1000);
                // Format label as HH:MM for readability
                var h = date.getHours().toString().padStart(2,'0');
                var m = date.getMinutes().toString().padStart(2,'0');
                labels.push(h + ':' + m);
                memData.push(row.used_memory / 1024 / 1024);
                var rh  = row.hits;
                var rm  = row.misses;
                var rr  = (rh + rm) > 0 ? (rh / (rh + rm)) * 100 : 100;
                ratioData.push(rr);
            });
            var ctx = chartEl.getContext('2d');
            if (!chartEl._chart) {
                // On first render create a new Chart instance with dual axes
                var memLabel   = <?php echo json_encode(ux_t('redis_memory_dataset_label', 'Memory (MB)')); ?>;
                var ratioLabel = <?php echo json_encode(ux_t('redis_hit_ratio_dataset_label', 'Hit ratio (%)')); ?>;
                chartEl._chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: memLabel,
                                data: memData,
                                borderColor: '#4f46e5',
                                backgroundColor: 'rgba(79,70,229,0.2)',
                                fill: true,
                                yAxisID: 'y',
                                tension: 0.3,
                                pointRadius: 0
                            },
                            {
                                label: ratioLabel,
                                data: ratioData,
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245,158,11,0.2)',
                                fill: false,
                                yAxisID: 'y1',
                                tension: 0.3,
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { display: false },
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#cbd5e1' },
                                grid: { display: false },
                                position: 'left'
                            },
                            y1: {
                                beginAtZero: true,
                                min: 0,
                                max: 100,
                                ticks: { color: '#cbd5e1' },
                                grid: { drawOnChartArea: false },
                                position: 'right'
                            }
                        },
                        plugins: {
                            legend: {
                                display: true,
                                labels: {
                                    color: '#cbd5e1',
                                    font: { size: 9 },
                                    usePointStyle: true,
                                    boxHeight: 6,
                                    boxWidth: 6
                                },
                                position: 'bottom'
                            },
                            tooltip: {
                                enabled: true,
                                backgroundColor: 'rgba(15,23,42,0.9)',
                                borderColor: 'rgba(148,163,184,0.3)',
                                borderWidth: 1,
                                titleColor: '#f5f5f5',
                                bodyColor: '#f5f5f5',
                                displayColors: false,
                                bodyFont: { size: 10 },
                                titleFont: { size: 10 },
                                callbacks: {
                                    label: function(context) {
                                        var label = context.dataset.label || '';
                                        if (label) label += ': ';
                                        label += context.formattedValue;
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                var ch = chartEl._chart;
                ch.data.labels = labels;
                ch.data.datasets[0].data = memData;
                ch.data.datasets[1].data = ratioData;
                ch.update();
            }
        }

        function uxFormatSeconds(sec) {
            if (sec === null || sec === undefined) return '–';
            sec = Number(sec);
            if (!isFinite(sec) || sec < 0) return '–';
            if (sec < 60) return Math.round(sec) + 's';
            var m = sec / 60;
            if (m < 60) return Math.round(m) + 'm';
            var h = m / 60;
            if (h < 24) return Math.round(h) + 'h';
            var d = h / 24;
            return Math.round(d) + 'd';
        }

        function uxRedisStatusLabel(status) {
            var s = (status || '').toLowerCase();
            if (s === 'ok')   return <?php echo json_encode(ux_t('redis_status_ok','سالم')); ?>;
            if (s === 'warn') return <?php echo json_encode(ux_t('redis_status_warn','هشدار')); ?>;
            if (s === 'crit') return <?php echo json_encode(ux_t('redis_status_crit','بحرانی')); ?>;
            return <?php echo json_encode(ux_t('redis_status_down','قطع')); ?>;
        }

        function uxRedisStatusStyle(el, status) {
            if (!el) return;
            var s = (status || '').toLowerCase();
            el.style.display = 'inline-block';
            el.style.padding = '4px 10px';
            el.style.borderRadius = '999px';
            el.style.fontSize = '12px';
            el.style.border = '1px solid rgba(255,255,255,0.18)';
            if (s === 'ok') {
                el.style.background = 'rgba(22,163,74,0.25)';
            } else if (s === 'warn') {
                el.style.background = 'rgba(234,179,8,0.22)';
            } else if (s === 'crit') {
                el.style.background = 'rgba(220,38,38,0.25)';
            } else {
                el.style.background = 'rgba(148,163,184,0.18)';
            }
        }

        function updateRedisHealth(health) {
            var stEl   = document.getElementById('ux-redis-health-status');
            var msgEl  = document.getElementById('ux-redis-health-msg');
            var latEl  = document.getElementById('ux-redis-health-latency');
            var memEl  = document.getElementById('ux-redis-health-memory');
            var opsEl  = document.getElementById('ux-redis-health-ops');
            var clientsEl = document.getElementById('ux-redis-health-clients');
            var roleEl    = document.getElementById('ux-redis-health-role');
            if (!stEl || !latEl || !memEl || !opsEl) return;

            var noData = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;
            if (!health || !health.status) {
                stEl.textContent = noData;
                latEl.textContent = noData;
                memEl.textContent = noData;
                opsEl.textContent = noData;
                if (clientsEl) clientsEl.textContent = noData;
                if (roleEl) roleEl.textContent = noData;
                if (msgEl) msgEl.textContent = '';
                return;
            }

            var status = health.status;
            stEl.textContent = uxRedisStatusLabel(status);
            uxRedisStatusStyle(stEl, status);

            var lat = health.latency_ms;
            latEl.textContent = (lat !== null && lat !== undefined) ? (Number(lat).toFixed(1) + ' ms') : '–';

            var used = Number(health.used_memory || 0) / 1024 / 1024;
            var max  = Number(health.maxmemory || 0) / 1024 / 1024;
            var pct  = health.memory_pct;
            if (max > 0 && pct !== null && pct !== undefined) {
                memEl.textContent = used.toFixed(1) + ' / ' + max.toFixed(0) + ' MB (' + Number(pct).toFixed(1) + '%)';
            } else {
                memEl.textContent = used.toFixed(1) + ' MB';
            }

            opsEl.textContent = String(health.ops_per_sec || 0);

            
            if (clientsEl) {
                clientsEl.textContent = (health.clients !== undefined && health.clients !== null) ? String(health.clients) : '–';
            }
            if (roleEl) {
                roleEl.textContent = (health.role) ? String(health.role) : '–';
            }
if (msgEl) {
                var parts = [];
                if (health.role) parts.push(<?php echo json_encode(ux_t('redis_health_role_label','نقش')); ?> + ': ' + health.role);
                if (health.clients !== undefined) parts.push(<?php echo json_encode(ux_t('redis_health_clients_label','کلاینت‌ها')); ?> + ': ' + health.clients);
                if (health.blocked_clients) parts.push('blocked: ' + health.blocked_clients);
                if (Array.isArray(health.warnings) && health.warnings.length) parts.push('⚠ ' + health.warnings.join(', '));
                msgEl.textContent = parts.join(' • ');
            }
        }

        function updateRedisPrefix(prefix) {
            var keysEl = document.getElementById('ux-redis-prefix-keys');
            var expEl  = document.getElementById('ux-redis-prefix-expires');
            var ttlEl  = document.getElementById('ux-redis-prefix-avgttl');
            var memEl  = document.getElementById('ux-redis-prefix-memory');
            var noteEl = document.getElementById('ux-redis-prefix-note');
            if (!keysEl || !expEl || !ttlEl || !memEl) return;

            var noData = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;
            if (!prefix || prefix.status !== 'ok') {
                keysEl.textContent = noData;
                expEl.textContent  = noData;
                ttlEl.textContent  = noData;
                memEl.textContent  = noData;
                if (noteEl) noteEl.textContent = '';
                return;
            }

            keysEl.textContent = String(prefix.keys || 0);
            expEl.textContent  = (prefix.expires_pct !== undefined && prefix.expires_pct !== null) ? (Number(prefix.expires_pct).toFixed(1) + '%') : '–';
            ttlEl.textContent  = uxFormatSeconds(prefix.avg_ttl_seconds);
            var mb = Number(prefix.memory_bytes || 0) / 1024 / 1024;
            memEl.textContent  = mb.toFixed(2) + ' MB';

            if (noteEl) {
                var tag = [];
                if (prefix.prefix) tag.push(prefix.prefix);
                if (prefix.db !== undefined) tag.push('db' + prefix.db);
                if (prefix.sampled) tag.push('sampled');
                noteEl.textContent = tag.join(' • ');
            }
        }

        function updateRedisCommands(commands) {
            var table = document.getElementById('ux-redis-command-table');
            var dtEl  = document.getElementById('ux-redis-command-dt');
            if (!table) return;

            var noData = <?php echo json_encode(ux_t('no_data', 'بدون داده')); ?>;

            function esc(s) {
                s = String(s === null || typeof s === 'undefined' ? '' : s);
                return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }

            if (!commands || commands.status !== 'ok' || !Array.isArray(commands.items)) {
                table.innerHTML = '<tbody><tr><td style="padding:10px 12px;color:#94a3b8;">' + noData + '</td></tr></tbody>';
                if (dtEl) dtEl.textContent = '';
                return;
            }

            if (dtEl) dtEl.textContent = 'Δt=' + String(commands.dt_seconds || 0) + 's';

            var html = '';
            html += '<thead><tr>';
            html += '<th>' + <?php echo json_encode(ux_t('redis_command_col_cmd','دستور')); ?> + '</th>';
            html += '<th>' + <?php echo json_encode(ux_t('redis_command_col_cps','calls/s')); ?> + '</th>';
            html += '<th>' + <?php echo json_encode(ux_t('redis_command_col_usec','µs/call')); ?> + '</th>';
            html += '<th>' + <?php echo json_encode(ux_t('redis_command_col_total','کل calls')); ?> + '</th>';
            html += '</tr></thead><tbody>';

            commands.items.forEach(function(it) {
                var dangerClass = it.danger ? ' class="is-danger"' : '';
                html += '<tr>';
                html += '<td' + dangerClass + '>' + esc(it.cmd || '') + '</td>';
                html += '<td dir="ltr">' + (Number(it.calls_per_sec || 0).toFixed(2)) + '</td>';
                html += '<td dir="ltr">' + (Number(it.usec_per_call || 0).toFixed(1)) + '</td>';
                html += '<td dir="ltr">' + esc(it.calls_total || 0) + '</td>';
                html += '</tr>';
            });

            html += '</tbody>';
            table.innerHTML = html;
        }


        /**
         * Fetch the latest Redis stats from the server and update the UI. This
         * function handles any network errors gracefully by skipping the update.
         */
        function pollRedis() {
            var url = buildRedisUrl();
            fetch(url, { credentials: 'same-origin' })
                .then(function(r) { return r && r.ok ? r.json() : null; })
                .then(function(data) {
                    // Gateway RPS badge (derived from Redis per-second counters)
                    (function updateGateway(gw){
                        var sumEl = document.getElementById('ux-gateway-rps-badge');
                        var nowEl = document.getElementById('ux-gw-rps-now');
                        var a10El = document.getElementById('ux-gw-rps-avg10');
                        var a60El = document.getElementById('ux-gw-rps-avg60');
                        var opsEl = document.getElementById('ux-gw-ops-req');
                        var allowEl = document.getElementById('ux-gw-allow');
                        var queueEl = document.getElementById('ux-gw-queue');

                        function setText(el, v){ if (el) el.textContent = v; }

                        if (!gw || typeof gw !== 'object') {
                            setText(sumEl, '–');
                            setText(nowEl, '–'); setText(a10El,'–'); setText(a60El,'–');
                            setText(opsEl,'–'); setText(allowEl,'–'); setText(queueEl,'–');
                            return;
                        }

                        var rpsNow = Number(gw.rps_now || 0);
                        var avg10  = Number(gw.avg10 || 0);
                        var avg60  = Number(gw.avg60 || 0);
                        var opsReq = (gw.ops_per_req === null || typeof gw.ops_per_req === 'undefined') ? null : Number(gw.ops_per_req);
                        var allowN = Number(gw.allow_now || 0);
                        var queueN = Number(gw.queue_now || 0);

                        setText(nowEl, String(rpsNow));
                        setText(a10El, avg10.toFixed(1));
                        setText(a60El, avg60.toFixed(1));
                        setText(allowEl, String(allowN));
                        setText(queueEl, String(queueN));

                        if (opsReq !== null && isFinite(opsReq)) {
                            setText(opsEl, opsReq.toFixed(2));
                        } else {
                            setText(opsEl, '–');
                        }

                        var parts = [];
                        parts.push('r/s=' + String(rpsNow));
                        parts.push('avg10=' + avg10.toFixed(1));
                        parts.push('avg60=' + avg60.toFixed(1));
                        parts.push('ops/req=' + ((opsReq !== null && isFinite(opsReq)) ? opsReq.toFixed(2) : '–'));
                        parts.push('allow=' + String(allowN));
                        parts.push('queue=' + String(queueN));

                        setText(sumEl, parts.join(' • '));
                    })(data && data.gateway ? data.gateway : null);

                    if (!data || !Array.isArray(data.stats)) {
                        updateRedisStats([]);
                        updateRedisHealth(null);
                        updateRedisPrefix(null);
                        updateRedisCommands(null);
                    } else {
                        updateRedisStats(data.stats);
                        updateRedisHealth(data.health || null);
                        updateRedisPrefix(data.prefix || null);
                        updateRedisCommands(data.commands || null);
                    }
                })
                .catch(function() {});
        }

        // Initialise on DOMContentLoaded: attach flush handler and kick off polling
        document.addEventListener('DOMContentLoaded', function() {
            var flushBtn = document.getElementById('ux-redis-flush');
            if (flushBtn) {
                var originalText = flushBtn.textContent;
                flushBtn.addEventListener('click', function() {
                    var url = buildRedisFlushUrl();
                    flushBtn.disabled = true;
                    fetch(url, {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function() {
                            // After flush, refresh stats
                            pollRedis();
                            // نمایش پیام موفقیت برای مدت کوتاه
                            var successLabel = <?php echo json_encode(ux_t('redis_flush_success', 'Cache flushed')); ?>;
                            flushBtn.textContent = successLabel;
                            setTimeout(function() {
                                flushBtn.textContent = originalText;
                            }, 2500);
                        })
                        .catch(function() {})
                        .finally(function() {
                            flushBtn.disabled = false;
                        });
                });
            }
            // Initial paint
            pollRedis();

            // Manual refresh
            var refreshNowBtn = document.getElementById('ux-redis-refresh-now');
            if (refreshNowBtn) {
                refreshNowBtn.addEventListener('click', function () {
                    pollRedis();
                });
            }

            // Adjustable polling interval (stored in localStorage)
            var pollTimer = null;
            function setPollInterval(ms) {
                ms = parseInt(ms, 10);
                if (!isFinite(ms) || ms < 5000) ms = 30000;
                if (pollTimer) {
                    clearInterval(pollTimer);
                }
                pollTimer = setInterval(function() { pollRedis(); }, ms);
            }

            var sel = document.getElementById('ux-redis-refresh-interval');
            if (sel) {
                try {
                    var saved = localStorage.getItem('uxRedisPollMs');
                    if (saved && sel.querySelector('option[value="' + saved + '"]')) {
                        sel.value = saved;
                    }
                } catch (e) {}

                setPollInterval(sel.value);

                sel.addEventListener('change', function () {
                    try { localStorage.setItem('uxRedisPollMs', sel.value); } catch (e) {}
                    setPollInterval(sel.value);
                    pollRedis();
                });
            } else {
                setPollInterval(30000);
            }
});
    })();
    </script>

    <!-- Backup and reset functionality script -->
    <script>
    (function() {
        // Build AJAX URLs for backup and reset operations
        function buildBackupUrl() {
            return '?ux_ajax=backup';
        }
        function buildResetUrl() {
            return '?ux_ajax=reset';
        }
        // Build AJAX URLs for separate analytics and database resets
        function buildResetAnalyticsUrl() {
            return '?ux_ajax=reset_analytics';
        }
        function buildResetDbUrl() {
            return '?ux_ajax=reset_db';
        }
        document.addEventListener('DOMContentLoaded', function() {
            // Handle backup button click
            var backupBtn = document.getElementById('ux-backup-btn');
            if (backupBtn) {
                var originalBackupText = backupBtn.textContent;
                backupBtn.addEventListener('click', function() {
                    backupBtn.disabled = true;
                    fetch(buildBackupUrl(), {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success && data.url) {
                                var downloadLabel = <?php echo json_encode(ux_t('backup_download_label','دانلود فایل پشتیبان')); ?>;
                                backupBtn.textContent = downloadLabel;
                                // Open the backup file in a new tab after a short delay
                                setTimeout(function() {
                                    window.open(data.url, '_blank');
                                }, 200);
                                setTimeout(function() {
                                    backupBtn.textContent = originalBackupText;
                                }, 3000);
                            } else {
                                var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('backup_error','خطا در ایجاد پشتیبان')); ?>;
                                backupBtn.textContent = errMsg;
                                setTimeout(function() {
                                    backupBtn.textContent = originalBackupText;
                                }, 3000);
                            }
                        })
                        .catch(function() {
                            var errMsg = <?php echo json_encode(ux_t('backup_error','خطا در ایجاد پشتیبان')); ?>;
                            backupBtn.textContent = errMsg;
                            setTimeout(function() {
                                backupBtn.textContent = originalBackupText;
                            }, 3000);
                        })
                        .finally(function() {
                            backupBtn.disabled = false;
                        });
                });
            }
            // Handle reset button click
            var resetBtn = document.getElementById('ux-reset-btn');
            if (resetBtn) {
                var originalResetText = resetBtn.textContent;
                resetBtn.addEventListener('click', function() {
                    var confirmMsg = <?php echo json_encode(ux_t('reset_confirm','آیا از ریست تنظیمات و داده‌ها مطمئن هستید؟')); ?>;
                    if (!window.confirm(confirmMsg)) {
                        return;
                    }
                    resetBtn.disabled = true;
                    fetch(buildResetUrl(), {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success) {
                                var successLabel = <?php echo json_encode(ux_t('reset_success_label','ریست شد')); ?>;
                                resetBtn.textContent = successLabel;
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                                resetBtn.textContent = errMsg;
                                setTimeout(function() {
                                    resetBtn.textContent = originalResetText;
                                    resetBtn.disabled = false;
                                }, 3000);
                            }
                        })
                        .catch(function() {
                            var errMsg = <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                            resetBtn.textContent = errMsg;
                            setTimeout(function() {
                                resetBtn.textContent = originalResetText;
                                resetBtn.disabled = false;
                            }, 3000);
                        });
                });
            }

            // Handle reset analytics button click
            var resetAnalyticsBtn = document.getElementById('ux-reset-analytics-btn');
            if (resetAnalyticsBtn) {
                var originalResetAnalyticsText = resetAnalyticsBtn.textContent;
                resetAnalyticsBtn.addEventListener('click', function() {
                    var confirmMsg = <?php echo json_encode(ux_t('reset_analytics_confirm','آیا از ریست داده‌های آنالیز مطمئن هستید؟')); ?>;
                    if (!window.confirm(confirmMsg)) {
                        return;
                    }
                    resetAnalyticsBtn.disabled = true;
                    fetch(buildResetAnalyticsUrl(), {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success) {
                                var successLabel = <?php echo json_encode(ux_t('reset_success_label','ریست شد')); ?>;
                                resetAnalyticsBtn.textContent = successLabel;
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                                resetAnalyticsBtn.textContent = errMsg;
                                setTimeout(function() {
                                    resetAnalyticsBtn.textContent = originalResetAnalyticsText;
                                    resetAnalyticsBtn.disabled = false;
                                }, 3000);
                            }
                        })
                        .catch(function() {
                            var errMsg = <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                            resetAnalyticsBtn.textContent = errMsg;
                            setTimeout(function() {
                                resetAnalyticsBtn.textContent = originalResetAnalyticsText;
                                resetAnalyticsBtn.disabled = false;
                            }, 3000);
                        });
                });
            }

            // Handle reset DB button click
            var resetDbBtn = document.getElementById('ux-reset-db-btn');
            if (resetDbBtn) {
                var originalResetDbText = resetDbBtn.textContent;
                resetDbBtn.addEventListener('click', function() {
                    var confirmMsg = <?php echo json_encode(ux_t('reset_db_confirm','آیا از ریست کامل پایگاه داده مطمئن هستید؟')); ?>;
                    if (!window.confirm(confirmMsg)) {
                        return;
                    }
                    resetDbBtn.disabled = true;
                    fetch(buildResetDbUrl(), {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success) {
                                var successLabel = <?php echo json_encode(ux_t('reset_success_label','ریست شد')); ?>;
                                resetDbBtn.textContent = successLabel;
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                                resetDbBtn.textContent = errMsg;
                                setTimeout(function() {
                                    resetDbBtn.textContent = originalResetDbText;
                                    resetDbBtn.disabled = false;
                                }, 3000);
                            }
                        })
                        .catch(function() {
                            var errMsg = <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                            resetDbBtn.textContent = errMsg;
                            setTimeout(function() {
                                resetDbBtn.textContent = originalResetDbText;
                                resetDbBtn.disabled = false;
                            }, 3000);
                        });
                });
            }
        });
    })();
    </script>

    <!-- Import backup functionality script -->
    <script>
    (function() {
        // Build AJAX URL for import operation
        function buildImportUrl() {
            return '?ux_ajax=import';
        }
        document.addEventListener('DOMContentLoaded', function() {
            var importBtn  = document.getElementById('ux-import-btn');
            var fileInput  = document.getElementById('ux-import-file');
            var csrfInput  = document.getElementById('ux-import-csrf');
            if (importBtn && fileInput && csrfInput) {
                var originalText = importBtn.textContent;
                importBtn.addEventListener('click', function() {
                    var file = fileInput.files && fileInput.files[0];
                    if (!file) {
                        // Show a tooltip-like alert when no file is selected
                        importBtn.textContent = <?php echo json_encode(ux_t('import_select_file','لطفاً فایل را انتخاب کنید')); ?>;
                        setTimeout(function() {
                            importBtn.textContent = originalText;
                        }, 2000);
                        return;
                    }
                    importBtn.disabled = true;
                    var formData = new FormData();
                    formData.append('backup_file', file);
                    formData.append('csrf', csrfInput.value);
                    // We signal import via AJAX endpoint
                    fetch(buildImportUrl(), {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }).then(function(r) { return r && r.ok ? r.json() : null; })
                    .then(function(data) {
                        if (data && data.success) {
                            var successLabel = <?php echo json_encode(ux_t('import_success_label','ایمپورت انجام شد')); ?>;
                            importBtn.textContent = successLabel;
                            // Reload to apply new config and database
                            setTimeout(function() {
                                window.location.reload();
                            }, 1000);
                        } else {
                            var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('import_error','خطا در ایمپورت')); ?>;
                            importBtn.textContent = errMsg;
                            setTimeout(function() {
                                importBtn.textContent = originalText;
                                importBtn.disabled = false;
                            }, 3000);
                        }
                    }).catch(function() {
                        var errMsg = <?php echo json_encode(ux_t('import_error','خطا در ایمپورت')); ?>;
                        importBtn.textContent = errMsg;
                        setTimeout(function() {
                            importBtn.textContent = originalText;
                            importBtn.disabled = false;
                        }, 3000);
                    });
                });
            }
        });
    })();
    </script>

    <!-- Script to handle unblocking IP addresses -->
    <script>
    (function() {
        document.addEventListener('DOMContentLoaded', function() {
            var unblockButtons = document.querySelectorAll('.ux-unblock-ip-btn');
            if (unblockButtons && unblockButtons.length) {
                unblockButtons.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var ip = this.getAttribute('data-ip');
                        if (!ip) return;
                        // Ask for confirmation before unblocking
                        var confirmMsg = <?php echo json_encode(ux_t('confirm_unblock_ip', 'آیا از آزادسازی این آی‌پی مطمئن هستید؟')); ?>;
                        // Replace placeholder {ip} if present in translation
                        if (confirmMsg && confirmMsg.indexOf('{ip}') !== -1) {
                            confirmMsg = confirmMsg.replace('{ip}', ip);
                        }
                        if (!window.confirm(confirmMsg)) {
                            return;
                        }
                        var formData = new FormData();
                        // CSRF token from session
                        formData.append('csrf', <?php echo json_encode($_SESSION['ux_csrf']); ?>);
                        formData.append('ip', ip);
                        fetch('?ux_ajax=unblock_ip', {
                            method: 'POST',
                            body: formData,
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success) {
                                // Reload page to refresh the blocked IP list
                                window.location.reload();
                            } else {
                                var errMsg = (data && data.message) ? data.message : 'Error';
                                alert(errMsg);
                            }
                        })
                        .catch(function() {
                            alert(<?php echo json_encode(ux_t('error','Error'), JSON_UNESCAPED_UNICODE); ?>);
                        });
                    });
                });
            }
        });
    })();
    </script>

    <!-- Widget reset DB functionality script -->
    <script>
    (function() {
        document.addEventListener('DOMContentLoaded', function() {
            var widgetDbBtn = document.getElementById('ux-widget-reset-db-btn');
            if (widgetDbBtn) {
                var originalText = widgetDbBtn.textContent;
                widgetDbBtn.addEventListener('click', function() {
                    var confirmMsg = <?php echo json_encode(ux_t('reset_db_confirm','آیا از ریست کامل پایگاه داده مطمئن هستید؟')); ?>;
                    if (!window.confirm(confirmMsg)) {
                        return;
                    }
                    widgetDbBtn.disabled = true;
                    fetch('?ux_ajax=reset_db', {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                        .then(function(r) { return r && r.ok ? r.json() : null; })
                        .then(function(data) {
                            if (data && data.success) {
                                var successLabel = <?php echo json_encode(ux_t('reset_success_label','ریست شد')); ?>;
                                widgetDbBtn.textContent = successLabel;
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                                widgetDbBtn.textContent = errMsg;
                                setTimeout(function() {
                                    widgetDbBtn.textContent = originalText;
                                    widgetDbBtn.disabled = false;
                                }, 3000);
                            }
                        })
                        .catch(function() {
                            var errMsg = <?php echo json_encode(ux_t('reset_error','خطا در ریست')); ?>;
                            widgetDbBtn.textContent = errMsg;
                            setTimeout(function() {
                                widgetDbBtn.textContent = originalText;
                                widgetDbBtn.disabled = false;
                            }, 3000);
                        });
                });
            }

        // Reset analytics functionality
        var analyticsBtn = document.getElementById('ux-widget-reset-analytics-btn');
        if (analyticsBtn) {
            var analyticsOriginal = analyticsBtn.textContent;
            analyticsBtn.addEventListener('click', function() {
                var confirmMsg = <?php echo json_encode(ux_t('reset_analytics_confirm','آیا از ریست داده‌های آنالیز مطمئن هستید؟')); ?>;
                if (!window.confirm(confirmMsg)) {
                    return;
                }
                analyticsBtn.disabled = true;
                fetch('?ux_ajax=reset_analytics', {
                            method: 'POST',
                            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
                            body: new URLSearchParams({csrf: <?php echo json_encode((string)($_SESSION['ux_csrf'] ?? ''), JSON_UNESCAPED_UNICODE); ?>}).toString(),
                            credentials: 'same-origin'
                        })
                    .then(function(r) { return r && r.ok ? r.json() : null; })
                    .then(function(data) {
                        if (data && data.success) {
                            var successLabel = <?php echo json_encode(ux_t('reset_analytics_success_label','آنالیز ریست شد')); ?>;
                            analyticsBtn.textContent = successLabel;
                            setTimeout(function() {
                                window.location.reload();
                            }, 1000);
                        } else {
                            var errMsg = (data && data.message) ? data.message : <?php echo json_encode(ux_t('reset_analytics_error','خطا در ریست آنالیز')); ?>;
                            analyticsBtn.textContent = errMsg;
                            setTimeout(function() {
                                analyticsBtn.textContent = analyticsOriginal;
                                analyticsBtn.disabled = false;
                            }, 3000);
                        }
                    })
                    .catch(function() {
                        var errMsg = <?php echo json_encode(ux_t('reset_analytics_error','خطا در ریست آنالیز')); ?>;
                        analyticsBtn.textContent = errMsg;
                        setTimeout(function() {
                            analyticsBtn.textContent = analyticsOriginal;
                            analyticsBtn.disabled = false;
                        }, 3000);
                    });
            });
        }
        });
    })();
    </script>

    <!-- Tab navigation handler: hide/show sections and mark active tabs -->
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        var nav = document.querySelector('.ux-settings-nav .ux-tabs');
        if (!nav) return;
        var links = nav.querySelectorAll('a[href^="#sec-"]');
        var sections = {};
        links.forEach(function (a) {
            var id = a.getAttribute('href').substring(1);
            var sec = document.getElementById(id);
            if (sec) sections[id] = sec;
            a.addEventListener('click', function (e) {
                e.preventDefault();
                showSection(id);
            });
        });
        function showSection(id) {
            Object.keys(sections).forEach(function (key) {
                var el = sections[key];
                if (el) el.style.display = (key === id) ? '' : 'none';
            });
            links.forEach(function (a) {
                if (a.getAttribute('href').substring(1) === id) {
                    a.classList.add('active');
                } else {
                    a.classList.remove('active');
                }
            });
            // If monitoring section selected, scroll to top to view live widgets
            if (id === 'sec-monitoring') {
                try {
                    window.scrollTo({top: 0, behavior: 'smooth'});
                } catch (e) {
                    window.scrollTo(0, 0);
                }
            }
            try {
                history.replaceState(null, '', '#' + id);
            } catch (e) {}
        }
        // Determine initial section based on hash; default to sec-monitoring (dashboard)
        var hashId = location.hash ? location.hash.substring(1) : '';
        var initialId = sections[hashId] ? hashId : 'sec-monitoring';
        showSection(initialId);
    });
    </script>

    </body>
    </html>
    <?php
    exit;
}