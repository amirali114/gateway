<?php
// Login view (inside admin layout)
?>
<div class="card" style="max-width:360px;margin:60px auto;">
    <div class="card">
        <h2 class="page-h1">ورود به پنل مدیریت</h2>
        <p class="text-xs text-muted">برای ورود، نام کاربری و رمز عبور را وارد کنید.</p>
        <?php if (!empty($error)): ?>
            <div class="text-sm text-danger mt-2">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="post" action="?action=admin_login" class="mt-3">
            <div class="form-row">
                <div>
                    <label>نام کاربری</label>
                    <input type="text" name="username" required>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <label>رمز عبور</label>
                    <input type="password" name="password" required>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn-sm btn-sm-primary" type="submit">ورود</button>
            </div>
            <p class="text-xs text-muted mt-2">
                لطفاً پس از اولین ورود، رمز عبور را در دیتابیس یا تنظیمات به یک مقدار قوی تغییر دهید.
            </p>
        </form>
    </div>
</div>
