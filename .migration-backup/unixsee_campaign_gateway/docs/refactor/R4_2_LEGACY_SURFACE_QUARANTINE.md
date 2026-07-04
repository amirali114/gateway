# R4.2 — Legacy Surface Quarantine

## Purpose

R4.2 reduces the release attack surface before R5 Agent Decision Comparator work starts.

R4.1 is preserved:

- PHP Gateway behavior remains unchanged.
- Go Agent API behavior remains unchanged.
- JSONL storage behavior remains unchanged.
- The Agent remains shadow-only and cannot affect `allow`, `queue`, `block`, `wait`, `pass`, tickets, redirects, waiting room rendering, or WordPress loading.

## Why `ux_gateway/` is legacy

The package contains a historical MVC-style tree at:

```text
ux_gateway/
```

That tree has its own controllers, routes, views, public front controller, config, helpers, and storage folders. It may still be useful as reference material, but it is not the active R4.x runtime path.

The active runtime is the root-level Gateway implementation, including files such as:

```text
gateway.php
admin.php
ux_admin_panel.php
ux_storage.php
ux_frontend.php
ux_ticket.php
ux_config.php
src/AgentShadowBridge.php
```

## Dependency check result

R4.2 searched the project for references to:

```text
ux_gateway
ux_gateway/
app/bootstrap.php
ux_gateway/public/index.php
```

The legacy tree contains its own internal references, for example `ux_gateway/public/index.php` requiring `../app/bootstrap.php`.

No active root-level PHP runtime file was found requiring the legacy bootstrap or legacy public index.

Specifically, no active file outside `ux_gateway/` requires:

```text
ux_gateway/app/bootstrap.php
ux_gateway/public/index.php
```

Because no active dependency was found, the directory was quarantined instead of deleted.

## Quarantine files added

R4.2 adds:

```text
ux_gateway/LEGACY_NOT_ACTIVE.md
ux_gateway/.htaccess
ux_gateway/public/.htaccess
```

`LEGACY_NOT_ACTIVE.md` explains that the directory is reference-only and must not be used as production routing.

The `.htaccess` files deny direct access where Apache/OpenLiteSpeed/LiteSpeed honors `.htaccess`:

```apache
Require all denied

Order allow,deny
Deny from all
```

This does not modify or replace the root `.htaccess`.

## How to verify it is not exposed

On an Apache/LiteSpeed/OpenLiteSpeed setup that honors `.htaccess`, direct requests to the legacy tree should be denied.

Examples:

```bash
curl -i https://example.com/ux_gateway/
curl -i https://example.com/ux_gateway/public/index.php
```

Expected result: HTTP 403 or equivalent access denial.

For Nginx, `.htaccess` is not evaluated. The web server config must also avoid exposing `ux_gateway/` as a public root or route. The safe production rule is simple:

```text
Do not set ux_gateway/public as a document root.
Do not route production traffic to ux_gateway/public/index.php.
```

## Release scanner

R4.2 adds:

```text
tools/uxgw_release_scan.php
```

Run it from the package root:

```bash
php tools/uxgw_release_scan.php
```

The scanner fails the release if it finds unsafe package content or unquarantined legacy surface, including:

- runtime DB/log/state files
- `.bak`, `.old`, `.orig`, `.tmp`, `.sqlite`, `.wal`, `.shm`, `.log`, `.jsonl` files
- world-writable files
- `agent/bin/`, `agent/data/`, or `agent/logs/`
- `ux_gateway/` without `LEGACY_NOT_ACTIVE.md`
- missing legacy deny `.htaccess` files
- active PHP files requiring the legacy bootstrap/public index

The scanner returns non-zero on FAIL.

## Self-test integration

`tools/uxgw_selftest.php` now also checks:

- legacy quarantine marker exists
- legacy deny `.htaccess` exists
- legacy public deny `.htaccess` exists
- release scanner exists
- release scanner passes

Normal release state must still report:

```text
FAIL=0
```

Warnings can still appear for intentionally empty release secrets or optional PHP extensions.

## Why this is needed before R5

R5 will introduce Agent Decision Comparator work. Before comparing PHP and Agent decisions, the release surface must be boring and predictable.

Keeping an inactive MVC tree inside the package without explicit quarantine creates avoidable risk:

- accidental public exposure
- accidental routing into old controllers
- confusion about the active runtime path
- future refactors using the wrong entry point

R4.2 keeps the reference code available while making it visibly inactive and harder to serve by mistake.

## What did not change

R4.2 intentionally does not change:

- PHP decision-making
- queue behavior
- ticket behavior
- admin login behavior
- waiting room rendering
- WordPress loading behavior
- route bypass behavior
- storage fail-open/fail-close behavior
- PHP Shadow Bridge payload behavior
- Go Agent endpoints
- Go Agent config format
- JSONL storage behavior
- `/healthz`, `/readyz`, `/v1/shadow/decision`, `/v1/stats` response compatibility

## Immediate rollback / disable note

There is no runtime feature toggle for this phase because no active runtime behavior changed.

If the legacy tree must be reviewed manually, read it as source code only. Do not expose it publicly and do not route production traffic through it.
