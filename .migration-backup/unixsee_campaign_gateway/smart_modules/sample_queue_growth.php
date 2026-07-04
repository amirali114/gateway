<?php
// نمونه ماژول: کاهش ظرفیت وقتی رشد صف خیلی زیاد است
// پیش‌فرض: غیرفعال (enabled=false) تا رفتار نسخه استیبل تغییر نکند

if (function_exists('ux_smart_register_module')) {
    ux_smart_register_module('queue_growth', function(array $ctx): array {
        $queue = (int)($ctx['queue'] ?? 0);
        $base  = (int)($ctx['base_max'] ?? 0);
        if ($base <= 0) return [];

        // اگر صف خیلی بزرگ شد، کاهش ملایم
        if ($queue > max(500, (int)round($base * 3))) {
            return [
                'cap_multiplier' => 0.8,
                'reason_codes' => ['mod_queue_growth'],
            ];
        }
        return [];
    }, 60, false);
}
