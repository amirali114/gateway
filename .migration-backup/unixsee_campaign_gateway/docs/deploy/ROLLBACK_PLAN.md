# Rollback Plan

R8D is shadow-only and local/dev by default. Rollback is simple if the package was kept isolated.

## Immediate rollback

1. Disable PHP shadow config:

```php
'agent_shadow_enabled' => false,
```

2. Stop local/dev services if installed:

```bash
systemctl stop unixsee-dashboard 2>/dev/null || true
systemctl stop unixsee-agent 2>/dev/null || true
systemctl stop unixsee-mother 2>/dev/null || true
```

3. Disable services if enabled manually:

```bash
systemctl disable unixsee-dashboard 2>/dev/null || true
systemctl disable unixsee-agent 2>/dev/null || true
systemctl disable unixsee-mother 2>/dev/null || true
```

4. Remove only the local install prefix if needed:

```bash
bash install/uninstall-local-dev.sh --apply --prefix /opt/unixsee-campaign-gateway --systemd
```

## PHP file rollback

If PHP Gateway files were copied into a staging WordPress install, restore the original files from the backup made before testing.

Do not delete:

- WordPress uploads
- WordPress database
- customer files
- database dumps
- unrelated logs

## Cache/log cleanup

Only clear Unixsee test logs/cache/state created for this staging test. Never run broad destructive cleanup commands against the web root.

## Prefix safety

The R8D.1 uninstaller validates the prefix before any removal. It accepts only the Unixsee local/dev prefixes and refuses WordPress/public web-root paths such as `public_html`, `/var/www`, `/home`, `/root`, or `/`.

The uninstaller does not use `eval`; removal is executed only as:

```bash
rm -rf -- "$PREFIX"
```

after strict prefix validation and only with `--apply`.

## R9.5 reverse proxy rollback

1. Disable the Dashboard HTTPS vhost/server block.
2. Stop or disable the Dashboard service if the exposure test is being rolled back.
3. Keep Mother internal; do not open `8732` unless trusted Agent access is still required.
4. Remove any temporary firewall allowance for Dashboard/Mother test exposure.
5. Do not delete WordPress uploads, database, or production webroot content.
