# Unixsee Campaign Gateway R10.1

Release: First Real Staging Deployment Package Cleanup

## Changelog
- Added minimal public PHP Gateway wrapper under `deploy/php-wrapper/gateway.php`.
- Added private PHP runtime install/update/rollback scripts.
- Fixed public wrapper install/update/rollback to copy only the minimal wrapper.
- Added hard-fail public webroot exposure validation.
- Standardized deployment paths across systemd, scripts, examples, and docs.
- Added production Agent systemd example.
- Updated Mother/Dashboard systemd examples to use `/opt/unixsee-campaign-gateway/bin` and `/etc/unixsee-gateway`.
- Added safer Core/Agent build-install-update-rollback flow with dry-run default.
- Added secret-file config support for Mother management token, Mother-Agent shared secret, Agent shadow secret, Agent Mother shared secret, and PostgreSQL DSN.
- Added staging-safe absolute-path config examples.
- Split validation into source-release and installed-runtime validators.
- Added deployment artifact manifest in Markdown and JSON.
- Added first real staging deployment runbook.
- Documented PostgreSQL honestly as optional/profile/fail-safe unless driver-enabled.

## Known limitations
- Agent remains shadow-only.
- Enforcement remains disabled.
- No remote command execution exists.
- JSON storage is staging-grade fallback.
- PostgreSQL profile exists, but runtime driver remains fail-safe unless a driver-enabled build is provided.
- RBAC is local; no SSO/OAuth/2FA.
- No HA clustering.
- Dashboard should be public only behind HTTPS/auth/reverse proxy.
- Mother remote exposure requires explicit remote-bind config and firewall allowlist.
- Agent must remain local-only by default.
- Public PHP path must remain wrapper-only.
