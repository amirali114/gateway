<?php
/**
 * ux_ticket.php
 * Signed short-lived pass ticket cookie for Unixsee Campaign Gateway.
 *
 * Goal:
 *  - Once a visitor is admitted, keep them admitted for a short TTL
 *    (prevents bouncing back to queue on refresh/back).
 *  - Cookie is HMAC-signed to prevent tampering.
 */

function ux_ticket_secret_file(array $config): string
{
    $f = $config['ticket_secret_file'] ?? (__DIR__ . '/.uxwr_secret.php');
    if (!is_string($f) || trim($f) === '') {
        $f = __DIR__ . '/.uxwr_secret.php';
    }
    $f = trim($f);
    // Release-safe: allow config to store a relative path, but resolve it inside the gateway dir.
    if ($f !== '' && $f[0] !== '/' && !preg_match('/^[A-Za-z]:[\\\/]/', $f)) {
        $f = __DIR__ . '/' . $f;
    }
    return $f;
}

/**
 * Ensure secret file exists. Returns secret (string).
 */
function ux_ticket_ensure_secret(array $config): string
{
    $file = ux_ticket_secret_file($config);

    // Fast path: file exists and loads a non-empty string
    if (is_file($file)) {
        $s = @include $file;
        if (is_string($s) && $s !== '') {
            return $s;
        }
    }

    // Generate new 32-byte secret
    try {
        $raw = random_bytes(32);
    } catch (Throwable $e) {
        $raw = openssl_random_pseudo_bytes(32) ?: (string)uniqid('ux', true);
    }
    $secret = bin2hex($raw);

    // Write atomically
    $php = "<?php\n// Auto-generated. Do NOT delete during an active campaign.\nreturn " . var_export($secret, true) . ";\n";
    @file_put_contents($file, $php, LOCK_EX);

    return $secret;
}

function ux_ticket_get_secret(array $config): ?string
{
    $file = ux_ticket_secret_file($config);
    if (!is_file($file)) {
        return null;
    }
    $s = @include $file;
    if (!is_string($s) || $s === '') {
        return null;
    }
    return $s;
}

function ux_ticket_ctx(array $config): string
{
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $ctx = 'v1';
    if (!empty($config['ticket_cookie_bind_ua'])) {
        // bind to UA (stable-ish)
        $ctx .= '|ua:' . hash('sha256', $ua);
    }
    if (!empty($config['ticket_cookie_bind_ip'])) {
        // bind to IP (can cause false negatives on mobile/proxies; keep optional)
        $ctx .= '|ip:' . hash('sha256', $ip);
    }
    return $ctx;
}

function ux_ticket_hmac(string $data, string $secret): string
{
    return hash_hmac('sha256', $data, $secret);
}

function ux_ticket_cookie_name(array $config): string
{
    $n = $config['ticket_cookie_name'] ?? 'uxwr_pass';
    if (!is_string($n) || trim($n) === '') {
        $n = 'uxwr_pass';
    }
    return $n;
}

function ux_ticket_enabled(array $config): bool
{
    return !empty($config['ticket_cookie_enabled']);
}

/**
 * Issue a signed ticket cookie (idempotent).
 */
function ux_ticket_issue(array $config): void
{
    if (!ux_ticket_enabled($config)) {
        return;
    }
    if (headers_sent()) {
        return;
    }

    $secret = ux_ticket_get_secret($config);
    if (!$secret) {
        $secret = ux_ticket_ensure_secret($config);
    }

    $ttl = (int)($config['ticket_cookie_ttl_seconds'] ?? 900);
    if ($ttl < 60) {
        $ttl = 60;
    }
    if ($ttl > 86400) {
        $ttl = 86400;
    }

    $exp = time() + $ttl;
    try {
        $nonce = bin2hex(random_bytes(8));
    } catch (Throwable $e) {
        $nonce = substr(hash('sha256', uniqid('ux', true)), 0, 16);
    }

    $ctx = ux_ticket_ctx($config);
    $data = 'v1.' . $exp . '.' . $nonce . '.' . $ctx;
    $sig  = ux_ticket_hmac($data, $secret);

    $val = 'v1.' . $exp . '.' . $nonce . '.' . $sig;

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    // Lax is safer for typical checkout/payment redirects than Strict.
    setcookie(ux_ticket_cookie_name($config), $val, [
        'expires'  => $exp,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Verify ticket cookie validity.
 */
function ux_ticket_is_valid(array $config): bool
{
    if (!ux_ticket_enabled($config)) {
        return false;
    }

    $name = ux_ticket_cookie_name($config);
    if (empty($_COOKIE[$name])) {
        return false;
    }

    $val = (string)$_COOKIE[$name];
    // v1.exp.nonce.sig
    $parts = explode('.', $val);
    if (count($parts) !== 4) {
        return false;
    }
    if ($parts[0] !== 'v1') {
        return false;
    }
    $exp = (int)$parts[1];
    $nonce = (string)$parts[2];
    $sig = (string)$parts[3];

    if ($exp <= time()) {
        return false;
    }
    if ($nonce === '' || $sig === '') {
        return false;
    }

    $secret = ux_ticket_get_secret($config);
    if (!$secret) {
        return false;
    }

    $ctx = ux_ticket_ctx($config);
    $data = 'v1.' . $exp . '.' . $nonce . '.' . $ctx;
    $calc = ux_ticket_hmac($data, $secret);

    return hash_equals($calc, $sig);
}
