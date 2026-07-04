<?php
if (function_exists('ux_smart_register_module')) {
    ux_smart_register_module('my_module', function(array $ctx): array {
        // مثال: اگر فشار صف زیاد شد، ظرفیت را ۱۰٪ کم کن
        $queue = (int)($ctx['queue'] ?? 0);
        $base  = (int)($ctx['base_max'] ?? 0);

        if ($queue > max(500, (int)round($base * 3))) {
            return [
                'cap_multiplier' => 0.9,
                'reason_codes' => ['mod_my_module'],
            ];
        }
        return [];
    }, 50, true); // priority=50, enabled=true
}
