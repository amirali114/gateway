<?php
/**
 * UNIXSEE Gateway Log Migration (JSON → SQLite)
 * login_attempts.json intentionally NOT migrated.
 *
 * This script migrates the existing JSON log files (ux_visit_log.json and ux_bot_log.json)
 * into the SQLite database (ux_campaign.sqlite). The login_attempts.json file is left
 * untouched so it can still be manually edited when needed.
 *
 * To run this migration:
 *   php ux_migrate_logs.php
 *
 * After running, the original JSON files will be renamed with a .migrated suffix.
 */

$dbFile = __DIR__ . '/ux_campaign.sqlite';
$db = new SQLite3($dbFile);

// ----------------------------------------------------------------------
// Create tables if they do not exist
// ----------------------------------------------------------------------

$db->exec("\nCREATE TABLE IF NOT EXISTS visits (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    timestamp INTEGER NOT NULL,\n    ip TEXT NOT NULL,\n    user_agent TEXT NOT NULL,\n    path TEXT NOT NULL,\n    country TEXT,\n    is_bot INTEGER DEFAULT 0\n);\n");

$db->exec("\nCREATE TABLE IF NOT EXISTS bot_logs (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    timestamp INTEGER NOT NULL,\n    ip TEXT NOT NULL,\n    user_agent TEXT NOT NULL,\n    bot_name TEXT,\n    result INTEGER,\n    path TEXT\n);\n");

echo "✓ Tables ensured in database.\n";

// ----------------------------------------------------------------------
// Helper to load JSON data
// ----------------------------------------------------------------------
function load_json_file(string $file): ?array {
    if (!is_file($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return null;
    }
    return $data;
}

// ----------------------------------------------------------------------
// Migrate ux_visit_log.json to visits table
// ----------------------------------------------------------------------
$visitFile = __DIR__ . '/ux_visit_log.json';
$visitsData = load_json_file($visitFile);
if ($visitsData) {
    echo "Migrating visits from ux_visit_log.json ...\n";
    $stmt = $db->prepare("\n        INSERT INTO visits (timestamp, ip, user_agent, path, country, is_bot)\n        VALUES (:ts, :ip, :ua, :path, :country, 0)\n    ");
    foreach ($visitsData as $entry) {
        $ts = isset($entry['ts']) ? (int)$entry['ts'] : time();
        $ip = isset($entry['ip']) ? (string)$entry['ip'] : '';
        $ua = isset($entry['ua']) ? (string)$entry['ua'] : '';
        $path = isset($entry['path']) ? (string)$entry['path'] : '/';
        $country = isset($entry['country']) ? (string)$entry['country'] : null;

        $stmt->bindValue(':ts', $ts, SQLITE3_INTEGER);
        $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
        $stmt->bindValue(':ua', $ua, SQLITE3_TEXT);
        $stmt->bindValue(':path', $path, SQLITE3_TEXT);
        $stmt->bindValue(':country', $country, SQLITE3_TEXT);
        $stmt->execute();
    }
    // rename file after migration
    @rename($visitFile, $visitFile . '.migrated');
    echo "✓ Visits migrated and ux_visit_log.json renamed.\n";
} else {
    echo "No visits to migrate.\n";
}

// ----------------------------------------------------------------------
// Migrate ux_bot_log.json to bot_logs table
// ----------------------------------------------------------------------
$botFile = __DIR__ . '/ux_bot_log.json';
$botData = load_json_file($botFile);
if ($botData) {
    echo "Migrating bot logs from ux_bot_log.json ...\n";
    $stmt = $db->prepare("\n        INSERT INTO bot_logs (timestamp, ip, user_agent, bot_name, result, path)\n        VALUES (:ts, :ip, :ua, :bot, :result, :path)\n    ");
    foreach ($botData as $entry) {
        $ts = isset($entry['ts']) ? (int)$entry['ts'] : time();
        $ip = isset($entry['ip']) ? (string)$entry['ip'] : '';
        $ua = isset($entry['ua']) ? (string)$entry['ua'] : '';
        $status = isset($entry['status']) ? (int)$entry['status'] : 0;
        $path = isset($entry['path']) ? (string)$entry['path'] : '';
        // bot_name will remain empty; detection will occur when reading from DB
        $botName = '';

        $stmt->bindValue(':ts', $ts, SQLITE3_INTEGER);
        $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
        $stmt->bindValue(':ua', $ua, SQLITE3_TEXT);
        $stmt->bindValue(':bot', $botName, SQLITE3_TEXT);
        $stmt->bindValue(':result', $status, SQLITE3_INTEGER);
        $stmt->bindValue(':path', $path, SQLITE3_TEXT);
        $stmt->execute();
    }
    @rename($botFile, $botFile . '.migrated');
    echo "✓ Bot logs migrated and ux_bot_log.json renamed.\n";
} else {
    echo "No bot logs to migrate.\n";
}

// ----------------------------------------------------------------------
// End: login_attempts.json is intentionally kept as JSON for manual editing.
// ----------------------------------------------------------------------

echo "\nMigration completed successfully.\n";