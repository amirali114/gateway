<?php
$errors  = $errors ?? [];
$old     = $old ?? ['name' => '', 'phone' => '', 'extra' => ''];
$variant = $variant ?? 'A';
?>
<div class="badge">
    <span>مرحله ۱ از ۲</span>
    <span>فرم ورود به <?= htmlspecialchars($campaign['name']) ?></span>
</div>
<div class="title"><?= htmlspecialchars($campaign['name']) ?></div>
<div class="subtitle">
    لطفاً اطلاعات خود را برای ادامه و ورود به صفحه اصلی وارد کنید. اطلاعات شما محرمانه است.
</div>

<div class="stepper">
    <span>فرم ثبت اطلاعات</span>
    <div class="stepper-bar">
        <div class="stepper-bar-inner"></div>
    </div>
    <span>سایت / صفحه اصلی</span>
</div>

<form method="post" action="?action=submit" id="gateway-form" novalidate>
    <input type="hidden" name="variant" value="<?= htmlspecialchars($variant) ?>">

    <div class="field">
        <label>نام و نام خانوادگی</label>
        <input type="text" name="name" value="<?= htmlspecialchars($old['name']) ?>" required>
        <?php if (!empty($errors['name'])): ?>
            <div class="error"><?= htmlspecialchars($errors['name']) ?></div>
        <?php endif; ?>
    </div>

    <div class="field">
        <label>شماره موبایل (با 09)</label>
        <input type="tel" name="phone" value="<?= htmlspecialchars($old['phone']) ?>" pattern="^09\d{9}$" required>
        <?php if (!empty($errors['phone'])): ?>
            <div class="error"><?= htmlspecialchars($errors['phone']) ?></div>
        <?php endif; ?>
    </div>

    <div class="field">
        <label>توضیحات (اختیاری)</label>
        <textarea name="extra" rows="3" placeholder="اگر توضیح یا نکته‌ای هست اینجا بنویسید..."><?= htmlspecialchars($old['extra']) ?></textarea>
    </div>

    <button type="submit" class="button">
        ادامه و ورود به صفحه اصلی
        <span class="button-arrow">→</span>
    </button>

    <div class="meta">
        <span>اتصال امن SSL</span>
        <span>پشتیبانی ۲۴ ساعته</span>
    </div>
</form>

<script>
    const form = document.getElementById('gateway-form');
    form.addEventListener('submit', function(e){
        const phone = form.querySelector('input[name="phone"]');
        const phoneVal = (phone.value || '').trim();
        if(!/^09\d{9}$/.test(phoneVal)){
            e.preventDefault();
            alert('لطفاً شماره موبایل معتبر وارد کنید (با 09).');
            phone.focus();
        }
    });
</script>
