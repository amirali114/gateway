<?php
// app/migrations.php

// admins table
$pdo->exec("
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
");

// campaigns table
$pdo->exec("
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    variant_a_active INTEGER NOT NULL DEFAULT 1,
    variant_b_active INTEGER NOT NULL DEFAULT 0,
    redirect_url TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL
);
");

// sessions table
$pdo->exec("
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    variant TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    data_json TEXT,
    created_at TEXT NOT NULL,
    converted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
");

// login attempts table
$pdo->exec("
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
);
");
// Gateway queue tables (for high-traffic control)
$pdo->exec("
CREATE TABLE IF NOT EXISTS ux_sessions (
    session_id TEXT PRIMARY KEY,
    last_seen  INTEGER NOT NULL
);
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS ux_queue (
    session_id TEXT PRIMARY KEY,
    joined_at  INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL
);
");

// Seed default admin if none
$stmt = $pdo->query("SELECT COUNT(*) AS c FROM admins");
$count = (int) $stmt->fetch(PDO::FETCH_ASSOC)['c'];
if ($count === 0) {
    $username = $config['admin']['username'];
    $hash     = $config['admin']['password_hash'];

    $insert = $pdo->prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)");
    $insert->execute([$username, $hash, date('c')]);
}

// Seed default campaign if none
$stmt = $pdo->query("SELECT COUNT(*) AS c FROM campaigns");
$count = (int) $stmt->fetch(PDO::FETCH_ASSOC)['c'];
if ($count === 0) {
    $insert = $pdo->prepare("
        INSERT INTO campaigns (name, slug, active, variant_a_active, variant_b_active, redirect_url, theme, created_at)
        VALUES (?, ?, 1, 1, 0, ?, 'default', ?)
    ");
    $insert->execute([
        'کمپین پیش‌فرض',
        'default',
        '/',
        date('c'),
    ]);
}
