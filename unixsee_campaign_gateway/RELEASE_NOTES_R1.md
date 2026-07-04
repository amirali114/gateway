# Unixsee Campaign Gateway — R1 Cleanup Start

This package is the first cleanup/refactor baseline from the current PHP proof-of-concept.

## Applied changes

- Fixed the `gateway.php` scope bug where `ux_api_check()` could be defined inside `ux_should_bypass_request()` and become unavailable at runtime.
- Hardened `ux_preview` so an empty or short `panel_token` no longer grants preview access.
- Fixed admin login lock duration key: `ux_admin.php` now reads `lock_minutes`, matching the admin panel setting.
- Removed runtime/private files from the release ZIP: SQLite DBs, WAL/SHM files, runtime JSON state, lock files, backup file, real ticket secret, uploaded media, and bundled font files.
- Sanitized `ux_config.php`: removed customer-specific IPs, campaign text, credentials/secrets, Redis password, and absolute customer paths.
- Hardened `.htaccess` to deny common secret/runtime/backup files.
- Safer fresh-install defaults in `gateway.php`: gateway disabled by default, maintenance mode, no built-in admin password, no built-in panel token.
- Search-bot DNS validation defaults changed to enabled/strict to reduce UA spoof bypass risk.

## Important before running

Set a real admin password hash and a strong panel token before using the admin panel or preview mode.

Example password hash generation:

```bash
php -r 'echo password_hash("YOUR_STRONG_PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'
```

Then place the resulting hash in `ux_config.php` under `admin_password`.

## Still not production-ready

This R1 package is a safer baseline, not the final Agent/Mother architecture. Remaining work:

- Move decision logic into a modular DecisionEngine.
- Add PHP→Go Agent bridge contract.
- Add Go Agent shadow mode.
- Remove PHP from hot path later.
- Replace SQLite hot-path usage with Agent RAM/BadgerDB in the next architecture phase.
