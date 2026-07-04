<?php
/**
 * Unixsee Campaign Gateway local self-test.
 * Run from CLI: php tools/uxgw_selftest.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "CLI only\n";
    exit(1);
}

$root = dirname(__DIR__);
$ok = 0; $warn = 0; $fail = 0;
$rows = [];
$add = function (string $status, string $name, string $detail = '') use (&$ok, &$warn, &$fail, &$rows) {
    if ($status === 'OK') $ok++;
    elseif ($status === 'WARN') $warn++;
    else $fail++;
    $rows[] = [$status, $name, $detail];
};

$configFile = $root . '/ux_config.php';
$config = is_file($configFile) ? require $configFile : [];
if (!is_array($config)) {
    $config = [];
}

$add(version_compare(PHP_VERSION, '8.0.0', '>=') ? 'OK' : 'FAIL', 'PHP version', PHP_VERSION);
$add(class_exists('PDO') ? 'OK' : 'FAIL', 'PDO extension', class_exists('PDO') ? 'loaded' : 'missing');
$sqlite = class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
$add($sqlite ? 'OK' : 'WARN', 'pdo_sqlite extension', $sqlite ? 'available' : 'missing; Redis mode or storage_fail_mode will be needed');
$add(class_exists('Redis') ? 'OK' : 'WARN', 'phpredis extension', class_exists('Redis') ? 'loaded' : 'missing; Redis fast path disabled');


$shadowKeys = [
    'agent_shadow_enabled',
    'agent_shadow_endpoint',
    'agent_shadow_timeout_ms',
    'agent_shadow_log_enabled',
    'agent_shadow_log_file',
    'agent_shadow_send_headers',
    'agent_shadow_send_cookies',
    'agent_shadow_secret',
];
$missingShadowKeys = array_values(array_filter($shadowKeys, fn($key) => !array_key_exists($key, $config)));
$add(empty($missingShadowKeys) ? 'OK' : 'FAIL', 'agent shadow config keys', empty($missingShadowKeys) ? 'all present' : implode(', ', $missingShadowKeys));
$add(empty($config['agent_shadow_enabled']) ? 'OK' : 'WARN', 'agent shadow default', empty($config['agent_shadow_enabled']) ? 'disabled' : 'enabled in current config');
$timeoutMs = isset($config['agent_shadow_timeout_ms']) ? (int)$config['agent_shadow_timeout_ms'] : 0;
$add(($timeoutMs >= 1 && $timeoutMs <= 3000) ? 'OK' : 'FAIL', 'agent shadow timeout', (string)$timeoutMs . 'ms');
$endpoint = (string)($config['agent_shadow_endpoint'] ?? '');
$localEndpoint = (bool)preg_match('~^https?://(127\.0\.0\.1|localhost)(:\d+)?/~i', $endpoint);
$add($localEndpoint ? 'OK' : 'WARN', 'agent shadow endpoint', $endpoint !== '' ? $endpoint : 'empty');

$bridgeFile = $root . '/src/AgentShadowBridge.php';
$add(is_file($bridgeFile) ? 'OK' : 'FAIL', 'agent shadow bridge file', is_file($bridgeFile) ? 'src/AgentShadowBridge.php' : 'missing');
if (is_file($bridgeFile)) {
    try {
        require_once $bridgeFile;
        $add(function_exists('ux_agent_shadow_send') ? 'OK' : 'FAIL', 'agent shadow callable', function_exists('ux_agent_shadow_send') ? 'ux_agent_shadow_send exists' : 'missing');
    } catch (Throwable $e) {
        $add('FAIL', 'agent shadow bridge load', $e->getMessage());
    }
}

if (function_exists('ux_agent_shadow_log_path')) {
    $logPath = ux_agent_shadow_log_path((string)($config['agent_shadow_log_file'] ?? 'logs/agent-shadow.log'));
    $logParent = dirname($logPath);
    $parentOk = is_dir($logParent) || @mkdir($logParent, 0755, true);
    $writable = $parentOk && is_dir($logParent) && is_writable($logParent);
    $add($writable ? 'OK' : 'WARN', 'agent shadow log path', $writable ? str_replace($root . '/', '', $logPath) : 'parent not writable: ' . $logParent);
}

if (function_exists('ux_agent_shadow_send')) {
    $testConfig = array_merge($config, [
        'agent_shadow_enabled' => true,
        'agent_shadow_endpoint' => 'http://127.0.0.1:1/__ux_shadow_selftest__',
        'agent_shadow_timeout_ms' => 1,
        'agent_shadow_log_enabled' => false,
        'agent_shadow_secret' => '',
    ]);
    $shadowPayload = [
        'schema_version' => 'r3.shadow.v1',
        'timestamp' => time(),
        'site' => ['host' => 'selftest.local', 'scheme' => 'http'],
        'request' => ['ip' => '127.0.0.1', 'method' => 'GET', 'path' => '/', 'query' => '', 'user_agent' => 'selftest', 'referer' => '', 'accept' => '', 'is_ajax' => false],
        'php_decision' => ['action' => 'pass', 'reason' => 'selftest_invalid_endpoint', 'status' => 200, 'retry_after' => null],
        'runtime' => ['storage_available' => true, 'storage_fail_mode' => 'open', 'gateway_enabled' => false, 'campaign_enabled' => false],
    ];
    $start = microtime(true);
    try {
        ux_agent_shadow_send($shadowPayload, $testConfig);
        $elapsedMs = (int)round((microtime(true) - $start) * 1000);
        $add($elapsedMs < 1000 ? 'OK' : 'WARN', 'agent invalid endpoint', 'no fatal, duration=' . $elapsedMs . 'ms');
    } catch (Throwable $e) {
        $add('FAIL', 'agent invalid endpoint', $e->getMessage());
    }
}


$legacyMarker = $root . '/ux_gateway/LEGACY_NOT_ACTIVE.md';
$legacyDeny = $root . '/ux_gateway/.htaccess';
$legacyPublicDeny = $root . '/ux_gateway/public/.htaccess';
if (is_dir($root . '/ux_gateway')) {
    $add(is_file($legacyMarker) ? 'OK' : 'FAIL', 'legacy quarantine marker', is_file($legacyMarker) ? 'present' : 'missing');
    $add(is_file($legacyDeny) ? 'OK' : 'FAIL', 'legacy deny htaccess', is_file($legacyDeny) ? 'ux_gateway/.htaccess' : 'missing');
    $add(is_file($legacyPublicDeny) ? 'OK' : 'FAIL', 'legacy public htaccess', is_file($legacyPublicDeny) ? 'ux_gateway/public/.htaccess' : 'missing');
} else {
    $add('OK', 'legacy quarantine', 'ux_gateway/ not present');
}

$releaseScan = $root . '/tools/uxgw_release_scan.php';
$add(is_file($releaseScan) ? 'OK' : 'FAIL', 'release scanner file', is_file($releaseScan) ? 'tools/uxgw_release_scan.php' : 'missing');
if (is_file($releaseScan)) {
    if (function_exists('exec')) {
        $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($releaseScan) . ' 2>&1';
        $scanOutput = [];
        $scanCode = 1;
        @exec($cmd, $scanOutput, $scanCode);
        $summary = '';
        foreach (array_reverse($scanOutput) as $line) {
            if (preg_match('/OK=\d+ WARN=\d+ FAIL=\d+/', $line)) {
                $summary = $line;
                break;
            }
        }
        $add($scanCode === 0 ? 'OK' : 'FAIL', 'release scan passes', $summary !== '' ? $summary : 'exit=' . $scanCode);
    } else {
        $add('WARN', 'release scan passes', 'exec disabled; run php tools/uxgw_release_scan.php manually');
    }
}

$adminPass = (string)($config['admin_password'] ?? '');
$add($adminPass !== '' ? 'OK' : 'WARN', 'admin_password', $adminPass !== '' ? 'set' : 'empty in release config');
$panelToken = (string)($config['panel_token'] ?? '');
$add(strlen($panelToken) >= 16 ? 'OK' : 'WARN', 'panel_token', strlen($panelToken) >= 16 ? 'strong enough' : 'empty/short; preview disabled');
$secretPath = (string)($config['ticket_secret_file'] ?? '');
$add($secretPath === '' || $secretPath[0] !== '/' ? 'OK' : 'WARN', 'ticket_secret_file', $secretPath === '' ? 'default' : $secretPath);

$privatePattern = '/(\/home\/|\/mnt\/data\/|remowin|pashalaser)/i';
$badPaths = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) {
    if (!$file->isFile()) continue;
    $path = $file->getPathname();
    $relPath = str_replace($root . '/', '', $path);
    if (str_starts_with($relPath, 'tools/uxgw_selftest.php')) continue;
    if (preg_match('/\.(png|jpg|jpeg|gif|woff2?|ttf|eot|svg|zip)$/i', $path)) continue;
    $txt = @file_get_contents($path);
    if (is_string($txt) && preg_match($privatePattern, $txt)) {
        $badPaths[] = $relPath;
    }
}
$add(empty($badPaths) ? 'OK' : 'WARN', 'private path scan', empty($badPaths) ? 'clean' : implode(', ', array_slice($badPaths, 0, 8)));

$runtimeFiles = [];
foreach (['*.sqlite','*.sqlite-wal','*.sqlite-shm','*.db','*.log','*.lock','*.bak','*.old','*.orig','ux_rate_limit.json'] as $glob) {
    foreach (glob($root . '/' . $glob) ?: [] as $f) {
        $runtimeFiles[] = basename($f);
    }
}
$add(empty($runtimeFiles) ? 'OK' : 'WARN', 'runtime files in root', empty($runtimeFiles) ? 'none' : implode(', ', $runtimeFiles));

try {
    if (!defined('UX_ADMIN_ENTRY')) define('UX_ADMIN_ENTRY', true);
    $_SERVER['REMOTE_ADDR'] = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $_SERVER['REQUEST_URI'] = $_SERVER['REQUEST_URI'] ?? '/';
    require_once $root . '/gateway.php';
    $needed = ['ux_api_check','ux_should_bypass_request','ux_can_pass_gateway','ux_ticket_secret_file','ux_storage_sqlite_available'];
    $missing = array_values(array_filter($needed, fn($fn) => !function_exists($fn)));
    $add(empty($missing) ? 'OK' : 'FAIL', 'core functions loaded', empty($missing) ? 'all required functions exist' : implode(', ', $missing));
} catch (Throwable $e) {
    $add('FAIL', 'gateway bootstrap', $e->getMessage());
}

echo "Unixsee Campaign Gateway Self-Test\n";
echo "==================================\n";
foreach ($rows as [$status, $name, $detail]) {
    printf("[%s] %-24s %s\n", $status, $name, $detail);
}
echo "----------------------------------\n";
printf("OK=%d WARN=%d FAIL=%d\n", $ok, $warn, $fail);
exit($fail > 0 ? 1 : 0);
