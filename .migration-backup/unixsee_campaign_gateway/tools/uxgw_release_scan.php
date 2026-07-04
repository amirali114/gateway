<?php
/**
 * Unixsee Campaign Gateway release surface scanner.
 *
 * Run from CLI before packaging:
 *   php tools/uxgw_release_scan.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "CLI only\n";
    exit(1);
}

$root = dirname(__DIR__);
$ok = 0;
$warn = 0;
$fail = 0;
$rows = [];

$add = function (string $status, string $name, string $detail = '') use (&$ok, &$warn, &$fail, &$rows): void {
    if ($status === 'OK') {
        $ok++;
    } elseif ($status === 'WARN') {
        $warn++;
    } else {
        $fail++;
    }
    $rows[] = [$status, $name, $detail];
};

$rel = static function (string $path) use ($root): string {
    $prefix = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    if (str_starts_with($path, $prefix)) {
        return str_replace(DIRECTORY_SEPARATOR, '/', substr($path, strlen($prefix)));
    }
    return str_replace(DIRECTORY_SEPARATOR, '/', $path);
};

$allFiles = [];
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);
foreach ($it as $item) {
    /** @var SplFileInfo $item */
    if ($item->isFile()) {
        $allFiles[] = $item->getPathname();
    }
}

$runtimePattern = '/(?:^|\/)(?:agent-shadow|unixsee-agent|shadow-events|ux_rate_limit|runtime|state|session|queue|events)[^\/]*\.(?:json|jsonl|log|db|sqlite|sqlite3|lock)$/i';
$forbiddenExtPattern = '/\.(?:bak|old|orig|tmp|temp|sqlite|sqlite3|sqlite-wal|sqlite-shm|wal|shm|log|jsonl)$/i';
$forbiddenFiles = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if ($r === 'logs/.gitkeep' || $r === 'ux_gateway/storage/logs/.gitkeep' || $r === 'assets/uploads/.gitkeep') {
        continue;
    }
    if (preg_match($forbiddenExtPattern, $r) || preg_match($runtimePattern, $r)) {
        $forbiddenFiles[] = $r;
    }
}
$add(empty($forbiddenFiles) ? 'OK' : 'FAIL', 'runtime/state file scan', empty($forbiddenFiles) ? 'clean' : implode(', ', array_slice($forbiddenFiles, 0, 20)));

$worldWritable = [];
foreach ($allFiles as $file) {
    $perms = @fileperms($file);
    if ($perms !== false && ($perms & 0002)) {
        $worldWritable[] = $rel($file);
    }
}
$add(empty($worldWritable) ? 'OK' : 'FAIL', 'world-writable files', empty($worldWritable) ? 'none' : implode(', ', array_slice($worldWritable, 0, 20)));

$agentRuntimeDirs = ['agent/bin', 'agent/data', 'agent/logs'];
$presentAgentRuntime = [];
foreach ($agentRuntimeDirs as $dir) {
    if (is_dir($root . '/' . $dir)) {
        $presentAgentRuntime[] = $dir . '/';
    }
}
$add(empty($presentAgentRuntime) ? 'OK' : 'FAIL', 'agent runtime folders', empty($presentAgentRuntime) ? 'absent' : implode(', ', $presentAgentRuntime));

$motherRuntimeDirs = ['mother/bin', 'mother/data', 'mother/logs'];
$presentMotherRuntime = [];
foreach ($motherRuntimeDirs as $dir) {
    if (is_dir($root . '/' . $dir)) {
        $presentMotherRuntime[] = $dir . '/';
    }
}
$add(empty($presentMotherRuntime) ? 'OK' : 'FAIL', 'mother runtime folders', empty($presentMotherRuntime) ? 'absent' : implode(', ', $presentMotherRuntime));


$dashboardRuntimeDirs = ['dashboard/node_modules', 'dashboard/.next', 'dashboard/out'];
$presentDashboardRuntime = [];
foreach ($dashboardRuntimeDirs as $dir) {
    if (is_dir($root . '/' . $dir)) {
        $presentDashboardRuntime[] = $dir . '/';
    }
}
$add(empty($presentDashboardRuntime) ? 'OK' : 'FAIL', 'dashboard runtime folders', empty($presentDashboardRuntime) ? 'absent' : implode(', ', $presentDashboardRuntime));


$envFiles = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    $base = basename($r);
    if ($base === '.env' || str_starts_with($base, '.env.')) {
        if ($base !== '.env.example') {
            $envFiles[] = $r;
        }
    }
}
$add(empty($envFiles) ? 'OK' : 'FAIL', 'real env files', empty($envFiles) ? 'absent' : implode(', ', array_slice($envFiles, 0, 20)));

$secretHits = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (!str_ends_with($r, '.example.yml') && !str_ends_with($r, '.env.example')) {
        continue;
    }
    $txt = @file_get_contents($file);
    if (!is_string($txt)) {
        continue;
    }
    if (preg_match('/(password|passwd|secret|token)\s*[:=]\s*["\']?[^"\'\s#]+/i', $txt, $m)) {
        $value = trim((string)preg_replace('/^[^:=]+[:=]\s*/', '', $m[0]), " \t\r\n\"'");
        $lowerValue = strtolower($value);
        $placeholder = str_contains($lowerValue, 'replace') || str_contains($lowerValue, 'example') || str_contains($lowerValue, 'generated') || str_contains($lowerValue, 'change-me') || str_contains($lowerValue, '...');
        if ($value !== '' && !$placeholder && !in_array($lowerValue, ['false', 'true', 'changeme', 'example', ''], true)) {
            $secretHits[] = $r . ': possible secret-looking value';
        }
    }
}
$add(empty($secretHits) ? 'OK' : 'FAIL', 'example config secret scan', empty($secretHits) ? 'clean' : implode(', ', array_slice($secretHits, 0, 20)));



$installTempArtifacts = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (preg_match('/^install\/(?:tmp|temp|\.tmp|\.cache)\//i', $r) || preg_match('/^install\/.*\.(?:tmp|temp|log|jsonl|sqlite|db)$/i', $r)) {
        $installTempArtifacts[] = $r;
    }
}
foreach (['install/tmp', 'install/temp', 'install/.tmp', 'install/.cache'] as $dir) {
    if (is_dir($root . '/' . $dir)) {
        $installTempArtifacts[] = $dir . '/';
    }
}
$installTempArtifacts = array_values(array_unique($installTempArtifacts));
$add(empty($installTempArtifacts) ? 'OK' : 'FAIL', 'install temp artifacts', empty($installTempArtifacts) ? 'absent' : implode(', ', array_slice($installTempArtifacts, 0, 20)));

$installerEvalHits = [];
foreach ([
    'install/install-local-dev.sh',
    'install/uninstall-local-dev.sh',
    'install/validate-package.sh',
    'install/run-smoke-test.sh',
] as $script) {
    $path = $root . '/' . $script;
    if (!is_file($path)) {
        continue;
    }
    $txt = (string)@file_get_contents($path);
    if (preg_match('/(^|[^A-Za-z0-9_])eval([^A-Za-z0-9_]|$)/', $txt)) {
        $installerEvalHits[] = $script . ': eval usage found';
    }
}
$add(empty($installerEvalHits) ? 'OK' : 'FAIL', 'installer eval scan', empty($installerEvalHits) ? 'no eval in installer scripts' : implode(', ', $installerEvalHits));

$installerShellSafety = $root . '/install/check-shell-safety.sh';
$add(is_file($installerShellSafety) ? 'OK' : 'FAIL', 'installer shell safety check', is_file($installerShellSafety) ? 'install/check-shell-safety.sh present' : 'missing');

$installGeneratedArtifacts = [];
foreach (['install/bin/unixsee-agent', 'install/bin/unixsee-mother', 'install/unixsee-agent', 'install/unixsee-mother'] as $bin) {
    if (is_file($root . '/' . $bin)) {
        $installGeneratedArtifacts[] = $bin;
    }
}
$add(empty($installGeneratedArtifacts) ? 'OK' : 'FAIL', 'install generated binaries', empty($installGeneratedArtifacts) ? 'absent' : implode(', ', $installGeneratedArtifacts));


$dashboardLock = $root . '/dashboard/package-lock.json';
$dashboardLockIssues = [];
if (is_file($dashboardLock)) {
    $lockText = (string)@file_get_contents($dashboardLock);
    if (preg_match('/(?:openai|artifactory|internal\.api)/i', $lockText)) {
        $dashboardLockIssues[] = 'dashboard/package-lock.json contains internal registry URL';
    }
}
$add(empty($dashboardLockIssues) ? 'OK' : 'FAIL', 'dashboard package-lock registry', empty($dashboardLockIssues) ? 'public registry only' : implode(', ', $dashboardLockIssues));

$dashboardHardcodedAgent = [];
foreach (['dashboard/app', 'dashboard/components', 'dashboard/lib'] as $uiDir) {
    $base = $root . '/' . $uiDir;
    if (!is_dir($base)) {
        continue;
    }
    $uiIterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($uiIterator as $uiItem) {
        /** @var SplFileInfo $uiItem */
        if (!$uiItem->isFile()) {
            continue;
        }
        $r = $rel($uiItem->getPathname());
        if (!preg_match('/\.(?:ts|tsx|js|jsx)$/', $r)) {
            continue;
        }
        $txt = (string)@file_get_contents($uiItem->getPathname());
        if (str_contains($txt, 'local-dev-agent')) {
            $dashboardHardcodedAgent[] = $r;
        }
    }
}
$add(empty($dashboardHardcodedAgent) ? 'OK' : 'FAIL', 'dashboard hardcoded local dev agent', empty($dashboardHardcodedAgent) ? 'absent from production UI files' : implode(', ', array_slice($dashboardHardcodedAgent, 0, 10)));


$dashboardDirectAgentFetch = [];
foreach (['dashboard/app', 'dashboard/components'] as $uiDir) {
    $base = $root . '/' . $uiDir;
    if (!is_dir($base)) {
        continue;
    }
    $uiIterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($uiIterator as $uiItem) {
        /** @var SplFileInfo $uiItem */
        if (!$uiItem->isFile()) {
            continue;
        }
        $r = $rel($uiItem->getPathname());
        if (!preg_match('/\.(?:ts|tsx|js|jsx)$/', $r)) {
            continue;
        }
        $txt = (string)@file_get_contents($uiItem->getPathname());
        if (preg_match('/UNIXSEE_AGENT_BASE_URL|NEXT_PUBLIC_UNIXSEE_AGENT_BASE_URL|debugAgentBaseUrl|getAgent\w*\(/', $txt)) {
            $dashboardDirectAgentFetch[] = $r;
        }
    }
}
$add(empty($dashboardDirectAgentFetch) ? 'OK' : 'FAIL', 'dashboard production direct Agent fetch', empty($dashboardDirectAgentFetch) ? 'absent from app/components' : implode(', ', array_slice($dashboardDirectAgentFetch, 0, 10)));


$dashboardUserRuntime = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (preg_match('/(?:^|\/)dashboard\/data\//i', $r) || preg_match('/(?:^|\/)(?:users\.json|audit\.jsonl|users\.json\.bak)$/i', $r)) {
        $dashboardUserRuntime[] = $r;
    }
}
$dashboardUserRuntime = array_values(array_unique($dashboardUserRuntime));
$add(empty($dashboardUserRuntime) ? 'OK' : 'FAIL', 'dashboard user/audit runtime files', empty($dashboardUserRuntime) ? 'absent' : implode(', ', array_slice($dashboardUserRuntime, 0, 20)));

$plaintextPasswordHits = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (!preg_match('/\.(?:md|txt|conf|env|example|yml|yaml|ts|tsx|js|jsx|json)$/', $r)) {
        continue;
    }
    $txt = (string)@file_get_contents($file);
    if (preg_match('/DASHBOARD_(?:BOOTSTRAP_)?ADMIN_PASSWORD\s*=|\"password\"\s*:\s*\"(?:admin|password|123456|changeme)/i', $txt)) {
        $plaintextPasswordHits[] = $r;
    }
}
$add(empty($plaintextPasswordHits) ? 'OK' : 'FAIL', 'plaintext dashboard password scan', empty($plaintextPasswordHits) ? 'clean' : implode(', ', array_slice($plaintextPasswordHits, 0, 10)));

$dashboardEnvFiles = [];
foreach (['dashboard/.env', 'dashboard/.env.local', 'dashboard/.env.production', 'dashboard/.env.development'] as $envFile) {
    if (is_file($root . '/' . $envFile)) {
        $dashboardEnvFiles[] = $envFile;
    }
}
$add(empty($dashboardEnvFiles) ? 'OK' : 'FAIL', 'dashboard env files', empty($dashboardEnvFiles) ? 'absent' : implode(', ', $dashboardEnvFiles));


$dashboardAuthSecretRefs = [];
foreach (['dashboard/.next', 'dashboard/out'] as $dir) {
    $base = $root . '/' . $dir;
    if (!is_dir($base)) {
        continue;
    }
    $scanIterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($scanIterator as $item) {
        /** @var SplFileInfo $item */
        if (!$item->isFile()) {
            continue;
        }
        $txt = @file_get_contents($item->getPathname());
        if (!is_string($txt)) {
            continue;
        }
        if (str_contains($txt, 'UNIXSEE_MOTHER_MANAGEMENT_TOKEN') || str_contains($txt, 'DASHBOARD_SESSION_SECRET')) {
            $dashboardAuthSecretRefs[] = $rel($item->getPathname());
        }
    }
}
$dashboardAuthSecretRefs = array_values(array_unique($dashboardAuthSecretRefs));
$add(empty($dashboardAuthSecretRefs) ? 'OK' : 'FAIL', 'dashboard built secret references', empty($dashboardAuthSecretRefs) ? 'absent from build artifacts' : implode(', ', array_slice($dashboardAuthSecretRefs, 0, 10)));

$postgresSecretHits = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (!preg_match('/\.(?:md|txt|conf|env|example|yml|yaml|sh|sql)$/', $r)) {
        continue;
    }
    $txt = (string)@file_get_contents($file);
    if (preg_match('/postgres:\/\/[^:\s@]+:(?:admin|password|123456|prod-|real-)[^@]*@/i', $txt)) {
        $postgresSecretHits[] = $r;
    }
}
$add(empty($postgresSecretHits) ? 'OK' : 'FAIL', 'postgres example secret scan', empty($postgresSecretHits) ? 'clean' : implode(', ', array_slice($postgresSecretHits, 0, 10)));





$dashboardPublicBindHits = [];
foreach (['dashboard/package.json', 'dashboard/README.md', 'deploy/systemd/unixsee-dashboard.service.example', 'install/systemd/unixsee-dashboard.service'] as $fileRel) {
    $path = $root . '/' . $fileRel;
    if (!is_file($path)) {
        continue;
    }
    $txt = (string)@file_get_contents($path);
    if (preg_match('/(?:0\.0\.0\.0|--hostname\s+0\.0\.0\.0|-H\s+0\.0\.0\.0|HOSTNAME=0\.0\.0\.0).*8740|8740.*(?:0\.0\.0\.0|--hostname\s+0\.0\.0\.0|-H\s+0\.0\.0\.0|HOSTNAME=0\.0\.0\.0)/', $txt)) {
        $dashboardPublicBindHits[] = $fileRel;
    }
}
$add(empty($dashboardPublicBindHits) ? 'OK' : 'FAIL', 'dashboard public bind default', empty($dashboardPublicBindHits) ? 'no 0.0.0.0 dashboard default' : implode(', ', $dashboardPublicBindHits));

$realDomainHits = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (!preg_match('/\.(?:md|txt|conf|env|example|yml|yaml|ts|tsx|js|jsx)$/', $r)) {
        continue;
    }
    $txt = (string)@file_get_contents($file);
    if (preg_match('/(?:unixsee\.(?:ir|com)|pashalaser\.com|jooyab\.com|buffkala\.com)/i', $txt)) {
        $realDomainHits[] = $r;
    }
}
$add(empty($realDomainHits) ? 'OK' : 'FAIL', 'hardcoded real domain scan', empty($realDomainHits) ? 'none' : implode(', ', array_slice($realDomainHits, 0, 10)));

$deployScripts = [
    'deploy/scripts/preflight-dashboard.sh',
    'deploy/scripts/validate-runtime-exposure.sh',
    'deploy/scripts/validate-dashboard-security.sh',
    'deploy/scripts/validate-mother-persistence.sh',
    'deploy/scripts/validate-config-rollout.sh',
    'deploy/scripts/validate-dashboard-rbac.sh',
    'deploy/scripts/validate-postgres-storage.sh',
    'deploy/scripts/check-secret-exposure.sh',
    'deploy/scripts/install-core.sh',
    'deploy/scripts/update-core.sh',
    'deploy/scripts/install-agent.sh',
    'deploy/scripts/update-agent.sh',
    'deploy/scripts/install-php-gateway-wrapper.sh',
    'deploy/scripts/rollback-core.sh',
    'deploy/scripts/rollback-agent.sh',
    'deploy/scripts/rollback-php-gateway-wrapper.sh',
    'deploy/scripts/preflight-core.sh',
    'deploy/scripts/preflight-agent.sh',
    'deploy/scripts/preflight-php-gateway.sh',
    'deploy/scripts/validate-production-readiness.sh',
    'deploy/scripts/backup-core-state.sh',
    'deploy/scripts/restore-core-state.sh',
    'deploy/scripts/backup-client-state.sh',
    'deploy/scripts/restore-client-state.sh',
    'deploy/scripts/security-scan-release.sh',
];
$missingDeployScripts = [];
foreach ($deployScripts as $script) {
    if (!is_file($root . '/' . $script)) {
        $missingDeployScripts[] = $script;
    }
}
$add(empty($missingDeployScripts) ? 'OK' : 'FAIL', 'R9.5 deploy validation scripts', empty($missingDeployScripts) ? 'present' : implode(', ', $missingDeployScripts));


$deployScriptSyntax = [];
foreach (glob($root . '/deploy/scripts/*.sh') ?: [] as $scriptPath) {
    $cmd = 'bash -n ' . escapeshellarg($scriptPath) . ' 2>&1';
    exec($cmd, $out, $rc);
    if ($rc !== 0) {
        $deployScriptSyntax[] = $rel($scriptPath) . ': ' . implode(' ', $out);
    }
}
$add(empty($deployScriptSyntax) ? 'OK' : 'FAIL', 'deploy script bash syntax', empty($deployScriptSyntax) ? 'all deploy scripts parse' : implode(' | ', array_slice($deployScriptSyntax, 0, 10)));

$deployEvalHits = [];
foreach (glob($root . '/deploy/scripts/*.sh') ?: [] as $scriptPath) {
    $txt = (string)@file_get_contents($scriptPath);
    if (preg_match('/(^|[^A-Za-z0-9_])eval([^A-Za-z0-9_]|$)/', $txt)) {
        $deployEvalHits[] = $rel($scriptPath);
    }
}
$add(empty($deployEvalHits) ? 'OK' : 'FAIL', 'deploy scripts eval scan', empty($deployEvalHits) ? 'no eval in deploy scripts' : implode(', ', $deployEvalHits));

$policyCacheFiles = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (str_contains($r, 'agent/data/policy-cache/') || basename($r) === 'last-known-policy.json' || preg_match('/last-known-policy\.json\.tmp$/i', $r)) {
        $policyCacheFiles[] = $r;
    }
}
if (is_dir($root . '/agent/data/policy-cache')) {
    $policyCacheFiles[] = 'agent/data/policy-cache/';
}
$policyCacheFiles = array_values(array_unique($policyCacheFiles));
$add(empty($policyCacheFiles) ? 'OK' : 'FAIL', 'agent policy cache runtime files', empty($policyCacheFiles) ? 'absent' : implode(', ', array_slice($policyCacheFiles, 0, 20)));

$motherStateRuntime = [];
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (preg_match('/(?:^|\/)mother-state\.json(?:\.bak|\.tmp)?$/i', $r) || preg_match('/(?:^|\/)mother\/data\//i', $r)) {
        $motherStateRuntime[] = $r;
    }
}
$motherStateRuntime = array_values(array_unique($motherStateRuntime));
$add(empty($motherStateRuntime) ? 'OK' : 'FAIL', 'mother persistent runtime state', empty($motherStateRuntime) ? 'absent' : implode(', ', array_slice($motherStateRuntime, 0, 20)));


$generatedBinaries = [];
foreach (['agent/unixsee-agent', 'mother/unixsee-mother', 'agent/bin/unixsee-agent', 'mother/bin/unixsee-mother'] as $bin) {
    if (is_file($root . '/' . $bin)) {
        $generatedBinaries[] = $bin;
    }
}
$add(empty($generatedBinaries) ? 'OK' : 'FAIL', 'generated Go binaries', empty($generatedBinaries) ? 'absent' : implode(', ', $generatedBinaries));

$legacyDir = $root . '/ux_gateway';
if (is_dir($legacyDir)) {
    $marker = $legacyDir . '/LEGACY_NOT_ACTIVE.md';
    $denyRoot = $legacyDir . '/.htaccess';
    $denyPublic = $legacyDir . '/public/.htaccess';
    $add(is_file($marker) ? 'OK' : 'FAIL', 'legacy marker', is_file($marker) ? 'ux_gateway/LEGACY_NOT_ACTIVE.md' : 'missing');
    $add(is_file($denyRoot) ? 'OK' : 'FAIL', 'legacy root deny', is_file($denyRoot) ? 'ux_gateway/.htaccess' : 'missing');
    $add(is_file($denyPublic) ? 'OK' : 'FAIL', 'legacy public deny', is_file($denyPublic) ? 'ux_gateway/public/.htaccess' : 'missing');

    foreach ([[$denyRoot, 'legacy root deny content'], [$denyPublic, 'legacy public deny content']] as [$denyFile, $label]) {
        $txt = is_file($denyFile) ? (string)@file_get_contents($denyFile) : '';
        $hasDeny = stripos($txt, 'Require all denied') !== false || stripos($txt, 'Deny from all') !== false;
        $add($hasDeny ? 'OK' : 'FAIL', $label, $hasDeny ? 'deny rule present' : 'deny rule missing');
    }
} else {
    $add('OK', 'legacy directory', 'not present');
}

$activeRequireHits = [];
$requirePattern = '/\b(?:require|require_once|include|include_once)\b\s*(?:\(?\s*)[^;\n]*(?:ux_gateway\s*\.\s*[\'\"]|ux_gateway\/|app\/bootstrap\.php|ux_gateway\/public\/index\.php)/i';
foreach ($allFiles as $file) {
    $r = $rel($file);
    if (!str_ends_with($r, '.php')) {
        continue;
    }
    if (str_starts_with($r, 'ux_gateway/')) {
        continue;
    }
    $txt = @file_get_contents($file);
    if (!is_string($txt)) {
        continue;
    }
    if (preg_match_all($requirePattern, $txt, $matches, PREG_OFFSET_CAPTURE)) {
        foreach ($matches[0] as $match) {
            $before = substr($txt, 0, (int)$match[1]);
            $line = substr_count($before, "\n") + 1;
            $activeRequireHits[] = $r . ':' . $line . ':' . trim($match[0]);
        }
    }
}
$add(empty($activeRequireHits) ? 'OK' : 'FAIL', 'active legacy bootstrap require', empty($activeRequireHits) ? 'none' : implode(' | ', array_slice($activeRequireHits, 0, 10)));

$rootHtaccess = $root . '/.htaccess';
$add(is_file($rootHtaccess) ? 'OK' : 'WARN', 'root htaccess', is_file($rootHtaccess) ? 'present; not modified by legacy quarantine scan' : 'missing');

ksort($rows);
echo "Unixsee Campaign Gateway Release Scan\n";
echo "=====================================\n";
foreach ($rows as [$status, $name, $detail]) {
    printf("[%s] %-32s %s\n", $status, $name, $detail);
}
echo "-------------------------------------\n";
printf("OK=%d WARN=%d FAIL=%d\n", $ok, $warn, $fail);
exit($fail > 0 ? 1 : 0);
