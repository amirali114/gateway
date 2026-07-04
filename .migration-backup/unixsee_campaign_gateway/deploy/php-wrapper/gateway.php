<?php
/**
 * Unixsee Campaign Gateway public wrapper (R10.1).
 * Public webroot-safe entrypoint only. The private runtime must live outside webroot.
 */
declare(strict_types=1);

$runtime = getenv('UNIXSEE_GATEWAY_PRIVATE_RUNTIME');
if (!is_string($runtime) || trim($runtime) === '') {
    $runtime = '/opt/unixsee-campaign-gateway/unixsee_campaign_gateway/gateway.php';
}

$runtime = trim($runtime);
if ($runtime === '' || $runtime[0] !== '/' || strpos($runtime, "\0") !== false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"error":"gateway_runtime_unavailable"}';
    exit;
}

$real = realpath($runtime);
if ($real === false || !is_file($real) || !is_readable($real)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"error":"gateway_runtime_unavailable"}';
    exit;
}

require $real;
