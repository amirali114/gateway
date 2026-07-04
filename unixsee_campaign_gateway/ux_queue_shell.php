<?php
/**
 * ux_queue_shell.php
 * Generates and serves a static waiting-room HTML shell + lightweight JSON check endpoint.
 *
 * NOTE: The shell HTML may be served for requests whose URL is NOT inside this gateway directory
 * (e.g. when gateway.php is included from a site's index.php). Therefore any linked assets
 * (CSS/images) must use an absolute, gateway-based URL to avoid broken styling.
 */

declare(strict_types=1);

/**
 * Best-effort public base URL for this gateway directory.
 * - If current SCRIPT_NAME path ends with the gateway folder, use that.
 * - Otherwise fall back to '/<gateway-folder>' (common deployment).
 */
function ux_gateway_public_base_url(): string
{
    $folder = trim((string)basename(__DIR__), '/');
    if ($folder === '') {
        return '';
    }

    $scriptDir = isset($_SERVER['SCRIPT_NAME']) ? rtrim(dirname((string)$_SERVER['SCRIPT_NAME']), '/') : '';
    if ($scriptDir === '' || $scriptDir === '/' || $scriptDir === '\\') {
        return '/' . $folder;
    }

    // If SCRIPT_NAME is already inside the gateway folder (including nested), prefer that.
    if (preg_match('~/' . preg_quote($folder, '~') . '$~', $scriptDir)) {
        return $scriptDir;
    }

    return '/' . $folder;
}

function ux_queue_shell_path(array $config): string
{
    $f = $config['queue_shell_file'] ?? 'ux_queue_shell.html';
    if (!is_string($f) || trim($f) === '') {
        $f = 'ux_queue_shell.html';
    }

    // Keep it inside gateway directory
    $f = basename($f);
    return __DIR__ . '/' . $f;
}

function ux_queue_shell_css_path(array $config): string
{
    $htmlPath = ux_queue_shell_path($config);
    $base = preg_replace('/\\.html?$/i', '', basename($htmlPath));
    if (!$base) {
        $base = 'ux_queue_shell';
    }
    return __DIR__ . '/' . $base . '.css';
}

function ux_queue_shell_css_public(array $config): string
{
    $htmlPath = ux_queue_shell_path($config);
    $base = preg_replace('/\\.html?$/i', '', basename($htmlPath));
    if (!$base) {
        $base = 'ux_queue_shell';
    }
    return $base . '.css';
}

function ux_queue_shell_enabled(array $config): bool
{
    return !empty($config['queue_shell_enabled']);
}

function ux_queue_shell_escape(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

/**
 * Normalize a possibly-relative asset URL to be served from the gateway folder.
 * - Keeps absolute URLs (http/https//) untouched.
 * - If it starts with 'assets/' or './assets/' -> prefixes with '__UX_BASE__/'
 * - If it already starts with '__UX_BASE__/' -> keeps.
 */
function ux_queue_shell_asset_url(string $url): string
{
    $u = trim($url);
    if ($u === '') {
        return '';
    }

    // Absolute URLs
    if (preg_match('~^(https?:)?//~i', $u)) {
        return $u;
    }

    // Already placeholdered
    if (strncmp($u, "__UX_BASE__/", 11) === 0) {
        return $u;
    }

    // Relative asset path
    $u = ltrim($u, '/');
    if (strncmp($u, "assets/", 7) === 0) {
        return '__UX_BASE__/' . $u;
    }

    // Keep other relative paths as-is
    return $u;
}

/**
 * Rebuild the static shell HTML (called on config save).
 */
function ux_queue_shell_rebuild(array $config): bool
{
    if (!ux_queue_shell_enabled($config)) {
        return false;
    }

    $title    = (string)($config['page_title'] ?? 'در حال آماده‌سازی…');
    $subtitle = (string)($config['page_subtitle'] ?? 'به دلیل ترافیک بالا، ورود به صورت نوبتی انجام می‌شود. لطفاً این صفحه را نبندید.');
    $primary  = (string)($config['primary_color'] ?? '#ff6a00');
    $bg       = (string)($config['bg_color'] ?? '#050816');
    $brand    = (string)($config['brand_tagline'] ?? 'unixsee Campaign Gateway');
    $footer   = (string)($config['footer_text'] ?? 'قدرت‌گرفته از unixsee');
    $mediaUrl = (string)($config['media_url'] ?? '');
    $themeCss = (string)($config['theme_css_url'] ?? '');
    $custom   = (string)($config['custom_html'] ?? '');

    $lang     = (string)($config['default_language'] ?? 'fa');
    $dir      = (function_exists('ux_is_rtl_lang') && ux_is_rtl_lang($lang)) ? 'rtl' : 'ltr';

    $noindex = empty($config['gateway_indexable']);

    $checkParam = (string)($config['queue_check_param'] ?? 'uxwr_check');
    if ($checkParam === '') {
        $checkParam = 'uxwr_check';
    }

    $btnText  = (string)($config['retry_button_text'] ?? 'بررسی وضعیت ورود');

    // Build and write the shell stylesheet next to the HTML (keeps all CSS out of inline <style>).
    $css  = ":root{--ux-primary:" . ux_queue_shell_escape($primary) . ";--ux-bg:" . ux_queue_shell_escape($bg) . ";}\n";
    $css .= "*{box-sizing:border-box} html,body{height:100%}\n";
    $css .= "body{margin:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(1200px 600px at 50% 0%, rgba(255,255,255,.06), transparent 60%), var(--ux-bg);color:#f5f5f7;font-family:\"UnixseePersian\",\"UnixseeOpenSans\",system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",tahoma,Arial,sans-serif;padding:18px}\n";
    $css .= ".card{width:min(520px,100%);background:rgba(10,10,26,.78);border:1px solid rgba(255,255,255,.12);border-radius:22px;box-shadow:0 20px 55px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06);padding:22px;backdrop-filter: blur(10px)}\n";
    $css .= ".brand{font-size:12px;letter-spacing:.2px;color:rgba(245,245,247,.7);margin-bottom:10px}\n";
    $css .= "h1{font-size:22px;line-height:1.35;margin:0 0 10px}\n";
    $css .= "p{margin:0 0 14px;color:rgba(245,245,247,.85);white-space:pre-line;font-size:14px;line-height:1.8}\n";
    $css .= ".media{margin:12px 0 16px;border-radius:16px;overflow:hidden}\n";
    $css .= ".media img{display:block;width:100%;height:auto}\n";
    $css .= ".row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:8px}\n";
    $css .= ".pill{display:inline-flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);font-size:13px;color:rgba(245,245,247,.9)}\n";
    $css .= ".dot{width:10px;height:10px;border-radius:50%;background:var(--ux-primary);box-shadow:0 0 18px rgba(255,106,0,.8)}\n";
    $css .= "button{appearance:none;border:0;border-radius:14px;padding:12px 14px;background:linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.06));color:#fff;cursor:pointer;font-weight:700;font-size:14px;box-shadow:0 12px 26px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.12)}\n";
    $css .= "button.primary{background:linear-gradient(135deg, var(--ux-primary), #ffb000)}\n";
    $css .= "button:disabled{opacity:.6;cursor:not-allowed}\n";
    $css .= ".meta{margin-top:14px;font-size:12px;color:rgba(245,245,247,.65)}\n";
    $css .= ".footer{margin-top:14px;font-size:12px;color:rgba(245,245,247,.55)}\n";
    $css .= ".grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}\n";
    $css .= ".k{font-size:11px;color:rgba(245,245,247,.65)} .v{font-size:13px;font-weight:700}\n";
    $css .= "@media (max-width:420px){.grid{grid-template-columns:1fr}}\n";

    $cssPath = ux_queue_shell_css_path($config);
    @file_put_contents($cssPath, $css, LOCK_EX);
    $cssPublic = ux_queue_shell_css_public($config);
    $cssVer = @filemtime($cssPath) ?: time();

    // Build static HTML
    $html = "<!doctype html>\n";
    $html .= "<html lang=\"" . ux_queue_shell_escape($lang) . "\" dir=\"" . ux_queue_shell_escape($dir) . "\">\n<head>\n";
    $html .= "  <meta charset=\"UTF-8\">\n";
    $html .= "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n";
    $html .= "  <title>" . ux_queue_shell_escape($title) . "</title>\n";
    if ($noindex) {
        $html .= "  <meta name=\"robots\" content=\"noindex, nofollow\">\n";
    }
    if ($themeCss !== '') {
        // if admin saved a relative css path, allow it but don't rewrite it here.
        $html .= "  <link rel=\"stylesheet\" href=\"" . ux_queue_shell_escape($themeCss) . "\">\n";
    }

    // IMPORTANT: always use placeholder base so it works even if the shell is served from a different URL.
    $html .= "  <link rel=\"stylesheet\" href=\"__UX_BASE__/assets/css/ux-fonts.css.php?v=" . (int)$cssVer . "\">\n";
    $html .= "  <link rel=\"stylesheet\" href=\"__UX_BASE__/" . ux_queue_shell_escape($cssPublic) . "?v=" . (int)$cssVer . "\">\n";
    $html .= "</head>\n<body>\n";

    $html .= "  <main class=\"card\">\n";
    $html .= "    <div class=\"brand\">" . ux_queue_shell_escape($brand) . "</div>\n";
    $html .= "    <h1>" . ux_queue_shell_escape($title) . "</h1>\n";
    $html .= "    <p>" . ux_queue_shell_escape($subtitle) . "</p>\n";

    $mediaOut = ux_queue_shell_asset_url($mediaUrl);
    if ($mediaOut !== '') {
        $html .= "    <div class=\"media\"><img src=\"" . ux_queue_shell_escape($mediaOut) . "\" alt=\"\"></div>\n";
    }

    $html .= "    <div class=\"row\">\n";
    $html .= "      <div class=\"pill\"><span class=\"dot\"></span><span id=\"uxStatus\">در صف هستید…</span></div>\n";
    $html .= "      <button class=\"primary\" id=\"uxCheckBtn\">" . ux_queue_shell_escape($btnText) . "</button>\n";
    $html .= "    </div>\n";

    $html .= "    <div class=\"grid\" aria-live=\"polite\">\n";
    $html .= "      <div class=\"pill\"><div><div class=\"k\">جایگاه شما</div><div class=\"v\" id=\"uxPos\">—</div></div></div>\n";
    $html .= "      <div class=\"pill\"><div><div class=\"k\">تعداد در صف</div><div class=\"v\" id=\"uxQCount\">—</div></div></div>\n";
    $html .= "      <div class=\"pill\"><div><div class=\"k\">فعال‌ها</div><div class=\"v\" id=\"uxActive\">—</div></div></div>\n";
    $html .= "      <div class=\"pill\"><div><div class=\"k\">ظرفیت</div><div class=\"v\" id=\"uxCap\">—</div></div></div>\n";
    $html .= "    </div>\n";

    if ($custom !== '') {
        $html .= "    <div class=\"meta\">" . $custom . "</div>\n";
    }

    $html .= "    <div class=\"footer\">" . ux_queue_shell_escape($footer) . "</div>\n";
    $html .= "  </main>\n";

    // JS: lightweight polling
    $html .= "  <script>\n";
    $html .= "  (function(){\n";
    $html .= "    const checkParam = " . json_encode($checkParam) . ";\n";
    $html .= "    const btn = document.getElementById('uxCheckBtn');\n";
    $html .= "    const st = document.getElementById('uxStatus');\n";
    $html .= "    const pos = document.getElementById('uxPos');\n";
    $html .= "    const qc = document.getElementById('uxQCount');\n";
    $html .= "    const ac = document.getElementById('uxActive');\n";
    $html .= "    const cap = document.getElementById('uxCap');\n";
    $html .= "    let timer = null;\n";
    $html .= "    let backoff = 0;\n";
    $html .= "    function setStatus(t){ if(st) st.textContent = t; }\n";
    $html .= "    function setNum(el, v){ if(!el) return; el.textContent = (v===null||v===undefined||v==='') ? '—' : String(v); }\n";
    $html .= "    async function check(){\n";
    $html .= "      btn && (btn.disabled = true);\n";
    $html .= "      try{\n";
    $html .= "        const url = (location.search ? (location.search + '&') : '?') + encodeURIComponent(checkParam) + '=1&_=' + Date.now();\n";
    $html .= "        const res = await fetch(url, {credentials:'same-origin', headers:{'Accept':'application/json'}});\n";
    $html .= "        if(!res.ok){ throw new Error('HTTP '+res.status); }\n";
    $html .= "        const data = await res.json();\n";
    $html .= "        backoff = 0;\n";
    $html .= "        if(data && data.status === 'pass'){\n";
    $html .= "          setStatus('✅ نوبت شما رسید؛ در حال ورود…');\n";
    $html .= "          setTimeout(function(){ location.reload(); }, 300);\n";
    $html .= "          return;\n";
    $html .= "        }\n";
    $html .= "        setStatus('⏳ در صف هستید…');\n";
    $html .= "        setNum(pos, data.position);\n";
    $html .= "        setNum(qc, data.queue_count);\n";
    $html .= "        setNum(ac, data.active_count);\n";
    $html .= "        setNum(cap, data.capacity);\n";
    $html .= "        const poll = Math.max(8, Math.min(30, parseInt(data.poll_after || 12, 10) || 12));\n";
    $html .= "        timer = setTimeout(check, poll*1000);\n";
    $html .= "      } catch(e){\n";
    $html .= "        backoff = Math.min(60, backoff ? backoff*2 : 12);\n";
    $html .= "        setStatus('⚠️ خطا در بررسی؛ تلاش مجدد…');\n";
    $html .= "        timer = setTimeout(check, backoff*1000);\n";
    $html .= "      } finally {\n";
    $html .= "        btn && (btn.disabled = false);\n";
    $html .= "      }\n";
    $html .= "    }\n";
    $html .= "    btn && btn.addEventListener('click', function(ev){ ev.preventDefault(); if(timer){clearTimeout(timer);} check(); });\n";
    $html .= "    // start automatically\n";
    $html .= "    check();\n";
    $html .= "  })();\n";
    $html .= "  </script>\n";
    $html .= "</body>\n</html>\n";

    $file = ux_queue_shell_path($config);
    return (bool)@file_put_contents($file, $html, LOCK_EX);
}

/**
 * Inject runtime base URL into the shell HTML (so relative assets won't break).
 */
function ux_queue_shell_inject_base(string $html, string $base): string
{
    $base = rtrim($base, '/');
    if ($base === '') {
        return $html;
    }

    // Placeholder replacement.
    $html = str_replace('__UX_BASE__', $base, $html);

    // Backward-compat: if the shell still has relative links, patch them.
    // stylesheet
    $html = preg_replace('~href="(ux_queue_shell[^\"\?]*\.css)(\?[^\"]*)?"~i', 'href="' . $base . '/$1$2"', $html) ?? $html;
    // images under assets/
    $html = preg_replace('~src="(\.\/)?assets\/~i', 'src="' . $base . '/assets/', $html) ?? $html;

    return $html;
}

/**
 * Send the waiting-room response (static shell preferred).
 */
function ux_send_waiting_room(array $config): void
{
    if (function_exists('ux_agent_shadow_decision')) {
        $mode = (string)($config['mode'] ?? 'maintenance');
        $action = in_array($mode, ['queue', 'smart_queue'], true) ? 'queue' : 'wait';
        $retry = isset($config['auto_retry_interval']) ? (int)$config['auto_retry_interval'] : 30;
        if ($retry < 1) { $retry = 30; }
        ux_agent_shadow_decision([
            'action' => $action,
            'reason' => $mode . '_waiting_room',
            'status' => 503,
            'retry_after' => $retry,
        ], $config);
    }

    if (ux_queue_shell_enabled($config)) {
        $file = ux_queue_shell_path($config);

        // If shell file missing, best-effort rebuild once.
        if (!is_file($file)) {
            try { ux_queue_shell_rebuild($config); } catch (Throwable $e) { /* ignore */ }
        }

        if (is_file($file)) {
            http_response_code(503);
            header('Content-Type: text/html; charset=UTF-8');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            if (empty($config['gateway_indexable'])) {
                header('X-Robots-Tag: noindex, nofollow', true);
            }

            $html = @file_get_contents($file);
            if ($html === false) {
                // Fallback to direct read.
                readfile($file);
                exit;
            }

            $base = ux_gateway_public_base_url();
            echo ux_queue_shell_inject_base($html, $base);
            exit;
        }
    }

    // Fallback: dynamic renderer (legacy)
    if (function_exists('ux_render_page_cached')) {
        ux_render_page_cached($config);
        exit;
    }

    // Last resort
    header('HTTP/1.1 503 Service Unavailable');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Service temporarily unavailable.';
    exit;
}
