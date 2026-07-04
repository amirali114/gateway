<?php
// Prevent redeclaration if this file has already been included.
if (function_exists('ux_storage_db_path')) {
    return;
}

/**
 * Ensure that the login_attempts table exists in the main SQLite database.
 *
 * On some deployments, administrators may upgrade from a version of the plugin
 * that did not include the login_attempts table. Although ux_storage_migrate()
 * normally creates this table when the database is first opened, the upgrade
 * path might bypass that migration or operate on an existing database file
 * that lacks the table. Calling this helper defensively before reading or
 * writing login attempt records creates the table if it is missing. The
 * CREATE TABLE IF NOT EXISTS statement is safe to call repeatedly; if the
 * table already exists, it has no effect.
 *
 * @param PDO $pdo The PDO connection to the main storage database.
 * @return void
 */
function ux_ensure_login_attempts_table(PDO $pdo): void
{
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS login_attempts ("
            . "    ip TEXT PRIMARY KEY,"
            . "    count INTEGER NOT NULL,"
            . "    locked_until INTEGER NOT NULL,"
            . "    updated_at INTEGER NOT NULL"
            . ");"
        );
    } catch (Throwable $e) {
        // Intentionally suppress errors. If the creation fails, the subsequent
        // read/write operations will log detailed error messages.
    }
}

/**
 * Check whether a column exists in a SQLite table.
 *
 * @param PDO    $pdo
 * @param string $table
 * @param string $column
 * @return bool
 */
function ux_sqlite_column_exists(PDO $pdo, string $table, string $column): bool
{
    try {
        // PRAGMA table_info returns one row per column.
        $stmt = $pdo->query("PRAGMA table_info(" . str_replace('"', '""', $table) . ")");
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        foreach ($rows as $r) {
            if (isset($r['name']) && (string)$r['name'] === $column) {
                return true;
            }
        }
    } catch (Throwable $e) {
        // ignore
    }
    return false;
}

/**
 * Add a column to a SQLite table if it does not already exist.
 *
 * @param PDO    $pdo
 * @param string $table
 * @param string $column
 * @param string $definition e.g. "INTEGER", "TEXT", "REAL NOT NULL DEFAULT 0"
 * @return void
 */
function ux_sqlite_add_column_if_missing(PDO $pdo, string $table, string $column, string $definition): void
{
    try {
        if (ux_sqlite_column_exists($pdo, $table, $column)) {
            return;
        }
        // Note: SQLite only supports adding one column at a time.
        $pdo->exec("ALTER TABLE " . $table . " ADD COLUMN " . $column . " " . $definition . ";");
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Runtime preflight for SQLite availability.
 * pdo_sqlite is required only for the PHP fallback storage path. Redis mode can run without it.
 */
function ux_storage_sqlite_available(): bool
{
    static $available = null;
    if ($available !== null) {
        return $available;
    }
    $available = class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
    return $available;
}
/**
 * Storage & queue helper functions for Unixsee Campaign Gateway
 * نسخه بهینه‌شده با SQLite (جایگزین JSON)
 *
 * این فایل به جای فایل‌های:
 *   - ux_campaign_sessions.json
 *   - ux_campaign_queue.json
 *   - ux_campaign_wait_times.json
 * از یک دیتابیس SQLite سبک در همین پوشه استفاده می‌کند.
 *
 * نیازی نیست خودت دیتابیس بسازی؛ در اولین اجرا، جداول به‌صورت خودکار ساخته می‌شوند.
 */

// مسیر فایل دیتابیس (در کنار gateway.php)
function ux_storage_db_path(): string
{
    /*
     * Determine the path to the SQLite database. By default the database
     * lives in the plugin directory as ux_campaign.sqlite. To support
     * deployments where write access to the web root is restricted or to
     * move the database outside of the publicly accessible directory, you
     * can set the CAMPAIGN_GATEWAY_DB_PATH environment variable. If this
     * variable is set to a non-empty string, that absolute path will be
     * used instead of the default location. Ensure the configured path is
     * writable by the web server. Example:
     *   export CAMPAIGN_GATEWAY_DB_PATH="/var/lib/unixsee/ux_campaign.sqlite"
     */
    $envPath = getenv('CAMPAIGN_GATEWAY_DB_PATH');
    if (is_string($envPath) && trim($envPath) !== '') {
        return $envPath;
    }
    return __DIR__ . '/ux_campaign.sqlite';
}

/**
 * Determine the path to the separate SQLite database used for visit analytics.
 *
 * To support deployments where analytics data should be isolated from the main
 * application database (for performance and scalability reasons), a distinct
 * database file is used to store entries in the `ux_visits` table. The path
 * to this analytics database can be configured via the CAMPAIGN_ANALYTICS_DB_PATH
 * environment variable. If this variable is set to a non-empty string,
 * that absolute path will be used. Otherwise, a default file named
 * `ux_analytics.sqlite` will be created in the plugin directory.
 *
 * @return string The absolute path to the analytics SQLite database file.
 */
function ux_storage_analytics_db_path(): string
{
    $envPath = getenv('CAMPAIGN_ANALYTICS_DB_PATH');
    if (is_string($envPath) && trim($envPath) !== '') {
        return $envPath;
    }
    return __DIR__ . '/ux_analytics.sqlite';
}

/**
 * Retrieve a PDO connection for the analytics database (singleton).
 *
 * This helper mirrors ux_storage_pdo() but uses the analytics DB path and
 * ensures that the `ux_visits` table exists by running a separate
 * migration. Because the analytics DB may handle a high volume of inserts
 * and reads, WAL mode and normal synchronous level are enabled for
 * better concurrent performance. If the database cannot be opened, a
 * memory-based fallback will be used to avoid fatal errors.
 *
 * @return PDO A PDO instance connected to the analytics SQLite database.
 */
function ux_storage_analytics_pdo(): PDO
{
    if (!ux_storage_sqlite_available()) {
        throw new RuntimeException('pdo_sqlite extension is not available; analytics SQLite storage is disabled.');
    }
    static $pdoAnalytics = null;
    if ($pdoAnalytics instanceof PDO) {
        return $pdoAnalytics;
    }

    $dbPath = ux_storage_analytics_db_path();
    // Log the analytics DB path once for debugging. Controlled via config
    static $loggedAnalyticsPath = false;
    // Only log if explicitly enabled in the configuration
    $shouldLog = false;
    if (function_exists('ux_get_config')) {
        // Use helper to read config if available (for backwards compatibility)
        $cfg = ux_get_config();
        $shouldLog = isset($cfg['log_db_path']) ? (bool)$cfg['log_db_path'] : false;
    } elseif (isset($GLOBALS['config'])) {
        $shouldLog = isset($GLOBALS['config']['log_db_path']) ? (bool)$GLOBALS['config']['log_db_path'] : false;
    }
    if ($shouldLog && !$loggedAnalyticsPath) {
        error_log('ux_storage_analytics_pdo using DB path: ' . $dbPath);
        $loggedAnalyticsPath = true;
    }

    try {
        $pdoAnalytics = new PDO('sqlite:' . $dbPath);
        $pdoAnalytics->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdoAnalytics->exec("PRAGMA journal_mode = WAL;");
        $pdoAnalytics->exec("PRAGMA synchronous = NORMAL;");

        // Integrity check for analytics DB (ux_analytics.sqlite). If malformed, back up and recreate.
        try {
            $check = $pdoAnalytics->query("PRAGMA integrity_check;")->fetch(PDO::FETCH_NUM);
            $okVal = is_array($check) ? (string)$check[0] : '';
            if (strtolower($okVal) !== 'ok') {
                $pdoAnalytics = null;
                $timestamp = date('Ymd_His');
                $backup = $dbPath . '.corrupt_' . $timestamp;
                @rename($dbPath, $backup);
                error_log('ux_storage_analytics_pdo detected a malformed SQLite DB; backed up to ' . $backup . ' and will recreate a new database.');
                $pdoAnalytics = new PDO('sqlite:' . $dbPath);
                $pdoAnalytics->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdoAnalytics->exec("PRAGMA journal_mode = WAL;");
                $pdoAnalytics->exec("PRAGMA synchronous = NORMAL;");
            }
        } catch (Throwable $ex) {
            // If integrity check fails, back up and recreate
            $pdoAnalytics = null;
            $timestamp = date('Ymd_His');
            $backup = $dbPath . '.corrupt_' . $timestamp;
            @rename($dbPath, $backup);
            error_log('ux_storage_analytics_pdo integrity check failed; backed up corrupt DB to ' . $backup . ' and creating a new database.');
            $pdoAnalytics = new PDO('sqlite:' . $dbPath);
            $pdoAnalytics->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdoAnalytics->exec("PRAGMA journal_mode = WAL;");
            $pdoAnalytics->exec("PRAGMA synchronous = NORMAL;");
        }
    } catch (Throwable $e) {
        error_log('Unixsee Gateway analytics SQLite error: ' . $e->getMessage());
        throw $e;
    }

    // Ensure the analytics table exists
    ux_storage_analytics_migrate($pdoAnalytics);

    return $pdoAnalytics;
}

/**
 * Get a Redis connection using configuration values.
 *
 * This helper attempts to create a singleton Redis client based on the
 * connection parameters provided in the gateway configuration. If Redis is
 * disabled or the PHP Redis extension is not available, this function
 * returns null. If a connection attempt fails, the failure is logged and
 * null is returned, ensuring the rest of the gateway can fall back to
 * SQLite storage. Subsequent calls return the same instance or null.
 *
 * @return Redis|null A connected Redis client, or null on failure.
 */
function ux_redis_client(): ?Redis
{
    static $redis = null;
    // false sentinel means a previous attempt failed or Redis is disabled
    static $disabled = false;
    if ($disabled) {
        return null;
    }
    if ($redis instanceof Redis) {
        return $redis;
    }
    global $config;
    if (empty($config['redis_enabled'])) {
        $disabled = true;
        return null;
    }
    // Require the Redis extension
    if (!class_exists('Redis')) {
        error_log('Unixsee Gateway: PHP Redis extension not installed');
        $disabled = true;
        return null;
    }

    // Connection parameters
    $host     = (string)($config['redis_host'] ?? '127.0.0.1');
    $port     = (int)($config['redis_port'] ?? 6379);
    $db       = (int)($config['redis_db'] ?? 0);
    $password = (string)($config['redis_password'] ?? '');

    // Safety / performance knobs (to avoid blocking WordPress when Redis is slow)
    $connectTimeout = (float)($config['redis_connect_timeout'] ?? 0.5);
    if ($connectTimeout <= 0) {
        $connectTimeout = 0.5;
    }
    $readTimeout = (float)($config['redis_read_timeout'] ?? 1.0);
    if ($readTimeout <= 0) {
        $readTimeout = 1.0;
    }
    $retryIntervalMs = (int)($config['redis_retry_interval_ms'] ?? 0);
    if ($retryIntervalMs < 0) {
        $retryIntervalMs = 0;
    }

    // Namespace to avoid colliding with WordPress object-cache keys.
    // NOTE: prefix MUST end with ':' for best readability.
    $prefix = (string)($config['redis_prefix'] ?? 'uxgw:');
    $prefix = trim($prefix);
    if ($prefix === '') {
        $prefix = 'uxgw:';
    }
    if (substr($prefix, -1) !== ':') {
        $prefix .= ':';
    }

    // Persistent connection is optional; if enabled, use a dedicated persistent-id
    // so that we never share the same connection with WordPress (which may use
    // a different DB index or prefix).
    $usePersistent = !empty($config['redis_persistent']);
    $persistentId  = (string)($config['redis_persistent_id'] ?? 'uxgw');
    if ($persistentId === '') {
        $persistentId = 'uxgw';
    }
    try {
        $redis = new Redis();

        // UNIX socket support: set redis_host to something like "/var/run/redis/redis.sock"
        $isUnixSocket = ($host !== '' && $host[0] === '/');
        if ($usePersistent) {
            // pconnect(host, port, timeout, persistent_id, retry_interval, read_timeout)
            $redis->pconnect($host, $isUnixSocket ? 0 : $port, $connectTimeout, $persistentId, $retryIntervalMs, $readTimeout);
        } else {
            // connect(host, port, timeout, reserved, retry_interval, read_timeout)
            $redis->connect($host, $isUnixSocket ? 0 : $port, $connectTimeout, null, $retryIntervalMs, $readTimeout);
        }

        if ($password !== '') {
            // If authentication fails, a RedisException will be thrown
            $redis->auth($password);
        }

        // Always select the configured DB (important when persistent connections are enabled)
        $redis->select($db);

        // Apply namespace prefix (isolates keys from WP object cache)
        if (defined('Redis::OPT_PREFIX')) {
            $redis->setOption(Redis::OPT_PREFIX, $prefix);
        }

        // Keep serializer disabled (we only store primitive values / json)
        if (defined('Redis::OPT_SERIALIZER') && defined('Redis::SERIALIZER_NONE')) {
            $redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_NONE);
        }

        // Ensure read-timeouts are applied even if connect signature differs
        if (defined('Redis::OPT_READ_TIMEOUT')) {
            $redis->setOption(Redis::OPT_READ_TIMEOUT, $readTimeout);
        }
    } catch (Throwable $e) {
        error_log('Unixsee Gateway: Redis connection failed: ' . $e->getMessage());
        $disabled = true;
        $redis    = null;
        return null;
    }
    return $redis;
}

/**
 * Create the ux_visits table in the analytics database if it does not exist.
 *
 * Only the `ux_visits` table is created in this migration, isolating
 * analytics data from other application tables. When called repeatedly,
 * the CREATE TABLE IF NOT EXISTS statement is a no-op.
 *
 * @param PDO $pdo The PDO connection to the analytics database.
 */
function ux_storage_analytics_migrate(PDO $pdo): void
{
    // جدول بازدیدها برای آنالیتیکس
    $pdo->exec("CREATE TABLE IF NOT EXISTS ux_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        ip TEXT NOT NULL,
        ua TEXT NOT NULL,
        path TEXT NOT NULL,
        is_bot INTEGER NOT NULL DEFAULT 0,
        status_code INTEGER NOT NULL DEFAULT 200
    );");

    // ستون‌های تکمیلی برای آنالیتیکس (نسخه‌های قدیمی دیتابیس)
    if (function_exists('ux_sqlite_add_column_if_missing')) {
        ux_sqlite_add_column_if_missing($pdo, 'ux_visits', 'blocked', 'INTEGER NOT NULL DEFAULT 0');
        ux_sqlite_add_column_if_missing($pdo, 'ux_visits', 'bytes', 'INTEGER NOT NULL DEFAULT 0');
    }

    // بانک هوشمند User-Agent (UA Intelligence Bank)
    $pdo->exec("CREATE TABLE IF NOT EXISTS ua_stats (
        ua_hash TEXT PRIMARY KEY,
        ua TEXT NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        hits INTEGER NOT NULL DEFAULT 0,
        last_ip TEXT,
        last_score INTEGER,
        classification TEXT,
        bot_name TEXT
    );");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ua_stats_hits ON ua_stats(hits);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ua_stats_last_seen ON ua_stats(last_seen);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ua_stats_classification ON ua_stats(classification);");

    // تجمیع دقیقه‌ای ترافیک (Human/Bot/Blocked)
    $pdo->exec("CREATE TABLE IF NOT EXISTS ux_traffic_minute (
        ts INTEGER PRIMARY KEY,
        human_req INTEGER NOT NULL DEFAULT 0,
        bot_req INTEGER NOT NULL DEFAULT 0,
        blocked_req INTEGER NOT NULL DEFAULT 0,
        human_bytes INTEGER NOT NULL DEFAULT 0,
        bot_bytes INTEGER NOT NULL DEFAULT 0,
        blocked_bytes INTEGER NOT NULL DEFAULT 0
    );");

    // نمونه‌برداری شبکه از /proc/net/dev (کم‌سربار)
    $pdo->exec("CREATE TABLE IF NOT EXISTS ux_net_samples (
        ts INTEGER PRIMARY KEY,
        iface TEXT NOT NULL,
        rx_bytes INTEGER NOT NULL,
        tx_bytes INTEGER NOT NULL,
        rx_kbps REAL NOT NULL,
        tx_kbps REAL NOT NULL
    );");

    // جدول آمار ردیس برای نمایش در پنل
    $pdo->exec("CREATE TABLE IF NOT EXISTS ux_redis_stats (
        ts INTEGER PRIMARY KEY,
        used_memory INTEGER NOT NULL,
        hits INTEGER NOT NULL,
        misses INTEGER NOT NULL,
        keys INTEGER NOT NULL
    );");
}

/**
 * گرفتن اتصال PDO به SQLite (به صورت singleton)
 */
function ux_storage_pdo(): PDO
{
    if (!ux_storage_sqlite_available()) {
        throw new RuntimeException('pdo_sqlite extension is not available; SQLite storage is disabled.');
    }
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dbPath = ux_storage_db_path();
    // Log the DB path once for debugging. Controlled via configuration to reduce log noise.
    static $loggedDbPath = false;
    // Determine whether to log the DB path based on config (default false)
    $shouldLogDb = false;
    if (function_exists('ux_get_config')) {
        $cfg = ux_get_config();
        $shouldLogDb = isset($cfg['log_db_path']) ? (bool)$cfg['log_db_path'] : false;
    } elseif (isset($GLOBALS['config'])) {
        $shouldLogDb = isset($GLOBALS['config']['log_db_path']) ? (bool)$GLOBALS['config']['log_db_path'] : false;
    }
    if ($shouldLogDb && !$loggedDbPath) {
        error_log('ux_storage_pdo using DB path: ' . $dbPath);
        $loggedDbPath = true;
    }

    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Suggested performance settings
        $pdo->exec("PRAGMA journal_mode = WAL;");
        $pdo->exec("PRAGMA synchronous = NORMAL;");

        // Run integrity check to detect a corrupted database. If the result is not 'ok',
        // the SQLite file is likely malformed. In that case, back up the file and
        // create a fresh database to avoid persistent errors. See issue: malformed database disk image.
        try {
            $check = $pdo->query("PRAGMA integrity_check;")->fetch(PDO::FETCH_NUM);
            $okVal = is_array($check) ? (string)$check[0] : '';
            if (strtolower($okVal) !== 'ok') {
                // Close the current connection to release file handle
                $pdo = null;
                $timestamp = date('Ymd_His');
                $backup = $dbPath . '.corrupt_' . $timestamp;
                // Attempt to back up the corrupt DB; suppress errors if it fails
                @rename($dbPath, $backup);
                error_log('ux_storage_pdo detected a malformed SQLite DB; backed up to ' . $backup . ' and will recreate a new database.');
                // Create a new empty database
                $pdo = new PDO('sqlite:' . $dbPath);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdo->exec("PRAGMA journal_mode = WAL;");
                $pdo->exec("PRAGMA synchronous = NORMAL;");
            }
        } catch (Throwable $ex) {
            // If the integrity check fails (e.g., disk image malformed), attempt recovery
            $pdo = null;
            $timestamp = date('Ymd_His');
            $backup = $dbPath . '.corrupt_' . $timestamp;
            @rename($dbPath, $backup);
            error_log('ux_storage_pdo integrity check failed; backed up corrupt DB to ' . $backup . ' and creating a new database.');
            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec("PRAGMA journal_mode = WAL;");
            $pdo->exec("PRAGMA synchronous = NORMAL;");
        }
    } catch (Throwable $e) {
        error_log('Unixsee Gateway SQLite error: ' . $e->getMessage());
        throw $e;
    }

    ux_storage_migrate($pdo);

    return $pdo;
}

/**
 * ساخت جداول در صورت نبودن
 */
function ux_storage_migrate(PDO $pdo): void
{
    // سشن‌های فعال (کاربرانی که داخل سایت هستند)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ux_sessions (
            session_id TEXT PRIMARY KEY,
            last_seen  INTEGER NOT NULL
        );
    ");

    // صف انتظار
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ux_queue (
            session_id TEXT PRIMARY KEY,
            joined_at  INTEGER NOT NULL,
            last_seen  INTEGER NOT NULL
        );
    ");

    // زمان‌های انتظار (برای محاسبه میانگین)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ux_wait_times (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at   INTEGER NOT NULL,
            wait_seconds INTEGER NOT NULL
        );
    ");
    // تاریخچه صف هوشمند (برای تحلیل هفتگی/ماهانه)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ux_smart_history (
            ts           INTEGER PRIMARY KEY,
            cpu_percent  INTEGER NOT NULL,
            mem_percent  INTEGER NOT NULL,
            active_count INTEGER NOT NULL,
            queue_count  INTEGER NOT NULL,
            base_max     INTEGER NOT NULL,
            cap          INTEGER NOT NULL
        );
    ");
    // Latency-based smart queue columns (upgrade-safe)
    if (function_exists('ux_sqlite_add_column_if_missing')) {
        ux_sqlite_add_column_if_missing($pdo, 'ux_smart_history', 'lat_p95_ms', 'INTEGER');
        ux_sqlite_add_column_if_missing($pdo, 'ux_smart_history', 'err5xx_pct', 'REAL');
        ux_sqlite_add_column_if_missing($pdo, 'ux_smart_history', 'lat_samples', 'INTEGER');
    }


    // جدول بازدیدهای انسانی (غیر ربات)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            ip TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            path TEXT NOT NULL,
            country TEXT,
            is_bot INTEGER DEFAULT 0
        );
    ");

    // جدول لاگ ربات ها
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bot_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            ip TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            bot_name TEXT,
            result INTEGER,
            path TEXT,
            score INTEGER,
            reasons TEXT,
            classification TEXT,
            verified INTEGER
        );
    ");

    // ستون‌های جدید لاگ ربات‌ها (برای نسخه‌های قدیمی دیتابیس)
    ux_sqlite_add_column_if_missing($pdo, 'bot_logs', 'score', 'INTEGER');
    ux_sqlite_add_column_if_missing($pdo, 'bot_logs', 'reasons', 'TEXT');
    ux_sqlite_add_column_if_missing($pdo, 'bot_logs', 'classification', 'TEXT');
    ux_sqlite_add_column_if_missing($pdo, 'bot_logs', 'verified', 'INTEGER');

    // جدول امتیازدهی ربات/رفتار برای هر IP (Bot Intelligence)
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS bot_scores (\n            ip TEXT PRIMARY KEY,\n            user_agent TEXT,\n            score INTEGER NOT NULL,\n            last_seen INTEGER NOT NULL,\n            last_req_ms INTEGER NOT NULL,\n            rate_estimate REAL NOT NULL DEFAULT 0,\n            created_at INTEGER NOT NULL,\n            updated_at INTEGER NOT NULL\n        );\n    ");

    // ایندکس‌ها برای گزارش‌گیری سریع‌تر (در پنل ادمین)
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_logs_ts ON bot_logs(timestamp);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_logs_ip ON bot_logs(ip);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_scores_score ON bot_scores(score);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_scores_last_seen ON bot_scores(last_seen);");

    // جدول کش اعتبارسنجی DNS برای ربات‌های معروف
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS bot_dns_cache (\n            ip TEXT PRIMARY KEY,\n            hostname TEXT,\n            verified INTEGER NOT NULL,\n            checked_at INTEGER NOT NULL,\n            expires_at INTEGER NOT NULL\n        );\n    ");

    // جدول ثبت تصمیمات هوشمند صف
    // هر تصمیم زمانی ثبت می‌شود که ظرفیت صف هوشمند تغییر می‌کند.
    // فیلدها شامل زمان تصمیم (ts)، ظرفیت قبلی (prev_cap)، ظرفیت جدید (new_cap)،
    // دلایل (reasons)، درصد CPU و حافظه در زمان تصمیم، تعداد کاربران داخل و صف، و ظرفیت پایه هستند.
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS smart_decisions (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            ts INTEGER NOT NULL,\n            prev_cap INTEGER NOT NULL,\n            new_cap INTEGER NOT NULL,\n            reasons TEXT NOT NULL,\n            cpu_percent INTEGER,\n            mem_percent INTEGER,\n            active_count INTEGER,\n            queue_count INTEGER,\n            base_max INTEGER\n        );\n    ");

    // جدول تلاش‌های لاگین (برای مدیریت IP lock)\n    // به جای ذخیره در ux_login_attempts.json، این جدول تعداد تلاش و زمان قفل را برای هر IP نگهداری می‌کند.\n    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS login_attempts (\n            ip TEXT PRIMARY KEY,\n            count INTEGER NOT NULL,\n            locked_until INTEGER NOT NULL,\n            updated_at INTEGER NOT NULL\n        );\n    ");

    // جدول ثبت بازدیدها (انسان و ربات) برای آنالیتیکس پیشرفته\n    // این جدول می‌تواند برای هر بازدید HTTP یک رکورد با مشخصات زمان (ts)، آی‌پی، یوزر اجنت،\n    // مسیر درخواست، نشانه ربات بودن و کد وضعیت HTTP ثبت کند.\n    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS ux_visits (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            ts INTEGER NOT NULL,\n            ip TEXT NOT NULL,\n            ua TEXT NOT NULL,\n            path TEXT NOT NULL,\n            is_bot INTEGER NOT NULL DEFAULT 0,\n            status_code INTEGER NOT NULL DEFAULT 200\n        );\n    ");
    // ستون‌های تکمیلی برای جدول ux_visits (برای سازگاری و آنالیتیکس دقیق‌تر)
    if (function_exists('ux_sqlite_add_column_if_missing')) {
        ux_sqlite_add_column_if_missing($pdo, 'ux_visits', 'blocked', 'INTEGER NOT NULL DEFAULT 0');
        ux_sqlite_add_column_if_missing($pdo, 'ux_visits', 'bytes', 'INTEGER NOT NULL DEFAULT 0');
    }

    
    // Latency samples (used by latency-based smart queue; low sample rate)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ux_latency (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            ms INTEGER NOT NULL,
            status INTEGER NOT NULL
        );
    " );
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ux_latency_ts ON ux_latency(ts);");

// جدول بلاک‌ها (Auto/Manual) – ایزوله و قابل Audit با TTL
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS bot_blocks (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            type TEXT NOT NULL,\n            value TEXT NOT NULL,\n            reason TEXT,\n            source TEXT NOT NULL DEFAULT 'manual',\n            expires_at INTEGER,\n            hits INTEGER NOT NULL DEFAULT 0,\n            active INTEGER NOT NULL DEFAULT 1,\n            created_at INTEGER NOT NULL,\n            updated_at INTEGER NOT NULL\n        );\n    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_blocks_lookup ON bot_blocks(type, value, active);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_blocks_expires ON bot_blocks(expires_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_blocks_created ON bot_blocks(created_at);");

    // جدول Strike ها برای Auto-Block (Strikes-based)
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS bot_strikes (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            type TEXT NOT NULL,\n            value TEXT NOT NULL,\n            ts INTEGER NOT NULL,\n            score INTEGER,\n            reasons TEXT,\n            created_at INTEGER NOT NULL\n        );\n    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bot_strikes_lookup ON bot_strikes(type, value, ts);");


}

/* ============================================================
 * سشن‌های فعال (جایگزین ux_campaign_sessions.json)
 * ============================================================ */

/**
 * خواندن سشن‌های فعال از دیتابیس
 * خروجی همان ساختار قبل است: [session_id => last_seen_timestamp]
 */
function ux_get_active_sessions(): array
{
    global $config;

    // If Redis is enabled and available, read sessions from Redis
    $redis = ux_redis_client();
    if ($redis instanceof Redis) {
        $now      = time();
        $lifetime = isset($config['session_lifetime']) ? (int)$config['session_lifetime'] : 120;
        if ($lifetime < 30) {
            $lifetime = 30;
        }
        $minTime = $now - $lifetime;
        try {
            // Remove expired sessions in a single call for efficiency
            $redis->zRemRangeByScore('ux_sessions', '-inf', (string)$minTime);
            // Get all current sessions with their last_seen timestamps
            $assoc = $redis->zRange('ux_sessions', 0, -1, true);
            $sessions = [];
            foreach ($assoc as $sid => $score) {
                $sessions[(string)$sid] = (int)$score;
            }
            return $sessions;
        } catch (Throwable $e) {
            error_log('ux_get_active_sessions (Redis) failed: ' . $e->getMessage());
            // fall back to SQLite if Redis operations fail
        }
    }

    // Fallback to SQLite
    $pdo = ux_storage_pdo();

    $now      = time();
    $lifetime = isset($config['session_lifetime']) ? (int)$config['session_lifetime'] : 120;
    if ($lifetime < 30) {
        $lifetime = 30;
    }

    $minTime = $now - $lifetime;

    // پاک‌سازی سشن‌های منقضی‌شده
    $stmt = $pdo->prepare("DELETE FROM ux_sessions WHERE last_seen < :minTime");
    $stmt->execute([':minTime' => $minTime]);

    // خواندن سشن‌های فعلی
    $stmt = $pdo->query("SELECT session_id, last_seen FROM ux_sessions");
    $sessions = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $sid = (string)$row['session_id'];
        $ts  = (int)$row['last_seen'];
        $sessions[$sid] = $ts;
    }

    return $sessions;
}

/**
 * ذخیره سشن‌های فعال در دیتابیس
 * مثل نسخه JSON، کل وضعیت را یکجا ذخیره می‌کنیم.
 */
function ux_save_active_sessions(array $sessions): void
{
    // If Redis is enabled, persist sessions to Redis instead of SQLite.
    $redis = ux_redis_client();
    if ($redis instanceof Redis) {
        try {
            // Use PIPELINE to reduce RTT; prefer UNLINK (non-blocking) when available.
            $redis->multi(Redis::PIPELINE);
            if (method_exists($redis, 'unlink')) {
                $redis->unlink('ux_sessions');
            } else {
                $redis->del('ux_sessions');
            }
            if (!empty($sessions)) {
                foreach ($sessions as $sid => $last_seen) {
                    $redis->zAdd('ux_sessions', (int)$last_seen, (string)$sid);
                }
            }
            $redis->exec();
        } catch (Throwable $e) {
            error_log('ux_save_active_sessions (Redis) failed: ' . $e->getMessage());
        }
        return;
    }

    // Fallback to SQLite
    $pdo = ux_storage_pdo();
    try {
        $pdo->beginTransaction();
        // پاک کردن وضعیت قبلی
        $pdo->exec("DELETE FROM ux_sessions");
        if (!empty($sessions)) {
            $stmt = $pdo->prepare("INSERT INTO ux_sessions (session_id, last_seen) VALUES (:sid, :last_seen)");
            foreach ($sessions as $sid => $last_seen) {
                $stmt->execute([
                    ':sid'       => (string)$sid,
                    ':last_seen' => (int)$last_seen,
                ]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('ux_save_active_sessions failed: ' . $e->getMessage());
    }
}

/* ============================================================
 * صف انتظار (جایگزین ux_campaign_queue.json)
 * ساختار خروجی: [session_id => ['joined_at' => ..., 'last_seen' => ...]]
 * ============================================================ */

function ux_get_queue_sessions(): array
{
    global $config;

    // If Redis is enabled, retrieve queue from Redis
    $redis = ux_redis_client();
    if ($redis instanceof Redis) {
        $now      = time();
        $lifetime = isset($config['session_lifetime']) ? (int)$config['session_lifetime'] : 120;
        if ($lifetime < 30) {
            $lifetime = 30;
        }
        $minTime = $now - $lifetime;
        try {
            // Identify and remove stale queue entries based on last_seen
            $expired = $redis->zRangeByScore('ux_queue_last_seen', '-inf', (string)$minTime);
            if (!empty($expired)) {
                // Remove expired members from both sets in a single call per set
                // zRem accepts multiple members as varargs
                $redis->zRem('ux_queue_last_seen', ...$expired);
                $redis->zRem('ux_queue', ...$expired);
            }
            // Get queue entries (session_id => joined_at)
            $joined = $redis->zRange('ux_queue', 0, -1, true);
            $last   = $redis->zRange('ux_queue_last_seen', 0, -1, true);
            $queue = [];
            foreach ($joined as $sid => $joined_at) {
                $last_seen = isset($last[$sid]) ? (int)$last[$sid] : (int)$joined_at;
                $queue[(string)$sid] = [
                    'joined_at' => (int)$joined_at,
                    'last_seen' => $last_seen,
                ];
            }
            return $queue;
        } catch (Throwable $e) {
            error_log('ux_get_queue_sessions (Redis) failed: ' . $e->getMessage());
            // fall back to SQLite
        }
    }

    // Fallback to SQLite
    $pdo = ux_storage_pdo();

    $now      = time();
    $lifetime = isset($config['session_lifetime']) ? (int)$config['session_lifetime'] : 120;
    if ($lifetime < 30) {
        $lifetime = 30;
    }
    $minTime = $now - $lifetime;
    // حذف کسانی که مدت زیادی است صفحه صف را رفرش نکرده‌اند
    $stmt = $pdo->prepare("DELETE FROM ux_queue WHERE last_seen < :minTime");
    $stmt->execute([':minTime' => $minTime]);
    // خواندن صف فعلی
    $stmt = $pdo->query("SELECT session_id, joined_at, last_seen FROM ux_queue");
    $queue = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $sid       = (string)$row['session_id'];
        $joined_at = (int)$row['joined_at'];
        $last_seen = (int)$row['last_seen'];
        $queue[$sid] = [
            'joined_at' => $joined_at,
            'last_seen' => $last_seen,
        ];
    }
    return $queue;
}

/**
 * ذخیره صف انتظار در دیتابیس
 * این تابع هم مثل نسخه JSON کل وضعیت صف را یکجا بازنویسی می‌کند.
 */
function ux_save_queue_sessions(array $queue): void
{
    // When Redis is enabled, write queue and last_seen sets into Redis
    $redis = ux_redis_client();
    if ($redis instanceof Redis) {
        try {
            $redis->multi(Redis::PIPELINE);
            // Clear existing queue data (prefer UNLINK to avoid blocking)
            if (method_exists($redis, 'unlink')) {
                $redis->unlink('ux_queue');
                $redis->unlink('ux_queue_last_seen');
            } else {
                $redis->del('ux_queue');
                $redis->del('ux_queue_last_seen');
            }
            if (!empty($queue)) {
                foreach ($queue as $sid => $info) {
                    $joined_at = isset($info['joined_at']) ? (int)$info['joined_at'] : time();
                    $last_seen = isset($info['last_seen']) ? (int)$info['last_seen'] : $joined_at;
                    $redis->zAdd('ux_queue', $joined_at, (string)$sid);
                    $redis->zAdd('ux_queue_last_seen', $last_seen, (string)$sid);
                }
            }
            $redis->exec();
        } catch (Throwable $e) {
            error_log('ux_save_queue_sessions (Redis) failed: ' . $e->getMessage());
        }
        return;
    }
    // Fallback to SQLite
    $pdo = ux_storage_pdo();
    try {
        $pdo->beginTransaction();
        // پاک کردن وضعیت قبلی
        $pdo->exec("DELETE FROM ux_queue");
        if (!empty($queue)) {
            $stmt = $pdo->prepare("INSERT INTO ux_queue (session_id, joined_at, last_seen) VALUES (:sid, :joined_at, :last_seen)");
            foreach ($queue as $sid => $info) {
                $joined_at = isset($info['joined_at']) ? (int)$info['joined_at'] : time();
                $last_seen = isset($info['last_seen']) ? (int)$info['last_seen'] : $joined_at;
                $stmt->execute([
                    ':sid'       => (string)$sid,
                    ':joined_at' => $joined_at,
                    ':last_seen' => $last_seen,
                ]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('ux_save_queue_sessions failed: ' . $e->getMessage());
    }
}

/* ============================================================
 * آمار زمان انتظار (جایگزین ux_campaign_wait_times.json)
 * ============================================================ */

function ux_log_wait_time(int $seconds): void
{
    $now = time();
    $sec = max(0, (int)$seconds);

    // Prefer Redis for high-throughput wait time tracking (no SQLite locks).
    $redis = function_exists('ux_redis_client') ? ux_redis_client() : null;
    if ($redis instanceof Redis) {
        try {
            $bucket = (int)floor($now / 60); // per-minute
            $sumKey = 'ux_wait:sum:' . $bucket;
            $cntKey = 'ux_wait:cnt:' . $bucket;
            $ttl = 7200; // keep 2h so last-hour window is always available
            $redis->multi(Redis::PIPELINE);
            $redis->incrBy($sumKey, $sec);
            $redis->expire($sumKey, $ttl);
            $redis->incr($cntKey);
            $redis->expire($cntKey, $ttl);
            $redis->exec();
            return;
        } catch (Throwable $e) {
            // fall back to SQLite
        }
    }

    // SQLite fallback
    $pdo = ux_storage_pdo();
    try {
        $stmt = $pdo->prepare("INSERT INTO ux_wait_times (created_at, wait_seconds) VALUES (:created_at, :wait_seconds)");
        $stmt->execute([':created_at' => $now, ':wait_seconds' => $sec]);
        $cleanup = $pdo->prepare("DELETE FROM ux_wait_times WHERE created_at < :cutoff");
        $cleanup->execute([':cutoff' => $now - 3600]);
    } catch (Throwable $e) {
        error_log('ux_log_wait_time failed: ' . $e->getMessage());
    }
}

/**
 * میانگین زمان انتظار (در ثانیه) طی حدود ۱ ساعت اخیر
 */
function ux_get_average_wait_time(): ?int
{
    $now = time();

    // Prefer Redis (aggregated per-minute buckets)
    $redis = function_exists('ux_redis_client') ? ux_redis_client() : null;
    if ($redis instanceof Redis) {
        try {
            $curBucket = (int)floor($now / 60);
            $sumKeys = [];
            $cntKeys = [];
            for ($b = $curBucket; $b > $curBucket - 60; $b--) {
                $sumKeys[] = 'ux_wait:sum:' . $b;
                $cntKeys[] = 'ux_wait:cnt:' . $b;
            }

            $redis->multi(Redis::PIPELINE);
            foreach ($sumKeys as $k) {
                $redis->get($k);
            }
            foreach ($cntKeys as $k) {
                $redis->get($k);
            }
            $vals = $redis->exec();
            if (!is_array($vals)) {
                return null;
            }

            $sum = 0;
            $cnt = 0;
            $i = 0;
            foreach ($sumKeys as $_) {
                $sum += (int)($vals[$i] ?? 0);
                $i++;
            }
            foreach ($cntKeys as $_) {
                $cnt += (int)($vals[$i] ?? 0);
                $i++;
            }

            if ($cnt < 1) {
                return null;
            }
            return (int)round($sum / $cnt);
        } catch (Throwable $e) {
            // fall back to SQLite
        }
    }

    // SQLite fallback
    $pdo = ux_storage_pdo();
    try {
        $stmt = $pdo->prepare("SELECT AVG(wait_seconds) AS avg_wait FROM ux_wait_times WHERE created_at >= :cutoff");
        $stmt->execute([':cutoff' => $now - 3600]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || $row['avg_wait'] === null) {
            return null;
        }
        return (int)round((float)$row['avg_wait']);
    } catch (Throwable $e) {
        error_log('ux_get_average_wait_time failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * تبدیل ثانیه به متن خوانا (همان نسخه قبلی)
 */
function ux_format_duration(int $seconds): string
{
    if ($seconds < 60) {
        return $seconds . ' ثانیه';
    }

    $minutes = (int) floor($seconds / 60);
    $rem     = $seconds % 60;

    if ($minutes < 60) {
        if ($rem < 10) {
            return $minutes . ' دقیقه';
        }
        return $minutes . ' دقیقه و ' . $rem . ' ثانیه';
    }

    $hours   = (int) floor($minutes / 60);
    $minutes = $minutes % 60;

    if ($minutes === 0) {
        return $hours . ' ساعت';
    }

    return $hours . ' ساعت و ' . $minutes . ' دقیقه';
}

/**
 * اطلاعات تقریبی فشار سرور (load average بر اساس تعداد هسته‌ها)
 */
function ux_get_server_load_info(): ?array {
    // از کش فایل استفاده کن تا در فواصل کوتاه (۵ ثانیه) مجددا اندازه‌گیری انجام نشود
    $cacheFile = __DIR__ . '/ux_load_cache.json';
    $now       = time();
    if (is_file($cacheFile)) {
        $json = @file_get_contents($cacheFile);
        $cache = json_decode($json, true);
        if (is_array($cache) && isset($cache['ts'], $cache['info']) && ($now - (int)$cache['ts']) < 5) {
            return $cache['info'];
        }
    }

    // جلوگیری از stampede زیر ترافیک بالا: فقط یک پردازش در هر لحظه اندازه‌گیری سنگین انجام دهد
    $fpLock = @fopen($cacheFile, 'c+');
    if ($fpLock) {
        if (!@flock($fpLock, LOCK_EX | LOCK_NB)) {
            // اگر قفل آزاد نبود، به‌جای بلوکه شدن، اگر چیزی در کش هست برگردان
            @fclose($fpLock);
            if (is_file($cacheFile)) {
                $json2 = @file_get_contents($cacheFile);
                $cache2 = json_decode($json2, true);
                if (is_array($cache2) && isset($cache2['info'])) {
                    return $cache2['info'];
                }
            }
            return null;
        }
    }

    $cpuPercent = null;
    $memPercent = null;
    // load1: 1-minute load average; load5: 5-minute; load15: 15-minute
    $load1      = 0.0;
    $load5      = 0.0;
    $load15     = 0.0;
    $diskPercent = null;

    // تعداد هسته‌ها (اولویت با تنظیمات پنل)
    $cores = 0;
    if (isset($GLOBALS['config']) && is_array($GLOBALS['config'])) {
        $cfgCores = (int)($GLOBALS['config']['server_cpu_cores'] ?? 0);
        if ($cfgCores > 0) {
            $cores = $cfgCores;
        }
    }

    // اگر هنوز مشخص نیست، از nproc کمک می‌گیریم
    if ($cores < 1 && function_exists('shell_exec')) {
        $out = @shell_exec('nproc 2>/dev/null');
        if (is_string($out)) {
            $cores = (int) trim($out);
        }
    }
    if ($cores < 1) {
        $cores = 4;
    }

    // تلاش برای خواندن درصد CPU و RAM از top (در صورت فعال بودن shell_exec)
    if (function_exists('shell_exec') && stripos(PHP_OS, 'WIN') !== 0) {
        $out = @shell_exec('LANG=C top -b -n 1 2>/dev/null | head -5');
        if (is_string($out) && $out !== '') {
            $lines = preg_split('/\r?\n/', trim($out));
            foreach ($lines as $line) {
                $l = trim($line);

                // خط CPU
                if ($cpuPercent === null && (stripos($l, 'Cpu(s):') !== false || stripos($l, '%Cpu(s):') !== false || stripos($l, 'Cpu(s)') !== false)) {
                    if (preg_match('/(\d+(?:\.\d+)?)\s*id/', $l, $m)) {
                        $idle = (float)$m[1];
                        $cpuPercent = (int) round(100 - $idle);
                    }
                }

                // خط RAM
                if ($memPercent === null && (stripos($l, 'KiB Mem') !== false || stripos($l, 'MiB Mem') !== false || stripos($l, 'GiB Mem') !== false || stripos($l, 'Mem :') !== false || stripos($l, 'Mem:') !== false)) {
                    if (preg_match('/Mem[^:]*:\s*([0-9\.]+)\s+total,\s*([0-9\.]+)\s+free,\s*([0-9\.]+)\s+used/', $l, $m)) {
                        $total = (float)$m[1];
                        $used  = (float)$m[3];
                        if ($total > 0) {
                            $memPercent = (int) round(($used / $total) * 100);
                        }
                    }
                }
            }
        }
    }

    // load average برای نمایش و fallback
    // sys_getloadavg سه مقدار میانگین بار را برای ۱، ۵ و ۱۵ دقیقه برمی‌گرداند
    if (function_exists('sys_getloadavg')) {
        $load = @sys_getloadavg();
        if (is_array($load) && count($load) >= 1) {
            $load1 = (float)$load[0];
        }
        if (is_array($load) && count($load) >= 2) {
            $load5 = (float)$load[1];
        }
        if (is_array($load) && count($load) >= 3) {
            $load15 = (float)$load[2];
        }
    }

    // اگر top در دسترس نبود، درصد CPU را تقریبی از روی load/cores می‌گیریم
    if ($cpuPercent === null && $load1 > 0) {
        $ratio      = $load1 / max(1, $cores);
        $cpuPercent = (int) round($ratio * 100);
    }
    if ($cpuPercent === null) {
        $cpuPercent = 0;
    }
    if ($cpuPercent < 0) { $cpuPercent = 0; }
    if ($cpuPercent > 300) { $cpuPercent = 300; }

    // اگر هنوز RAM نداریم، از /proc/meminfo استفاده می‌کنیم (در صورت امکان)
    if ($memPercent === null && @is_readable('/proc/meminfo')) {
        $meminfo = @file('/proc/meminfo');
        $memTotal = $memAvailable = null;
        foreach ($meminfo as $line) {
            if (stripos($line, 'MemTotal:') === 0) {
                $memTotal = (float) filter_var($line, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
            } elseif (stripos($line, 'MemAvailable:') === 0) {
                $memAvailable = (float) filter_var($line, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
            }
        }
        if ($memTotal && $memAvailable !== null) {
            $memPercent = (int) round(100 - ($memAvailable / max(1, $memTotal)) * 100);
        }
    }

    // اگر همچنان مقدار RAM بدست نیامده و shell_exec در دسترس است، از خروجی free -m استفاده می‌کنیم
    // این حالت به عنوان fallback سوم در نظر گرفته شده و ممکن است در برخی توزیع‌ها دقیق‌تر باشد
    if ($memPercent === null && function_exists('shell_exec') && stripos(PHP_OS, 'WIN') !== 0) {
        $out = @shell_exec('free -m 2>/dev/null');
        if (is_string($out) && trim($out) !== '') {
            $linesFree = preg_split('/\r?\n/', trim($out));
            foreach ($linesFree as $l) {
                // ساختار معمول: Mem:  total used free shared buff/cache available
                // ما مجموع و مقدار استفاده شده را می‌گیریم
                if (preg_match('/^Mem:\s+(\d+)\s+(\d+)/', trim($l), $mm)) {
                    $total = (float)$mm[1];
                    $used  = (float)$mm[2];
                    if ($total > 0) {
                        $memPercent = (int) round(($used / $total) * 100);
                    }
                    break;
                }
            }
        }
    }

    // Disk usage (مسیر فعلی اسکریپت)
    $diskPath  = __DIR__;
    $totalDisk = @disk_total_space($diskPath);
    $freeDisk  = @disk_free_space($diskPath);
    if ($totalDisk > 0 && $freeDisk !== false) {
        $diskPercent = (int) round(100 - ($freeDisk / $totalDisk) * 100);
    }
    $info = [
        'load1'          => $load1,
        'load5'          => $load5,
        'load15'         => $load15,
        'cores'          => $cores,
        'percent'        => $cpuPercent,
        'memory_percent' => $memPercent,
        'disk_percent'   => $diskPercent,
    ];

    // اندازه‌گیری تعداد اتصالات شبکه برای درک بهتر از بار همزمان
    // اگر shell_exec فعال است و سیستم ویندوز نیست، تلاش می‌کنیم با ss یا netstat تعداد اتصالات TCP را شمارش کنیم.
    $connCount = null;
    if (function_exists('shell_exec') && stripos(PHP_OS, 'WIN') !== 0) {
        $out = @shell_exec('ss -tan 2>/dev/null | wc -l');
        if (is_string($out) && trim($out) !== '') {
            $connCount = (int) trim($out);
        } else {
            // fallback به netstat در صورت نبود ss
            $out = @shell_exec('netstat -an 2>/dev/null | wc -l');
            if (is_string($out) && trim($out) !== '') {
                $connCount = (int) trim($out);
            }
        }
    }
    if ($connCount !== null) {
        $info['conn_count'] = $connCount;
    }
    // ذخیره در کش برای استفاده در چند ثانیه آینده
    @file_put_contents($cacheFile, json_encode(['ts' => $now, 'info' => $info], JSON_UNESCAPED_UNICODE));

    if (isset($fpLock) && is_resource($fpLock)) { @flock($fpLock, LOCK_UN); @fclose($fpLock); }

    return $info;
}

function ux_get_session_id() {
    $cookie_name = 'ux_campaign_sid';

    if (!empty($_COOKIE[$cookie_name])) {
        $sid = preg_replace('/[^a-zA-Z0-9]/', '', $_COOKIE[$cookie_name]);
        if ($sid !== '') {
            return $sid;
        }
    }

    try {
        $sid = bin2hex(random_bytes(16));
    } catch (Exception $e) {
        $sid = md5(uniqid('ux_', true));
    }

    $expire   = time() + 6 * 3600;
    $path     = '/';
    $domain   = '';
    $secure   = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $httponly = true;

    setcookie($cookie_name, $sid, $expire, $path, $domain, $secure, $httponly);

    return $sid;
}



/* ============================================================
 * تاریخچه صف هوشمند (ux_smart_history)
 * ============================================================ */

/**
 * ثبت یک نمونه از وضعیت صف هوشمند در دیتابیس
 * - برای تحلیل هفتگی/ماهانه و تصمیم‌گیری‌های پیش‌بین
 */
function ux_log_smart_history(int $cpu, int $mem, int $base_max, int $cap, int $active_count, int $queue_count, ?int $lat_p95_ms = null, ?float $err5xx_pct = null, ?int $lat_samples = null): void
{
    try {
        $pdo = ux_storage_pdo();

        // هر ردیف نماینده یک دقیقه است (ts = شروع دقیقه)
        $now    = time();
        $minute = (int)($now / 60) * 60;

        $stmt = $pdo->prepare("
            INSERT OR REPLACE INTO ux_smart_history (
                ts, cpu_percent, mem_percent, active_count, queue_count, base_max, cap, lat_p95_ms, err5xx_pct, lat_samples
            ) VALUES (
                :ts, :cpu, :mem, :active, :queue, :base_max, :cap, :lat_p95_ms, :err5xx_pct, :lat_samples
            )
        ");
        $stmt->execute([
            ':ts'        => $minute,
            ':cpu'       => (int)$cpu,
            ':mem'       => (int)$mem,
            ':active'    => (int)$active_count,
            ':queue'     => (int)$queue_count,
            ':base_max'  => (int)$base_max,
            ':cap'       => (int)$cap,
            ':lat_p95_ms' => ($lat_p95_ms === null ? null : (int)$lat_p95_ms),
            ':err5xx_pct' => ($err5xx_pct === null ? null : (float)$err5xx_pct),
            ':lat_samples'=> ($lat_samples === null ? null : (int)$lat_samples),
        ]);

        // پاک‌سازی ردیف‌های خیلی قدیمی بر اساس تنظیمات نگهداری. حداقل ۳۰ روز.
        // مقدار retention از پیکربندی global گرفته می‌شود تا توسط پنل مدیریت قابل کنترل باشد.
        $retentionDays = 90;
        // استفاده از مقدار موجود در کانفیگ در صورت وجود
        if (isset($GLOBALS['config']) && is_array($GLOBALS['config'])) {
            $days = $GLOBALS['config']['smart_history_retention_days'] ?? 90;
            $days = (int)$days;
            if ($days >= 30) {
                $retentionDays = $days;
            }
        }
        $cutoff = $now - ($retentionDays * 86400);
        $del    = $pdo->prepare("DELETE FROM ux_smart_history WHERE ts < :cutoff");
        $del->execute([':cutoff' => $cutoff]);
    } catch (Throwable $e) {
        error_log('ux_log_smart_history failed: ' . $e->getMessage());
    }
}

/**
 * گرفتن چند نمونهٔ اخیر برای تصمیم‌گیری پیش‌بین
 * @param int $limit حداکثر تعداد نمونه (مثلاً ۶)
 * @return array آرایه‌ای از آخرین نمونه‌ها (جدیدترین در اندیس 0)
 */
function ux_get_smart_recent_samples(int $limit = 6): array
{
    try {
        $pdo = ux_storage_pdo();

        $stmt = $pdo->prepare("
            SELECT ts, cpu_percent, mem_percent, active_count, queue_count, base_max, cap
            FROM ux_smart_history
            ORDER BY ts DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', max(1, (int)$limit), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!is_array($rows)) {
            return [];
        }

        return $rows;
    } catch (Throwable $e) {
        error_log('ux_get_smart_recent_samples failed: ' . $e->getMessage());
        return [];
    }
}

/* ============================================================
 * ثبت و واکشی تصمیمات هوشمند (smart_decisions)
 * ============================================================ */

/**
 * ثبت یک تصمیم هوشمند برای ظرفیت صف.
 * این تابع زمانی فراخوانی می‌شود که الگوریتم ظرفیت هوشمند مقدار جدیدی تعیین می‌کند.
 *
 * @param int    $prevCap    ظرفیت قبلی قبل از تغییر
 * @param int    $newCap     ظرفیت جدید پس از تصمیم
 * @param string $reasons    دلیل/دلایل تغییر (کدهای جدا شده با ویرگول)
 * @param int    $cpu        درصد CPU در زمان تصمیم
 * @param int    $mem        درصد حافظه در زمان تصمیم
 * @param int    $active     تعداد کاربران داخل سایت در زمان تصمیم
 * @param int    $queue      تعداد کاربران در صف انتظار در زمان تصمیم
 * @param int    $baseMax    ظرفیت پایه تعریف‌شده در تنظیمات
 */
function ux_log_smart_decision(int $prevCap, int $newCap, string $reasons, int $cpu, int $mem, int $active, int $queue, int $baseMax): void
{
    try {
        $pdo = ux_storage_pdo();
        $stmt = $pdo->prepare(
            "\n            INSERT INTO smart_decisions (\n                ts, prev_cap, new_cap, reasons, cpu_percent, mem_percent, active_count, queue_count, base_max\n            ) VALUES (\n                :ts, :prev, :new, :reasons, :cpu, :mem, :active, :queue, :base_max\n            )\n        "
        );
        $stmt->execute([
            ':ts'      => time(),
            ':prev'    => $prevCap,
            ':new'     => $newCap,
            ':reasons' => $reasons,
            ':cpu'     => $cpu,
            ':mem'     => $mem,
            ':active'  => $active,
            ':queue'   => $queue,
            ':base_max' => $baseMax,
        ]);

        // پاک‌سازی ردیف‌های قدیمی بر اساس تنظیمات نگهداری. حداقل ۳۰ روز.
        $retentionDays = 90;
        if (isset($GLOBALS['config']) && is_array($GLOBALS['config'])) {
            $days = $GLOBALS['config']['smart_decisions_retention_days'] ?? 90;
            $days = (int)$days;
            if ($days >= 30) {
                $retentionDays = $days;
            }
        }
        $cutoff = time() - ($retentionDays * 86400);
        $del = $pdo->prepare("DELETE FROM smart_decisions WHERE ts < :cutoff");
        $del->execute([':cutoff' => $cutoff]);
    } catch (Throwable $e) {
        error_log('ux_log_smart_decision failed: ' . $e->getMessage());
    }
}

/**
 * واکشی تصمیمات هوشمند ثبت‌شده از یک بازه زمانی مشخص
 *
 * @param int $fromTimestamp
 * @return array لیست تصمیمات به صورت آرایه‌ای از رکوردها
 */
function ux_get_smart_decisions(int $fromTimestamp = 0): array
{
    try {
        $pdo = ux_storage_pdo();
        $stmt = $pdo->prepare(
            "\n            SELECT ts, prev_cap, new_cap, reasons, cpu_percent, mem_percent, active_count, queue_count, base_max\n            FROM smart_decisions\n            WHERE ts >= :from\n            ORDER BY ts DESC\n        "
        );
        $stmt->execute([':from' => $fromTimestamp]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    } catch (Throwable $e) {
        error_log('ux_get_smart_decisions failed: ' . $e->getMessage());
        return [];
    }
}

/**
 * دریافت همه تلاش‌های لاگین از دیتابیس SQLite
 * ساختار خروجی مشابه نسخه JSON است: [ ip => ['count' => n, 'locked_until' => ts, 'updated_at' => ts ] ]
 * اگر جدول خالی باشد، آرایه خالی برمی‌گرداند.
 *
 * @return array
 */
function ux_get_login_attempts_db(): array
{
    try {
        $pdo   = ux_storage_pdo();
        // Ensure the login_attempts table exists before querying it
        ux_ensure_login_attempts_table($pdo);
        $stmt  = $pdo->query("SELECT ip, count, locked_until, updated_at FROM login_attempts");
        $rows  = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out   = [];
        foreach ($rows as $row) {
            $ip              = (string)$row['ip'];
            $out[$ip]        = [
                'count'        => (int)$row['count'],
                'locked_until' => (int)$row['locked_until'],
                'updated_at'   => (int)$row['updated_at'],
            ];
        }
        return $out;
    } catch (Throwable $e) {
        error_log('ux_get_login_attempts_db failed: ' . $e->getMessage());
        return [];
    }
}

/**
 * گرفتن اطلاعات تلاش لاگین برای یک IP خاص از دیتابیس
 * اگر وجود نداشته باشد null برمی‌گرداند.
 *
 * @param string $ip
 * @return array|null
 */
function ux_get_login_attempt_db(string $ip): ?array
{
    try {
        $pdo  = ux_storage_pdo();
        // Ensure the login_attempts table exists before querying it
        ux_ensure_login_attempts_table($pdo);
        $stmt = $pdo->prepare("SELECT count, locked_until, updated_at FROM login_attempts WHERE ip = :ip LIMIT 1");
        $stmt->execute([':ip' => $ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return [
                'count'        => (int)$row['count'],
                'locked_until' => (int)$row['locked_until'],
                'updated_at'   => (int)$row['updated_at'],
            ];
        }
        return null;
    } catch (Throwable $e) {
        error_log('ux_get_login_attempt_db failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * ذخیره یک رکورد تلاش لاگین برای IP مشخص
 * اگر رکورد وجود داشته باشد، به روزرسانی می‌کند؛ در غیر این صورت درج می‌کند.
 *
 * @param string $ip
 * @param int    $count
 * @param int    $lockedUntil
 */
function ux_set_login_attempt_db(string $ip, int $count, int $lockedUntil): void
{
    try {
        $pdo  = ux_storage_pdo();
        // Ensure the login_attempts table exists before inserting/updating
        ux_ensure_login_attempts_table($pdo);
        $stmt = $pdo->prepare(
            "INSERT INTO login_attempts (ip, count, locked_until, updated_at)\n             VALUES (:ip, :cnt, :lock_until, :updated)\n             ON CONFLICT(ip) DO UPDATE SET\n                 count = excluded.count,\n                 locked_until = excluded.locked_until,\n                 updated_at = excluded.updated_at"
        );
        $stmt->execute([
            ':ip'        => $ip,
            ':cnt'       => $count,
            ':lock_until' => $lockedUntil,
            ':updated'   => time(),
        ]);
    } catch (Throwable $e) {
        error_log('ux_set_login_attempt_db failed: ' . $e->getMessage());
    }
}

/**
 * ذخیره یک بازدید HTTP در جدول ux_visits.
 * این تابع برای ثبت بازدیدهای ربات و انسان همراه با کد وضعیت HTTP استفاده می‌شود.
 *
 * @param bool $isBot      آیا بازدید کننده ربات است؟ true برای ربات، false برای انسان.
 * @param int  $statusCode کد وضعیت HTTP (به طور پیش‌فرض 200)
 * @return void
 */
function ux_storage_log_visit(bool $isBot, int $statusCode = 200, int $blocked = 0, int $bytes = 0): void
{
    if (!ux_storage_sqlite_available()) {
        return;
    }
    // Determine which PDO to use. We prefer the analytics database for visit logging.
    if (function_exists('ux_storage_analytics_pdo')) {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            try { ux_storage_analytics_migrate($pdo); } catch (Throwable $e) { /* ignore */ }
        }
    } else {
        $pdo = ux_storage_pdo();
        if (function_exists('ux_storage_migrate')) {
            try { ux_storage_migrate($pdo); } catch (Throwable $e) { /* ignore */ }
        }
    }

    $now  = time();
    $ip   = function_exists('ux_get_user_ip') ? ux_get_user_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $ua   = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $path = (string)($_SERVER['REQUEST_URI'] ?? '');

    try {
        // Detect optional columns once for performance.
        static $hasBlocked = null;
        static $hasBytes   = null;
        if ($hasBlocked === null) {
            $hasBlocked = function_exists('ux_sqlite_column_exists') ? ux_sqlite_column_exists($pdo, 'ux_visits', 'blocked') : false;
        }
        if ($hasBytes === null) {
            $hasBytes = function_exists('ux_sqlite_column_exists') ? ux_sqlite_column_exists($pdo, 'ux_visits', 'bytes') : false;
        }

        $columns = ['ts','ip','ua','path','is_bot','status_code'];
        $values  = [':ts',':ip',':ua',':path',':is_bot',':status_code'];
        $params  = [
            ':ts' => $now,
            ':ip' => $ip,
            ':ua' => $ua,
            ':path' => $path,
            ':is_bot' => $isBot ? 1 : 0,
            ':status_code' => (int)$statusCode,
        ];

        if ($hasBlocked) {
            $columns[] = 'blocked';
            $values[]  = ':blocked';
            $params[':blocked'] = (int)$blocked;
        }
        if ($hasBytes) {
            $columns[] = 'bytes';
            $values[]  = ':bytes';
            $params[':bytes'] = max(0, (int)$bytes);
        }

        $sql = "INSERT INTO ux_visits (" . implode(',', $columns) . ") VALUES (" . implode(',', $values) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (Throwable $e) {
        // Ignore logging errors to avoid breaking the gateway.
        error_log('ux_storage_log_visit failed: ' . $e->getMessage());
    }
}

/**
 * ثبت آمار جاری ردیس در پایگاه داده آنالیتیکس.
 *
 * این تابع با استفاده از ux_redis_client وضعیت فعلی ردیس را نمونه‌برداری می‌کند،
 * شامل حافظه مصرفی، تعداد هیت و میس و تعداد کلیدهای موجود در دیتابیس انتخاب‌شده.
 * مقادیر به جدول ux_redis_stats در پایگاه داده آنالیتیکس وارد یا به‌روزرسانی می‌شود.
 * در صورتی که ردیس فعال نباشد یا دسترسی وجود نداشته باشد، عملیات انجام نمی‌شود.
 *
 * @return void
 */
function ux_log_redis_stat(): void
{
    $redis = ux_redis_client();
    if (!($redis instanceof Redis)) {
        return;
    }
    try {
        $info = $redis->info();
        $used   = 0;
        $hits   = 0;
        $misses = 0;
        // پشتیبانی از نسخه‌های مختلف phpRedis: مقادیر ممکن است در سطح اول یا بخش‌های جداگانه باشند
        if (isset($info['used_memory'])) {
            $used = (int) $info['used_memory'];
        } elseif (isset($info['Memory']['used_memory'])) {
            $used = (int) $info['Memory']['used_memory'];
        }
        if (isset($info['keyspace_hits'])) {
            $hits = (int) $info['keyspace_hits'];
        } elseif (isset($info['Stats']['keyspace_hits'])) {
            $hits = (int) $info['Stats']['keyspace_hits'];
        }
        if (isset($info['keyspace_misses'])) {
            $misses = (int) $info['keyspace_misses'];
        } elseif (isset($info['Stats']['keyspace_misses'])) {
            $misses = (int) $info['Stats']['keyspace_misses'];
        }
        $keys = 0;
        try {
            $keys = (int) $redis->dbSize();
        } catch (Throwable $e) {
            $keys = 0;
        }
        $ts = time();
        $pdo = function_exists('ux_storage_analytics_pdo') ? ux_storage_analytics_pdo() : ux_storage_pdo();
        // اطمینان از وجود جدول
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ux_redis_stats (ts INTEGER PRIMARY KEY, used_memory INTEGER NOT NULL, hits INTEGER NOT NULL, misses INTEGER NOT NULL, keys INTEGER NOT NULL);");
        }
        $stmt = $pdo->prepare("INSERT OR REPLACE INTO ux_redis_stats (ts, used_memory, hits, misses, keys) VALUES (:ts, :used, :hits, :misses, :keys)");
        $stmt->execute([
            ':ts'     => $ts,
            ':used'   => $used,
            ':hits'   => $hits,
            ':misses' => $misses,
            ':keys'   => $keys,
        ]);
    } catch (Throwable $e) {
        error_log('ux_log_redis_stat failed: ' . $e->getMessage());
    }
}

/**
 * بازیابی آمارهای اخیر ردیس برای ترسیم نمودار.
 *
 * @param int $limit حداکثر تعداد نقاط داده که باید بازگردانده شود (به طور پیش‌فرض ۴۸).
 * @return array آرایه‌ای از رکوردها شامل ts، used_memory، hits، misses و keys به ترتیب زمانی صعودی.
 */
function ux_get_redis_stats(int $limit = 48): array
{
    try {
        $pdo = function_exists('ux_storage_analytics_pdo') ? ux_storage_analytics_pdo() : ux_storage_pdo();
        // اطمینان از وجود جدول
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }
        $limit = max(1, (int) $limit);
        $stmt = $pdo->prepare("SELECT ts, used_memory, hits, misses, keys FROM ux_redis_stats ORDER BY ts DESC LIMIT :lim");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($rows)) {
            return [];
        }
        // بازگشت بر اساس ترتیب زمانی صعودی برای نمودار
        return array_reverse($rows);
    } catch (Throwable $e) {
        error_log('ux_get_redis_stats failed: ' . $e->getMessage());
        return [];
    }
}

/**
 * ------------------------------
 * Admin-only Redis observability
 * (Health / Prefix Monitor / Command Load)
 * ------------------------------
 * These helpers are used by the admin panel to provide production-safe visibility
 * without impacting the hot-path gateway decisions.
 */

function ux_admin_cache_get(string $key)
{
    // Prefer APCu when available (fast, in-memory per PHP-FPM worker)
    if (function_exists('apcu_fetch') && ini_get('apc.enabled')) {
        $success = false;
        $val = apcu_fetch($key, $success);
        return $success ? $val : null;
    }
    $file = sys_get_temp_dir() . '/uxgw_admin_cache_' . sha1($key) . '.json';
    if (!is_file($file)) return null;
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['expires_at'])) return null;
    if ((int)$data['expires_at'] < time()) {
        @unlink($file);
        return null;
    }
    return $data['value'] ?? null;
}

function ux_admin_cache_set(string $key, $value, int $ttlSeconds = 30): void
{
    $ttlSeconds = max(1, $ttlSeconds);
    if (function_exists('apcu_store') && ini_get('apc.enabled')) {
        @apcu_store($key, $value, $ttlSeconds);
        return;
    }
    $file = sys_get_temp_dir() . '/uxgw_admin_cache_' . sha1($key) . '.json';
    $payload = [
        'expires_at' => time() + $ttlSeconds,
        'value' => $value,
    ];
    @file_put_contents($file, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/**
 * Create a dedicated Redis client for admin metrics:
 * - Non-persistent (avoids sharing state with WordPress object-cache)
 * - No key-prefix applied (so we can SCAN for the real prefixed keys)
 */
function ux_redis_admin_client(): ?Redis
{
    global $config;
    if (empty($config['redis_enabled'])) return null;

    $host  = (string)($config['redis_host'] ?? '127.0.0.1');
    $port  = (int)($config['redis_port'] ?? 6379);
    $db    = (int)($config['redis_db'] ?? 0);
    $pass  = (string)($config['redis_password'] ?? '');
    $ct    = (float)($config['redis_connect_timeout'] ?? 0.5);
    $rt    = (float)($config['redis_read_timeout'] ?? 1.0);

    try {
        $r = new Redis();
        $isUnix = ($host !== '' && $host[0] === '/');
        // Non-persistent connection on purpose
        $r->connect($host, $isUnix ? 0 : $port, $ct, null, 0, $rt);
        if ($pass !== '') $r->auth($pass);
        $r->select($db);
        if (defined('Redis::OPT_READ_TIMEOUT')) {
            $r->setOption(Redis::OPT_READ_TIMEOUT, $rt);
        }
        // No prefix, no serializer
        if (defined('Redis::OPT_PREFIX')) $r->setOption(Redis::OPT_PREFIX, '');
        if (defined('Redis::OPT_SERIALIZER')) $r->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_NONE);
        return $r;
    } catch (Throwable $e) {
        error_log('Unixsee Gateway: Redis admin client failed: ' . $e->getMessage());
        return null;
    }
}

function ux_get_redis_health_metrics(): array
{
    global $config;
    $r = ux_redis_admin_client();
    $db = (int)($config['redis_db'] ?? 0);

    $warnLatencyMs = (int)($config['redis_health_latency_warn_ms'] ?? 20);
    $warnMemPct    = (int)($config['redis_health_memory_warn_pct'] ?? 85);
    $critMemPct    = (int)($config['redis_health_memory_crit_pct'] ?? 95);

    if (!($r instanceof Redis)) {
        return [
            'status' => 'down',
            'db' => $db,
            'message' => 'Redis unreachable',
        ];
    }

    $warnings = [];
    $latMs = null;

    try {
        $t0 = microtime(true);
        // Some Redis servers respond with "+PONG" or "PONG"
        $r->ping();
        $latMs = (microtime(true) - $t0) * 1000.0;
        if ($latMs > $warnLatencyMs) {
            $warnings[] = 'high_latency';
        }
    } catch (Throwable $e) {
        return [
            'status' => 'down',
            'db' => $db,
            'message' => 'Redis ping failed',
        ];
    }

    $info = [];
    try {
        $info = $r->info();
    } catch (Throwable $e) {
        // Still return ping latency at least
        $info = [];
        $warnings[] = 'info_failed';
    }

    // Normalize across phpredis versions: values may be flat or sectioned
    $used = (int)($info['used_memory'] ?? ($info['Memory']['used_memory'] ?? 0));
    $max  = (int)($info['maxmemory'] ?? ($info['Memory']['maxmemory'] ?? 0));
    $clients = (int)($info['connected_clients'] ?? ($info['Clients']['connected_clients'] ?? 0));
    $blocked = (int)($info['blocked_clients'] ?? ($info['Clients']['blocked_clients'] ?? 0));
    $ops     = (int)($info['instantaneous_ops_per_sec'] ?? ($info['Stats']['instantaneous_ops_per_sec'] ?? 0));
    $evicted = (int)($info['evicted_keys'] ?? ($info['Stats']['evicted_keys'] ?? 0));
    $role    = (string)($info['role'] ?? ($info['Replication']['role'] ?? ''));

    $memPct = null;
    if ($max > 0) {
        $memPct = ($used / $max) * 100.0;
        if ($memPct >= $warnMemPct) $warnings[] = 'high_memory';
        if ($memPct >= $critMemPct) $warnings[] = 'critical_memory';
    }

    if ($blocked > 0) $warnings[] = 'blocked_clients';
    if ($evicted > 0) $warnings[] = 'evictions';

    $status = 'ok';
    if (in_array('critical_memory', $warnings, true)) {
        $status = 'crit';
    } elseif (!empty($warnings)) {
        $status = 'warn';
    }

    return [
        'status' => $status,
        'db' => $db,
        'latency_ms' => $latMs,
        'used_memory' => $used,
        'maxmemory' => $max,
        'memory_pct' => $memPct,
        'clients' => $clients,
        'blocked_clients' => $blocked,
        'ops_per_sec' => $ops,
        'evicted_keys' => $evicted,
        'role' => $role,
        'warnings' => $warnings,
    ];
}

/**
 * Prefix monitor: estimates key-count, expire ratio, avg TTL, and optional memory usage
 * for THIS gateway namespace only.
 *
 * IMPORTANT: This runs only in the admin panel polling endpoint.
 */
function ux_get_redis_prefix_metrics(int $maxKeys = 5000, int $timeBudgetMs = 120, int $memorySampleKeys = 200): array
{
    global $config;
    $prefix = (string)($config['redis_prefix'] ?? 'uxgw:');
    $db = (int)($config['redis_db'] ?? 0);

    $r = ux_redis_admin_client();
    if (!($r instanceof Redis)) {
        return [
            'db' => $db,
            'prefix' => $prefix,
            'status' => 'down',
        ];
    }

    $maxKeys = max(10, $maxKeys);
    $timeBudgetMs = max(20, $timeBudgetMs);

    $cursor = 0;
    $keys = [];
    $t0 = microtime(true);

    try {
        do {
            $batch = [];
            // phpredis SCAN signature: scan(&$it, $pattern, $count)
            $batch = $r->scan($cursor, $prefix . '*', 500);
            if ($batch === false) $batch = [];
            foreach ($batch as $k) {
                $keys[] = $k;
                if (count($keys) >= $maxKeys) break 2;
            }
            $elapsedMs = (microtime(true) - $t0) * 1000.0;
            if ($elapsedMs >= $timeBudgetMs) break;
        } while ($cursor !== 0);
    } catch (Throwable $e) {
        return [
            'db' => $db,
            'prefix' => $prefix,
            'status' => 'error',
            'message' => 'SCAN failed',
        ];
    }

    $complete = ($cursor === 0) && (count($keys) < $maxKeys) && (((microtime(true) - $t0) * 1000.0) < $timeBudgetMs);
    $sampled  = !$complete;

    $total = count($keys);
    if ($total === 0) {
        return [
            'db' => $db,
            'prefix' => $prefix,
            'status' => 'ok',
            'keys' => 0,
            'sampled' => false,
            'expires_pct' => 0,
            'avg_ttl_seconds' => null,
            'memory_bytes' => 0,
        ];
    }

    // TTL stats (pipelined)
    $expiring = 0;
    $ttlSum = 0;
    $ttlCount = 0;

    try {
        $r->multi(Redis::PIPELINE);
        foreach ($keys as $k) {
            $r->ttl($k);
        }
        $ttls = $r->exec();
        if (!is_array($ttls)) $ttls = [];
        foreach ($ttls as $ttl) {
            $ttl = (int)$ttl;
            if ($ttl >= 0) {
                $expiring++;
                $ttlSum += $ttl;
                $ttlCount++;
            }
        }
    } catch (Throwable $e) {
        // ignore TTL errors
    }

    $expiresPct = $total > 0 ? ($expiring / $total) * 100.0 : 0.0;
    $avgTtl = $ttlCount > 0 ? ($ttlSum / $ttlCount) : null;

    // Memory usage (sampled) — safe & bounded
    $memBytes = 0;
    $memSample = array_slice($keys, 0, max(1, min($memorySampleKeys, $total)));
    try {
        $r->multi(Redis::PIPELINE);
        foreach ($memSample as $k) {
            if (method_exists($r, 'memoryUsage')) {
                $r->memoryUsage($k);
            } else {
                $r->rawCommand('MEMORY', 'USAGE', $k);
            }
        }
        $mem = $r->exec();
        if (!is_array($mem)) $mem = [];
        foreach ($mem as $b) {
            $b = (int)$b;
            if ($b > 0) $memBytes += $b;
        }
        // If we sampled, extrapolate roughly
        if ($sampled && count($memSample) > 0) {
            $avgPerKey = $memBytes / count($memSample);
            $memBytes = (int)round($avgPerKey * $total);
        }
    } catch (Throwable $e) {
        // ignore
    }

    return [
        'db' => $db,
        'prefix' => $prefix,
        'status' => 'ok',
        'keys' => $total,
        'sampled' => $sampled,
        'expires_pct' => $expiresPct,
        'avg_ttl_seconds' => $avgTtl,
        'memory_bytes' => $memBytes,
    ];
}

function ux_parse_redis_cmdstat(string $s): array
{
    // Format: calls=123,usec=456,usec_per_call=3.71
    $out = ['calls' => 0, 'usec' => 0, 'usec_per_call' => 0.0];
    $parts = explode(',', $s);
    foreach ($parts as $p) {
        $kv = explode('=', trim($p), 2);
        if (count($kv) !== 2) continue;
        $k = trim($kv[0]);
        $v = trim($kv[1]);
        if ($k === 'calls') $out['calls'] = (int)$v;
        elseif ($k === 'usec') $out['usec'] = (int)$v;
        elseif ($k === 'usec_per_call') $out['usec_per_call'] = (float)$v;
    }
    return $out;
}

/**
 * Command load: top commands by recent call rate (delta between polls).
 */
function ux_get_redis_command_load_metrics(int $topN = 10): array
{
    global $config;
    $db = (int)($config['redis_db'] ?? 0);
    $r = ux_redis_admin_client();
    if (!($r instanceof Redis)) {
        return ['db' => $db, 'status' => 'down', 'items' => []];
    }

    $info = [];
    try {
        // Prefer commandstats section when supported
        $info = $r->info('commandstats');
    } catch (Throwable $e) {
        try { $info = $r->info(); } catch (Throwable $e2) { $info = []; }
    }

    // Flatten section if needed
    if (isset($info['Commandstats']) && is_array($info['Commandstats'])) {
        $info = $info['Commandstats'];
    }

    $stats = [];
    foreach ($info as $k => $v) {
        if (strpos($k, 'cmdstat_') === 0) {
            $cmd = substr($k, 8);
            $parsed = ux_parse_redis_cmdstat((string)$v);
            $stats[$cmd] = $parsed;
        }
    }

    $now = time();
    $cacheKey = 'uxgw_cmdstats_prev_db' . $db;
    $prev = ux_admin_cache_get($cacheKey);
    $prevTs = is_array($prev) && isset($prev['ts']) ? (int)$prev['ts'] : 0;
    $prevMap = is_array($prev) && isset($prev['map']) && is_array($prev['map']) ? $prev['map'] : [];

    $dt = ($prevTs > 0) ? max(1, $now - $prevTs) : 30;

    $items = [];
    foreach ($stats as $cmd => $row) {
        $calls = (int)($row['calls'] ?? 0);
        $prevCalls = (int)($prevMap[$cmd] ?? $calls);
        $delta = max(0, $calls - $prevCalls);
        $cps = $delta / $dt;
        $items[] = [
            'cmd' => $cmd,
            'calls_per_sec' => $cps,
            'delta_calls' => $delta,
            'usec_per_call' => (float)($row['usec_per_call'] ?? 0.0),
            'calls_total' => $calls,
        ];
    }

    // Update cache for next poll (store totals only)
    $storeMap = [];
    foreach ($stats as $cmd => $row) {
        $storeMap[$cmd] = (int)($row['calls'] ?? 0);
    }
    ux_admin_cache_set($cacheKey, ['ts' => $now, 'map' => $storeMap], 300);

    // Sort by recent rate
    usort($items, function($a, $b) {
        if ($a['calls_per_sec'] === $b['calls_per_sec']) return 0;
        return ($a['calls_per_sec'] < $b['calls_per_sec']) ? 1 : -1;
    });
    $items = array_slice($items, 0, max(1, $topN));

    // Flag potentially dangerous commands if they appear
    $danger = ['keys','flushdb','flushall','eval','evalsha','script','config','monitor'];
    foreach ($items as &$it) {
        $it['danger'] = in_array(strtolower($it['cmd']), $danger, true);
    }
    unset($it);

    return [
        'db' => $db,
        'status' => 'ok',
        'dt_seconds' => $dt,
        'items' => $items,
    ];
}

/**
 * Lightweight per-second metrics for high-traffic monitoring (Redis only).
 *
 * Keys:
 *   metrics:<metric>:sec:<unix_ts>  (INCR)  with TTL
 *
 * NOTES:
 * - Designed for 2000 rps: 1 INCR per request (plus EXPIRE only when first created)
 * - Never blocks the request if Redis is down/slow.
 */
function ux_metrics_inc(string $metric, int $by = 1): void
{
    global $config;
    if (empty($config['metrics_enabled'])) {
        return;
    }
    if ($by === 0) return;

    $redis = ux_redis_client();
    if (!$redis instanceof Redis) {
        return;
    }

    $metric = preg_replace('/[^a-z0-9_\-]/i', '_', $metric);
    if ($metric === '') return;

    $ttl = isset($config['metrics_retention_seconds']) ? (int)$config['metrics_retention_seconds'] : 600;
    if ($ttl < 60) $ttl = 600;

    $ts = time();
    $key = "metrics:$metric:sec:$ts";

    try {
        // INCRBY and only set TTL on first increment
        $val = (int)$redis->incrBy($key, $by);
        if ($val === $by) {
            $redis->expire($key, $ttl);
        }
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Read recent per-second metrics series.
 *
 * @return array<int,int> [ts => value]
 */
function ux_metrics_get_series(string $metric, int $seconds = 60): array
{
    global $config;
    $redis = ux_redis_admin_client();
    if (!$redis instanceof Redis) return [];

    $metric = preg_replace('/[^a-z0-9_\-]/i', '_', $metric);
    if ($metric === '') return [];

    $seconds = max(1, min(600, $seconds));
    $now = time();
    $keys = [];
    for ($t = $now - $seconds + 1; $t <= $now; $t++) {
        $keys[] = "metrics:$metric:sec:$t";
    }

    $out = [];
    try {
        $vals = $redis->mGet($keys);
        if (is_array($vals)) {
            for ($i=0; $i<count($keys); $i++) {
                $k = $keys[$i];
                $ts = (int)substr($k, strrpos($k, ':')+1);
                $v = isset($vals[$i]) ? (int)$vals[$i] : 0;
                $out[$ts] = $v;
            }
        }
    } catch (Throwable $e) {
        return [];
    }
    return $out;
}




/**
 * پاک‌سازی کامل دیتابیس انتخاب‌شده در ردیس.
 *
 * این تابع تمام کلیدهای دیتابیس فعلی ردیس را پاک می‌کند. در صورتی که ردیس موجود نباشد، false بازمی‌گرداند.
 *
 * @return bool موفقیت عملیات
 */
function ux_flush_redis_cache(): bool
{
    $redis = ux_redis_client();
    if (!($redis instanceof Redis)) {
        return false;
    }
    try {
        /*
         * Flushing the entire Redis database can be very expensive and will
         * evict unrelated data (e.g. WordPress object cache) causing the
         * server to rebuild caches and spike CPU usage. To avoid this, only
         * delete keys that belong to the unixsee gateway. Keys used by this
         * plugin follow a predictable prefix (e.g. ux_sessions, ux_queue,
         * ux_queue_last_seen, ux_analytics:*). We iterate over matching keys
         * using SCAN and delete them in small batches. SCAN is non-blocking
         * and safe for production use.
         */
        $deletedAny = false;

        // Prefer UNLINK (non-blocking) when available.
        $deleteFn = method_exists($redis, 'unlink') ? 'unlink' : 'del';

        // Delete only keys belonging to this gateway (pattern list is safe with OPT_PREFIX).
        $patterns = [
            'ux_sessions',
            'ux_queue',
            'ux_queue_last_seen',
            'ux_analytics:*',

            // Human stats (24h)
            'ux_human:hits:*',
            'ux_human:uniq:*',

            // Wait time aggregates
            'ux_wait:sum:*',
            'ux_wait:cnt:*',

            // Rate-limit buckets
            'ux_rl:*',

            // Queue/session prune locks
            'ux_prune_lock',

            // Bot scoring + DNS cache
            'ux:botscore:*',
            'ux:botdns:*',

            // Bot blocks cache
            'ux:block:*',
            'ux:block_cache_warm',
            'ux:block_sync_lock',
            'ux_bot_blocks_cleanup_lock',
        ];

        foreach ($patterns as $pattern) {
            $it = null;
            do {
                $keys = $redis->scan($it, $pattern, 100);
                if ($keys !== false && !empty($keys)) {
                    foreach (array_chunk($keys, 200) as $chunk) {
                        // del/unlink can accept multiple keys as varargs
                        $redis->$deleteFn(...$chunk);
                    }
                    $deletedAny = true;
                }
            } while ($it > 0);
        }
        return $deletedAny;
    } catch (Throwable $e) {
        error_log('ux_flush_redis_cache failed: ' . $e->getMessage());
        return false;
    }
}


/* ============================================================
 * Bot Blocks (Auto/Manual) + Strikes Engine
 * ============================================================ */

/**
 * Normalize UA hash (sha256).
 */
function ux_ua_hash(string $ua): string
{
    // Use raw UA text as input; sha256 returns 64-hex string.
    return hash('sha256', $ua);
}

/**
 * Disable expired blocks (TTL) in-place to keep queries fast.
 */
function ux_bot_blocks_cleanup_expired(PDO $pdo): void
{
    $now = time();

    // Throttle cleanup to avoid running UPDATE on every request.
    // We use a Redis NX lock if available; otherwise we fall back to best-effort.
    $shouldRun = true;
    if (function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
            if ($redis instanceof Redis) {
                $shouldRun = (bool)$redis->set('ux_bot_blocks_cleanup_lock', (string)$now, ['nx', 'ex' => 60]);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    if (!$shouldRun) {
        return;
    }

    try {
        $stmt = $pdo->prepare(
            "UPDATE bot_blocks SET active = 0, updated_at = :now
             WHERE active = 1
               AND expires_at IS NOT NULL
               AND expires_at > 0
               AND expires_at <= :now"
        );
        $stmt->execute([':now' => $now]);
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Compute Redis cache-key for a block value.
 * NOTE: Keys are prefixed via ux_redis_client() OPT_PREFIX.
 */
function ux_bot_block_cache_key(string $type, string $value): string
{
    return 'ux:block:' . $type . ':' . $value;
}

/**
 * Keep a warm in-Redis snapshot of currently active blocks.
 *
 * Goal: avoid doing 1-2 SQLite SELECTs on every request.
 * The cache is refreshed at most once per minute (distributed lock).
 */
function ux_bot_blocks_cache_maybe_sync(PDO $pdo): void
{
    global $config;
    if (empty($config['redis_enabled']) || !function_exists('ux_redis_client')) {
        return;
    }

    try {
        $redis = ux_redis_client();
    } catch (Throwable $e) {
        return;
    }
    if (!$redis instanceof Redis) {
        return;
    }

    $now = time();
    $cacheTtl = isset($config['bot_block_cache_ttl_seconds']) ? (int)$config['bot_block_cache_ttl_seconds'] : 300;
    if ($cacheTtl < 30) {
        $cacheTtl = 30;
    }

    // Refresh blocks at most once per minute.
    $lockOk = false;
    try {
        $lockOk = (bool)$redis->set('ux:block_sync_lock', (string)$now, ['nx', 'ex' => 60]);
    } catch (Throwable $e) {
        $lockOk = false;
    }
    if (!$lockOk) {
        return;
    }

    // Ensure expired blocks are deactivated (throttled inside)
    ux_bot_blocks_cleanup_expired($pdo);

    try {
        $stmt = $pdo->prepare(
            "SELECT id, type, value, reason, source, expires_at
             FROM bot_blocks
             WHERE active = 1
               AND (expires_at IS NULL OR expires_at = 0 OR expires_at > :now)"
        );
        $stmt->execute([':now' => $now]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($rows)) {
            return;
        }

        $redis->multi(Redis::PIPELINE);
        // Mark cache warm only after we successfully read the current active blocks from SQLite.
        $redis->setex('ux:block_cache_warm', $cacheTtl, (string)$now);
        foreach ($rows as $r) {
            $type = (string)($r['type'] ?? '');
            $value = (string)($r['value'] ?? '');
            if ($type === '' || $value === '') {
                continue;
            }
            $expiresAt = (int)($r['expires_at'] ?? 0);
            $ttl = $cacheTtl;
            if ($expiresAt > 0) {
                $ttl = $expiresAt - $now;
                if ($ttl <= 0) {
                    continue;
                }
                // Don't keep a stale cache entry longer than cacheTtl unless needed.
                if ($ttl > $cacheTtl) {
                    $ttl = $cacheTtl;
                }
            }

            $payload = json_encode([
                'id' => (int)($r['id'] ?? 0),
                'type' => $type,
                'value' => $value,
                'source' => (string)($r['source'] ?? 'manual'),
                'reason' => (string)($r['reason'] ?? ''),
                'expires_at' => $expiresAt,
            ], JSON_UNESCAPED_UNICODE);
            if ($payload === false) {
                continue;
            }

            $redis->setex(ux_bot_block_cache_key($type, $value), $ttl, $payload);
        }
        $redis->exec();
    } catch (Throwable $e) {
        try {
            $redis->discard();
        } catch (Throwable $e2) {
            // ignore
        }
    }
}

/**
 * Find an active block record (optionally filtering by source).
 *
 * @return array|null
 */
function ux_bot_block_find_active(PDO $pdo, string $type, string $value, bool $includeAuto = true, bool $includeManual = true): ?array
{
    // Fast-path: Redis cached blocks (refreshed periodically). This avoids a SELECT per request.
    global $config;
    if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
        try {
            $redis = ux_redis_client();
            if ($redis instanceof Redis) {
                // Opportunistically refresh the cache (distributed lock inside).
                ux_bot_blocks_cache_maybe_sync($pdo);

                $now = time();
                $cacheKey = ux_bot_block_cache_key($type, $value);
                $raw = $redis->get($cacheKey);
                if ($raw !== false && $raw !== null && $raw !== '') {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $src = (string)($decoded['source'] ?? 'manual');
                        if ((!$includeAuto && $src === 'auto') || (!$includeManual && $src === 'manual')) {
                            return null;
                        }
                        $exp = (int)($decoded['expires_at'] ?? 0);
                        if ($exp > 0 && $exp <= $now) {
                            // expired cache entry
                            try { $redis->del($cacheKey); } catch (Throwable $e) {}
                            return null;
                        }
                        // Shape it like a DB row where possible.
                        return [
                            'id' => (int)($decoded['id'] ?? 0),
                            'type' => $type,
                            'value' => $value,
                            'reason' => (string)($decoded['reason'] ?? ''),
                            'source' => $src,
                            'expires_at' => $exp,
                            'active' => 1,
                        ];
                    }
                }

                // If cache is warm, trust negative without hitting SQLite.
                static $cacheWarm = null;
                if ($cacheWarm === null) {
                    try {
                        $warmVal = $redis->get('ux:block_cache_warm');
                        $cacheWarm = ($warmVal !== false && $warmVal !== null && $warmVal !== '');
                    } catch (Throwable $e) {
                        $cacheWarm = false;
                    }
                }
                if ($cacheWarm) {
                    return null;
                }
                // If cache isn't warm (e.g., Redis restart), fall through to SQLite for correctness.
            }
        } catch (Throwable $e) {
            // fall through
        }
    }

    // SQLite fallback (cold cache / Redis disabled)
    ux_bot_blocks_cleanup_expired($pdo);

    $now = time();
    $src = [];
    if ($includeAuto) {
        $src[] = "source='auto'";
    }
    if ($includeManual) {
        $src[] = "source='manual'";
    }
    if (empty($src)) {
        return null;
    }
    $srcSql = '(' . implode(' OR ', $src) . ')';

    try {
        $stmt = $pdo->prepare(
            "SELECT * FROM bot_blocks
             WHERE active = 1
               AND type = :type
               AND value = :value
               AND {$srcSql}
               AND (expires_at IS NULL OR expires_at = 0 OR expires_at > :now)
             ORDER BY created_at DESC
             LIMIT 1"
        );
        $stmt->execute([
            ':type' => $type,
            ':value' => $value,
            ':now' => $now,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Increment block hit counter.
 */
function ux_bot_block_hit(PDO $pdo, int $id): void
{
    $now = time();
    try {
        $stmt = $pdo->prepare("UPDATE bot_blocks SET hits = hits + 1, updated_at = :now WHERE id = :id");
        $stmt->execute([':now' => $now, ':id' => $id]);
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Create a new block record (or refresh an existing active one for the same source).
 *
 * @return int Inserted row id (or existing id if refreshed)
 */
function ux_bot_block_create(PDO $pdo, string $type, string $value, string $reason, string $source = 'manual', ?int $ttlSeconds = null): int
{
    $now = time();
    $expiresAt = null;
    if ($ttlSeconds !== null && $ttlSeconds > 0) {
        $expiresAt = $now + (int)$ttlSeconds;
    }

    // Ensure only one active block per (type,value,source) at a time
    try {
        $stmt = $pdo->prepare("UPDATE bot_blocks SET active = 0, updated_at = :now
                               WHERE active = 1 AND type = :type AND value = :value AND source = :source");
        $stmt->execute([
            ':now' => $now,
            ':type' => $type,
            ':value' => $value,
            ':source' => $source,
        ]);
    } catch (Throwable $e) {
        // ignore
    }

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO bot_blocks (type, value, reason, source, expires_at, hits, active, created_at, updated_at)
             VALUES (:type, :value, :reason, :source, :expires_at, 0, 1, :now, :now)"
        );
        $stmt->execute([
            ':type' => $type,
            ':value' => $value,
            ':reason' => $reason,
            ':source' => $source,
            ':expires_at' => $expiresAt,
            ':now' => $now,
        ]);
        $id = (int)$pdo->lastInsertId();

        // Best-effort: update Redis cache immediately (keeps block checks fast)
        global $config;
        if (!empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
            try {
                $redis = ux_redis_client();
                if ($redis instanceof Redis) {
                    $cacheTtl = isset($config['bot_block_cache_ttl_seconds']) ? (int)$config['bot_block_cache_ttl_seconds'] : 300;
                    if ($cacheTtl < 30) {
                        $cacheTtl = 30;
                    }
                    $ttl = $cacheTtl;
                    if ($expiresAt !== null && $expiresAt > 0) {
                        $ttl = $expiresAt - $now;
                        if ($ttl <= 0) {
                            $ttl = 5;
                        }
                        if ($ttl > $cacheTtl) {
                            $ttl = $cacheTtl;
                        }
                    }

                    $payload = json_encode([
                        'id' => $id,
                        'type' => $type,
                        'value' => $value,
                        'source' => $source,
                        'reason' => $reason,
                        'expires_at' => (int)($expiresAt ?? 0),
                    ], JSON_UNESCAPED_UNICODE);
                    if ($payload !== false) {
                        $redis->setex(ux_bot_block_cache_key($type, $value), $ttl, $payload);
                        $redis->setex('ux:block_cache_warm', $cacheTtl, (string)$now);
                    }
                }
            } catch (Throwable $e) {
                // ignore
            }
        }

        return $id;
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * Unblock (deactivate) by id.
 */
function ux_bot_block_unblock(PDO $pdo, int $id): bool
{
    $now = time();
    try {
        // Fetch type/value so we can also purge Redis cache
        $type = '';
        $value = '';
        try {
            $stmt0 = $pdo->prepare("SELECT type, value FROM bot_blocks WHERE id = :id LIMIT 1");
            $stmt0->execute([':id' => $id]);
            $row0 = $stmt0->fetch(PDO::FETCH_ASSOC);
            if (is_array($row0)) {
                $type = (string)($row0['type'] ?? '');
                $value = (string)($row0['value'] ?? '');
            }
        } catch (Throwable $e0) {
            // ignore
        }

        $stmt = $pdo->prepare("UPDATE bot_blocks SET active = 0, updated_at = :now WHERE id = :id");
        $stmt->execute([':now' => $now, ':id' => $id]);

        // Best-effort: delete Redis cache key (so unblock takes effect instantly)
        global $config;
        if ($type !== '' && $value !== '' && !empty($config['redis_enabled']) && function_exists('ux_redis_client')) {
            try {
                $redis = ux_redis_client();
                if ($redis instanceof Redis) {
                    $redis->del(ux_bot_block_cache_key($type, $value));
                }
            } catch (Throwable $e) {
                // ignore
            }
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Add a strike and return number of strikes within the window.
 */
function ux_bot_strike_add(PDO $pdo, string $type, string $value, int $windowSeconds, ?int $score = null, array $reasons = []): int
{
    $now = time();
    $windowSeconds = max(60, (int)$windowSeconds);

    // Insert strike
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO bot_strikes (type, value, ts, score, reasons, created_at)
             VALUES (:type, :value, :ts, :score, :reasons, :created_at)"
        );
        $stmt->execute([
            ':type' => $type,
            ':value' => $value,
            ':ts' => $now,
            ':score' => $score,
            ':reasons' => json_encode($reasons, JSON_UNESCAPED_UNICODE),
            ':created_at' => $now,
        ]);
    } catch (Throwable $e) {
        // ignore insert failure
    }

    // Cleanup old strikes occasionally (best-effort)
    try {
        $cut = $now - 86400; // keep last 24h
        $pdo->prepare("DELETE FROM bot_strikes WHERE ts < :cut")->execute([':cut' => $cut]);
    } catch (Throwable $e) {
        // ignore
    }

    // Count strikes in window
    $since = $now - $windowSeconds;
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bot_strikes WHERE type = :type AND value = :value AND ts >= :since");
        $stmt->execute([
            ':type' => $type,
            ':value' => $value,
            ':since' => $since,
        ]);
        return (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * Clear strikes for a target (after block, optional).
 */
function ux_bot_strikes_clear(PDO $pdo, string $type, string $value): void
{
    try {
        $pdo->prepare("DELETE FROM bot_strikes WHERE type = :type AND value = :value")->execute([
            ':type' => $type,
            ':value' => $value,
        ]);
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Compute escalated TTL based on how many times this value reached threshold in last 24h.
 *
 * @param array $ladderSeconds Example: [3600, 21600, 86400]
 */
function ux_bot_autoblock_ttl(PDO $pdo, string $type, string $value, array $ladderSeconds, int $defaultTtlSeconds = 3600): int
{
    $now = time();
    $since = $now - 86400;

    // Validate ladder
    $ladder = [];
    foreach ($ladderSeconds as $sec) {
        $sec = (int)$sec;
        if ($sec > 0) {
            $ladder[] = $sec;
        }
    }
    if (empty($ladder)) {
        $ladder = [$defaultTtlSeconds];
    }

    $count = 0;
    try {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM bot_blocks
             WHERE type = :type AND value = :value AND source = 'auto' AND created_at >= :since"
        );
        $stmt->execute([
            ':type' => $type,
            ':value' => $value,
            ':since' => $since,
        ]);
        $count = (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        $count = 0;
    }

    $idx = $count; // first time => 0, second => 1, ...
    if ($idx < 0) $idx = 0;
    if ($idx > (count($ladder) - 1)) {
        $idx = count($ladder) - 1;
    }
    return (int)$ladder[$idx];
}

/* ============================================================
 * UA Intelligence Bank (Analytics DB)
 * ============================================================ */

/**
 * Record/update UA stats (low overhead UPSERT).
 */
function ux_ua_bank_record(string $ua, string $ip, ?int $score = null, ?string $classification = null, ?string $botName = null): void
{
    $ua = (string)$ua;
    if ($ua === '') {
        return;
    }
    $hash = ux_ua_hash($ua);
    $now = time();

    if (!function_exists('ux_storage_analytics_pdo')) {
        return;
    }

    try {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO ua_stats (ua_hash, ua, first_seen, last_seen, hits, last_ip, last_score, classification, bot_name)
             VALUES (:h, :ua, :now, :now, 1, :ip, :score, :class, :bot)
             ON CONFLICT(ua_hash) DO UPDATE SET
                ua = excluded.ua,
                last_seen = excluded.last_seen,
                hits = ua_stats.hits + 1,
                last_ip = excluded.last_ip,
                last_score = CASE WHEN excluded.last_score IS NULL THEN ua_stats.last_score ELSE excluded.last_score END,
                classification = CASE WHEN excluded.classification IS NULL OR excluded.classification = '' THEN ua_stats.classification ELSE excluded.classification END,
                bot_name = CASE WHEN excluded.bot_name IS NULL OR excluded.bot_name = '' THEN ua_stats.bot_name ELSE excluded.bot_name END"
        );
        $stmt->execute([
            ':h' => $hash,
            ':ua' => $ua,
            ':now' => $now,
            ':ip' => $ip,
            ':score' => $score,
            ':class' => $classification,
            ':bot' => $botName,
        ]);
    } catch (Throwable $e) {
        // ignore
    }
}

/**
 * Fetch UA stats list for admin UI.
 */
function ux_ua_bank_list(int $limit = 200, int $offset = 0, ?string $search = null): array
{
    if (!function_exists('ux_storage_analytics_pdo')) {
        return [];
    }
    $limit = max(1, min(1000, (int)$limit));
    $offset = max(0, (int)$offset);
    $search = is_string($search) ? trim($search) : '';

    try {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }

        $sql = "SELECT ua_hash, ua, first_seen, last_seen, hits, last_ip, last_score, classification, bot_name
                FROM ua_stats";
        $params = [];
        if ($search !== '') {
            $sql .= " WHERE ua LIKE :q";
            $params[':q'] = '%' . $search . '%';
        }
        $sql .= " ORDER BY last_seen DESC LIMIT :lim OFFSET :off";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    } catch (Throwable $e) {
        return [];
    }
}


/**
 * Advanced UA Bank list (server-side pagination + filters).
 *
 * This is used by the admin panel AJAX endpoint (ua-bank-list). If your
 * deployment upgraded the admin panel without upgrading ux_storage.php,
 * the UA Bank would appear empty because the advanced list function
 * did not exist. This helper restores that functionality.
 *
 * @param array $opts Supported keys:
 *  - limit (int) 1..1000
 *  - offset (int) >=0
 *  - sort (string) hits|last_seen|score
 *  - dir (string) asc|desc
 *  - classification (string) optional exact match
 *  - min_hits (int|null)
 *  - min_score (int|null)
 *  - max_score (int|null)
 *  - last_seen_from (int|null) epoch seconds
 *  - last_seen_to (int|null) epoch seconds
 *  - search (string) substring match on ua/ua_hash
 *  - hash_filter (array|null) list of ua_hash for IN/NOT IN filtering
 *  - hash_filter_mode (string) in|not_in
 *
 * @return array{rows:array<int,array<string,mixed>>, total:int}
 */
function ux_ua_bank_list_advanced(array $opts = []): array
{
    if (!function_exists('ux_storage_analytics_pdo')) {
        return ['rows' => [], 'total' => 0];
    }

    $limit  = isset($opts['limit']) ? (int)$opts['limit'] : 25;
    $offset = isset($opts['offset']) ? (int)$opts['offset'] : 0;
    $limit  = max(1, min(1000, $limit));
    $offset = max(0, $offset);

    $sort = strtolower(trim((string)($opts['sort'] ?? 'last_seen')));
    $dir  = strtolower(trim((string)($opts['dir'] ?? 'desc')));
    $classification = trim((string)($opts['classification'] ?? ''));
    $search = trim((string)($opts['search'] ?? ''));

    $minHits  = array_key_exists('min_hits', $opts) ? $opts['min_hits'] : null;
    $minScore = array_key_exists('min_score', $opts) ? $opts['min_score'] : null;
    $maxScore = array_key_exists('max_score', $opts) ? $opts['max_score'] : null;
    $lastFrom = array_key_exists('last_seen_from', $opts) ? $opts['last_seen_from'] : null;
    $lastTo   = array_key_exists('last_seen_to', $opts) ? $opts['last_seen_to'] : null;

    $hashFilter = $opts['hash_filter'] ?? null;
    $hashFilterMode = strtolower(trim((string)($opts['hash_filter_mode'] ?? 'in')));
    if (!in_array($hashFilterMode, ['in', 'not_in'], true)) {
        $hashFilterMode = 'in';
    }

    // Sort whitelist (prevents SQL injection)
    $sortMap = [
        'hits' => 'hits',
        'last_seen' => 'last_seen',
        'score' => 'last_score',
    ];
    $sortCol = $sortMap[$sort] ?? 'last_seen';
    $dirSql  = ($dir === 'asc') ? 'ASC' : 'DESC';

    try {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }

        // If ua_stats is empty but we already have visits, backfill a small window once.
        try {
            $uaCnt = (int)$pdo->query("SELECT COUNT(*) FROM ua_stats")->fetchColumn();
        } catch (Throwable $e) {
            $uaCnt = 0;
        }
        if ($uaCnt === 0) {
            ux_ua_bank_backfill_from_visits($pdo);
        }

        $where = [];
        $params = [];

        if ($classification !== '') {
            $where[] = "classification = :class";
            $params[':class'] = $classification;
        }
        if ($minHits !== null && $minHits !== '') {
            $where[] = "hits >= :min_hits";
            $params[':min_hits'] = (int)$minHits;
        }
        if ($minScore !== null && $minScore !== '') {
            $where[] = "last_score IS NOT NULL AND last_score >= :min_score";
            $params[':min_score'] = (int)$minScore;
        }
        if ($maxScore !== null && $maxScore !== '') {
            $where[] = "last_score IS NOT NULL AND last_score <= :max_score";
            $params[':max_score'] = (int)$maxScore;
        }
        if ($lastFrom !== null && $lastFrom !== '') {
            $where[] = "last_seen >= :last_from";
            $params[':last_from'] = (int)$lastFrom;
        }
        if ($lastTo !== null && $lastTo !== '') {
            $where[] = "last_seen <= :last_to";
            $params[':last_to'] = (int)$lastTo;
        }
        if ($search !== '') {
            $where[] = "(ua LIKE :q OR ua_hash LIKE :q)";
            $params[':q'] = '%' . $search . '%';
        }

        // hash_filter for blocked/not_blocked UX (ua_hash IN/NOT IN)
        $hashes = [];
        if (is_array($hashFilter)) {
            foreach ($hashFilter as $h) {
                $h = strtolower(trim((string)$h));
                if ($h !== '' && preg_match('/^[a-f0-9]{64}$/', $h)) {
                    $hashes[] = $h;
                }
            }
            $hashes = array_values(array_unique($hashes));
        }
        if (!empty($hashes)) {
            $ph = [];
            foreach ($hashes as $i => $h) {
                $k = ':h' . $i;
                $ph[] = $k;
                $params[$k] = $h;
            }
            $where[] = "ua_hash " . ($hashFilterMode === 'not_in' ? 'NOT IN' : 'IN') . " (" . implode(',', $ph) . ")";
        }

        $whereSql = '';
        if (!empty($where)) {
            $whereSql = ' WHERE ' . implode(' AND ', $where);
        }

        // Total
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM ua_stats" . $whereSql);
        foreach ($params as $k => $v) {
            $type = is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($k, $v, $type);
        }
        $stmt->execute();
        $total = (int)$stmt->fetchColumn();

        // Rows
        $sql = "SELECT ua_hash, ua, first_seen, last_seen, hits, last_ip, last_score, classification, bot_name
                FROM ua_stats" . $whereSql .
                " ORDER BY " . $sortCol . " " . $dirSql .
                " LIMIT :lim OFFSET :off";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $type = is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($k, $v, $type);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'rows' => is_array($rows) ? $rows : [],
            'total' => $total,
        ];
    } catch (Throwable $e) {
        return ['rows' => [], 'total' => 0];
    }
}

/**
 * Backfill UA bank from recent visits when ua_stats is empty.
 *
 * This is a safety net for upgraded installations. It scans a limited number of
 * recent ux_visits rows (30 days window, capped) and builds aggregated UA stats.
 *
 * @return int number of UA entries inserted/updated
 */
function ux_ua_bank_backfill_from_visits(PDO $pdo, int $days = 30, int $maxVisits = 10000, int $maxUas = 2000): int
{
    $days = max(1, min(180, (int)$days));
    $maxVisits = max(1000, min(50000, (int)$maxVisits));
    $maxUas = max(100, min(10000, (int)$maxUas));
    $since = time() - ($days * 86400);

    try {
        // If ux_visits doesn't exist, nothing to backfill
        $vCnt = 0;
        try {
            $vCnt = (int)$pdo->query("SELECT COUNT(*) FROM ux_visits")->fetchColumn();
        } catch (Throwable $e) {
            $vCnt = 0;
        }
        if ($vCnt <= 0) {
            return 0;
        }

        $stmt = $pdo->prepare(
            "SELECT ts, ip, ua, is_bot
             FROM ux_visits
             WHERE ts >= :since AND ua != ''
             ORDER BY ts DESC
             LIMIT :lim"
        );
        $stmt->bindValue(':since', (int)$since, PDO::PARAM_INT);
        $stmt->bindValue(':lim', (int)$maxVisits, PDO::PARAM_INT);
        $stmt->execute();

        $agg = []; // ua_hash => stats
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $ua = (string)($r['ua'] ?? '');
            if ($ua === '') {
                continue;
            }
            $h = function_exists('ux_ua_hash') ? ux_ua_hash($ua) : hash('sha256', $ua);
            $ts = (int)($r['ts'] ?? 0);
            $ip = (string)($r['ip'] ?? '');
            $isBot = (int)($r['is_bot'] ?? 0);

            if (!isset($agg[$h])) {
                if (count($agg) >= $maxUas) {
                    // Stop collecting new UAs to keep the backfill bounded.
                    continue;
                }
                $agg[$h] = [
                    'ua_hash' => $h,
                    'ua' => $ua,
                    'first_seen' => $ts,
                    'last_seen' => $ts,
                    'hits' => 1,
                    'last_ip' => $ip,
                    // For backfill we set a lightweight classification; scoring later can overwrite.
                    'classification' => $isBot ? 'bot' : 'human',
                ];
            } else {
                $agg[$h]['hits'] = (int)$agg[$h]['hits'] + 1;
                if ($ts < (int)$agg[$h]['first_seen']) {
                    $agg[$h]['first_seen'] = $ts;
                }
                if ($ts > (int)$agg[$h]['last_seen']) {
                    $agg[$h]['last_seen'] = $ts;
                    $agg[$h]['last_ip'] = $ip;
                    $agg[$h]['ua'] = $ua;
                }
            }
        }

        if (empty($agg)) {
            return 0;
        }

        $ins = $pdo->prepare(
            "INSERT INTO ua_stats (ua_hash, ua, first_seen, last_seen, hits, last_ip, last_score, classification, bot_name)
             VALUES (:h, :ua, :fs, :ls, :hits, :ip, NULL, :class, NULL)
             ON CONFLICT(ua_hash) DO UPDATE SET
                ua = excluded.ua,
                first_seen = CASE WHEN excluded.first_seen < ua_stats.first_seen THEN excluded.first_seen ELSE ua_stats.first_seen END,
                last_seen = CASE WHEN excluded.last_seen > ua_stats.last_seen THEN excluded.last_seen ELSE ua_stats.last_seen END,
                hits = CASE WHEN excluded.hits > ua_stats.hits THEN excluded.hits ELSE ua_stats.hits END,
                last_ip = excluded.last_ip,
                classification = CASE WHEN ua_stats.classification IS NULL OR ua_stats.classification = '' THEN excluded.classification ELSE ua_stats.classification END"
        );

        $n = 0;
        foreach ($agg as $row) {
            $ins->execute([
                ':h' => (string)$row['ua_hash'],
                ':ua' => (string)$row['ua'],
                ':fs' => (int)$row['first_seen'],
                ':ls' => (int)$row['last_seen'],
                ':hits' => (int)$row['hits'],
                ':ip' => (string)$row['last_ip'],
                ':class' => (string)$row['classification'],
            ]);
            $n++;
        }
        return $n;
    } catch (Throwable $e) {
        return 0;
    }
}


/* ============================================================
 * Traffic & Bandwidth Intelligence (Analytics DB)
 * ============================================================ */

/**
 * Check whether a PHP function exists and is not disabled via disable_functions.
 */
function ux_fn_enabled(string $fn): bool
{
    if (!function_exists($fn)) {
        return false;
    }
    $disabled = (string)ini_get('disable_functions');
    if ($disabled === '') {
        return true;
    }
    $list = array_map('trim', explode(',', $disabled));
    return !in_array($fn, $list, true);
}

/**
 * Read a file using a shell command (cat) as a fallback.
 *
 * Why: On some hosts, PHP file functions cannot read /proc due to open_basedir,
 * but executing a fixed system command may still work.
 */
function ux_shell_cat(string $path): string
{
    // Fixed command only; path is escaped.
    $cmd = 'cat ' . escapeshellarg($path) . ' 2>/dev/null';

    if (ux_fn_enabled('shell_exec')) {
        $out = @shell_exec($cmd);
        return is_string($out) ? $out : '';
    }
    if (ux_fn_enabled('exec')) {
        $lines = [];
        $rc = 0;
        @exec($cmd, $lines, $rc);
        if ($rc === 0 && is_array($lines)) {
            return implode("\n", $lines);
        }
    }
    return '';
}

/**
 * Fallback: read interface counters via sysfs (same data source used by tools like nload).
 *
 * @return array<string,array{rx:int,tx:int}>
 */
function ux_netdev_read_sysfs(): array
{
    $out = [];
    // List interfaces via shell (avoids PHP open_basedir restrictions).
    $ifsRaw = ux_shell_cat('/sys/class/net');
    // If cat on directory doesn't work (it usually won't), use ls.
    if ($ifsRaw === '' && ux_fn_enabled('shell_exec')) {
        $ifsRaw = (string)@shell_exec('ls -1 /sys/class/net 2>/dev/null');
    } elseif ($ifsRaw === '' && ux_fn_enabled('exec')) {
        $lines = [];
        $rc = 0;
        @exec('ls -1 /sys/class/net 2>/dev/null', $lines, $rc);
        if ($rc === 0) {
            $ifsRaw = implode("\n", $lines);
        }
    }
    $ifs = preg_split('/\r?\n/', trim((string)$ifsRaw));
    if (!is_array($ifs)) {
        return [];
    }
    foreach ($ifs as $iface) {
        $iface = trim((string)$iface);
        if ($iface === '' || $iface === '.' || $iface === '..') {
            continue;
        }
        // Sanitize: interface names are usually like eth0, ens3, venet0, lo, etc.
        if (!preg_match('/^[a-zA-Z0-9_.:-]{1,32}$/', $iface)) {
            continue;
        }
        $rxPath = '/sys/class/net/' . $iface . '/statistics/rx_bytes';
        $txPath = '/sys/class/net/' . $iface . '/statistics/tx_bytes';
        $rxRaw = trim(ux_shell_cat($rxPath));
        $txRaw = trim(ux_shell_cat($txPath));
        if ($rxRaw === '' || $txRaw === '') {
            continue;
        }
        if (!ctype_digit($rxRaw) || !ctype_digit($txRaw)) {
            continue;
        }
        $out[$iface] = ['rx' => (int)$rxRaw, 'tx' => (int)$txRaw];
    }
    return $out;
}

/**
 * Read /proc/net/dev counters.
 *
 * @return array<string,array{rx:int,tx:int}> iface => counters
 */
function ux_netdev_read(): array
{
    $file = '/proc/net/dev';
    $raw = '';
    // Try direct read first (may fail due to open_basedir).
    if (@is_readable($file)) {
        $raw = (string)@file_get_contents($file);
    }

    // Fallback: shell cat (works on many DirectAdmin/shared setups even when PHP can't read /proc).
    if ($raw === '') {
        $raw = ux_shell_cat($file);
    }

    // Fallback 2: sysfs counters (same source used by tools like nload).
    if ($raw === '') {
        $sys = ux_netdev_read_sysfs();
        return $sys;
    }

    $lines = preg_split('/\r?\n/', trim($raw));
    if (!is_array($lines) || count($lines) < 3) {
        return [];
    }
    $out = [];
    // Skip headers (first 2 lines)
    foreach (array_slice($lines, 2) as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, ':') === false) {
            continue;
        }
        [$iface, $rest] = array_map('trim', explode(':', $line, 2));
        $parts = preg_split('/\s+/', trim($rest));
        if (!is_array($parts) || count($parts) < 16) {
            continue;
        }
        // According to /proc/net/dev format: rx_bytes is field0, tx_bytes is field8
        $rx = (int)$parts[0];
        $tx = (int)$parts[8];
        $out[$iface] = ['rx' => $rx, 'tx' => $tx];
    }
    return $out;
}

/**
 * Pick a primary interface for sampling.
 */
function ux_netdev_pick_iface(array $counters, ?string $preferred = null): ?string
{
    if ($preferred && isset($counters[$preferred])) {
        return $preferred;
    }
    // Prefer non-loopback with the most traffic
    $best = null;
    $bestTotal = -1;
    foreach ($counters as $iface => $ct) {
        if ($iface === 'lo') {
            continue;
        }
        $total = (int)($ct['rx'] ?? 0) + (int)($ct['tx'] ?? 0);
        if ($total > $bestTotal) {
            $bestTotal = $total;
            $best = $iface;
        }
    }
    if ($best !== null) {
        return $best;
    }
    // Fallback to loopback if that's all we have
    return isset($counters['lo']) ? 'lo' : null;
}

/**
 * Sample network stats at most once every N seconds (default 5).
 * Stores samples in analytics DB (ux_net_samples).
 */
function ux_net_sample_maybe(array $config): void
{
    $enabled = !empty($config['traffic_intel_enabled']);
    if (!$enabled) {
        return;
    }
    $interval = isset($config['traffic_intel_net_sample_interval']) ? (int)$config['traffic_intel_net_sample_interval'] : 5;
    if ($interval < 1) {
        $interval = 5;
    }

    $cacheFile = __DIR__ . '/ux_net_cache.json';
    $now = time();
    $cache = ['ts' => 0, 'iface' => '', 'rx' => 0, 'tx' => 0];

    // Best-effort file cache with lock
    $fp = @fopen($cacheFile, 'c+');
    if ($fp) {
        if (!@flock($fp, LOCK_EX | LOCK_NB)) {
            @fclose($fp);
            return;
        }
        $raw = stream_get_contents($fp);
        if (is_string($raw) && $raw !== '') {
            $tmp = json_decode($raw, true);
            if (is_array($tmp)) {
                $cache = array_merge($cache, $tmp);
            }
        }
        if ($now - (int)($cache['ts'] ?? 0) < $interval) {
            // too soon
            @flock($fp, LOCK_UN);
            @fclose($fp);
            return;
        }

        $counters = ux_netdev_read();
        $iface = ux_netdev_pick_iface($counters, isset($config['traffic_intel_interface']) ? (string)$config['traffic_intel_interface'] : null);
        if ($iface === null || !isset($counters[$iface])) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
            return;
        }

        $rx = (int)$counters[$iface]['rx'];
        $tx = (int)$counters[$iface]['tx'];
        $prevTs = (int)($cache['ts'] ?? 0);
        $prevRx = (int)($cache['rx'] ?? 0);
        $prevTx = (int)($cache['tx'] ?? 0);

        $dt = max(1, $now - $prevTs);
        $dRx = max(0, $rx - $prevRx);
        $dTx = max(0, $tx - $prevTx);

        $rxKbps = ($dRx / 1024.0) / (float)$dt;
        $txKbps = ($dTx / 1024.0) / (float)$dt;

        // Write cache back
        $cache = ['ts' => $now, 'iface' => $iface, 'rx' => $rx, 'tx' => $tx];
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($cache, JSON_UNESCAPED_UNICODE));
        @flock($fp, LOCK_UN);
        @fclose($fp);

        // Store in analytics DB
        if (function_exists('ux_storage_analytics_pdo')) {
            try {
                $pdo = ux_storage_analytics_pdo();
                if (function_exists('ux_storage_analytics_migrate')) {
                    ux_storage_analytics_migrate($pdo);
                }
                $stmt = $pdo->prepare(
                    "INSERT OR REPLACE INTO ux_net_samples (ts, iface, rx_bytes, tx_bytes, rx_kbps, tx_kbps)
                     VALUES (:ts, :iface, :rx, :tx, :rxk, :txk)"
                );
                $stmt->execute([
                    ':ts' => $now,
                    ':iface' => $iface,
                    ':rx' => $rx,
                    ':tx' => $tx,
                    ':rxk' => $rxKbps,
                    ':txk' => $txKbps,
                ]);
            } catch (Throwable $e) {
                // ignore
            }
        }
    }
}

/**
 * Compute traffic per minute for the last N minutes from ux_visits and persist into ux_traffic_minute.
 *
 * @return array{series:array<int,array>, from:int, to:int}
 */
function ux_traffic_minute_compute(int $minutesBack = 60): array
{
    if (!function_exists('ux_storage_analytics_pdo')) {
        return ['series' => [], 'from' => 0, 'to' => 0];
    }
    $minutesBack = max(5, min(24*60, (int)$minutesBack));

    $to = time();
    $from = $to - ($minutesBack * 60);

    try {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }

        $stmt = $pdo->prepare(
            "SELECT (ts / 60) * 60 AS minute_ts,
                    SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) AS human_req,
                    SUM(CASE WHEN is_bot = 1 AND (blocked IS NULL OR blocked = 0) THEN 1 ELSE 0 END) AS bot_req,
                    SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) AS blocked_req,
                    SUM(CASE WHEN is_bot = 0 THEN COALESCE(bytes,0) ELSE 0 END) AS human_bytes,
                    SUM(CASE WHEN is_bot = 1 AND (blocked IS NULL OR blocked = 0) THEN COALESCE(bytes,0) ELSE 0 END) AS bot_bytes,
                    SUM(CASE WHEN blocked = 1 THEN COALESCE(bytes,0) ELSE 0 END) AS blocked_bytes
             FROM ux_visits
             WHERE ts >= :from
             GROUP BY minute_ts
             ORDER BY minute_ts ASC"
        );
        $stmt->execute([':from' => $from]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!is_array($rows)) {
            $rows = [];
        }

        // Persist into ux_traffic_minute for future use
        foreach ($rows as $r) {
            $ts = (int)($r['minute_ts'] ?? 0);
            if ($ts <= 0) continue;
            $pdo->prepare(
                "INSERT OR REPLACE INTO ux_traffic_minute
                 (ts, human_req, bot_req, blocked_req, human_bytes, bot_bytes, blocked_bytes)
                 VALUES (:ts, :h, :b, :bl, :hb, :bb, :blb)"
            )->execute([
                ':ts' => $ts,
                ':h' => (int)($r['human_req'] ?? 0),
                ':b' => (int)($r['bot_req'] ?? 0),
                ':bl' => (int)($r['blocked_req'] ?? 0),
                ':hb' => (int)($r['human_bytes'] ?? 0),
                ':bb' => (int)($r['bot_bytes'] ?? 0),
                ':blb' => (int)($r['blocked_bytes'] ?? 0),
            ]);
        }

        return ['series' => $rows, 'from' => $from, 'to' => $to];
    } catch (Throwable $e) {
        return ['series' => [], 'from' => $from, 'to' => $to];
    }
}

/**
 * Fetch recent network samples.
 */
function ux_net_samples_list(int $limit = 120): array
{
    if (!function_exists('ux_storage_analytics_pdo')) {
        return [];
    }
    $limit = max(5, min(2000, (int)$limit));
    try {
        $pdo = ux_storage_analytics_pdo();
        if (function_exists('ux_storage_analytics_migrate')) {
            ux_storage_analytics_migrate($pdo);
        }
        $stmt = $pdo->prepare("SELECT ts, iface, rx_kbps, tx_kbps, rx_bytes, tx_bytes FROM ux_net_samples ORDER BY ts DESC LIMIT :lim");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    } catch (Throwable $e) {
        return [];
    }
}


// Do not force SQLite initialization on every request. Tables are migrated lazily when
// the storage layer is actually used. This avoids a white-screen fatal on servers where
// pdo_sqlite is missing and keeps the gateway lightweight in Redis-first mode.
if (getenv('UXGW_AUTO_MIGRATE') === '1' && ux_storage_sqlite_available()) {
    try {
        ux_storage_pdo();
        if (function_exists('ux_storage_analytics_pdo')) {
            ux_storage_analytics_pdo();
        }
    } catch (Throwable $e) {
        error_log('Unixsee Gateway auto-migrate skipped: ' . $e->getMessage());
    }
}
