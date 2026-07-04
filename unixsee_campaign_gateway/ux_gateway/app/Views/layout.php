<?php
/** @var string $viewPath */
/** @var array $theme */
/** @var array $campaign */
?><!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($campaign['name'] ?? 'فرم کمپین') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="?action=front_css&v=1">
</head>
<body>
<div class="overlay"></div>
<div class="card">
    <?php require $viewPath; ?>
</div>
</body>
</html>
