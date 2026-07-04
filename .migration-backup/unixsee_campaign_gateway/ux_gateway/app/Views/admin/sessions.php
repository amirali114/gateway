<?php
/** @var array $sessions */
/** @var string|null $from */
/** @var string|null $to */
?>
<div class="topbar">
    <div>
        <h1 class="page-h1">سشن‌ها</h1>
        <div class="text-xs text-muted">لیست آخرین ثبت‌نام‌ها و سشن‌های کمپین</div>
    </div>
</div>

<div class="card">
    <form method="get" class="text-xs">
        <input type="hidden" name="action" value="admin_sessions">
        <div class="form-row">
            <div>
                <label>از تاریخ (YYYY-MM-DD)</label>
                <input type="text" name="from" value="<?= htmlspecialchars($from ?? '') ?>" placeholder="مثال: 2025-01-01">
            </div>
            <div>
                <label>تا تاریخ (YYYY-MM-DD)</label>
                <input type="text" name="to" value="<?= htmlspecialchars($to ?? '') ?>" placeholder="مثال: 2025-01-31">
            </div>
            <div style="align-self:flex-end;">
                <button class="btn-sm btn-sm-primary" type="submit">فیلتر</button>
            </div>
        </div>
    </form>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>کمپین</th>
                <th>ورژن</th>
                <th>نام</th>
                <th>موبایل</th>
                <th>IP</th>
                <th>زمان</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($sessions as $s): 
            $data = json_decode($s['data_json'] ?? '[]', true) ?: [];
        ?>
            <tr>
                <td><?= (int) $s['id'] ?></td>
                <td><?= htmlspecialchars($s['campaign_name'] ?? '-') ?></td>
                <td><span class="badge"><?= htmlspecialchars($s['variant']) ?></span></td>
                <td><?= htmlspecialchars($data['name'] ?? '-') ?></td>
                <td><?= htmlspecialchars($data['phone'] ?? '-') ?></td>
                <td class="text-xs text-muted"><?= htmlspecialchars($s['ip'] ?? '-') ?></td>
                <td class="text-xs text-muted"><?= htmlspecialchars($s['created_at']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
