# R2 Debug Notes — Unixsee Campaign Gateway

This build keeps the current PHP gateway, but hardens runtime behavior so the next step can be shadow-mode Go Agent integration.

## Fixed / improved

- Added a release-safe self-test: `php tools/uxgw_selftest.php`.
- Added guarded SQLite availability detection via `ux_storage_sqlite_available()`.
- Prevented white-screen fatal when `pdo_sqlite` is missing and Redis is not active.
- Added `storage_fail_mode` config:
  - `open`: allow traffic if the local storage backend is unavailable.
  - `close`: keep users in waiting room if the storage backend is unavailable.
- Removed hard-coded private paths from release config.
- Resolved relative `ticket_secret_file` paths safely inside the gateway directory.
- Hardened client IP detection: forwarded headers are ignored unless `trusted_proxy_enabled=true` and `REMOTE_ADDR` is in `trusted_proxies`.
- Tightened bypass matching to use parsed request path/query instead of loose substring matching against the full URI.
- Removed duplicate Redis active-count read in the waiting-room check endpoint.

## Current architecture status

- PHP gateway remains the active runtime.
- No Go Agent is wired yet.
- This build is ready for the next refactor step: define a local decision contract and run a Go Agent in shadow mode.

## Important production note

For real queue enforcement in PHP fallback mode, install `pdo_sqlite` or enable Redis. Without either one, the gateway will use `storage_fail_mode` instead of crashing.
