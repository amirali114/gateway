<?php
/**
 * ux-fonts.css.php
 * Dynamic font-face stylesheet (local fonts) for both frontend and admin panel.
 *
 * - Reads selected Persian font from ux_config.php.
 * - No external dependencies.
 */

header('Content-Type: text/css; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');

$root = dirname(dirname(__DIR__)); // .../unixsee_campaign_gateway
$configFile = $root . '/ux_config.php';
$config = [];
if (is_file($configFile)) {
    $cfg = include $configFile;
    if (is_array($cfg)) {
        $config = $cfg;
    }
}

$fontsDir = $root . '/assets/fonts';

// Build fonts URL based on current script URL
$script = (string)($_SERVER['SCRIPT_NAME'] ?? '');
$assetsUrl = rtrim(dirname(dirname($script)), '/'); // /.../assets
$fontsUrl  = $assetsUrl . '/fonts';

// Persian font selection (same logic as admin panel + frontend)
$persianFontFile = $config['persian_font_file'] ?? '';
if (!is_string($persianFontFile)) {
    $persianFontFile = '';
}
$persianFontFile = trim($persianFontFile);
if ($persianFontFile !== '' && !is_file($fontsDir . '/' . $persianFontFile)) {
    $persianFontFile = '';
}
if ($persianFontFile === '') {
    foreach (['Estedad-VF.woff2', 'Estedad-VF.woff', 'kalameh-regular.woff2', 'kalameh-regular.woff', 'kalameh-regular.ttf'] as $candidate) {
        if (is_file($fontsDir . '/' . $candidate)) {
            $persianFontFile = $candidate;
            break;
        }
    }
}

$persianFormat = '';
if ($persianFontFile !== '') {
    $ext = strtolower(pathinfo($persianFontFile, PATHINFO_EXTENSION));
    if ($ext === 'ttf') {
        $persianFormat = 'truetype';
    } elseif ($ext === 'otf') {
        $persianFormat = 'opentype';
    } elseif (in_array($ext, ['woff', 'woff2', 'eot'], true)) {
        $persianFormat = $ext;
    }
}

function ux_css_escape(string $s): string {
    return str_replace(['"', "\\", "\n", "\r"], ['%22', '%5C', '', ''], $s);
}

if ($persianFontFile !== '' && $persianFormat !== '') {
    $persianSources = [];
    $selectedBase = strtolower((string)pathinfo($persianFontFile, PATHINFO_FILENAME));

    if ($selectedBase === 'estedad-vf') {
        foreach (['Estedad-VF.woff2' => 'woff2', 'Estedad-VF.woff' => 'woff'] as $candidate => $format) {
            if (is_file($fontsDir . '/' . $candidate)) {
                $url = ux_css_escape($fontsUrl . '/' . str_replace('\\', '/', $candidate));
                $persianSources[] = 'url("' . $url . '") format("' . ux_css_escape($format) . '")';
            }
        }
    }

    if (!$persianSources) {
        $url = ux_css_escape($fontsUrl . '/' . str_replace('\\', '/', $persianFontFile));
        $persianSources[] = 'url("' . $url . '") format("' . ux_css_escape($persianFormat) . '")';
    }

    $fontWeight = ($selectedBase === 'estedad-vf') ? '100 900' : '400';
    echo '@font-face{font-family:"UnixseePersian";src:' . implode(',', $persianSources) . ';font-weight:' . $fontWeight . ';font-style:normal;font-display:swap;}' . "\n";
}

// OpenSans (always shipped locally)
$osRegularW2 = ux_css_escape($fontsUrl . '/open-sans-regular.woff2');
$osRegularW  = ux_css_escape($fontsUrl . '/open-sans-regular.woff');
$osLightW2   = ux_css_escape($fontsUrl . '/open-sans-300.woff2');
$osLightW    = ux_css_escape($fontsUrl . '/open-sans-300.woff');

echo "@font-face{font-family:\"UnixseeOpenSans\";src:url(\"{$osRegularW2}\") format(\"woff2\"),url(\"{$osRegularW}\") format(\"woff\");font-weight:400;font-style:normal;font-display:swap;}\n";
echo "@font-face{font-family:\"UnixseeOpenSans\";src:url(\"{$osLightW2}\") format(\"woff2\"),url(\"{$osLightW}\") format(\"woff\");font-weight:300;font-style:normal;font-display:swap;}\n";

echo ':root{--ux-font-fa:"UnixseePersian","UnixseeOpenSans",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",tahoma,Arial,sans-serif;--ux-font-en:"UnixseeOpenSans",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",tahoma,Arial,sans-serif;--ux-font-ui:var(--ux-font-en);}' . "
";
echo 'html[lang^="fa"],html[lang^="ar"]{--ux-font-ui:var(--ux-font-fa);}' . "
";
echo 'html[lang^="fa"] body,html[lang^="fa"] button,html[lang^="fa"] input,html[lang^="fa"] textarea,html[lang^="fa"] select,html[lang^="ar"] body,html[lang^="ar"] button,html[lang^="ar"] input,html[lang^="ar"] textarea,html[lang^="ar"] select{font-family:var(--ux-font-fa);}' . "
";
echo 'html[lang^="en"] body,html[lang^="en"] button,html[lang^="en"] input,html[lang^="en"] textarea,html[lang^="en"] select{font-family:var(--ux-font-en);}' . "
";
echo 'input::placeholder,textarea::placeholder{font-family:var(--ux-font-en);}' . "
";
echo 'code,pre,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;}' . "
";
