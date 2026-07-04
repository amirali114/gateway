<?php
$position = $position ?? null;
$inside   = $inside ?? 0;
$max      = $max ?? 0;
?>
<div class="badge">
    <span>در صف انتظار</span>
    <span>کمپین <?= htmlspecialchars($campaign['name'] ?? '') ?></span>
</div>

<div class="title">سرورها شلوغ هستند</div>

<div class="subtitle">
    برای جلوگیری از فشار روی سایت، شما در یک صف موقت قرار گرفته‌اید.
    صفحه به‌صورت خودکار هر چند ثانیه یک‌بار رفرش می‌شود.
</div>

<div class="stepper">
    <span>لطفاً این صفحه را نبندید تا نوبت شما برسد.</span>
</div>

<div class="timer">
    <?php if ($position): ?>
        موقعیت شما در صف:
        <strong>#<?= (int) $position ?></strong>
    <?php endif; ?>
    <?php if ($max): ?>
        <span class="timer-sub">
            ظرفیت همزمان سرور: <?= (int) $max ?> کاربر
        </span>
    <?php endif; ?>
</div>

<script>
// هر 8 ثانیه یک‌بار صفحه را رفرش می‌کنیم
setTimeout(function () {
    window.location.reload();
}, 8000);
</script>
