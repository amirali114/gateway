<?php
/** @var array $themes */
/** @var string $app_name */
?>
<div class="topbar">
    <div>
        <h1 class="page-h1">تنظیمات</h1>
        <div class="text-xs text-muted">نمای کلی تنظیمات برنامه</div>
    </div>
</div>

<div class="card">
    <h2 class="page-h2">اطلاعات کلی</h2>
    <p class="text-sm"><strong>نام برنامه:</strong> <?= htmlspecialchars($app_name) ?></p>
    <p class="text-xs text-muted mt-2">
        تنظیمات پیشرفته‌تر (مانند base_url و اطلاعات دیتابیس) از طریق فایل <code>app/config.php</code> قابل تغییر هستند.
    </p>
</div>

<div class="card">
    <h2 class="page-h2">تم‌های موجود</h2>
    <table>
        <thead>
            <tr>
                <th>شناسه تم</th>
                <th>رنگ اصلی</th>
                <th>پس‌زمینه</th>
                <th>Dark Mode</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($themes as $key => $th): ?>
            <tr>
                <td><span class="badge"><?= htmlspecialchars($key) ?></span></td>
                <td><?= htmlspecialchars($th['primary_color'] ?? '-') ?></td>
                <td class="text-xs text-muted">
                    <?= htmlspecialchars(mb_substr($th['background'] ?? '-', 0, 40)) ?>...
                </td>
                <td><?= !empty($th['dark_mode']) ? 'بله' : 'خیر' ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
