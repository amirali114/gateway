<?php
// app/Helpers/helpers.php

function get_client_ip(): string
{
    $keys = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR',
    ];
    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ipList = explode(',', (string) $_SERVER[$key]);
            return trim($ipList[0]);
        }
    }
    return '0.0.0.0';
}

function ux_log(string $message, array $context = []): void
{
    $logDir  = __DIR__ . '/../../storage/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/app.log';
    $entry   = date('c') . ' ' . $message;
    if (!empty($context)) {
        $entry .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
    }
    $entry .= PHP_EOL;
    @file_put_contents($logFile, $entry, FILE_APPEND);
}

function ux_main_gateway_base_url(): string
{
    $scriptDir = isset($_SERVER['SCRIPT_NAME'])
        ? str_replace('\\', '/', dirname((string) $_SERVER['SCRIPT_NAME']))
        : '';

    if ($scriptDir === '' || $scriptDir === '/' || $scriptDir === '\\') {
        return '';
    }

    $scriptDir = rtrim($scriptDir, '/');

    if (preg_match('#^(.*)/ux_gateway/public$#', $scriptDir, $m)) {
        return $m[1] !== '' ? $m[1] : '/';
    }

    if (preg_match('#^(.*)/ux_gateway$#', $scriptDir, $m)) {
        return $m[1] !== '' ? $m[1] : '/';
    }

    return rtrim(dirname($scriptDir), '/');
}

function ux_main_gateway_asset_url(string $path = ''): string
{
    $base = ux_main_gateway_base_url();
    $path = ltrim($path, '/');

    if ($base === '' || $base === '/') {
        return '/' . $path;
    }

    return rtrim($base, '/') . '/' . $path;
}
