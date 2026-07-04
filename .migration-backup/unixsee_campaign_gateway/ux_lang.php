<?php
/**
 * Language & translation helpers for Unixsee Campaign Gateway
 */

function ux_determine_language(array $config): string
{
    // لیست زبان‌های مجاز از کانفیگ
    $available = $config['available_languages'] ?? ['fa', 'en'];
    $available = array_values(array_unique(array_map(function ($l) {
        $l = strtolower(trim((string)$l));
        // فقط حروف a-z برای سادگی
        $l = preg_replace('/[^a-z]/', '', $l);
        return $l ?: 'fa';
    }, $available)));
    if (!$available) {
        $available = ['fa', 'en'];
    }

    // ۱) اگر ux_lang در GET باشد، همان را انتخاب و در کوکی ذخیره کن
    if (isset($_GET['ux_lang'])) {
        $lang = strtolower(trim((string)$_GET['ux_lang']));
        $lang = preg_replace('/[^a-z]/', '', $lang);
        if (!$lang) {
            $lang = 'fa';
        }
        if (!in_array($lang, $available, true)) {
            $lang = $available[0];
        }
        // کوکی ۳۰ روزه
        setcookie('ux_lang', $lang, time() + 30 * 24 * 3600, "/");
        return $lang;
    }

    // ۲) اگر قبلاً در کوکی ذخیره شده باشد
    if (isset($_COOKIE['ux_lang'])) {
        $lang = strtolower(trim((string)$_COOKIE['ux_lang']));
        $lang = preg_replace('/[^a-z]/', '', $lang);
        if ($lang && in_array($lang, $available, true)) {
            return $lang;
        }
    }

    // ۳) تشخیص حدودی از روی زبان مرورگر
    if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        $header = strtolower((string)$_SERVER['HTTP_ACCEPT_LANGUAGE']);

        // اگر فارسی / ایران دیده شد
        if (strpos($header, 'fa') !== false || strpos($header, 'ir') !== false) {
            if (in_array('fa', $available, true)) {
                return 'fa';
            }
        }

        // اگر انگلیسی دیده شد
        if (strpos($header, 'en') !== false) {
            if (in_array('en', $available, true)) {
                return 'en';
            }
        }
    }

    // در نهایت: اولین زبان لیست
    return $available[0];
}

function ux_load_translations(string $lang): array
{
    $file = __DIR__ . '/lang/' . $lang . '.php';
    if (is_file($file)) {
        $data = include $file;
        if (is_array($data)) {
            return $data;
        }
    }
    return [];
}

// آیا زبان راست به چپ است (برای تنظیم direction)
function ux_is_rtl_lang(string $lang): bool
{
    return in_array(strtolower($lang), ['fa', 'ar', 'ps'], true);
}

// تابع اصلی ترجمه
function ux_t(string $key, ?string $default = null): string
{
    $lang = $GLOBALS['ux_lang']         ?? 'fa';
    $all  = $GLOBALS['ux_translations'] ?? [];
    if (isset($all[$key])) {
        return (string)$all[$key];
    }
    return $default ?? $key;
}

// مقداردهی سراسری (باید بعد از لود شدن $config صدا زده شود)
if (!isset($GLOBALS['ux_lang'])) {
    $GLOBALS['ux_lang'] = ux_determine_language($config);
}
$GLOBALS['ux_translations'] = ux_load_translations($GLOBALS['ux_lang']);
