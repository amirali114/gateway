<?php
// app/bootstrap.php

declare(strict_types=1);

error_reporting(E_ALL);

require __DIR__ . '/Helpers/helpers.php';

$config = require __DIR__ . '/config.php';

// Secure session
session_name($config['session']['name']);
session_set_cookie_params([
    'lifetime' => $config['session']['lifetime'],
    'httponly' => true,
    'secure'   => !empty($_SERVER['HTTPS']),
    'samesite' => 'Strict',
]);
// Start a session only if not already started to avoid warnings when bootstrap.php is
// included multiple times. In the campaign gateway context, another session may already
// be active. Guard against repeated session_start calls.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// DB connection (SQLite)
try {
    $pdo = new PDO('sqlite:' . $config['database']['path']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Throwable $e) {
    ux_log('DB connection error', ['error' => $e->getMessage()]);
    if (!empty($config['debug'])) {
        die('DB Error: ' . $e->getMessage());
    }
    die('Internal Server Error');
}

// Run migrations (create tables if not exists)
require __DIR__ . '/migrations.php';

// Simple autoloader for Controllers, Services, Repositories
spl_autoload_register(function (string $class): void {
    $baseDir = __DIR__;
    $class = str_replace('\\', DIRECTORY_SEPARATOR, $class);
    $basename = basename($class);
    $paths = [
        $baseDir . '/Controllers/' . $basename . '.php',
        $baseDir . '/Services/' . $basename . '.php',
        $baseDir . '/Repositories/' . $basename . '.php',
    ];

    foreach ($paths as $path) {
        if (is_file($path)) {
            require $path;
            return;
        }
    }
});
