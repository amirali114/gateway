<?php
/**
 * Optional local mock Agent for R3 shadow bridge testing only.
 *
 * Run:
 *   php -S 127.0.0.1:8731 tools/mock_agent_server.php
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method !== 'POST' || $path !== '/v1/shadow/decision') {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'not_found'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return;
}

$raw = file_get_contents('php://input') ?: '';
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'invalid_json'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return;
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => true,
    'mode' => 'shadow',
    'agent_decision' => [
        'action' => 'allow',
        'reason' => 'mock_only',
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
