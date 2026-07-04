این پوشه برای ماژول‌های صف هوشمند (Smart Queue) است.

هر فایل PHP می‌تواند یک یا چند ماژول ثبت کند:

ux_smart_register_module('my_module', function(array $ctx): array {
    // ctx شامل cpu/mem/disk/inside/queue/base_max/current_cap/recommended_cap/trend_up/trend_down/now است
    // خروجی می‌تواند یکی از این‌ها باشد:
    //  - 'cap_multiplier' => 0.9
    //  - 'cap_delta' => -30
    //  - 'recommended_cap' => 120
    //  - 'force_trend_down' => true
    //  - 'reason_codes' => ['mod_my_module']
    return [];
}, 50, true);

فعال/غیرفعال:
- اگر smart_modules_enabled خالی باشد و smart_modules_auto_enable=true باشد، ماژول‌هایی که enabled=true باشند اجرا می‌شوند.
- اگر smart_modules_enabled را پر کنید، فقط همان‌ها اجرا می‌شوند.
