<?php
/* ================== صفحه کمپین / صف انتظار ================== */

function ux_font_base_url() {
    // پایه‌ی URL فونت‌ها بر اساس دایرکتوری خود گیت‌وی
    $gateway_dir = '/' . trim(basename(__DIR__), '/'); // مثل: /unixsee_campaign_gateway

    // دایرکتوری اسکریپت فعلی
    $script_dir = isset($_SERVER['SCRIPT_NAME']) ? dirname($_SERVER['SCRIPT_NAME']) : '';

    if ($script_dir === '/' || $script_dir === '\\' || $script_dir === '') {
        // وقتی از روت سایت (index.php) اجرا می‌شود
        $base = $gateway_dir;
    } else {
        // وقتی مستقیماً خود gateway.php یا زیرمسیرهای آن اجرا شوند
        $base = rtrim($script_dir, '/');
    }

    return $base . '/assets/fonts';

}


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

function ux_cache_file_path() {
    return __DIR__ . '/ux_campaign_page_cache.html';
}

function ux_clear_page_cache() {
    $file = ux_cache_file_path();
    if (file_exists($file)) {
        @unlink($file);
    }
}

/**
 * رندر صفحه کمپین با کش ساده فایل.
 * اگر page_cache_ttl <= 0 باشد، کش غیرفعال است و مستقیماً ux_render_page اجرا می‌شود.
 * در ترافیک بالا پیشنهاد می‌شود مقدار کوچکی مثل 10–30 ثانیه تنظیم شود.
 */
function ux_render_page_cached(array $config) {
    // Log view of campaign/queue page for Traffic Intelligence
    if (function_exists('ux_log_human_visit')) {
        try { ux_log_human_visit($config); } catch (Throwable $e) { /* ignore */ }
    }

    $ttl = isset($config['page_cache_ttl']) ? (int)$config['page_cache_ttl'] : 0;
    if ($ttl <= 0) {
        ux_render_page($config);
        return;
    }

    $file = ux_cache_file_path();
    $now  = time();

    if (file_exists($file) && ($now - filemtime($file) < $ttl)) {
        readfile($file);
        return;
    }

    ob_start();
    ux_render_page($config);
    $html = ob_get_clean();
    if ($html !== '' && $html !== false) {
        @file_put_contents($file, $html, LOCK_EX);
    }
    echo $html;
}

function ux_render_page(array $config) {
    // شمارش معکوس
    $remaining_seconds = 0;
    if (!empty($config['show_countdown']) && !empty($config['countdown_target'])) {
        try {
            $tz = new DateTimeZone($config['timezone'] ?? 'Asia/Tehran');
            $now = new DateTimeImmutable('now', $tz);
            $target = new DateTimeImmutable($config['countdown_target'], $tz);
            $diff   = $target->getTimestamp() - $now->getTimestamp();
            $remaining_seconds = max(0, $diff);
        } catch (Exception $e) {
            $remaining_seconds = 0;
        }
    }

    $title         = $config['page_title'] ?? 'کمپین در حال آماده‌سازی است';
    $subtitle      = $config['page_subtitle'] ?? '';
    $media_url     = $config['media_url'] ?? '';
    $primary_color = $config['primary_color'] ?: '#ff6a00';
    $bg_color      = $config['bg_color'] ?: '#050816';
    $custom_html   = $config['custom_html'] ?? '';
    $theme_css_url = $config['theme_css_url'] ?? '';

    $body_font   = $config['body_font_family'] ?? '';
    $title_fs    = $config['title_font_size'] ?? '22px';
    $subtitle_fs = $config['subtitle_font_size'] ?? '14px';

    // فونت فارسی انتخاب‌شده برای صفحه کمپین / صف انتظار
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

    $theme_mode  = $config['theme_mode'] ?? 'glass';

    $enable_glow   = !empty($config['enable_glow']);
    $glow_color    = $config['glow_color'] ?: $primary_color;
    $shadow_style  = $config['shadow_style'] ?? 'trend-soft';

    // تنظیمات تصویر / GIF
    $media_width_desktop = isset($config['media_width_desktop'])
        ? (int)$config['media_width_desktop']
        : (isset($config['media_width']) ? (int)$config['media_width'] : 60);
    $media_width_mobile  = isset($config['media_width_mobile'])
        ? (int)$config['media_width_mobile']
        : (isset($config['media_width']) ? (int)$config['media_width'] : 90);

    // محدود کردن به بازه منطقی
    if ($media_width_desktop < 10) $media_width_desktop = 10;
    if ($media_width_desktop > 100) $media_width_desktop = 100;
    if ($media_width_mobile < 10)  $media_width_mobile  = 10;
    if ($media_width_mobile > 100) $media_width_mobile  = 100;

    $media_align    = $config['media_align']    ?? 'center';
    $media_bg_color = $config['media_bg_color'] ?? '';
    $media_radius   = $config['media_radius']   ?? '20px';

    // متن‌های برند
    $brand_tagline = $config['brand_tagline'] ?? 'unixsee Campaign Gateway – محافظ هوشمند کمپین فروش';
    $footer_text   = $config['footer_text']   ?? 'قدرت‌گرفته از unixsee – طراحی و توسعه توسط Team unixsee';

    // رفرش خودکار
    $auto_retry_enabled   = !empty($config['auto_retry_enabled']);
    $auto_retry_interval  = max(10, (int)($config['auto_retry_interval'] ?? 30));
    $retry_button_enabled = !empty($config['retry_button_enabled']);
    $retry_button_text    = $config['retry_button_text'] ?? '🔄 بررسی وضعیت ورود';
    $mode                 = $config['mode'] ?? 'maintenance';

    // استایل‌های داینامیک تصویر
    $media_wrapper_style = '';
    if (!empty($media_bg_color) && strtolower($media_bg_color) !== 'transparent') {
        $media_wrapper_style .= 'background:' . $media_bg_color . ';padding:10px;border-radius:' . $media_radius . ';';
    }
    if ($media_align === 'right') {
        $media_wrapper_style .= 'text-align:right;';
    } elseif ($media_align === 'left') {
        $media_wrapper_style .= 'text-align:left;';
    } else {
        $media_wrapper_style .= 'text-align:center;';
    }

    // خود عرض در CSS ریسپانسیو کنترل می‌شود؛ اینجا فقط رفتار خود تصویر را تنظیم می‌کنیم
    $media_img_style = 'border-radius:' . $media_radius . ';display:block;width:100%;height:auto;';
    if ($media_align === 'right') {
        $media_img_style .= 'margin:0 0 0 auto;';
    } elseif ($media_align === 'left') {
        $media_img_style .= 'margin:0 auto 0 0;';
    } else {
        $media_img_style .= 'margin:0 auto;';
    }

    // تم‌ها
    $card_bg    = 'rgba(10,10,26,0.78)';
    $text_main  = '#f5f5f7';
    $text_muted = 'rgba(245,245,247,0.8)';

    if ($theme_mode === 'light') {
        $bg_color   = $bg_color ?: '#f5f5f7';
        $card_bg    = 'rgba(255,255,255,0.9)';
        $text_main  = '#111111';
        $text_muted = 'rgba(0,0,0,0.7)';
    } elseif ($theme_mode === 'dark') {
        $bg_color   = $bg_color ?: '#050816';
        $card_bg    = 'rgba(8,8,18,0.9)';
    } elseif ($theme_mode === 'blackfriday') {
        $bg_color   = $bg_color ?: '#000000';
        $card_bg    = 'linear-gradient(135deg, rgba(0,0,0,0.94), rgba(40,0,0,0.98))';
        if (empty($primary_color) || $primary_color === '#ff6a00') {
            $primary_color = '#ffc300';
        }
    } else { // glass
        $bg_color = $bg_color ?: '#050816';
        $card_bg  = 'rgba(10,10,26,0.78)';
    }

    // سایه کارت
    $card_box_shadow = '0 22px 60px rgba(0,0,0,0.85)';
    if ($shadow_style === 'trend-soft') {
        $card_box_shadow = '0 20px 55px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)';
    } elseif ($shadow_style === 'trend-deep') {
        $card_box_shadow = '0 34px 90px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08)';
    } elseif ($shadow_style === 'soft-float') {
        $card_box_shadow = '0 18px 45px rgba(0,0,0,0.7), 0 24px 50px rgba(0,0,0,0.5)';
    } elseif ($shadow_style === 'none') {
        $card_box_shadow = 'none';
    }

    $card_border_css = '1px solid rgba(255,255,255,0.12)';
    if ($enable_glow) {
        $card_border_css = '1px solid rgba(255,255,255,0.18)';
        $card_box_shadow .= ', 0 0 0 1px ' . $glow_color . ', 0 0 24px ' . $glow_color . ', 0 0 48px ' . $glow_color;
    }

    $btn_shadow = '0 14px 30px rgba(0,0,0,0.75)';
    if ($shadow_style === 'trend-soft') {
        $btn_shadow = '0 12px 26px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)';
    } elseif ($shadow_style === 'trend-deep') {
        $btn_shadow = '0 20px 45px rgba(0,0,0,0.9)';
    } elseif ($shadow_style === 'soft-float') {
        $btn_shadow = '0 14px 32px rgba(0,0,0,0.75)';
    } elseif ($shadow_style === 'none') {
        $btn_shadow = 'none';
    }
    if ($enable_glow) {
        $btn_shadow .= ', 0 0 18px ' . $glow_color;
    }

    http_response_code(503);
    ux_log_bot_visit($config, 503);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    $gateway_indexable = !empty($config['gateway_indexable']);
    if (!$gateway_indexable) {
        header('X-Robots-Tag: noindex, nofollow', true);
    }
    ?>
<!doctype html>
<html lang="<?php echo htmlspecialchars($GLOBALS['ux_lang'] ?? 'fa', ENT_QUOTES, 'UTF-8'); ?>"
      dir="<?php echo ux_is_rtl_lang($GLOBALS['ux_lang'] ?? 'fa') ? 'rtl' : 'ltr'; ?>">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php if (empty($config['gateway_indexable'])): ?>
        <meta name="robots" content="noindex, nofollow">
    <?php endif; ?>
    <?php if (!empty($theme_css_url)): ?>
        <link rel="stylesheet" href="<?php echo htmlspecialchars($theme_css_url, ENT_QUOTES, 'UTF-8'); ?>">
    <?php endif; ?>
    <?php
        $ux_cfg_ver = @filemtime(__DIR__ . '/ux_config.php') ?: time();
        $ux_css_ver = @filemtime(__DIR__ . '/assets/css/ux-frontend.css.php') ?: $ux_cfg_ver;
    ?>
    <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/assets/css/ux-fonts.css.php?v=' . $ux_cfg_ver, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="<?php echo htmlspecialchars(ux_gateway_base_url() . '/ux_frontend_css.php?v=' . $ux_css_ver . '&cfg=' . $ux_cfg_ver, ENT_QUOTES, 'UTF-8'); ?>">

</head>
<body>
<div class="ux-wrapper">
    <div class="ux-inner">
        <div class="ux-brand">
            <span class="ux-dot"></span>
            <span><?php echo htmlspecialchars($brand_tagline, ENT_QUOTES, 'UTF-8'); ?></span>
        </div>

        <?php if (!empty($media_url)): ?>
            <div class="ux-media" style="<?php echo htmlspecialchars($media_wrapper_style, ENT_QUOTES, 'UTF-8'); ?>">
                <div class="ux-media-inner">
                    <img src="<?php echo htmlspecialchars($media_url, ENT_QUOTES, 'UTF-8'); ?>"
                         alt=""
                         style="<?php echo htmlspecialchars($media_img_style, ENT_QUOTES, 'UTF-8'); ?>">
                </div>
            </div>
        <?php endif; ?>

        <div class="ux-title"><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></div>
        <div class="ux-subtitle"><?php echo nl2br(htmlspecialchars($subtitle, ENT_QUOTES, 'UTF-8')); ?></div>

        <?php if (!empty($config['show_countdown']) && $remaining_seconds > 0): ?>
            <div id="ux-countdown" class="ux-countdown" data-remaining="<?php echo (int)$remaining_seconds; ?>">
                <div class="ux-countdown-item">
                    <div class="ux-countdown-value" id="ux-days">--</div>
                    <div class="ux-countdown-label"><?php echo htmlspecialchars(ux_t('countdown_days', 'روز'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="ux-countdown-item">
                    <div class="ux-countdown-value" id="ux-hours">--</div>
                    <div class="ux-countdown-label"><?php echo htmlspecialchars(ux_t('countdown_hours', 'ساعت'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="ux-countdown-item">
                    <div class="ux-countdown-value" id="ux-mins">--</div>
                    <div class="ux-countdown-label"><?php echo htmlspecialchars(ux_t('countdown_minutes', 'دقیقه'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
                <div class="ux-countdown-item">
                    <div class="ux-countdown-value" id="ux-secs">--</div>
                    <div class="ux-countdown-label"><?php echo htmlspecialchars(ux_t('countdown_seconds', 'ثانیه'), ENT_QUOTES, 'UTF-8'); ?></div>
                </div>
            </div>
        <?php endif; ?>

        <?php if ($mode === 'queue' && $retry_button_enabled): ?>
        <a href="#" class="ux-btn" id="ux-retry-btn">
        <?php echo htmlspecialchars($retry_button_text, ENT_QUOTES, 'UTF-8'); ?>
            </a>
            <div style="font-size:11px;opacity:.8;margin-top:6px;">
                <?php echo htmlspecialchars(ux_t('auto_retry_before', 'تلاش خودکار بعد از'), ENT_QUOTES, 'UTF-8'); ?>
                <strong id="ux-auto-retry-counter"><?php echo (int)$auto_retry_interval; ?></strong>
                <?php echo htmlspecialchars(ux_t('auto_retry_after', 'ثانیه دیگر انجام می‌شود.'), ENT_QUOTES, 'UTF-8'); ?>
            </div>  
        <?php endif; ?>   


        <?php if (!empty(trim($custom_html))): ?>
            <div class="ux-custom">
                <?php echo $custom_html; ?>
            </div>
        <?php endif; ?>

        <div class="ux-footer">
            <?php echo htmlspecialchars($footer_text, ENT_QUOTES, 'UTF-8'); ?>
        </div>
    </div>
</div>

<?php if (!empty($config['show_countdown']) && $remaining_seconds > 0): ?>
<script>
    (function() {
        var el = document.getElementById('ux-countdown');
        if (!el) return;
        var remaining = parseInt(el.getAttribute('data-remaining'), 10);
        if (isNaN(remaining) || remaining <= 0) return;

        var daysEl  = document.getElementById('ux-days');
        var hoursEl = document.getElementById('ux-hours');
        var minsEl  = document.getElementById('ux-mins');
        var secsEl  = document.getElementById('ux-secs');

        function render(sec) {
            if (sec < 0) sec = 0;
            var days  = Math.floor(sec / (60 * 60 * 24));
            var hours = Math.floor((sec % (60 * 60 * 24)) / (60 * 60));
            var mins  = Math.floor((sec % (60 * 60)) / 60);
            var secs  = Math.floor(sec % 60);

            daysEl.textContent  = days;
            hoursEl.textContent = hours;
            minsEl.textContent  = mins;
            secsEl.textContent  = secs;
        }

        render(remaining);
        setInterval(function() {
            remaining--;
            if (remaining < 0) remaining = 0;
            render(remaining);
        }, 1000);
    })();
</script>
<?php endif; ?>

<script>
(function () {
    var isQueueMode   = <?php echo $mode === 'queue' ? 'true' : 'false'; ?>;
    var autoEnabled   = <?php echo ($mode === 'queue' && $auto_retry_enabled) ? 'true' : 'false'; ?>;
    var intervalSec   = <?php echo (int)$auto_retry_interval; ?>;
    var retryBtn      = document.getElementById('ux-retry-btn');

    if (!isQueueMode) return;

    if (retryBtn) {
        retryBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.reload();
        });
    }

    if (autoEnabled) {
    if (intervalSec < 10) intervalSec = 10;

    var remaining = intervalSec;
    var counterEl = document.getElementById('ux-auto-retry-counter');

    function tick() {
        // به‌روزرسانی عدد روی صفحه
        if (counterEl) {
            counterEl.textContent = remaining;
        }

        // وقتی به صفر رسید → رفرش صفحه
        if (remaining <= 0) {
            window.location.reload();
            return;
        }

        remaining--;
        setTimeout(tick, 1000);
    }

    // شروع شمارش معکوس
    tick();
}

})();
</script>

<!-- ارسال پیام به پنل مدیریت پس از بارگذاری کامل صفحه جهت اعمال مجدد اسکیل در پیش‌نمایش -->
<script>
(function() {
    // اگر درون iframe نمایش داده می‌شود، سیگنال بارگذاری را به والد بفرست
    if (window.parent && window.parent !== window) {
        try {
            window.parent.postMessage('ux-preview-loaded', '*');
        } catch (e) {
            // سکوت در صورت خطا
        }
    }
})();
</script>
</body>
</html>
<?php
    exit;
}