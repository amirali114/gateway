# R8D.1 Installer Shell Safety Hotfix

R8D.1 hardens the local/dev installer and uninstaller scripts before staging-server execution.

## What changed

- Removed all shell `eval` usage from installer/uninstaller scripts.
- Replaced string-based command execution with direct quoted commands.
- Added strict prefix validation to install and uninstall scripts.
- Added `install/check-shell-safety.sh` to scan installer scripts for unsafe shell patterns.
- Updated `tools/uxgw_release_scan.php` so release packaging fails if installer scripts contain `eval`.

## Safe prefix policy

Allowed prefixes are intentionally narrow:

- `/opt/unixsee-campaign-gateway`
- `/usr/local/unixsee-campaign-gateway`
- `/tmp/unixsee-campaign-gateway-test-*` for local tests only

Rejected prefixes include:

- `/`
- `/root`
- `/home`
- `/var/www`
- anything containing `public_html`
- anything containing `..`, quotes, semicolons, ampersands, pipes, or newlines

This prevents accidental cleanup of WordPress, DirectAdmin, OpenLiteSpeed, public web roots, or unrelated system paths.

## Installer behavior remains unchanged

The installer still defaults to dry-run. Nothing is written unless `--apply` is passed.

The uninstaller still only removes the validated configured prefix, and only with `--apply`.

## Safety checks

Run:

```bash
bash install/check-shell-safety.sh
bash install/install-local-dev.sh --dry-run --prefix /tmp/unixsee-campaign-gateway-test-safe
bash install/install-local-dev.sh --dry-run --prefix /home/test/domains/example.com/public_html
bash install/uninstall-local-dev.sh --dry-run --prefix "/tmp/unixsee-test'; echo BAD; '"
```

Expected results:

- safe `/tmp/unixsee-campaign-gateway-test-*` prefix is accepted
- `public_html` prefix is refused
- quote/semicolon injection prefix is refused
- no injected command is executed

## Non-goals

R8D.1 does not change PHP Gateway behavior, Agent behavior, Mother behavior, Dashboard behavior, policy assignment, enforcement, PostgreSQL, WordPress integration, or web server configuration.

PHP remains the source of truth. Agent remains shadow-only. Dashboard remains read-only.
