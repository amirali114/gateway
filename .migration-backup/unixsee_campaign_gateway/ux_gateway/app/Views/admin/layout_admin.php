<?php
/** @var string $viewPath */
?><!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>پنل مدیریت گیت‌وی</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="?action=admin_css&v=1">
</head>
<body>
<div class="layout">
    <div class="sidebar">
        <div class="brand">
            Unixsee Gateway
            <br><small>پنل مدیریت کمپین</small>
        </div>
        <?php $act = $_GET['action'] ?? ''; ?>
        <div class="nav">
            <a href="?action=admin_dashboard" class="<?= $act==='admin_dashboard' || $act==='' ? 'active' : '' ?>">داشبورد</a>
            <a href="?action=admin_sessions" class="<?= $act==='admin_sessions' ? 'active' : '' ?>">سشن‌ها</a>
            <a href="?action=admin_campaigns" class="<?= $act==='admin_campaigns' ? 'active' : '' ?>">کمپین‌ها</a>
            <a href="?action=admin_settings" class="<?= $act==='admin_settings' ? 'active' : '' ?>">تنظیمات</a>
        </div>
        <div class="sidebar-footer">
            <a href="?action=admin_logout" class="logout-link">خروج</a>
        </div>
    </div>
    <div class="content">
        <?php require $viewPath; ?>
    </div>
</div>
</body>
</html>
