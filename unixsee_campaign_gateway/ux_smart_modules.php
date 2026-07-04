<?php
/**
 * Smart Queue Modules (ux_smart_modules.php)
 *
 * هدف: اجازه بدهید ماژول‌های متعدد (bot pressure, traffic intel, campaign weight, …)
 * فقط «سیگنال» بدهند و تصمیم‌گیری صف هوشمند را بهتر کنند، بدون اینکه مسیر داغ سنگین شود.
 *
 * الگو:
 *  - ماژول‌ها فقط با یک تابع ثبت می‌شوند.
 *  - هر ماژول یک context (آرایه) می‌گیرد و می‌تواند خروجی پیشنهاد بدهد:
 *      - recommended_cap (عدد جدید)
 *      - cap_multiplier (ضریب روی ظرفیت)
 *      - cap_delta (کاهش/افزایش)
 *      - force_trend_up / force_trend_down
 *      - reason_codes (کدهای کوتاه برای ثبت در smart_decisions)
 *
 * نکته پایداری:
 *  - هر ماژول داخل try/catch اجرا می‌شود تا اگر ماژول خطا داشت، کل gateway از کار نیفتد.
 */

if (!function_exists('ux_smart_register_module')) {

    /**
     * @return array<string, array{name:string,priority:int,handler:callable,enabled:bool}>
     */
    function &ux_smart_modules_registry(): array
    {
        static $reg = [];
        return $reg;
    }

    /**
     * Register a smart module.
     *
     * @param string   $name
     * @param callable $handler  function(array $ctx): array  (returns changes)
     * @param int      $priority smaller runs earlier
     * @param bool     $enabled  default enabled (can be filtered by config)
     */
    function ux_smart_register_module(string $name, callable $handler, int $priority = 50, bool $enabled = true): void
    {
        $name = trim($name);
        if ($name === '') return;
        $reg = &ux_smart_modules_registry();
        $reg[$name] = [
            'name' => $name,
            'priority' => $priority,
            'handler' => $handler,
            'enabled' => $enabled,
        ];
    }

    /**
     * Autoload custom modules from a directory.
     * Each file can call ux_smart_register_module().
     */
    function ux_smart_modules_autoload(?string $dir = null): void
    {
        if ($dir === null || trim($dir) === '') {
            $dir = __DIR__ . '/smart_modules';
        }
        $dir = rtrim($dir, '/');
        // If path is relative, resolve relative to plugin root
        if (strpos($dir, '/') !== 0 && strpos($dir, ':') === false) {
            $dir = __DIR__ . '/' . $dir;
        }
        if (!is_dir($dir)) return;

        $files = glob($dir . '/*.php');
        if (!is_array($files)) return;

        foreach ($files as $file) {
            // suppress errors to avoid breaking hot-path
            @require_once $file;
        }
    }

    /**
     * Apply smart modules.
     *
     * @param array $ctx input context
     * @return array{ctx:array, reason_codes:array<int,string>, debug:array<int,array>}
     */
    function ux_smart_modules_apply(array $ctx): array
    {
        global $config;

        // Load custom modules once
        static $loaded = false;
        if (!$loaded) {
            $loaded = true;
            $dir = isset($config['smart_modules_dir']) ? (string)$config['smart_modules_dir'] : null;
            ux_smart_modules_autoload($dir);
        }

        $reg = ux_smart_modules_registry();
        if (empty($reg)) {
            return ['ctx' => $ctx, 'reason_codes' => [], 'debug' => []];
        }

        // enabled allowlist
        $allow = $config['smart_modules_enabled'] ?? null; // array of names
        $deny  = $config['smart_modules_disabled'] ?? null; // array of names
        $useAllow = is_array($allow) && count($allow) > 0;
        $autoEnable = !empty($config['smart_modules_auto_enable']);
        $denySet = [];
        if (is_array($deny)) {
            foreach ($deny as $n) $denySet[(string)$n] = true;
        }

        // sort by priority
        uasort($reg, function($a, $b){
            return ($a['priority'] ?? 50) <=> ($b['priority'] ?? 50);
        });

        $reasonCodes = [];
        $debug = [];
        $cap0 = (int)($ctx['recommended_cap'] ?? 0);

        foreach ($reg as $name => $mod) {
            $enabled = !empty($mod['enabled']);
            if ($useAllow) {
                $enabled = in_array($name, $allow, true);
            } elseif (!$autoEnable) {
                // default: nothing runs unless explicitly enabled
                $enabled = false;
            }
            if (isset($denySet[$name])) {
                $enabled = false;
            }
            if (!$enabled) continue;

            try {
                $handler = $mod['handler'];
                $out = $handler($ctx);
                if (is_array($out)) {
                    // apply fields
                    if (isset($out['cap_multiplier'])) {
                        $mul = (float)$out['cap_multiplier'];
                        if ($mul > 0 && $mul < 10) {
                            $ctx['recommended_cap'] = (int)round(((int)($ctx['recommended_cap'] ?? 0)) * $mul);
                        }
                    }
                    if (isset($out['cap_delta'])) {
                        $delta = (int)$out['cap_delta'];
                        $ctx['recommended_cap'] = (int)($ctx['recommended_cap'] ?? 0) + $delta;
                    }
                    if (isset($out['recommended_cap'])) {
                        $ctx['recommended_cap'] = (int)$out['recommended_cap'];
                    }
                    if (isset($out['force_trend_down'])) {
                        $ctx['trend_down'] = (bool)$out['force_trend_down'];
                    }
                    if (isset($out['force_trend_up'])) {
                        $ctx['trend_up'] = (bool)$out['force_trend_up'];
                    }
                    if (isset($out['reason_codes']) && is_array($out['reason_codes'])) {
                        foreach ($out['reason_codes'] as $c) {
                            $c = trim((string)$c);
                            if ($c !== '') $reasonCodes[] = $c;
                        }
                    }
                    if (!empty($config['smart_modules_debug'])) {
                        $debug[] = [
                            'module' => $name,
                            'before' => $cap0,
                            'after'  => (int)($ctx['recommended_cap'] ?? 0),
                            'out'    => $out,
                        ];
                        $cap0 = (int)($ctx['recommended_cap'] ?? 0);
                    }
                }
            } catch (Throwable $e) {
                // never break gateway because of a module
                $reasonCodes[] = 'mod_err_' . preg_replace('/[^a-z0-9_]+/i', '_', $name);
                if (!empty($config['smart_modules_debug'])) {
                    $debug[] = ['module' => $name, 'error' => $e->getMessage()];
                }
            }
        }

        return ['ctx' => $ctx, 'reason_codes' => $reasonCodes, 'debug' => $debug];
    }

    /**
     * Return list of registered module names (for admin panel).
     *
     * @return array<int, array{name:string,priority:int,enabled:bool}>
     */
    function ux_smart_modules_list(): array
    {
        global $config;
        static $loadedList = false;
        if (!$loadedList) {
            $loadedList = true;
            $dir = isset($config['smart_modules_dir']) ? (string)$config['smart_modules_dir'] : null;
            ux_smart_modules_autoload($dir);
        }
        $reg = ux_smart_modules_registry();
        if (empty($reg)) return [];
        uasort($reg, function($a, $b){
            return ($a['priority'] ?? 50) <=> ($b['priority'] ?? 50);
        });
        $out = [];
        foreach ($reg as $m) {
            $out[] = [
                'name' => (string)($m['name'] ?? ''),
                'priority' => (int)($m['priority'] ?? 50),
                'enabled' => !empty($m['enabled']),
            ];
        }
        return $out;
    }
}

// Optional: ship with zero-impact sample modules (only run when enabled in config)
if (!function_exists('ux_smart_modules_builtin_register')) {
    function ux_smart_modules_builtin_register(): void
    {
        // Example: اگر صف خیلی بزرگ شد، ظرفیت را محتاط‌تر کن (فقط با enable)
        ux_smart_register_module('queue_guard', function(array $ctx): array {
            $queue = (int)($ctx['queue'] ?? 0);
            $base  = (int)($ctx['base_max'] ?? 0);
            if ($base <= 0) return [];
            if ($queue > max(200, (int)round($base * 2))) {
                return [
                    'cap_multiplier' => 0.85,
                    'reason_codes' => ['mod_queue_guard'],
                ];
            }
            return [];
        }, 80, false);

        // Example: وقتی فشار کاربر همزمان از حد گذشت، کاهش ملایم
        ux_smart_register_module('inside_guard', function(array $ctx): array {
            $inside = (int)($ctx['inside'] ?? 0);
            $base  = (int)($ctx['base_max'] ?? 0);
            if ($base <= 0) return [];
            if ($inside > (int)round($base * 0.95)) {
                return [
                    'cap_multiplier' => 0.9,
                    'reason_codes' => ['mod_inside_guard'],
                ];
            }
            return [];
        }, 90, false);
    }

    // register builtins once
    ux_smart_modules_builtin_register();
}