<?php
/**
 * ux_frontend_css.php
 * Standalone stylesheet endpoint for the campaign / waiting-room page.
 * (Keeps all CSS out of inline <style> blocks.)
 */

declare(strict_types=1);

header('Content-Type: text/css; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=300');

$config = @require __DIR__ . '/ux_config.php';
if (!is_array($config)) {
    $config = [];
}

// Bring helper(s) (ux_font_base_url, etc.) into scope.
require_once __DIR__ . '/ux_frontend.php';

// -------- Compute the variables used by assets/css/ux-frontend.css.php --------

$primary_color = !empty($config['primary_color']) ? (string)$config['primary_color'] : '#ff6a00';
$bg_color      = !empty($config['bg_color']) ? (string)$config['bg_color'] : '#050816';
$body_font     = isset($config['body_font_family']) ? (string)$config['body_font_family'] : '';
$title_fs      = isset($config['title_font_size']) ? (string)$config['title_font_size'] : '22px';
$subtitle_fs   = isset($config['subtitle_font_size']) ? (string)$config['subtitle_font_size'] : '14px';

$theme_mode   = isset($config['theme_mode']) ? (string)$config['theme_mode'] : 'glass';
$enable_glow  = !empty($config['enable_glow']);
$glow_color   = !empty($config['glow_color']) ? (string)$config['glow_color'] : $primary_color;
$shadow_style = isset($config['shadow_style']) ? (string)$config['shadow_style'] : 'trend-soft';

// Media widths
$media_width_desktop = isset($config['media_width_desktop'])
    ? (int)$config['media_width_desktop']
    : (isset($config['media_width']) ? (int)$config['media_width'] : 60);
$media_width_mobile  = isset($config['media_width_mobile'])
    ? (int)$config['media_width_mobile']
    : (isset($config['media_width']) ? (int)$config['media_width'] : 90);

if ($media_width_desktop < 10) $media_width_desktop = 10;
if ($media_width_desktop > 100) $media_width_desktop = 100;
if ($media_width_mobile < 10) $media_width_mobile = 10;
if ($media_width_mobile > 100) $media_width_mobile = 100;

// Persian font selection (same logic as ux_render_page)
$fonts_dir = __DIR__ . '/assets/fonts';
$persian_font_file = isset($config['persian_font_file']) ? (string)$config['persian_font_file'] : '';
if ($persian_font_file !== '' && !is_file($fonts_dir . '/' . $persian_font_file)) {
    $persian_font_file = '';
}
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
    $ext = strtolower((string)pathinfo($persian_font_file, PATHINFO_EXTENSION));
    if ($ext === 'ttf') {
        $persian_font_format = 'truetype';
    } elseif ($ext === 'otf') {
        $persian_font_format = 'opentype';
    } elseif (in_array($ext, ['woff','woff2','eot'], true)) {
        $persian_font_format = $ext;
    }
    $persian_font_src = $persian_font_file;
}

// Theme mode colors
$card_bg    = 'rgba(10,10,26,0.78)';
$text_main  = '#f5f5f7';

if ($theme_mode === 'light') {
    $bg_color   = $bg_color ?: '#f5f5f7';
    $card_bg    = 'rgba(255,255,255,0.9)';
    $text_main  = '#111111';
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

// Card shadow
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
    $btn_shadow = '0 18px 40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.12)';
} elseif ($shadow_style === 'soft-float') {
    $btn_shadow = '0 16px 40px rgba(0,0,0,0.75)';
} elseif ($shadow_style === 'none') {
    $btn_shadow = 'none';
}

// Output the CSS template (expects the vars above).
require __DIR__ . '/assets/css/ux-frontend.css.php';
