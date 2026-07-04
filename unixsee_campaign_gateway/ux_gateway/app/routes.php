<?php
// app/routes.php

$action = $_GET['action'] ?? 'front';

switch ($action) {
    case 'front':
        // Front UI
        $controller = new FrontController($pdo, $config);
        $controller->showGateway();
        break;

    case 'submit':
        $controller = new FrontController($pdo, $config);
        $controller->handleSubmit();
        break;

    case 'admin_login':
        $controller = new AuthController($pdo, $config);
        $controller->login();
        break;

    case 'admin_logout':
        $controller = new AuthController($pdo, $config);
        $controller->logout();
        break;

    case 'admin_dashboard':
        $controller = new AdminController($pdo, $config);
        $controller->dashboard();
        break;

    case 'admin_sessions':
        $controller = new AdminController($pdo, $config);
        $controller->sessions();
        break;

    case 'admin_campaigns':
        $controller = new AdminController($pdo, $config);
        $controller->campaigns();
        break;

    case 'admin_settings':
        $controller = new AdminController($pdo, $config);
        $controller->settings();
        break;

case 'front_css':
    $controller = new FrontController($pdo, $config);
    $controller->css();
    break;

case 'admin_css':
    $controller = new AuthController($pdo, $config);
    $controller->adminCss();
    break;

    default:
http_response_code(404);
        echo 'Not Found';
        break;
}
