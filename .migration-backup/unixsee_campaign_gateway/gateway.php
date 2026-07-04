<?php
/**
 * Unixsee Campaign Gateway - Standalone with Admin Panel
 * Brand: unixsee
 * Dev: Saeid Salimi (Team unixsee)
 */


// NOTE: Front gateway must stay session-free for performance.
// Admin panel session is started only in admin.php.

/* ================== کانفیگ ================== */

$config_file = __DIR__ . '/ux_config.php';
$config      = ux_load_config($config_file);

// سیستم زبان و ترجمه
require __DIR__ . '/ux_lang.php';

// توابع ذخیره‌سازی (سشن‌ها، صف، زمان انتظار)
require __DIR__ . '/ux_storage.php';

// Signed ticket cookie + static queue shell (product-grade hot path)
require_once __DIR__ . '/ux_ticket.php';
require_once __DIR__ . '/ux_queue_shell.php';

// Latency sampling + latency-based smart queue
require_once __DIR__ . '/ux_latency.php';
try { ux_latency_bootstrap($config); } catch (Throwable $e) { /* ignore */ }


// Smart Queue modules (optional)
if (is_file(__DIR__ . '/ux_smart_modules.php')) {
    require_once __DIR__ . '/ux_smart_modules.php';
}

// Traffic/Bandwidth sampling (throttled; minimal overhead)
if (!(defined('UX_ADMIN_ENTRY') && UX_ADMIN_ENTRY) && function_exists('ux_net_sample_maybe')) {
    try { ux_net_sample_maybe($config); } catch (Throwable $e) { /* ignore */ }
}

// (Admin panel code is loaded only in admin.php; keep frontend lean.)
// توابع و HTML صفحه‌ی کمپین / صف انتظار
require __DIR__ . '/ux_frontend.php';

// Optional R3 shadow bridge to a local future Agent. PHP remains source of truth.
require_once __DIR__ . '/src/AgentShadowBridge.php';

function ux_default_config() {
    return [
        'enabled'            => false,
        'mode'               => 'maintenance',          // maintenance | whitelist | queue
        'wp_index'           => 'index-wp.php',
        'admin_username'     => 'unixsee',
        'admin_password'     => '',
        'panel_token'        => '',

        // --- Agent Shadow Bridge (R3) ---
        // Disabled by default. When enabled, PHP's final decision is sent to a local Agent
        // for observation only; the Agent response is never used for runtime decisions.
        'agent_shadow_enabled'      => false,
        'agent_shadow_endpoint'     => 'http://127.0.0.1:8731/v1/shadow/decision',
        'agent_shadow_timeout_ms'   => 80,
        'agent_shadow_log_enabled'  => true,
        'agent_shadow_log_file'     => 'logs/agent-shadow.log',
        'agent_shadow_send_headers' => false,
        'agent_shadow_send_cookies' => false,
        'agent_shadow_secret'       => '',
        'timezone'           => 'Asia/Tehran',
        'always_allow_ips'   => [],
        'allowed_ips'        => [],
        // List of IP addresses that should be completely blocked from accessing the site. Any
        // request from an IP in this list is immediately denied with a 403 response. Use
        // the admin panel to manage this list rather than editing it directly.
        'blocked_ips'        => [],
        'max_active_users'   => 1000,
        'server_cpu_cores'    => 16,
        'server_cpu_threads'  => 32,
        'server_cpu_freq_ghz' => 4.5,
        'server_cpu_model'    => '',
        'server_ram_gb'       => 128,
        'server_disk_gb'      => 2048,
        'session_lifetime'   => 120,             // ثانیه – کاربر بیکار بعد از این زمان از صف حذف می‌شود
        'page_cache_ttl'   => 30,              // مدت کش صفحه کمپین (ثانیه)؛ ۰ یعنی بدون کش
        'bypass_paths'       => [],              // مسیرهایی که همیشه بای‌پس می‌شوند (درگاه پرداخت، وب‌هوک و ...)
        'gateway_scope'      => 'site',          // site | include_paths
        'include_paths'      => [],              // در حالت include_paths فقط این مسیرها زیر گیت‌وی هستند

        'countdown_target'   => '',
        'show_countdown'     => true,
        'page_title'         => 'کمپین در حال آماده‌سازی است',
        'page_subtitle'      => "به دلیل ترافیک بسیار بالا، ورود به کمپین به صورت نوبتی انجام می‌شود.\nنوبت شما به‌زودی می‌رسد؛ لطفاً این صفحه را نبندید.",
        'media_url'          => '',
        'primary_color'      => '#ff6a00',
        'bg_color'           => '#050816',
        'theme_css_url'      => '',
        // فونت اختصاصی CSS (اختیاری، برای کاربر حرفه‌ای)
        'body_font_family'   => '',
        // فایل فونت فارسی که از پوشه assets/fonts انتخاب می‌شود
        'persian_font_file'  => 'Estedad-VF.woff2',
        'title_font_size'    => '22px',
        'subtitle_font_size' => '14px',
        'custom_html'        => '',
        'theme_mode'         => 'glass',         // پیش‌فرض glass برای حس آیفونی

        // تنظیمات تصویر / GIF
        'media_width'        => '100%',     // مثلا 100% یا 320px
        'media_align'        => 'center',   // center | right | left
        'media_bg_color'     => '',         // رنگ بک‌گراند مخصوص ناحیه تصویر
        'media_radius'       => '20px',     // گردی گوشه‌ها

        // متن‌های برند / هدر و فوتر
        'brand_tagline'      => 'unixsee Campaign Gateway – محافظ هوشمند کمپین فروش',
        'footer_text'        => 'قدرت‌گرفته از unixsee – طراحی و توسعه توسط Team unixsee',

        // افکت‌های جدید:
        'enable_glow'        => true,            // حاشیه نورانی
        'glow_color'         => '#ff6a00',       // رنگ Glow
        'shadow_style'       => 'trend-soft',    // none | trend-soft | trend-deep | soft-float

        // رفرش خودکار و دکمه بررسی
        'auto_retry_enabled'   => true,          // تلاش خودکار برای ورود (رفرش اتوماتیک)
        'auto_retry_interval'  => 30,            // فاصله رفرش (ثانیه)
        'retry_button_enabled' => true,          // نمایش دکمه بررسی
        'retry_button_text'    => 'بررسی وضعیت ورود',
            'allow_search_bots'   => true,            // عبور دادن ربات‌های موتور جستجو از گیت‌وی
        'bot_user_agents'     => [
            'googlebot',
            'bingbot',
            'slurp',
            'duckduckbot',
            'baiduspider',
            'yandex',
            'googlebot-image',
            'googlebot-news',
        ],

        // قوانین Allow/Deny برای ربات‌ها (تکمیل‌شونده در پنل)
        'bot_allow_rules' => [],
        'bot_deny_rules'  => [],

        // --- Bot Intelligence (امتیازدهی ربات/رفتار) ---
        'bot_scoring_enabled'                 => false,
        'bot_scoring_use_redis'               => true,
        'bot_scoring_log_level'               => 1, // 0=off, 1=important, 2=verbose
        'bot_bad_action'                      => 'block', // block | queue
        'bot_score_storage_ttl_seconds'       => 21600, // 6h

        // Score model
        'bot_score_initial'                   => 50,
        'bot_score_good_threshold'            => 80,
        'bot_score_bad_threshold'             => 25,
        'bot_score_decay_half_life_seconds'   => 3600,

        // Sliding rate (EWMA)
        'bot_score_rate_threshold'            => 120,   // RPM
        'bot_rate_half_life_seconds'          => 10.0,
        'bot_rate_cap_rpm'                    => 6000.0,

        // Penalties/Bonuses
        'bot_score_empty_ua_penalty'          => 10,
        'bot_score_suspicious_ua_penalty'     => 25,
        'bot_score_verified_search_bot_bonus' => 35,
        'bot_score_fake_search_bot_penalty'   => 60,
        'bot_score_rate_penalty_points'       => 20,

        // Suspicious UA substrings (editable in panel)
        'bot_score_suspicious_uas'            => [
            'curl','wget','python','scrapy','httpclient','okhttp','libwww-perl','java',
            'go-http-client','aiohttp','selenium','headless','phantomjs'
        ],

        // DNS validation for "good" bots (reverse+forward DNS)
        'bot_dns_validation_enabled'          => true,
        'bot_dns_validation_mode'             => 'strict', // off | balanced | strict
        'bot_dns_cache_ttl_seconds'           => 21600,
        'bot_dns_allowed_domains'             => [],

        // Cookie smoothing (signed cookie)
        'bot_cookie_enabled'                  => true,
        'bot_cookie_name'                     => 'ux_bm',
        'bot_cookie_ttl_seconds'              => 7200,
        'bot_cookie_weight'                   => 0.25,
        'bot_cookie_signing_key'              => '',

        // ML hook (disabled by default)
        'bot_ml_enabled'                      => false,
        'bot_ml_php_file'                     => __DIR__ . '/ux_bot_ml.php',

        // --- Auto-Block (Strikes-based) ---
        // Mode: 1=Aggressive, 2=Balanced (recommended), 3=Safe
        'auto_block_enabled'                   => true,
        'auto_block_mode'                      => 2,
        // Target to block: ip | ua
        'auto_block_target'                    => 'ip',
        // Strikes policy
        'auto_block_strikes'                   => 5,
        'auto_block_window_seconds'            => 600,   // 10 minutes
        // Base TTL and escalation ladder (in seconds)
        'auto_block_ttl_seconds'               => 3600,  // 1 hour
        'auto_block_escalation_ladder_seconds' => [3600, 21600, 86400], // 1h -> 6h -> 24h
        // Verified search bots are exempt from AUTO blocks (manual blocks still apply)
        'auto_block_exempt_verified_bots'      => true,

        // --- UA & Traffic Intelligence ---
        'ua_bank_enabled'                      => true,
        'traffic_intel_enabled'                => true,
        'traffic_intel_net_sample_interval'    => 5,     // seconds
        'traffic_intel_interface'              => '',    // auto-pick if empty
        'traffic_intel_chart_minutes'          => 120,
        'gateway_indexable'   => false,          // اگر false باشد، صفحه کمپین با noindex علامت‌گذاری می‌شود

                                                 // --- چندزبانه: زبان پیش‌فرض و لیست زبان‌های مجاز ---
        'default_language'    => 'fa',           // fa یا en
        'available_languages' => ['fa', 'en'],

        // --- تنظیمات امنیتی پنل ---
        // حداکثر تعداد تلاش ناموفق قبل از قفل شدن حساب
        'max_login_attempts'  => 5,
        // مدت زمان قفل حساب به دقیقه
        'lock_minutes'        => 15,

        // --- نرخ درخواست مجاز بر اساس هر IP (Rate Limiting) ---
        // بیشترین تعداد درخواست مجاز از یک IP در بازه ۶۰ ثانیه. اگر ۰ باشد، محدودیتی اعمال نمی‌شود.
        'rate_limit_per_minute'   => 0,
        // مدت زمانی که در صورت عبور از حد، پاسخ با تأخیر داده می‌شود (به ثانیه). اگر ۰ باشد، پاسخ ۴۲۹ بازگشت داده می‌شود.
        'rate_limit_sleep_seconds' => 0,

        // --- Redis settings (for cache and queue) ---
        // When redis_enabled is true, active sessions and queue data are stored in Redis
        // instead of SQLite. Set these values according to your Redis server.
        'redis_enabled'      => false,
        'redis_host'         => '127.0.0.1',
        'redis_port'         => 6379,
        'redis_db'           => 0,
        'redis_password'     => '',

// Require Redis for queue decisions when enabled (recommended for high-traffic campaigns).
// If redis_required is true and Redis is unavailable, the gateway will either fail-open
// (allow visitors) or fail-close (show waiting room) depending on redis_required_fail_mode.
'redis_required'             => false,
'redis_required_fail_mode'   => 'open', // open | close

// Static waiting room shell + lightweight JSON check endpoint
'queue_shell_enabled'        => true,
'queue_shell_file'           => 'ux_queue_shell.html',
'queue_check_param'          => 'uxwr_check',

// Signed "pass ticket" cookie (prevents admitted users from bouncing back to queue)
'ticket_cookie_enabled'      => true,
'ticket_cookie_name'         => 'uxwr_pass',
'ticket_cookie_ttl_seconds'  => 900, // 15 min
'ticket_cookie_bind_ua'      => true,
'ticket_cookie_bind_ip'      => false,
'ticket_secret_file'         => __DIR__ . '/.uxwr_secret.php',

        // --- Analytics caching and precompute settings ---
        // Duration (in seconds) that computed bot/error analytics are cached in Redis.  A higher value
        // reduces load on the database at the expense of showing slightly stale data on the dashboard.
        'analytics_cache_ttl'         => 60,
        // Enable background precompute of analytics.  When enabled, the system records the timestamp
        // of the last precompute in Redis and will recompute analytics if the interval has elapsed.
        // This helps avoid recomputing the same expensive queries on every dashboard request.
        'analytics_precompute_enabled' => false,
        // The minimum number of seconds between automatic analytics recomputation when precompute
        // is enabled.  This interval should be equal or greater than analytics_cache_ttl; otherwise
        // the cache may expire before a new precompute is triggered.
        'analytics_precompute_interval' => 60,

        // Whether to store complete error lists in the analytics cache. If enabled,
        // the full list of 4xx and 5xx URLs will be cached in Redis along with
        // the summary statistics. This may increase memory usage but allows
        // external tools to analyse detailed error data without querying the
        // SQLite database repeatedly.
        'analytics_cache_include_lists' => false,

        // تنظیمات هوشمند صف
        // اهداف مصرف منابع برای الگوریتم صف هوشمند
        'smart_target_cpu'        => 75,
        'smart_target_mem'        => 80,
        'smart_target_disk'       => 70,
        // حداکثر تعداد اتصال به ازای هر کاربر فعال. اگر میانگین تعداد اتصالات هر کاربر بیشتر از این مقدار باشد، ظرفیت کاهش می‌یابد.
        'smart_max_conn_per_user' => 3,

        // پیش‌بینی مصرف منابع. اگر فعال باشد، الگوریتم ظرفیت با استفاده از مدل سادهٔ میانگین نمایی
        // مصرف CPU و حافظه در چند نمونهٔ اخیر را پیش‌بینی می‌کند و ظرفیت را بر اساس مقدار پیش‌بینی‌شده تنظیم می‌کند.
        'smart_prediction_enabled' => false,
        // ضریب یادگیری (alpha) برای میانگین نمایی. عددی بین 0 و 1؛ هرچه بزرگ‌تر باشد، به نمونهٔ اخیر وزن بیشتری داده می‌شود.
        'smart_prediction_alpha'   => 0.5,
        // اگر فعال شود، حتی در صورتی که ظرفیت تغییر نکند، هر بار که الگوریتم ظرفیت اجرا می‌شود یک سطر در smart_decisions ثبت می‌شود. این برای مانیتورینگ دقیق‌تر مفید است.
        'smart_log_no_change'      => false,


        // --- Latency-based smart queue (adaptive concurrency) ---
        // When enabled, smart_queue adjusts capacity based on p95 latency and 5xx error-rate (tail health signals).
        'latency_smart_enabled'      => true,
        // Record latency samples only for admitted requests (pass-through to WordPress).
        'latency_record_enabled'     => true,
        // Rolling time window for p95/error calculations.
        'latency_window_seconds'     => 60,
        // Sampling rate (0..1). Keep low for very high RPS.
        'latency_sample_rate'        => 0.05,
        // Minimum samples required before applying latency decisions.
        'latency_min_samples'        => 30,
        // Target / hard p95 thresholds (milliseconds).
        'latency_p95_target_ms'      => 900,
        'latency_p95_hard_ms'        => 2500,
        // 5xx error-rate threshold in percent (e.g., 2.0 = 2%).
        'latency_err_rate_high_pct'  => 2.0,

        // --- Retention settings for smart history and smart decisions ---
        // These values control how long (in days) entries are retained in the
        // ux_smart_history and smart_decisions tables. When the retention
        // period has elapsed, old records will be purged automatically by
        // logging functions. A minimum of 30 days is enforced to avoid
        // accidental data loss. Defaults to 90 days if not configured.
        'smart_history_retention_days'   => 90,
        'smart_decisions_retention_days' => 90,

        
];
}

function ux_save_config($file, array $config) {
    $export = var_export($config, true);
    $php = "<?php
return " . $export . ";
";
    @file_put_contents($file, $php, LOCK_EX);

    // Refresh waiting-room artifacts (keeps hot path fast)
    if (function_exists('ux_clear_page_cache')) {
        try { ux_clear_page_cache(); } catch (Throwable $e) { /* ignore */ }
    }
    if (function_exists('ux_ticket_ensure_secret')) {
        try { ux_ticket_ensure_secret($config); } catch (Throwable $e) { /* ignore */ }
    }
    if (function_exists('ux_queue_shell_rebuild')) {
        try { ux_queue_shell_rebuild($config); } catch (Throwable $e) { /* ignore */ }
    }
}


function ux_load_config($file) {
    $defaults = ux_default_config();

    $merged = $defaults;
    // Load configuration file if it exists
    if (file_exists($file)) {
        $cfg = require $file;
        if (is_array($cfg)) {
            // Merge file values over defaults
            $merged = array_merge($defaults, $cfg);
        }
    } else {
        // Persist default config if no file exists
        ux_save_config($file, $defaults);
        $merged = $defaults;
    }

    // Allow overriding sensitive values via environment variables
    // This enhances security by avoiding hardcoded credentials in source code.
    $envUser = getenv('CG_ADMIN_USERNAME');
    if ($envUser !== false && $envUser !== '') {
        $merged['admin_username'] = $envUser;
    }
    $envPass = getenv('CG_ADMIN_PASSWORD');
    if ($envPass !== false && $envPass !== '') {
        // Expect the environment value to already be a password hash
        $merged['admin_password'] = $envPass;
    }
    $envToken = getenv('CG_PANEL_TOKEN');
    if ($envToken !== false && $envToken !== '') {
        $merged['panel_token'] = $envToken;
    }

    return $merged;
}

$config = ux_load_config($config_file);

/* ================== توابع عمومی ================== */

function ux_get_user_ip() {
    global $config;

    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if ($remote !== '' && filter_var($remote, FILTER_VALIDATE_IP)) {
        $trustedProxyEnabled = !empty($config['trusted_proxy_enabled']);
        $trustedProxies = isset($config['trusted_proxies']) && is_array($config['trusted_proxies'])
            ? $config['trusted_proxies']
            : [];

        // Security default: do NOT trust spoofable proxy headers unless explicitly enabled
        // and the immediate REMOTE_ADDR is in the configured trusted proxy list.
        if (!$trustedProxyEnabled || !in_array($remote, $trustedProxies, true)) {
            return $remote;
        }
    }

    $keys = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_X_CLUSTER_CLIENT_IP',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];
    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip_list = explode(',', (string)$_SERVER[$key]);
            foreach ($ip_list as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
    }
    return '0.0.0.0';
}

// Pass-through to WordPress (marks latency sampling if enabled)
function ux_enter_wp($wp_index, ?array $shadowDecision = null) {
    global $config;
    if ($shadowDecision === null) {
        $shadowDecision = [
            'action' => 'pass',
            'reason' => 'enter_wp',
            'status' => 200,
            'retry_after' => null,
        ];
    }
    if (function_exists('ux_agent_shadow_decision')) {
        ux_agent_shadow_decision($shadowDecision, is_array($config ?? null) ? $config : []);
    }
    if (function_exists('ux_latency_mark_pass')) {
        ux_latency_mark_pass();
    }
    require $wp_index;
    exit;
}

function ux_get_gateway_health_snapshot(array $config): array
{
    // حداکثر تعداد مجاز کاربر داخل سایت (از کانفیگ)
    $maxActive = isset($config['max_active_users'])
        ? (int)$config['max_active_users']
        : 0;

    // استفاده از توابعی که الان در ux_storage.php تعریف شده‌اند (مبتنی بر SQLite)
    $sessions = ux_get_active_sessions();   // [session_id => last_seen]
    $queueMap = ux_get_queue_sessions();    // [session_id => ['joined_at' => ..., 'last_seen' => ...]]

    $inside = is_array($sessions) ? count($sessions) : 0;
    $queue  = is_array($queueMap) ? count($queueMap) : 0;

    // Latency-based health signals (p95 latency + 5xx error-rate)
    $latP95 = null;
    $err5xx = null;
    $latN   = 0;
    if (!empty($config['latency_smart_enabled']) && function_exists('ux_latency_get_window_stats')) {
        try {
            $latStats = ux_latency_get_window_stats($config);
            if (is_array($latStats)) {
                $latP95 = array_key_exists('p95_ms', $latStats) ? ($latStats['p95_ms'] === null ? null : (int)$latStats['p95_ms']) : null;
                $err5xx = array_key_exists('err5xx_pct', $latStats) ? ($latStats['err5xx_pct'] === null ? null : (float)$latStats['err5xx_pct']) : null;
                $latN   = array_key_exists('samples', $latStats) ? (int)$latStats['samples'] : 0;
            }
        } catch (Throwable $e) {
            // ignore
        }
    }


    $usage = 0;
    if ($maxActive > 0) {
        $usage = (int)round(($inside / $maxActive) * 100);
        if ($usage > 999) {
            $usage = 999;
        }
    }

    return [
        'max_active_users' => $maxActive,
        'inside'           => $inside,
        'queue'            => $queue,
        'usage_percent'    => $usage,
    ];
}

/**
 * Load login attempts from storage file. Each key is an IP with structure [count, locked_until].
 *
 * @return array
 */

function ux_is_search_bot(array $config): bool {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($ua === '') {
        return false;
    }

    $bots = $config['bot_user_agents'] ?? [];
    if (!is_array($bots)) {
        $bots = [$bots];
    }

    foreach ($bots as $bot) {
        $bot = trim(strtolower((string)$bot));
        if ($bot !== '' && strpos($ua, $bot) !== false) {
            return true;
        }
    }

    return false;
}


function ux_detect_bot_name(string $ua): string {
    $ua = strtolower($ua);
    $map = [
        'googlebot'    => 'Googlebot',
        'bingbot'      => 'Bingbot',
        'yandex'       => 'Yandex',
        'duckduckbot'  => 'DuckDuckBot',
        'baiduspider'  => 'Baidu',
        'slurp'        => 'Yahoo! Slurp',
    ];
    foreach ($map as $needle => $label) {
        if (strpos($ua, $needle) !== false) {
            return $label;
        }
    }
    return $ua !== '' ? mb_substr($ua, 0, 50) : 'Unknown';
}

/**
 * لاگ‌کردن بازدید ربات‌ها در ux_bot_log.json
 */
function ux_log_bot_visit(array $config, int $status_code, ?int $score = null, ?string $reasonsJson = null, ?string $classification = null, ?int $verified = null): void {
    /**
     * نسخه جدید ux_log_bot_visit:
     * این تابع فقط در صورتی اجرا می‌شود که درخواست توسط یک ربات موتور جستجو باشد.
     * به جای ذخیره در فایل JSON، اطلاعات در جدول bot_logs دیتابیس SQLite ذخیره می‌شود.
     */
    if (!ux_is_search_bot($config)) {
        return;
    }
    $now  = time();
    $ip   = ux_get_user_ip();
    $ua   = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $path = $_SERVER['REQUEST_URI'] ?? '';
    $botName = ux_detect_bot_name($ua);
    // Normalize optional fields
    if ($reasonsJson === null) {
        $reasonsJson = '[]';
    }
    if (!is_string($reasonsJson)) {
        $reasonsJson = '[]';
    }
    if ($classification === null) {
        $classification = 'search_bot';
    }
    if ($verified === null) {
        $verified = 0;
    }

    try {
        $pdo = ux_storage_pdo();
        // Prefer the new schema (with score/reasons/classification/verified)
        $stmt = $pdo->prepare(
            "INSERT INTO bot_logs (timestamp, ip, user_agent, bot_name, result, path, score, reasons, classification, verified)
            VALUES (:ts, :ip, :ua, :bot_name, :result, :path, :score, :reasons, :class, :verified)"
        );
        $stmt->execute([
            ':ts'       => $now,
            ':ip'       => $ip,
            ':ua'       => $ua,
            ':bot_name' => $botName,
            ':result'   => $status_code,
            ':path'     => $path,
            ':score'    => $score,
            ':reasons'  => $reasonsJson,
            ':class'    => $classification,
            ':verified' => $verified,
        ]);
    } catch (Throwable $e) {
        // Backward compatibility fallback (older DB schema)
        try {
            $pdo = ux_storage_pdo();
            $stmt = $pdo->prepare(
                "INSERT INTO bot_logs (timestamp, ip, user_agent, bot_name, result, path)
                VALUES (:ts, :ip, :ua, :bot_name, :result, :path)"
            );
            $stmt->execute([
                ':ts'       => $now,
                ':ip'       => $ip,
                ':ua'       => $ua,
                ':bot_name' => $botName,
                ':result'   => $status_code,
                ':path'     => $path,
            ]);
        } catch (Throwable $e2) {
            error_log('ux_log_bot_visit (SQLite) failed: ' . $e2->getMessage());
        }
    }

    // ذخیره بازدید در جدول ux_visits از طریق کلاس آنالیتیکس
    if (class_exists('UxGatewayAnalytics')) {
        try {
            UxGatewayAnalytics::logBotVisit($status_code);
        } catch (Throwable $e) {
            // نادیده گرفتن خطا تا لاگ اصلی از کار نیفتد
            error_log('UxGatewayAnalytics::logBotVisit failed: ' . $e->getMessage());
        }
    }
}
/**
 * لاگ‌کردن بازدید کاربران واقعی (غیر ربات) در ux_visit_log.json
 */
function ux_log_human_visit(array $config): void
{
    // IMPORTANT:
    // Previously we INSERT-ed every human hit into SQLite. Under high traffic that creates
    // heavy write-lock contention and can hang PHP-FPM.
    // The optimized version stores ONLY aggregated human counters in Redis (if available).
    // This keeps the hot-path write-behind, cheap and non-blocking.

    // Search-bots are tracked separately; skip here.
    if (ux_is_search_bot($config)) {
        return;
    }

    $now = time();
    $ip  = ux_get_user_ip();

    // Redis aggregated counters (per-hour buckets + HyperLogLog for approximate unique IPs)
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
            if ($redis instanceof Redis) {
                $hourBucket = (int)floor($now / 3600);
                $hitsKey = 'ux_human:hits:' . $hourBucket;
                $hllKey  = 'ux_human:uniq:' . $hourBucket;
                // Keep ~48h so "last 24h" dashboard can sum buckets.
                $ttl = 48 * 3600;

                // Pipeline to minimize RTT
                $redis->multi(Redis::PIPELINE);
                $redis->incr($hitsKey);
                $redis->expire($hitsKey, $ttl);
                if (method_exists($redis, 'pfAdd')) {
                    $redis->pfAdd($hllKey, [$ip]);
                    $redis->expire($hllKey, $ttl);
                }
                $redis->exec();
                return;
            }
        } catch (Throwable $e) {
            // fall through (no DB write fallback)
        }
    }
}

/*
 * محاسبه آمار ربات‌ها در ۲۴ ساعت اخیر
 *
 * توابع آمار ربات‌ها در این نسخه دیگر در این فایل قرار ندارند. برای نمایش
 * آمار کامل ربات‌ها در پنل مدیریت، از توابع ux_get_bot_stats_sql و
 * ux_get_bot_detail_sql که در فایل ux_admin_panel.php تعریف شده‌اند استفاده
 * می‌کنیم. بنابراین فراخوانی‌های مربوط به آمار ربات‌ها از داخل این فایل
 * حذف شده‌اند.
 */

/**
 * جزییات آخرین درخواست‌های ثبت‌شده برای یک ربات یا یک IP خاص
 */
function ux_get_bot_detail(array $config, ?string $botName = null, ?string $ipFilter = null): array {
    $file = __DIR__ . '/ux_bot_log.json';
    if (!is_file($file)) {
        return [
            'total'        => 0,
            'success'      => 0,
            'timeouts'     => 0,
            'unique_paths' => 0,
            'items'        => [],
        ];
    }

    $json = @file_get_contents($file);
    $rows = json_decode($json, true);
    if (!is_array($rows)) {
        return [
            'total'        => 0,
            'success'      => 0,
            'timeouts'     => 0,
            'unique_paths' => 0,
            'items'        => [],
        ];
    }

    $maxItems = 30;
    $details  = [];
    $total    = 0;
    $success  = 0;
    $timeouts = 0;
    $paths    = [];

    // از آخر به اول (جدیدترین‌ها اول)
    $rows = array_reverse($rows);
    foreach ($rows as $row) {
        $ts     = (int)($row['ts'] ?? 0);
        $ip     = (string)($row['ip'] ?? '');
        $ua     = (string)($row['ua'] ?? '');
        $path   = (string)($row['path'] ?? '');
        $status = (int)($row['status'] ?? 0);

        $match = true;

        if ($botName !== null && $botName !== '') {
            $detected = ux_detect_bot_name($ua);
            if ($detected !== $botName) {
                $match = false;
            }
        }

        if ($ipFilter !== null && $ipFilter !== '') {
            if ($ip !== $ipFilter) {
                $match = false;
            }
        }

        if (!$match) {
            continue;
        }

        $total++;
        if ($status >= 200 && $status < 300) {
            $success++;
        } elseif ($status === 408 || ($status >= 500 && $status < 600)) {
            $timeouts++;
        }

        if ($path !== '') {
            $paths[$path] = true;
        }

        if (count($details) < $maxItems) {
            $details[] = [
                'ts'       => $ts,
                'time'     => $ts ? date('Y-m-d H:i', $ts) : null,
                'ip'       => $ip,
                'status'   => $status,
                'path'     => $path,
                'ua'       => $ua,
            ];
        }
    }

    return [
        'total'        => $total,
        'success'      => $success,
        'timeouts'     => $timeouts,
        'unique_paths' => count($paths),
        'items'        => $details,
    ];
}



function ux_match_ip_cidr(string $cidr, string $ip): bool {
    $ipLong = ip2long($ip);
    if ($ipLong === false) {
        return false;
    }

    if (strpos($cidr, '/') !== false) {
        list($subnet, $bits) = explode('/', $cidr, 2);
        $subnetLong = ip2long(trim($subnet));
        if ($subnetLong === false) {
            return false;
        }
        $bits = (int)$bits;
        if ($bits < 0 || $bits > 32) {
            return false;
        }
        $mask = -1;
        $mask = $mask << (32 - $bits);
        $mask = $mask & 0xFFFFFFFF;

        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    // بدون / یعنی آدرس دقیق
    $target = ip2long(trim($cidr));
    if ($target === false) {
        return false;
    }

    return $ipLong === $target;
}

/**
 * بررسی این‌که یک قانون (Allow/Deny) روی IP/UA فعلی match می‌شود یا نه
 * قوانین:
 *   - ua:something → جستجوی substring روی User-Agent (case-insensitive)
 *   - ip:1.2.3.4/24 → بررسی IP/CIDR
 */
function ux_bot_rule_matches(string $rule, string $ip, string $ua): bool {
    $rule = trim($rule);
    if ($rule === '') {
        return false;
    }

    if (stripos($rule, 'ip:') === 0) {
        $cidr = trim(substr($rule, 3));
        if ($cidr === '') {
            return false;
        }
        return ux_match_ip_cidr($cidr, $ip);
    }

    // پیش‌فرض: UA
    if (stripos($rule, 'ua:') === 0) {
        $needle = trim(substr($rule, 3));
    } else {
        $needle = $rule;
    }

    if ($needle === '') {
        return false;
    }

    $needle = mb_strtolower($needle);
    $uaLower = mb_strtolower($ua);

    return strpos($uaLower, $needle) !== false;
}

function ux_bot_list_matches(array $rules, string $ip, string $ua): bool {
    foreach ($rules as $rule) {
        if (ux_bot_rule_matches((string)$rule, $ip, $ua)) {
            return true;
        }
    }
    return false;
}

/**
 * آیا این ربات طبق قوانین پنل Deny شده است؟
 */
function ux_is_bot_denied(array $config): bool {
    $rules = $config['bot_deny_rules'] ?? [];
    if (!is_array($rules) || empty($rules)) {
        return false;
    }

    $ip = ux_get_user_ip();
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    return ux_bot_list_matches($rules, $ip, $ua);
}

/**
 * اگر فهرست Allow خالی نباشد، فقط ربات‌هایی که match شوند مجاز هستند.
 * اگر فهرست Allow خالی باشد، همه (به جز Deny شده‌ها) مجازند.
 */
function ux_is_bot_allowed_by_list(array $config): bool {
    $rules = $config['bot_allow_rules'] ?? [];
    if (!is_array($rules) || empty($rules)) {
        return true;
    }

    $ip = ux_get_user_ip();
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    return ux_bot_list_matches($rules, $ip, $ua);
}

/**
 * تصمیم نهایی: آیا این ربات اجازه عبور مستقیم به وردپرس را دارد؟
 */
function ux_should_allow_bot(array $config): bool {
    if (empty($config['allow_search_bots'])) {
        return false;
    }

    if (ux_is_bot_denied($config)) {
        return false;
    }

    if (!ux_is_bot_allowed_by_list($config)) {
        return false;
    }

    return true;
}

/**
 * تصمیم اتمیک برای اینکه کاربر اجازه عبور از گیت‌وی دارد یا باید در صف بماند.
 *
 * خروجی:
 *  - true  → اجازه ورود به وردپرس
 *  - false → باید صفحه صف را ببیند
 */
function ux_can_pass_gateway(int $max_active): bool {
    global $config;

    $now = time();
    $sid = ux_get_session_id();

// Fast bypass: admitted visitors keep a short-lived signed ticket cookie.
if (function_exists('ux_ticket_is_valid') && ux_ticket_is_valid($config)) {
    // Touch active session in Redis if possible (keeps capacity accounting stable).
    $redisTmp = null;
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try { $redisTmp = ux_redis_client(); } catch (Throwable $e) { $redisTmp = null; }
    }
    if ($redisTmp instanceof Redis) {
        try { $redisTmp->zAdd('ux_sessions', $now, $sid); } catch (Throwable $e) { /* ignore */ }
    }
    return true;
}


    if ($max_active <= 0) {
        // اگر سقف تعریف نشده، گیت‌وی را عملاً غیرفعال می‌کنیم
        return true;
    }

    // --- Fast path (Redis) ---
    // NOTE:
    //  - The previous implementation reloaded + rewrote the full sessions/queue set
    //    on every request. Under load, that causes huge Redis/SQLite pressure and can
    //    also slow down WordPress (which may share the same Redis instance).
    //  - In Redis mode we update only THIS session and occasionally prune expired ones.
    $redis = null;
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
        } catch (Throwable $e) {
            $redis = null;
        }
    }

// If Redis is enabled and required, do not fall back to SQLite under load.
if (!empty($config['redis_enabled']) && !empty($config['redis_required']) && !($redis instanceof Redis)) {
    $fail = (string)($config['redis_required_fail_mode'] ?? 'open'); // open|close
    if ($fail === 'close') {
        return false;
    }
    // fail-open (default): allow traffic rather than risking an outage
    return true;
}

    if ($redis instanceof Redis) {
        $lifetime = isset($config['session_lifetime']) ? (int)$config['session_lifetime'] : 120;
        if ($lifetime < 10) {
            $lifetime = 10;
        }
        $minTime = $now - $lifetime;

        // Throttle pruning to at most once per second.
        try {
            $lockKey = 'ux_prune_lock';
            $got = $redis->set($lockKey, (string)$now, ['nx', 'ex' => 1]);
            if ($got) {
                // Expire inactive active-sessions
                $redis->zRemRangeByScore('ux_sessions', '-inf', (string)$minTime);

                // Expire inactive queue entries (based on last_seen)
                $expired = $redis->zRangeByScore('ux_queue_last_seen', '-inf', (string)$minTime, ['limit' => [0, 2000]]);
                if (is_array($expired) && !empty($expired)) {
                    // Remove from both ZSETs (chunked to avoid oversized argument lists)
                    foreach (array_chunk($expired, 500) as $chunk) {
                        if (empty($chunk)) {
                            continue;
                        }
                        $redis->zRem('ux_queue_last_seen', ...$chunk);
                        $redis->zRem('ux_queue', ...$chunk);
                    }
                }
            }
        } catch (Throwable $e) {
            // ignore prune issues
        }

        // 1) If already active -> allow and touch
        try {
            $activeScore = $redis->zScore('ux_sessions', $sid);
        } catch (Throwable $e) {
            $activeScore = false;
        }
        if ($activeScore !== false && $activeScore !== null) {
            try {
                $redis->zAdd('ux_sessions', $now, $sid);
                // ensure not left in queue
                $redis->zRem('ux_queue', $sid);
                $redis->zRem('ux_queue_last_seen', $sid);
            } catch (Throwable $e) {
                // ignore
            }
            if (function_exists('ux_ticket_issue')) { ux_ticket_issue($config); }
            return true;
        }

        // 2) Capacity check
        $activeCount = 0;
        try {
            $activeCount = (int)$redis->zCard('ux_sessions');
        } catch (Throwable $e) {
            $activeCount = 0;
        }

        if ($activeCount < $max_active) {
            // allow: add to active sessions
            try {
                $redis->zAdd('ux_sessions', $now, $sid);
            } catch (Throwable $e) {
                // ignore
            }

            // If it was queued, log wait time and remove from queue.
            try {
                $joinedAt = $redis->zScore('ux_queue', $sid);
                if ($joinedAt !== false && $joinedAt !== null) {
                    $wait = $now - (int)$joinedAt;
                    if ($wait > 0) {
                        ux_log_wait_time($wait);
                    }
                    $redis->zRem('ux_queue', $sid);
                    $redis->zRem('ux_queue_last_seen', $sid);
                }
            } catch (Throwable $e) {
                // ignore
            }
            if (function_exists('ux_ticket_issue')) { ux_ticket_issue($config); }
            return true;
        }

        // 3) No capacity -> queue/touch
        try {
            $joinedAt = $redis->zScore('ux_queue', $sid);
            if ($joinedAt === false || $joinedAt === null) {
                $redis->zAdd('ux_queue', $now, $sid);
            }
            $redis->zAdd('ux_queue_last_seen', $now, $sid);
        } catch (Throwable $e) {
            // ignore
        }
        return false;
    }

    // --- Fallback path (SQLite) ---
    // If Redis is not active and SQLite is unavailable, never fatal in front of WordPress.
    if (function_exists('ux_storage_sqlite_available') && !ux_storage_sqlite_available()) {
        error_log('Unixsee Gateway storage unavailable: pdo_sqlite extension is missing. Applying storage_fail_mode.');
        $failMode = (string)($config['storage_fail_mode'] ?? 'open'); // open|close
        return $failMode === 'close' ? false : true;
    }

    // سشن‌های فعال و صف را از SQLite می‌خوانیم (ux_storage.php)
    $sessions = ux_get_active_sessions();   // [session_id => last_seen]
    $queue    = ux_get_queue_sessions();    // [session_id => ['joined_at' => ..., 'last_seen' => ...]]

    $allowed = false;

    // اگر کاربر همین الان داخل سایت است
    if (isset($sessions[$sid])) {
        $allowed = true;
        $sessions[$sid] = $now;

        // اگر به هر دلیلی هنوز در صف ثبت است، از صف حذف شود
        if (isset($queue[$sid])) {
            unset($queue[$sid]);
        }
    }
    // اگر ظرفیت خالی است، اجازه ورود بده
    elseif (count($sessions) < $max_active) {
        $allowed = true;
        $sessions[$sid] = $now;

        // اگر قبلاً در صف بوده، زمان انتظارش را لاگ کن و از صف حذف کن
        if (isset($queue[$sid])) {
            $joined_at = isset($queue[$sid]['joined_at']) ? (int)$queue[$sid]['joined_at'] : $now;
            $wait      = $now - $joined_at;
            if ($wait > 0) {
                ux_log_wait_time($wait); // در ux_storage.php پیاده‌سازی شده
            }
            unset($queue[$sid]);
        }
    }
    // در غیر این صورت، باید در صف بماند / اضافه شود
    else {
        if (!isset($queue[$sid])) {
            $queue[$sid] = [
                'joined_at' => $now,
                'last_seen' => $now,
            ];
        } else {
            $queue[$sid]['last_seen'] = $now;
        }
    }

    // ذخیره وضعیت جدید سشن‌ها و صف در SQLite
    ux_save_active_sessions($sessions);
    ux_save_queue_sessions($queue);

    if ($allowed && function_exists('ux_ticket_issue')) {
        ux_ticket_issue($config);
    }

    return $allowed;
}

/**
 * تشخیص اینکه این درخواست باید بای‌پس شود و مستقیم برود سراغ وردپرس یا نه
 * (برای بازگشت از درگاه، وب‌هوک، پنل مدیریت و ...)
 */
function ux_should_bypass_request(array $config) {
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
    if ($uri === '') return false;

    $pathOnly = parse_url($uri, PHP_URL_PATH);
    if (!is_string($pathOnly) || $pathOnly === '') {
        $pathOnly = '/';
    }
    $query = parse_url($uri, PHP_URL_QUERY);
    $query = is_string($query) ? $query : '';

    // Always bypass real WordPress admin/login endpoints only by PATH, not by arbitrary query text.
    if ($pathOnly === '/wp-login.php' || $pathOnly === '/wp-admin' || str_starts_with($pathOnly, '/wp-admin/')) {
        return true;
    }

    // مسیرهای تنظیم‌شده در پنل (مسیرهای همیشه مجاز)
    $paths = (array)($config['bypass_paths'] ?? []);
    foreach ($paths as $path) {
        $path = trim((string)$path);
        if ($path === '') {
            continue;
        }
        if ($path[0] === '?') {
            if ($query !== '' && strpos('?' . $query, $path) !== false) {
                return true;
            }
            continue;
        }
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }
        if ($pathOnly === rtrim($path, '/') || str_starts_with($pathOnly, rtrim($path, '/') . '/')) {
            return true;
        }
    }

    // مسیرهای متداول ووکامرس برای پرداخت/بازگشت
    if (strpos($query, 'wc-ajax=checkout') !== false ||
        strpos($query, 'wc-ajax=update_order_review') !== false ||
        strpos($pathOnly, '/order-pay') !== false ||
        strpos($pathOnly, '/order-received') !== false ||
        strpos($query, 'wc-api=') !== false ||
        str_starts_with($pathOnly, '/wc-api/')) {
        return true;
    }

    return false;
}

/**
 * Lightweight JSON endpoint for the static waiting-room shell.
 * Triggered by query param (default: ?uxwr_check=1).
 *
 * Response:
 *  {status: "wait"|"pass", poll_after: int, position: int|null, queue_count:int|null, active_count:int|null, capacity:int|null}
 */
function ux_api_check(array $config): void
{
    // JSON-only
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    $mode = (string)($config['mode'] ?? 'maintenance');

    // If gateway disabled -> pass
    $wp_index = dirname(__DIR__) . '/' . ($config['wp_index'] ?? 'index-wp.php');
    if (empty($config['enabled']) || !is_file($wp_index)) {
        if (function_exists('ux_agent_shadow_decision')) {
            ux_agent_shadow_decision(['action' => 'pass', 'reason' => 'api_gateway_disabled_or_wp_missing', 'status' => 200, 'retry_after' => 30], $config);
        }
        echo json_encode([
            'status' => 'pass',
            'poll_after' => 30,
            'position' => null,
            'queue_count' => null,
            'active_count' => null,
            'capacity' => null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ip = function_exists('ux_get_user_ip') ? ux_get_user_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');

    // Blocked IPs
    if (!empty($config['blocked_ips']) && in_array($ip, (array)$config['blocked_ips'], true)) {
        http_response_code(403);
        if (function_exists('ux_agent_shadow_decision')) {
            ux_agent_shadow_decision(['action' => 'block', 'reason' => 'api_blocked_ip', 'status' => 403, 'retry_after' => null], $config);
        }
        echo json_encode(['status' => 'blocked'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Always-allow IPs -> pass
    if (!empty($config['always_allow_ips']) && in_array($ip, (array)$config['always_allow_ips'], true)) {
        if (function_exists('ux_agent_shadow_decision')) {
            ux_agent_shadow_decision(['action' => 'pass', 'reason' => 'api_always_allow_ip', 'status' => 200, 'retry_after' => 30], $config);
        }
        echo json_encode(['status' => 'pass', 'poll_after' => 30], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Mode decisions
    $canPass = false;
    $capacity = null;

    if ($mode === 'whitelist') {
        $allowed_ips = (array)($config['allowed_ips'] ?? []);
        $canPass = in_array($ip, $allowed_ips, true);
    } elseif ($mode === 'queue') {
        $capacity = !empty($config['max_active_users']) ? (int)$config['max_active_users'] : 200;
        if ($capacity <= 0) { $capacity = 200; }
        $canPass = ux_can_pass_gateway($capacity);
    } elseif ($mode === 'smart_queue') {
        $base = !empty($config['max_active_users']) ? (int)$config['max_active_users'] : 200;
        if ($base <= 0) { $base = 200; }
        $capacity = function_exists('ux_dynamic_max_active') ? ux_dynamic_max_active($base) : $base;
        $canPass = ux_can_pass_gateway($capacity);
    } else {
        // maintenance
        $canPass = false;
    }

    // Stats (best-effort; full stats are Redis-first by design)
    $position = null;
    $queueCount = null;
    $activeCount = null;

    $redis = null;
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try { $redis = ux_redis_client(); } catch (Throwable $e) { $redis = null; }
    }
    if ($redis instanceof Redis) {
        try {
            $sid = function_exists('ux_get_session_id') ? ux_get_session_id() : '';
            $rank = $sid !== '' ? $redis->zRank('ux_queue', $sid) : false;
            if ($rank !== false && $rank !== null) {
                $position = (int)$rank + 1;
            }
            $queueCount = (int)$redis->zCard('ux_queue');
            $activeCount = (int)$redis->zCard('ux_sessions');
        } catch (Throwable $e) {
            // ignore
        }
    }

    // Poll tuning
    $poll = 12;
    if (is_int($position) && $position > 500) {
        $poll = 18;
    }
    if ($canPass) {
        $poll = 30;
    }

    if (function_exists('ux_agent_shadow_decision')) {
        ux_agent_shadow_decision([
            'action' => $canPass ? 'pass' : 'wait',
            'reason' => $canPass ? 'api_can_pass' : 'api_waiting_room',
            'status' => 200,
            'retry_after' => $poll,
        ], $config);
    }

    echo json_encode([
        'status' => $canPass ? 'pass' : 'wait',
        'poll_after' => $poll,
        'position' => $position,
        'queue_count' => $queueCount,
        'active_count' => $activeCount,
        'capacity' => $capacity,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ================== پنل مدیریت ================== */


/**
 * ریدایرکت امن بعد از POST در پنل مدیریت (الگوی Post/Redirect/Get)
 */
function ux_panel_redirect(): void {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' && $_SERVER['HTTPS'] !== '0') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? '';
    $uri    = $_SERVER['REQUEST_URI'] ?? '';
    if ($host && $uri) {
        header('Location: ' . $scheme . '://' . $host . $uri, true, 303);
        exit;
    }
}



/* ================== روتر اصلی ================== */

// اگر این فایل به‌عنوان ورود به پنل ادمین از طریق admin.php فراخوانی شده باشد،
// از اجرای روتر جلوگیری می‌کنیم تا فقط توابع و کانفیگ‌ها لود شوند.
if (defined('UX_ADMIN_ENTRY') && UX_ADMIN_ENTRY) {
    return;
}


// مسیر پنل ادمین
// Lightweight waiting-room check endpoint
$__ux_check_param = (string)($config['queue_check_param'] ?? 'uxwr_check');
if ($__ux_check_param === '') { $__ux_check_param = 'uxwr_check'; }
if (isset($_GET[$__ux_check_param])) {
    ux_api_check($config);
}

// مسیر پنل ادمین از طریق admin.php مدیریت می‌شود؛ بلوک قبلی ux_panel حذف شد.

// پیش‌نمایش صفحه کمپین / صف انتظار
$__ux_preview_token = (string)($config['panel_token'] ?? '');
if (isset($_GET['ux_preview']) && strlen($__ux_preview_token) >= 16 && hash_equals($__ux_preview_token, (string)$_GET['ux_preview'])) {
    // نمایش مستقیم صفحه کمپین / صف انتظار، بدون اعمال منطق صف و بای‌پس
    ux_render_page($config);
    exit;
}


// مسیر index اصلی وردپرس
$wp_index = dirname(__DIR__) . '/' . ($config['wp_index'] ?? 'index-wp.php');

// اگر اسکریپت فعال نیست یا index وردپرس یافت نشد → مستقیم وردپرس
if (empty($config['enabled']) || !file_exists($wp_index)) {
    ux_enter_wp($wp_index, ['action' => 'pass', 'reason' => 'gateway_disabled_or_wp_missing', 'status' => 200, 'retry_after' => null]);
}

$user_ip = ux_get_user_ip();

// --- IP blocking: deny access if the user's IP is in blocked_ips ---
// If the user's IP appears in the blocked_ips list, immediately return a 403 and
// record a bot visit for analytics. This check happens before any other gateway
// rules so that blocked addresses cannot bypass the gateway.
if (!empty($config['blocked_ips']) && in_array($user_ip, (array)$config['blocked_ips'], true)) {
    // attempt to record the blocked request as a bot visit with status 403
    try {
        if (function_exists('ux_storage_log_visit')) {
            ux_storage_log_visit(true, 403, 1);
        }
    } catch (Throwable $e) {
        // ignore logging errors
    }
    header('HTTP/1.1 403 Forbidden');
    header('Content-Type: text/plain; charset=utf-8');
    if (function_exists('ux_agent_shadow_decision')) {
        ux_agent_shadow_decision(['action' => 'block', 'reason' => 'blocked_ip', 'status' => 403, 'retry_after' => null], $config);
    }
    echo 'Forbidden: Your IP is blocked.';
    exit;
}

// Bot Intelligence / Search-bot gatekeeper (optional)
// این ماژول:
//  - در صورت فعال بودن، برای هر IP یک امتیاز رفتار نگه می‌دارد
//  - می‌تواند ربات‌های معروف را با Reverse/Forward DNS اعتبارسنجی کند
//  - و در صورت نیاز، ربات‌های بد را بلاک یا به صف هدایت کند
require_once __DIR__ . '/ux_bot_detection.php';
ux_bot_gatekeeper($config, $wp_index);

// --- Rate limiting per IP ---
// محدودیت نرخ درخواست، فقط برای آی‌پی‌های غیر از always_allow اعمال می‌شود.
// نکته: ربات‌های موتور جستجوی تأییدشده معمولاً قبل از این مرحله توسط ux_bot_gatekeeper
// به وردپرس هدایت می‌شوند و بنابراین Rate Limit روی آن‌ها اعمال نخواهد شد.
if (!empty($config['rate_limit_per_minute'])
    && (!isset($config['always_allow_ips']) || !in_array($user_ip, (array)$config['always_allow_ips'], true))
) {
    if (!ux_rate_limit_check($config, $user_ip)) {
        $sleep = isset($config['rate_limit_sleep_seconds']) ? (int)$config['rate_limit_sleep_seconds'] : 0;
        if ($sleep > 0) {
            if ($sleep > 10) {
                $sleep = 10;
            }
            sleep($sleep);
        }
        header('HTTP/1.1 429 Too Many Requests');
        header('Content-Type: text/plain; charset=utf-8');
        if (function_exists('ux_agent_shadow_decision')) {
            ux_agent_shadow_decision(['action' => 'block', 'reason' => 'rate_limited', 'status' => 429, 'retry_after' => null], $config);
        }
        echo 'Too many requests. Please slow down.';
        exit;
    }
}



// درخواست‌هایی که باید همیشه بای‌پس شوند (از جمله بازگشت از درگاه)
if (ux_should_bypass_request($config)) {
    ux_log_human_visit($config);
    ux_enter_wp($wp_index, ['action' => 'pass', 'reason' => 'bypass_route', 'status' => 200, 'retry_after' => null]);
}

// اگر حوزهٔ اجرای گیت‌وی فقط روی مسیرهای مشخص‌شده باشد و این درخواست جزو آن‌ها نباشد → مستقیم وردپرس
$gateway_scope = $config['gateway_scope'] ?? 'site';
if ($gateway_scope === 'include_paths') {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $include_paths = (array)($config['include_paths'] ?? []);
    $matched = false;
    foreach ($include_paths as $path) {
        $path = trim($path);
        if ($path === '') continue;
        if (strpos($uri, $path) === 0) {
            $matched = true;
            break;
        }
    }
    if (!$matched) {
        ux_log_human_visit($config);
        ux_enter_wp($wp_index, ['action' => 'pass', 'reason' => 'scope_bypass', 'status' => 200, 'retry_after' => null]);
    }
}

// آی‌پی‌های همیشه مجاز
if (!empty($config['always_allow_ips']) && in_array($user_ip, (array)$config['always_allow_ips'], true)) {
    ux_log_human_visit($config);
    ux_enter_wp($wp_index, ['action' => 'pass', 'reason' => 'always_allow_ip', 'status' => 200, 'retry_after' => null]);
}




/**
 * ظرفیت داینامیک برای حالت smart_queue
 * - فقط بین یک حداقل امن و مقدار max_active_users نوسان می‌کند
 * - از ux_get_server_load_info برای خواندن لود استفاده می‌کند
 * - وضعیت در فایل ux_dynamic_state.json ذخیره می‌شود تا در ریکوئست‌های بعدی هم حفظ شود
 */

function ux_dynamic_max_active(int $base_max): int {
    $base_max = max(1, $base_max);

    // وضعیت داخلی (برای کش کردن آخرین ظرفیت و زمان آپدیت)
    $state_file = __DIR__ . '/ux_dynamic_state.json';
    $state = [
        'current_cap' => $base_max,
        'last_update' => 0,
    ];

    if (is_file($state_file)) {
        $json = @file_get_contents($state_file);
        $tmp  = json_decode($json, true);
        if (is_array($tmp)) {
            $state = array_merge($state, $tmp);
        }
    }

    $now = time();

    // فاصله‌ی بروزرسانی صف هوشمند (برای جلوگیری از storm زیر 2000rps)
    global $config;
    $interval = isset($config['smart_update_interval_seconds']) ? (int)$config['smart_update_interval_seconds'] : 10;
    if ($interval < 1) { $interval = 10; }

    // اگر کمتر از interval ثانیه از آخرین محاسبه گذشته، همان ظرفیت قبلی را برگردان
    if ($now - (int)$state['last_update'] < $interval) {
        $cap = (int)$state['current_cap'];
        return (int)min($base_max, max(1, $cap));
    }

    // توزیع‌شده/غیرمسدود: فقط یک worker حق محاسبه‌ی ظرفیت جدید را دارد
    $lockAcquired = false;
    $lockHandle = null;
    $lockTtl = max(2, min(30, $interval));

    // ترجیحاً از Redis lock استفاده کن (بهتر از flock زیر OLS)
    if (function_exists('ux_redis_client')) {
        $r = ux_redis_client();
        if ($r instanceof Redis) {
            try {
                $lockAcquired = (bool)$r->set('ux_smart_update_lock', (string)$now, ['nx', 'ex' => $lockTtl]);
            } catch (Throwable $e) {
                $lockAcquired = false;
            }
        }
    }
    // اگر Redis نبود، از فایل لاک non-blocking استفاده کن
    if (!$lockAcquired) {
        $lockFile = __DIR__ . '/ux_smart_update.lock';
        $lockHandle = @fopen($lockFile, 'c');
        if (is_resource($lockHandle)) {
            $lockAcquired = @flock($lockHandle, LOCK_EX | LOCK_NB);
        }
    }
    if (!$lockAcquired) {
        // یک worker دیگر در حال محاسبه است؛ از cap قبلی استفاده کن
        $cap = (int)$state['current_cap'];
        return (int)min($base_max, max(1, $cap));
    }

    // از اینجا به بعد فقط همین worker محاسبه انجام می‌دهد
    $state['last_update'] = $now;

    $info = ux_get_server_load_info();
    if (!is_array($info)) {
        $cap = (int)$state['current_cap'];
        $cap = (int)min($base_max, max(1, $cap));
        $state['current_cap'] = $cap;

        @file_put_contents($state_file, json_encode($state, JSON_UNESCAPED_UNICODE));
        return $cap;
    }

    $cpu = isset($info['percent']) ? (float)$info['percent'] : 0.0;
    $mem = isset($info['memory_percent']) ? (float)$info['memory_percent'] : 0.0;

    $disk = isset($info['disk_percent']) && is_numeric($info['disk_percent']) ? (float)$info['disk_percent'] : 0.0;

    // پیش‌بینی مصرف CPU و حافظه (میانگین نمایی) در صورت فعال بودن
    $predCpu = $cpu;
    $predMem = $mem;
    global $config;
    $predictionEnabled = isset($config['smart_prediction_enabled']) && $config['smart_prediction_enabled'];
    if ($predictionEnabled) {
        $alpha = isset($config['smart_prediction_alpha']) ? (float)$config['smart_prediction_alpha'] : 0.5;
        if ($alpha <= 0) { $alpha = 0.1; }
        if ($alpha > 1) { $alpha = 1.0; }
        // دریافت نمونه‌های اخیر برای محاسبه پیش‌بینی. نمونه‌ها به ترتیب جدیدترین در شاخص 0 قرار دارند.
        $samplesForPrediction = ux_get_smart_recent_samples(6);
        // ما میانگین نمایی را از قدیمی‌ترین به جدیدترین محاسبه می‌کنیم تا یک پیش‌بینی برای مرحله بعدی بدست آوریم.
        // اگر نمونه‌ای در دسترس نباشد، از مقدار فعلی استفاده می‌شود.
        if (is_array($samplesForPrediction) && count($samplesForPrediction) > 1) {
            // نمونه‌ها را معکوس می‌کنیم تا قدیمی‌ترین در ابتدای آرایه باشد
            $rev = array_reverse($samplesForPrediction);
            // مقدار اولیه: اولین نمونه (قدیمی‌ترین)
            $predCpuTmp = (float)($rev[0]['cpu_percent'] ?? $cpu);
            $predMemTmp = (float)($rev[0]['mem_percent'] ?? $mem);
            for ($i = 1; $i < count($rev); $i++) {
                $sampleCpu = (float)($rev[$i]['cpu_percent'] ?? $cpu);
                $sampleMem = (float)($rev[$i]['mem_percent'] ?? $mem);
                $predCpuTmp = $alpha * $sampleCpu + (1 - $alpha) * $predCpuTmp;
                $predMemTmp = $alpha * $sampleMem + (1 - $alpha) * $predMemTmp;
            }
            // پیش‌بینی ما همان مقدار محاسبه‌شده است؛ اگر این مقدار از مقدار فعلی بیشتر باشد، از آن استفاده می‌کنیم
            if ($predCpuTmp > $cpu) {
                $predCpu = $predCpuTmp;
            }
            if ($predMemTmp > $mem) {
                $predMem = $predMemTmp;
            }
        }
    }

    $minCap = (int)max(1, round($base_max * 0.4)); // حداقل ۴۰٪ ظرفیت پایه

    // خواندن وضعیت فعلی سشن‌ها (داخل سایت / در صف)
    $sessions = ux_get_active_sessions();   // [session_id => last_seen]
    $queueMap = ux_get_queue_sessions();    // [session_id => ['joined_at' => ..., 'last_seen' => ...]];
    $inside   = is_array($sessions) ? count($sessions) : 0;
    $queue    = is_array($queueMap) ? count($queueMap) : 0;

    // Latency-based health signals (p95 latency + 5xx error-rate)
    $latP95 = null;
    $err5xx = null;
    $latN   = 0;
    if (!empty($config['latency_smart_enabled']) && function_exists('ux_latency_get_window_stats')) {
        try {
            $latStats = ux_latency_get_window_stats($config);
            if (is_array($latStats)) {
                $latP95 = array_key_exists('p95_ms', $latStats) ? ($latStats['p95_ms'] === null ? null : (int)$latStats['p95_ms']) : null;
                $err5xx = array_key_exists('err5xx_pct', $latStats) ? ($latStats['err5xx_pct'] === null ? null : (float)$latStats['err5xx_pct']) : null;
                $latN   = array_key_exists('samples', $latStats) ? (int)$latStats['samples'] : 0;
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    // ظرفیت جاری قبلی
    $cur = (int)$state['current_cap'];
    if ($cur <= 0) {
        $cur = $base_max;
    }

    // محاسبه مقدار پیشنهادی بر اساس CPU/Memory به ازای هر کاربر
    $recommended = $base_max;
    if ($inside > 0) {
        // هدف: حفظ استفاده از CPU، حافظه و دیسک در حدود مقادیر تعریف‌شده در کانفیگ
        global $config;
        $targetCpu  = isset($config['smart_target_cpu'])  ? (float)$config['smart_target_cpu']  : 75.0;
        $targetMem  = isset($config['smart_target_mem'])  ? (float)$config['smart_target_mem']  : 80.0;
        $targetDisk = isset($config['smart_target_disk']) ? (float)$config['smart_target_disk'] : 70.0;
        $maxConnPerUser = isset($config['smart_max_conn_per_user']) ? (float)$config['smart_max_conn_per_user'] : 3.0;
        $cpu_based_cap = $base_max;
        if ($predCpu > 0.0) {
            $cpu_based_cap = (int)floor(($targetCpu / max(1e-5, (float)$predCpu)) * $inside);
        }
        $mem_based_cap = $base_max;
        if ($predMem > 0.0) {
            $mem_based_cap = (int)floor(($targetMem / max(1e-5, (float)$predMem)) * $inside);
        }
        // ظرفیت براساس استفاده دیسک
        $disk_based_cap = $base_max;
        if (isset($info['disk_percent']) && is_numeric($info['disk_percent'])) {
            $diskPercent = (float)$info['disk_percent'];
            if ($diskPercent > 0.0) {
                $disk_based_cap = (int)floor(($targetDisk / max(1e-5, $diskPercent)) * $inside);
            }
        }
        // ظرفیت براساس تعداد اتصالات به ازای هر کاربر
        $conn_based_cap = $base_max;
        if (isset($info['conn_count']) && $inside > 0) {
            $avgConnPerUser = (float)$info['conn_count'] / $inside;
            if ($avgConnPerUser > $maxConnPerUser) {
                $conn_based_cap = (int)floor(($maxConnPerUser / max(1e-5, $avgConnPerUser)) * $inside);
            }
        }
        $recommended = min($cpu_based_cap, $mem_based_cap, $disk_based_cap, $conn_based_cap, $base_max);
        // همیشه حداقل minCap را نگه داریم
        if ($recommended < $minCap) {
            $recommended = $minCap;
        }
    }

    // بررسی روند (trend) بر اساس آخرین نمونه‌ها
    $recent = ux_get_smart_recent_samples(6); // جدیدترین در اندیس 0
    $trendDown = false;
    $trendUp   = false;
    if (count($recent) >= 2) {
        $last = $recent[0];
        $prev = $recent[1];
        $lastCpu  = (float)($last['cpu_percent'] ?? 0);
        $prevCpu  = (float)($prev['cpu_percent'] ?? 0);
        $lastAct  = (int)($last['active_count'] ?? 0);
        $prevAct  = (int)($prev['active_count'] ?? 0);
        if ($cpu > $lastCpu && $lastCpu > $prevCpu && $inside > $lastAct) {
            // روند صعودی در CPU و تعداد کاربران
            $trendUp = true;
        } elseif ($cpu < $lastCpu && $lastCpu <= $prevCpu && $inside < $lastAct) {
            // روند نزولی در CPU و تعداد کاربران
            $trendDown = true;
        }
    }

    $reasonCodes = [];

    // Latency-based adaptive concurrency (reduce cap when tail latency or 5xx rises)
    $minSamples = isset($config['latency_min_samples']) ? (int)$config['latency_min_samples'] : 30;
    if ($minSamples < 5) { $minSamples = 5; }
    $p95Target  = isset($config['latency_p95_target_ms']) ? (int)$config['latency_p95_target_ms'] : 900;
    $p95Hard    = isset($config['latency_p95_hard_ms']) ? (int)$config['latency_p95_hard_ms'] : 2500;
    $errHighPct = isset($config['latency_err_rate_high_pct']) ? (float)$config['latency_err_rate_high_pct'] : 2.0;
    if ($errHighPct < 0) { $errHighPct = 0; }

    if (!empty($config['latency_smart_enabled'])) {
        if ($latN < $minSamples || $latP95 === null) {
            $reasonCodes[] = 'lat_insufficient';
        } else {
            if ($latP95 >= $p95Hard || ($err5xx !== null && $err5xx >= ($errHighPct * 2))) {
                $recommended = (int)max($minCap, round($recommended * 0.6));
                $reasonCodes[] = ($latP95 >= $p95Hard) ? 'lat_hard' : 'err_hard';
            } elseif ($latP95 >= $p95Target || ($err5xx !== null && $err5xx >= $errHighPct)) {
                $recommended = (int)max($minCap, round($recommended * 0.8));
                $reasonCodes[] = ($latP95 >= $p95Target) ? 'lat_high' : 'err_high';
            } elseif ($latP95 <= (int)round($p95Target * 0.7) && ($err5xx === null || $err5xx <= ($errHighPct * 0.25))) {
                $recommended = (int)min($base_max, max($minCap, round($recommended * 1.05)));
                $reasonCodes[] = 'lat_good';
            }
        }
    }


    // واکنش به فشار بسیار زیاد
    if ($cpu >= 90 || $mem >= 90) {
        $recommended = (int)max($minCap, round($recommended * 0.6));
        $reasonCodes[] = 'cpu_high';
    }
    // واکنش به فشار متوسط
    elseif ($cpu >= 75 || $mem >= 80) {
        $recommended = (int)max($minCap, round($recommended * 0.8));
        $reasonCodes[] = 'cpu_medium';
    } else {
        // سرور نسبتاً خنک
        if ($cpu < 50 && $mem < 50) {
            $reasonCodes[] = 'cpu_low';
        }
    }

    // روند صعودی و در محدوده متوسط → کاهش پیشگیرانه
    if ($trendUp && $cpu >= 60 && $cpu <= 85) {
        $recommended = (int)max($minCap, round($recommended * 0.85));
        $reasonCodes[] = 'trend_up';
    } elseif ($trendDown && $cpu <= 60) {
        $reasonCodes[] = 'cool_server';
        // در صورت خنک شدن سریع سرور و کاهش کاربران، می‌توانیم کمی افزایش دهیم
    }

    // Smart Queue Modules: ماژول‌ها «سیگنال» می‌دهند و روی recommended/trend اثر می‌گذارند
    if (function_exists('ux_smart_modules_apply')) {
        $ctx = [
            'base_max' => (int)$base_max,
            'min_cap'  => (int)$minCap,
            'current_cap' => (int)$cur,
            'recommended_cap' => (int)$recommended,
            'cpu' => (float)$cpu,
            'mem' => (float)$mem,
            'disk' => (float)$disk,
            'inside' => (int)$inside,
            'queue'  => (int)$queue,
            'trend_up' => (bool)$trendUp,
            'trend_down' => (bool)$trendDown,
            'now' => (int)$now,
        ];
        $applied = ux_smart_modules_apply($ctx);
        if (is_array($applied) && isset($applied['ctx']) && is_array($applied['ctx'])) {
            $ctx2 = $applied['ctx'];
            if (isset($ctx2['recommended_cap'])) {
                $recommended = (int)$ctx2['recommended_cap'];
            }
            if (isset($ctx2['trend_up'])) {
                $trendUp = (bool)$ctx2['trend_up'];
            }
            if (isset($ctx2['trend_down'])) {
                $trendDown = (bool)$ctx2['trend_down'];
            }
        }
        if (is_array($applied) && isset($applied['reason_codes']) && is_array($applied['reason_codes'])) {
            foreach ($applied['reason_codes'] as $rc) {
                $rc = trim((string)$rc);
                if ($rc !== '') { $reasonCodes[] = $rc; }
            }
        }
    }

    // همیشه محدوده‌ها را enforce کن
    if ($recommended < $minCap) { $recommended = $minCap; }
    if ($recommended > $base_max) { $recommended = $base_max; }

// ظرفیت نهایی بر اساس recommended و ظرفیت جاری: کاهش سریع، افزایش آهسته
    $newCap = $cur;
    if ($recommended < $cur) {
        // کاهش سریع (20٪ یا تا recommended)
        $newCap = max($recommended, (int)round($cur * 0.8));
        $reasonCodes[] = 'decrease';
    } elseif ($recommended > $cur) {
        // افزایش آهسته (10٪ یا تا recommended)
        $newCap = min($recommended, (int)ceil($cur * 1.1));
        $reasonCodes[] = 'increase';
    }
    // اعمال حداقل و حداکثر
    if ($newCap < $minCap) {
        $newCap = $minCap;
        $reasonCodes[] = 'enforce_min';
    }
    if ($newCap > $base_max) {
        $newCap = $base_max;
        $reasonCodes[] = 'enforce_max';
    }

    // ثبت تصمیم در صورت تغییر ظرفیت یا زمانی که گزینه لاگ بدون تغییر فعال باشد
    $logNoChange = isset($config['smart_log_no_change']) && $config['smart_log_no_change'];
    if ($newCap !== $cur) {
        $reasons = implode(',', array_unique($reasonCodes));
        ux_log_smart_decision((int)$cur, (int)$newCap, $reasons, (int)$cpu, (int)$mem, (int)$inside, (int)$queue, (int)$base_max);
    } elseif ($logNoChange) {
        // اگر ظرفیت تغییر نکرد و گزینهٔ لاگ فعال است، دلیلی مشخص می‌کنیم
        $reasons = 'no_change';
        ux_log_smart_decision((int)$cur, (int)$newCap, $reasons, (int)$cpu, (int)$mem, (int)$inside, (int)$queue, (int)$base_max);
    }

    // ثبت در تاریخچه برای تحلیل هفتگی/ماهانه
    ux_log_smart_history((int)$cpu, (int)$mem, $base_max, (int)$newCap, (int)$inside, (int)$queue, ($latP95===null?null:(int)$latP95), ($err5xx===null?null:(float)$err5xx), (int)$latN);

    // به‌روزرسانی وضعیت و ذخیره فایل state
    $cap = (int)$newCap;
    $state['current_cap'] = $cap;
    // expose latency health signals for admin live panel
    $state['lat_p95_ms'] = $latP95;
    $state['err5xx_pct'] = $err5xx;
    $state['lat_samples'] = $latN;
    @file_put_contents($state_file, json_encode($state, JSON_UNESCAPED_UNICODE));

    // Release update lock (never block)
    if (isset($lockHandle) && is_resource($lockHandle)) {
        @flock($lockHandle, LOCK_UN);
        @fclose($lockHandle);
    } else {
        // best-effort: release Redis lock
        if (function_exists('ux_redis_client')) {
            $r2 = ux_redis_client();
            if ($r2 instanceof Redis) {
                try { $r2->del('ux_smart_update_lock'); } catch (Throwable $e) { /* ignore */ }
            }
        }
    }

    return $cap;
}

/**
 * بررسی محدودیت نرخ درخواست (Rate Limiting) برای هر IP در هر دقیقه.
 * در صورت عبور از حد مجاز، false باز می‌گردد. داده‌ها در فایل ux_rate_limit.json ذخیره می‌شوند.
 *
 * @param array  $config پیکربندی شامل rate_limit_per_minute
 * @param string $ip     آی‌پی کاربر
 * @return bool          true اگر درخواست مجاز باشد، false اگر محدودیت اعمال شود
 */
function ux_rate_limit_check(array $config, string $ip): bool {
    $limit = isset($config['rate_limit_per_minute']) ? (int)$config['rate_limit_per_minute'] : 0;
    // اگر محدودیتی تعیین نشده باشد، همیشه اجازه بده
    if ($limit < 1) {
        return true;
    }

    // Prefer Redis when available (atomic, fast, no filesystem contention)
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
            if ($redis instanceof Redis) {
                $bucket = (int)floor(time() / 60);
                // One key per (IP, minute). TTL slightly > 60s to cover clock drift.
                $key = 'ux_rl:' . $bucket . ':' . $ip;
                $count = (int)$redis->incr($key);
                if ($count === 1) {
                    $redis->expire($key, 120);
                }
                return $count <= $limit;
            }
        } catch (Throwable $e) {
            // fall back to file-based limiter
        }
    }
    $file = __DIR__ . '/ux_rate_limit.json';
    $data = [];
    // Best-effort lock to avoid corrupt JSON under concurrent writes.
    $fp = @fopen($file, 'c+');
    if ($fp) {
        @flock($fp, LOCK_EX);
        $json = stream_get_contents($fp);
        $tmp  = json_decode($json ?: '', true);
        if (is_array($tmp)) {
            $data = $tmp;
        }
        // We will write back below.
    } elseif (is_file($file)) {
        $json = @file_get_contents($file);
        $tmp  = json_decode($json ?: '', true);
        if (is_array($tmp)) {
            $data = $tmp;
        }
    }
    $now = time();
    // ساختار ذخیره: [ip => ['ts' => timestamp, 'count' => int]]
    $entry = isset($data[$ip]) && is_array($data[$ip]) ? $data[$ip] : ['ts' => 0, 'count' => 0];
    // اگر از آخرین ثبت بیش از ۶۰ ثانیه گذشته باشد، ریست می‌کنیم
    if ($now - (int)($entry['ts'] ?? 0) >= 60) {
        $entry['ts'] = $now;
        $entry['count'] = 1;
    } else {
        $entry['count'] = (int)($entry['count'] ?? 0) + 1;
    }
    $data[$ip] = $entry;
    // ذخیره اطلاعات محدودیت
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($fp) {
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, $encoded);
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
    } else {
        @file_put_contents($file, $encoded);
    }
    // اگر تعداد از حد مجاز بیشتر باشد، محدود کن
    return $entry['count'] <= $limit;
}



$mode = $config['mode'] ?? 'maintenance';

// Lightweight metrics (never blocks)
if (function_exists('ux_metrics_inc')) {
    ux_metrics_inc('req', 1);
}

// حالت whitelist
if ($mode === 'whitelist') {
    $allowed_ips = (array)($config['allowed_ips'] ?? []);
    if (in_array($user_ip, $allowed_ips, true)) {
        ux_log_human_visit($config);
        ux_enter_wp($wp_index, ['action' => 'allow', 'reason' => 'whitelist_allowed', 'status' => 200, 'retry_after' => null]);
    } else {
        ux_send_waiting_room($config);
        exit;
    }
}

// حالت queue (صف انتظار)
if ($mode === 'queue') {
    $max_active = !empty($config['max_active_users']) ? (int)$config['max_active_users'] : 200;
    if ($max_active <= 0) {
        $max_active = 200;
    }

// تصمیم اتمیک برای ورود یا ماندن در صف
if (ux_can_pass_gateway($max_active)) {
    ux_log_human_visit($config);
    ux_enter_wp($wp_index, ['action' => 'allow', 'reason' => 'queue_capacity_available', 'status' => 200, 'retry_after' => null]);
}

    // ظرفیت پر است → صفحه صف
    ux_send_waiting_room($config);
    exit;
}


// حالت smart_queue (صف هوشمند بر اساس لود سرور)
if ($mode === 'smart_queue') {
    $base_max = !empty($config['max_active_users']) ? (int)$config['max_active_users'] : 200;
    if ($base_max <= 0) {
        $base_max = 200;
    }

    $max_active = ux_dynamic_max_active($base_max);

    // تصمیم اتمیک برای ورود یا ماندن در صف
    $canPass = ux_can_pass_gateway($max_active);
    if (function_exists('ux_metrics_inc')) {
        ux_metrics_inc($canPass ? 'allow' : 'queue', 1);
    }
    if ($canPass) {
        ux_log_human_visit($config);
        ux_enter_wp($wp_index, ['action' => 'allow', 'reason' => 'smart_queue_capacity_available', 'status' => 200, 'retry_after' => null]);
    }

    // ظرفیت پر است → صفحه صف
    ux_send_waiting_room($config);
    exit;
}

// حالت maintenance / کمپین
ux_send_waiting_room($config);
