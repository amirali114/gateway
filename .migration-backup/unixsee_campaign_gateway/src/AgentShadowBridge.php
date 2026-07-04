<?php
/**
 * Unixsee Campaign Gateway - Agent Shadow Bridge (R3)
 *
 * Sends PHP's already-final decision to a local future Agent endpoint in shadow mode.
 * The Agent is observational only: its response is never used to change gateway output.
 */

if (!function_exists('ux_agent_shadow_send')) {
    /**
     * Send a shadow payload to the local Agent endpoint.
     *
     * This function is intentionally defensive: no exception may escape, and failed,
     * slow, missing, or invalid Agent responses must never affect PHP Gateway behavior.
     */
    function ux_agent_shadow_send(array $payload, array $config): void
    {
        if (empty($config['agent_shadow_enabled'])) {
            return;
        }

        $endpoint = trim((string)($config['agent_shadow_endpoint'] ?? ''));
        if ($endpoint === '') {
            return;
        }

        $started = microtime(true);
        $httpStatus = null;
        $success = false;
        $error = null;

        try {
            if (!isset($payload['schema_version']) || (string)$payload['schema_version'] === '') {
                $payload['schema_version'] = 'r3.shadow.v1';
            }

            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($json) || $json === '') {
                $error = 'json_encode_failed';
                ux_agent_shadow_write_log($config, $endpoint, false, null, $error, $started);
                return;
            }

            $timeoutMs = ux_agent_shadow_timeout_ms($config);
            $headers = [
                'Content-Type: application/json',
                'X-Unixsee-Agent-Schema: r3.shadow.v1',
            ];

            $secret = (string)($config['agent_shadow_secret'] ?? '');
            if ($secret !== '') {
                $headers[] = 'X-Unixsee-Agent-Signature: sha256=' . hash_hmac('sha256', $json, $secret);
            }

            $result = ux_agent_shadow_http_post($endpoint, $json, $headers, $timeoutMs);
            $httpStatus = $result['http_status'];
            $body = (string)$result['body'];
            $error = $result['error'];
            $success = (bool)$result['success'];

            if ($success && $body !== '') {
                json_decode($body, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $success = false;
                    $error = 'invalid_json';
                }
            }
        } catch (Throwable $e) {
            $success = false;
            $error = 'exception:' . $e->getMessage();
        }

        ux_agent_shadow_write_log($config, $endpoint, $success, $httpStatus, $error, $started);
    }

    /**
     * Build and send a standard shadow decision payload.
     */
    function ux_agent_shadow_decision(array $decision, array $config): void
    {
        if (empty($config['agent_shadow_enabled'])) {
            return;
        }

        try {
            ux_agent_shadow_send(ux_agent_shadow_build_payload($decision, $config), $config);
        } catch (Throwable $e) {
            // Shadow mode must never affect the gateway.
        }
    }

    /**
     * Build the R3 shadow payload contract from current request/runtime state.
     */
    function ux_agent_shadow_build_payload(array $decision, array $config): array
    {
        $action = (string)($decision['action'] ?? 'pass');
        $allowedActions = ['allow', 'queue', 'block', 'pass', 'wait'];
        if (!in_array($action, $allowedActions, true)) {
            $action = 'pass';
        }

        $status = isset($decision['status']) ? (int)$decision['status'] : 200;
        if ($status < 100 || $status > 599) {
            $status = 200;
        }

        $retryAfter = $decision['retry_after'] ?? null;
        if ($retryAfter !== null) {
            $retryAfter = max(0, (int)$retryAfter);
        }

        $scheme = 'http';
        if ((!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off' && (string)$_SERVER['HTTPS'] !== '0')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')) {
            $scheme = 'https';
        }

        $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            $path = '/';
        }
        $query = parse_url($uri, PHP_URL_QUERY);
        if (!is_string($query)) {
            $query = (string)($_SERVER['QUERY_STRING'] ?? '');
        }

        $ip = function_exists('ux_get_user_ip') ? (string)ux_get_user_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
        if ($ip === '') {
            $ip = '0.0.0.0';
        }

        $request = [
            'ip' => $ip,
            'method' => (string)($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            'path' => $path,
            'query' => $query,
            'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'referer' => (string)($_SERVER['HTTP_REFERER'] ?? ''),
            'accept' => (string)($_SERVER['HTTP_ACCEPT'] ?? ''),
            'is_ajax' => ux_agent_shadow_is_ajax(),
        ];

        if (!empty($config['agent_shadow_send_headers'])) {
            $request['headers'] = ux_agent_shadow_collect_headers();
        }

        if (!empty($config['agent_shadow_send_cookies'])) {
            $request['cookies'] = ux_agent_shadow_collect_cookies();
        }

        return [
            'schema_version' => 'r3.shadow.v1',
            'timestamp' => time(),
            'site' => [
                'host' => (string)($_SERVER['HTTP_HOST'] ?? ''),
                'scheme' => $scheme,
            ],
            'request' => $request,
            'php_decision' => [
                'action' => $action,
                'reason' => (string)($decision['reason'] ?? ''),
                'status' => $status,
                'retry_after' => $retryAfter,
            ],
            'runtime' => [
                'storage_available' => ux_agent_shadow_storage_available(),
                'storage_fail_mode' => (string)($config['storage_fail_mode'] ?? ($config['redis_required_fail_mode'] ?? 'open')),
                'gateway_enabled' => !empty($config['enabled']),
                'campaign_enabled' => !empty($config['enabled']) && in_array((string)($config['mode'] ?? 'maintenance'), ['maintenance', 'whitelist', 'queue', 'smart_queue'], true),
            ],
        ];
    }

    function ux_agent_shadow_timeout_ms(array $config): int
    {
        $timeoutMs = isset($config['agent_shadow_timeout_ms']) ? (int)$config['agent_shadow_timeout_ms'] : 80;
        if ($timeoutMs < 1) {
            $timeoutMs = 80;
        }
        if ($timeoutMs > 3000) {
            $timeoutMs = 3000;
        }
        return $timeoutMs;
    }

    function ux_agent_shadow_http_post(string $endpoint, string $json, array $headers, int $timeoutMs): array
    {
        if (function_exists('curl_init')) {
            return ux_agent_shadow_http_post_curl($endpoint, $json, $headers, $timeoutMs);
        }

        return ux_agent_shadow_http_post_stream($endpoint, $json, $headers, $timeoutMs);
    }

    function ux_agent_shadow_http_post_curl(string $endpoint, string $json, array $headers, int $timeoutMs): array
    {
        $ch = @curl_init($endpoint);
        if (!$ch) {
            return ['success' => false, 'http_status' => null, 'error' => 'curl_init_failed', 'body' => ''];
        }

        @curl_setopt($ch, CURLOPT_POST, true);
        @curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        @curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        @curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        @curl_setopt($ch, CURLOPT_HEADER, false);
        @curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, $timeoutMs);
        @curl_setopt($ch, CURLOPT_TIMEOUT_MS, $timeoutMs);
        @curl_setopt($ch, CURLOPT_NOSIGNAL, true);

        $body = @curl_exec($ch);
        $errno = (int)@curl_errno($ch);
        $err = $errno ? (string)@curl_error($ch) : null;
        $httpStatus = (int)@curl_getinfo($ch, CURLINFO_HTTP_CODE);
        @curl_close($ch);

        $success = ($errno === 0 && $httpStatus >= 200 && $httpStatus < 300);
        return [
            'success' => $success,
            'http_status' => $httpStatus > 0 ? $httpStatus : null,
            'error' => $success ? null : ($err ?: ('http_status_' . ($httpStatus ?: 0))),
            'body' => is_string($body) ? $body : '',
        ];
    }

    function ux_agent_shadow_http_post_stream(string $endpoint, string $json, array $headers, int $timeoutMs): array
    {
        $headerText = implode("\r\n", $headers);
        $timeoutSeconds = max(0.001, $timeoutMs / 1000);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => $headerText,
                'content' => $json,
                'timeout' => $timeoutSeconds,
                'ignore_errors' => true,
            ],
        ]);

        $body = @file_get_contents($endpoint, false, $context);
        $httpStatus = null;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('~^HTTP/\S+\s+(\d{3})\b~', (string)$line, $m)) {
                    $httpStatus = (int)$m[1];
                    break;
                }
            }
        }

        $success = is_string($body) && $httpStatus !== null && $httpStatus >= 200 && $httpStatus < 300;
        return [
            'success' => $success,
            'http_status' => $httpStatus,
            'error' => $success ? null : ($httpStatus === null ? 'request_failed' : ('http_status_' . $httpStatus)),
            'body' => is_string($body) ? $body : '',
        ];
    }

    function ux_agent_shadow_write_log(array $config, string $endpoint, bool $success, ?int $httpStatus, ?string $error, float $started): void
    {
        if (empty($config['agent_shadow_log_enabled'])) {
            return;
        }

        try {
            $file = ux_agent_shadow_log_path((string)($config['agent_shadow_log_file'] ?? 'logs/agent-shadow.log'));
            if ($file === '') {
                return;
            }
            $dir = dirname($file);
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            if (!is_dir($dir) || !is_writable($dir)) {
                return;
            }

            $line = [
                'timestamp' => time(),
                'endpoint' => $endpoint,
                'success' => $success,
                'http_status' => $httpStatus,
                'error' => $error,
                'duration_ms' => (int)round((microtime(true) - $started) * 1000),
            ];
            $encoded = json_encode($line, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (is_string($encoded)) {
                @file_put_contents($file, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX);
            }
        } catch (Throwable $e) {
            // Local shadow logging must never affect request handling.
        }
    }

    function ux_agent_shadow_log_path(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }
        if ($path[0] === '/' || preg_match('~^[A-Za-z]:[\\/]~', $path)) {
            return $path;
        }
        return dirname(__DIR__) . '/' . ltrim($path, '/\\');
    }

    function ux_agent_shadow_is_ajax(): bool
    {
        $xhr = strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
        if ($xhr === 'xmlhttprequest') {
            return true;
        }
        $accept = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
        return strpos($accept, 'application/json') !== false;
    }

    function ux_agent_shadow_collect_headers(): array
    {
        $headers = [];
        $deny = [
            'HTTP_COOKIE' => true,
            'HTTP_AUTHORIZATION' => true,
            'REDIRECT_HTTP_AUTHORIZATION' => true,
            'PHP_AUTH_USER' => true,
            'PHP_AUTH_PW' => true,
            'HTTP_PROXY_AUTHORIZATION' => true,
        ];

        foreach ($_SERVER as $key => $value) {
            if (!is_string($key) || !str_starts_with($key, 'HTTP_')) {
                continue;
            }
            if (isset($deny[$key])) {
                continue;
            }
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$name] = ux_agent_shadow_scalar_string($value, 1024);
        }
        return $headers;
    }

    function ux_agent_shadow_collect_cookies(): array
    {
        $cookies = [];
        foreach ($_COOKIE as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }
            $cookies[$key] = ux_agent_shadow_scalar_string($value, 512);
        }
        return $cookies;
    }

    function ux_agent_shadow_scalar_string($value, int $maxLen): string
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $str = (string)$value;
        if ($maxLen > 0 && strlen($str) > $maxLen) {
            return substr($str, 0, $maxLen) . '...';
        }
        return $str;
    }

    function ux_agent_shadow_storage_available(): bool
    {
        if (function_exists('ux_storage_sqlite_available')) {
            try {
                return (bool)ux_storage_sqlite_available();
            } catch (Throwable $e) {
                return false;
            }
        }
        return true;
    }
}
