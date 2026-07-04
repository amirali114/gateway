<?php
/** @var int $total */
/** @var int $today */
/** @var int $week */
/** @var array $variant */
/** @var array $campaigns */
?>
<div class="topbar">
    <div>
        <h1 class="page-h1">داشبورد</h1>
        <div class="text-xs text-muted">مرور کلی وضعیت کمپین و سشن‌های ثبت‌شده</div>
    </div>
</div>

<div class="kpi-wrap">
    <div class="kpi">
        <div class="kpi-title">کل ثبت‌نام‌های موفق</div>
        <div class="kpi-value"><?= (int) $total ?></div>
        <div class="kpi-meta">همه‌ی زمان‌ها</div>
    </div>
    <div class="kpi">
        <div class="kpi-title">امروز</div>
        <div class="kpi-value"><?= (int) $today ?></div>
        <div class="kpi-meta">از ۰۰:۰۰ امروز</div>
    </div>
    <div class="kpi">
        <div class="kpi-title">۷ روز اخیر</div>
        <div class="kpi-value"><?= (int) $week ?></div>
        <div class="kpi-meta">کل ثبت‌نام‌ها در یک هفته‌ی گذشته</div>
    </div>
    <div class="kpi">
        <div class="kpi-title">A/B تست</div>
        <div class="kpi-value">
            A: <?= (int) ($variant['A'] ?? 0) ?> /
            B: <?= (int) ($variant['B'] ?? 0) ?>
        </div>
        <div class="kpi-meta">جمع: <?= (int) ($variant['total'] ?? 0) ?></div>
    </div>
</div>

<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
            <div style="font-size:14px;font-weight:600;">کمپین‌ها</div>
            <div class="text-xs text-muted">لیست کمپین‌های فعلی و وضعیت آن‌ها</div>
        </div>
        <a href="?action=admin_campaigns" class="text-xs" class="link-accent">مدیریت کمپین‌ها →</a>
    </div>

    <table>
        <thead>
            <tr>
                <th>نام کمپین</th>
                <th>اسلاگ</th>
                <th>وضعیت</th>
                <th>A/B</th>
                <th>تم</th>
                <th>ایجاد شده</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($campaigns as $c): ?>
            <tr>
                <td><?= htmlspecialchars($c['name']) ?></td>
                <td><?= htmlspecialchars($c['slug']) ?></td>
                <td>
                    <?php if (!empty($c['active'])): ?>
                        <span class="badge badge-green">فعال</span>
                    <?php else: ?>
                        <span class="badge badge-red">غیرفعال</span>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if (!empty($c['variant_b_active'])): ?>
                        <span class="badge">A/B فعال</span>
                    <?php else: ?>
                        <span class="badge">فقط A</span>
                    <?php endif; ?>
                </td>
                <td><span class="badge"><?= htmlspecialchars($c['theme']) ?></span></td>
                <td class="text-xs text-muted"><?= htmlspecialchars(substr($c['created_at'], 0, 10)) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
