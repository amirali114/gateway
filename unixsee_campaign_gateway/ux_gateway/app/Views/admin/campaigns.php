<?php
/** @var array $campaigns */
/** @var array $themes */
?>
<div class="topbar">
    <div>
        <h1 class="page-h1">کمپین‌ها</h1>
        <div class="text-xs text-muted">مدیریت کمپین‌های ورودی و تست A/B</div>
    </div>
</div>

<div class="card">
    <h2 class="page-h2">ساخت کمپین جدید</h2>
    <form method="post" class="text-xs">
        <input type="hidden" name="form_action" value="create">
        <div class="form-row">
            <div>
                <label>نام کمپین</label>
                <input type="text" name="name" required>
            </div>
            <div>
                <label>اسلاگ (انگلیسی و یکتا)</label>
                <input type="text" name="slug" required placeholder="مثال: winter-sale">
            </div>
        </div>
        <div class="form-row">
            <div>
                <label>آدرس ریدایرکت پس از ثبت</label>
                <input type="url" name="redirect_url" required placeholder="مثال: /shop">
            </div>
            <div>
                <label>تم</label>
                <select name="theme">
                    <?php foreach ($themes as $t): ?>
                        <option value="<?= htmlspecialchars($t) ?>"><?= htmlspecialchars($t) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div>
                <label>
                    <input type="checkbox" name="active" value="1" checked> فعال باشد
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" name="variant_b_active" value="1"> فعال‌کردن تست A/B (ورژن B)
                </label>
            </div>
        </div>
        <div class="mt-2">
            <button class="btn-sm btn-sm-primary" type="submit">ایجاد کمپین</button>
        </div>
    </form>
</div>

<div class="card">
    <h2 class="page-h2">لیست کمپین‌ها</h2>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>نام</th>
                <th>اسلاگ</th>
                <th>وضعیت</th>
                <th>A/B</th>
                <th>تم</th>
                <th>عملیات</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($campaigns as $c): ?>
            <tr>
                <td><?= (int) $c['id'] ?></td>
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
                <td>
                    <form method="post" class="inline-flex">
                        <input type="hidden" name="form_action" value="update_theme">
                        <input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
                        <select name="theme" style="max-width:120px;">
                            <?php foreach ($themes as $t): ?>
                                <option value="<?= htmlspecialchars($t) ?>" <?= $c['theme']===$t?'selected':'' ?>>
                                    <?= htmlspecialchars($t) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <button class="btn-sm btn-sm-outline" type="submit">ذخیره</button>
                    </form>
                </td>
                <td class="nowrap">
                    <form method="post" >
                        <input type="hidden" name="form_action" value="toggle_active">
                        <input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
                        <button class="btn-sm" type="submit">
                            <?= !empty($c['active']) ? 'غیرفعال‌کردن' : 'فعال‌کردن' ?>
                        </button>
                    </form>
                    <form method="post" >
                        <input type="hidden" name="form_action" value="toggle_variant_b">
                        <input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
                        <button class="btn-sm" type="submit">
                            <?= !empty($c['variant_b_active']) ? 'خاموش‌کردن B' : 'روشن‌کردن B' ?>
                        </button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
