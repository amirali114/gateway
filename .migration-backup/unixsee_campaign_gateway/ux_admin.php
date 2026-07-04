<?php
/**
 * Admin login & authentication helpers for Unixsee Campaign Gateway.
 *
 * این فایل مسئول:
 * - مدیریت تلاش‌های لاگین و محدودیت IP
 * - ذخیره تلاش‌ها در ux_login_attempts.json
 * - نمایش فرم لاگین پنل ادمین
 *
 * پیش‌نیازها:
 * - session_start در gateway.php فراخوانی شده باشد
 * - $config از ux_config.php لود شده باشد
 * - توابع ux_t(), ux_is_rtl_lang(), ux_get_user_ip() موجود باشند
 */



/**
 * Base URL helper for loading local assets in standalone mode.
 */
if (!function_exists('ux_gateway_base_url')) {
    function ux_gateway_base_url(): string
    {
        $gateway_dir = '/' . trim(basename(__DIR__), '/');
        $script_dir = isset($_SERVER['SCRIPT_NAME']) ? dirname((string)$_SERVER['SCRIPT_NAME']) : '';

        if ($script_dir === '/' || $script_dir === '\\' || $script_dir === '') {
            $base = $gateway_dir;
        } else {
            $base = rtrim($script_dir, '/');
        }
        return $base;
    }
}


/**
 * خواندن تلاش‌های لاگین از فایل JSON
 *
 * ساختار خروجی:
 * [
 *   "ip-address" => ["count" => N, "locked_until" => timestamp],
 *   ...
 * ]
 */
function ux_get_login_attempts(): array
{
    // از دیتابیس SQLite می‌خوانیم. اگر خطا دهد، آرایه خالی برمی‌گردد.
    if (function_exists('ux_get_login_attempts_db')) {
        $data = ux_get_login_attempts_db();
        return is_array($data) ? $data : [];
    }
    return [];
}

/**
 * ذخیره تلاش‌های لاگین در فایل JSON
 */
function ux_save_login_attempts(array $data): void
{
    // ذخیره تلاش‌های لاگین در دیتابیس
    if (function_exists('ux_set_login_attempt_db')) {
        foreach ($data as $ip => $entry) {
            $cnt  = isset($entry['count']) ? (int)$entry['count'] : 0;
            $lock = isset($entry['locked_until']) ? (int)$entry['locked_until'] : 0;
            ux_set_login_attempt_db((string)$ip, $cnt, $lock);
        }
    }
}

/**
 * چند ثانیه تا پایان لاک شدن لاگین این IP باقی مانده؟
 * اگر ۰ برگردد یعنی لاک نیست.
 */
function ux_login_lock_remaining(string $ip, array $config): int
{
    // از دیتابیس مقدار باقیمانده قفل را می‌خوانیم
    if (function_exists('ux_get_login_attempt_db')) {
        $entry = ux_get_login_attempt_db($ip);
        if ($entry === null) {
            return 0;
        }
        $lockedUntil = isset($entry['locked_until']) ? (int)$entry['locked_until'] : 0;
        $now         = time();
        return $lockedUntil > $now ? ($lockedUntil - $now) : 0;
    }
    return 0;
}

/**
 * ثبت یک تلاش لاگین جدید برای IP
 * - در صورت موفقیت: ریست تعداد و برداشتن لاک
 * - در صورت شکست: افزایش count و در صورت رسیدن به سقف، لاک‌کردن IP
 */
function ux_record_login_attempt(string $ip, bool $success, array $config): void
{
    $now         = time();
    // دریافت رکورد فعلی از DB
    $entry       = function_exists('ux_get_login_attempt_db') ? ux_get_login_attempt_db($ip) : null;
    if ($entry === null) {
        $entry = ['count' => 0, 'locked_until' => 0];
    }
    // اگر زمان لاک قبلی گذشته، ریست کن
    if (!empty($entry['locked_until']) && (int)$entry['locked_until'] <= $now) {
        $entry['locked_until'] = 0;
        $entry['count']        = 0;
    }
    if ($success) {
        // لاگین موفق: ریست همه چیز
        $entry['count']        = 0;
        $entry['locked_until'] = 0;
    } else {
        // لاگین ناموفق: افزایش شمارنده
        $entry['count'] = isset($entry['count']) ? ((int)$entry['count'] + 1) : 1;
        $maxAttempts = isset($config['max_login_attempts']) ? (int)$config['max_login_attempts'] : 5;
        if ($maxAttempts < 1) {
            $maxAttempts = 5;
        }
        $lockMinutes = isset($config['lock_minutes']) ? (int)$config['lock_minutes'] : 15;
        if ($lockMinutes < 1) {
            $lockMinutes = 15;
        }
        if ($entry['count'] >= $maxAttempts) {
            $entry['locked_until'] = $now + ($lockMinutes * 60);
        }
    }
    // ذخیره در DB
    if (function_exists('ux_set_login_attempt_db')) {
        ux_set_login_attempt_db($ip, (int)$entry['count'], (int)$entry['locked_until']);
    }
}

/* ================== وضعیت لاگین ادمین ================== */

/**
 * آیا ادمین وارد شده است؟
 */
function ux_is_logged_in(): bool
{
    return !empty($_SESSION['ux_admin_logged_in']);
}

/**
 * اگر لاگین نیست:
 * - لاک IP را چک می‌کند
 * - فرم لاگین را هندل می‌کند
 * - فرم HTML لاگین را نمایش می‌دهد و exit می‌کند
 *
 * اگر لاگین است:
 * - فقط return می‌کند
 */
function ux_require_login(array $config): void
{
    if (ux_is_logged_in()) {
        return;
    }

    $ip            = ux_get_user_ip();
    $lockRemaining = ux_login_lock_remaining($ip, $config);
    $error         = '';

    // تولید و بررسی CSRF برای فرم لاگین
    if (empty($_SESSION['ux_login_csrf'])) {
        try {
            $_SESSION['ux_login_csrf'] = bin2hex(random_bytes(16));
        } catch (Exception $e) {
            $_SESSION['ux_login_csrf'] = md5(uniqid('ux_login_csrf', true));
        }
    }
    $loginCsrf = $_SESSION['ux_login_csrf'];

    // اگر لاک نیست و فرم لاگین POST شده
    if (
        $lockRemaining <= 0 &&
        (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') &&
        (($_POST['ux_action'] ?? '') === 'login')
    ) {
        // بررسی توکن CSRF
        $postedToken = (string)($_POST['csrf'] ?? '');
        if (!hash_equals($loginCsrf, $postedToken)) {
            $error         = ux_t('error_invalid_token', 'خطا: توکن امنیتی نامعتبر است.');
            // ثبت تلاش ناموفق بدون افزایش شمارنده (تا کاربر در چند ثانیه مجدد ارسال نکند)
            ux_record_login_attempt($ip, false, $config);
            $lockRemaining = ux_login_lock_remaining($ip, $config);
        } else {
        $username   = trim((string)($_POST['username'] ?? ''));
        $password   = (string)($_POST['password'] ?? '');
        $storedUser = (string)($config['admin_username'] ?? '');
        $storedPass = (string)($config['admin_password'] ?? '');

        $passwordMatch = false;
        if ($storedPass !== '') {
            // اگر پسورد هَش شده (bcrypt و ...)
            if (preg_match('/^\$2[aby]\$/', $storedPass)) {
                $passwordMatch = password_verify($password, $storedPass);
            } else {
                // مقایسه ساده (برای پسوردهای ساده قدیمی)
                $passwordMatch = hash_equals($storedPass, $password);
            }
        }

            if ($username === $storedUser && $passwordMatch) {
                // لاگین موفق
                ux_record_login_attempt($ip, true, $config);
                session_regenerate_id(true);
                $_SESSION['ux_admin_logged_in'] = true;

                $target = $_SERVER['REQUEST_URI'] ?? '';
                if ($target === '') {
                    $target = './';
                }
                header('Location: ' . $target, true, 302);
                exit;
            } else {
                // لاگین ناموفق
                ux_record_login_attempt($ip, false, $config);
                $error         = ux_t('login_error', 'نام کاربری یا رمز عبور اشتباه است.');
                $lockRemaining = ux_login_lock_remaining($ip, $config);
            }
        }
    } elseif ($lockRemaining > 0) {
        $error = ux_t('login_error_rate_limit', 'تعداد تلاش ناموفق زیاد است. لطفاً بعداً دوباره تلاش کنید.');
    }

    // ============= رندر HTML فرم لاگین =============

    $currentLang = $GLOBALS['ux_lang'] ?? 'fa';
    $dirAttr     = ux_is_rtl_lang($currentLang) ? 'rtl' : 'ltr';

    $htmlTitle = htmlspecialchars(
        ux_t('admin_login_title', 'Campaign Gateway Login'),
        ENT_QUOTES,
        'UTF-8'
    );
    $labelUser = htmlspecialchars(
        ux_t('login_username', 'Username'),
        ENT_QUOTES,
        'UTF-8'
    );
    $labelPass = htmlspecialchars(
        ux_t('login_password', 'Password'),
        ENT_QUOTES,
        'UTF-8'
    );
    $btnText = htmlspecialchars(
        ux_t('login_button', 'Login'),
        ENT_QUOTES,
        'UTF-8'
    );
    $errorText = $error !== '' ? htmlspecialchars($error, ENT_QUOTES, 'UTF-8') : '';

    $lockText = '';
    if ($lockRemaining > 0) {
        $lockText = htmlspecialchars(
            ux_t(
                'login_locked_message',
                'ورود موقتاً مسدود شده است. چند دقیقه دیگر دوباره تلاش کنید.'
            ),
            ENT_QUOTES,
            'UTF-8'
        );
    }

    ?>
    <!doctype html>
    <html lang="<?php echo htmlspecialchars($currentLang, ENT_QUOTES, 'UTF-8'); ?>" dir="<?php echo $dirAttr; ?>">
    <head>
        <meta charset="utf-8">
        <title><?php echo $htmlTitle; ?></title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <?php
            $ux_css_ver = @filemtime(__DIR__ . '/assets/css/ux-login.css') ?: time();
        ?>
        <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/css/ux-fonts.css.php?v=' . $ux_css_ver, ENT_QUOTES, 'UTF-8'); ?>">
        <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/css/ux-login.css?v=' . $ux_css_ver, ENT_QUOTES, 'UTF-8'); ?>">
    </head>
    <body>
    <div class="ux-login-card">
        <h1 class="ux-login-title"><?php echo $htmlTitle; ?></h1>
        <p class="ux-login-sub">
            <?php echo htmlspecialchars(
                ux_t('admin_login_subtitle', 'برای ورود به پنل مدیریت، مشخصات خود را وارد کنید.'),
                ENT_QUOTES,
                'UTF-8'
            ); ?>
        </p>

        <?php if ($errorText !== ''): ?>
            <div class="ux-error"><?php echo $errorText; ?></div>
        <?php endif; ?>

        <?php if ($lockRemaining > 0 && $lockText !== ''): ?>
            <div class="ux-lock"><?php echo $lockText; ?></div>
        <?php endif; ?>

        <form method="post">
            <input type="hidden" name="ux_action" value="login">
            <!-- CSRF token برای امنیت فرم لاگین -->
            <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($loginCsrf, ENT_QUOTES, 'UTF-8'); ?>">
            <div class="ux-field">
                <label class="ux-label"><?php echo $labelUser; ?></label>
                <input class="ux-input" type="text" name="username" autocomplete="username">
            </div>
            <div class="ux-field">
                <label class="ux-label"><?php echo $labelPass; ?></label>
                <input class="ux-input" type="password" name="password" autocomplete="current-password">
            </div>
            <button class="ux-btn" type="submit"><?php echo $btnText; ?></button>
        </form>
    </div>
    </body>
    </html>
    <?php
    exit;
}
