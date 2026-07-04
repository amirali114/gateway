<?php
/**
 * نقطهٔ ورود جدید پنل ادمین برای Unixsee Campaign Gateway.
 * این فایل اجازه می‌دهد بدون استفاده از توکن در URL، پنل مدیریت را
 * از مسیر ثابتی مانند /unixsee_campaign_gateway/admin.php بارگذاری کنید.
 *
 * این فایل توابع و تنظیمات موردنیاز را از gateway.php و سایر
 * فایل‌های کمکی بارگذاری می‌کند و سپس ux_admin_panel را اجرا می‌کند.
 */

// تعریف constant برای جلوگیری از اجرای روتر اصلی در gateway.php
define('UX_ADMIN_ENTRY', true);

// شروع سشن (لازم برای احراز هویت ادمین)
// بررسی می‌کنیم که سشن قبلاً شروع نشده باشد، زیرا در صورت فراخوانی مجدد
// session_start() پیغام Notice صادر می‌شود. بنابراین فقط در صورت عدم وجود سشن فعال اجرا می‌شود.
if (session_status() === PHP_SESSION_NONE) {
    // Determine if HTTPS is enabled
    $secureFlag = false;
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        $secureFlag = true;
    }
    // Configure session cookie parameters for increased security
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secureFlag,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

// بارگذاری فایل اصلی gateway برای دسترسی به توابع کانفیگ و کمکی
require_once __DIR__ . '/gateway.php';

// Analytics class (used by admin dashboard)
require_once __DIR__ . '/core/Gateway/GatewayAnalytics.php';

// اکنون توابع ux_default_config(), ux_load_config(), ux_save_config() و سایر توابع مورد نیاز
// از طریق فایل gateway.php در دسترس هستند.

// بارگذاری فایل‌های مربوط به لاگین و پنل ادمین
require_once __DIR__ . '/ux_admin.php';
require_once __DIR__ . '/ux_admin_panel.php';

// تعیین مسیر فایل کانفیگ و لود آن
$config_file = __DIR__ . '/ux_config.php';
$config      = ux_load_config($config_file);

// اجرا پنل ادمین
ux_admin_panel($config_file, $config);
