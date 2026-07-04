# Unixsee Campaign Gateway Local/Dev Installer

R8D adds safe installation and validation helpers for a backup/staging server.
The default behavior is dry-run. Nothing is installed unless `--apply` is passed.

## Safety rules

The scripts in this directory do **not**:

- modify DirectAdmin, OpenLiteSpeed, Apache, Nginx, or vhost config
- modify WordPress, `public_html`, uploads, database, or `.htaccess`
- enable Agent enforcement
- expose Agent, Mother, or Dashboard publicly
- restart production services automatically
- create cron jobs, sudoers rules, or remote command hooks

PHP remains the production source of truth. The Agent remains shadow-only. The Dashboard remains read-only.

## Validate package

```bash
bash install/validate-package.sh
```

This checks PHP, Go, Mother, Agent, Dashboard, and the release scanner.
It requires `php`, `go`, `npm`, `curl`, and `unzip`.

## Smoke test

```bash
bash install/run-smoke-test.sh
```

This runs Mother and Agent on loopback ports with temporary configs and state under `mktemp`.
It posts one safe synthetic shadow payload and verifies Agent stats increment.

Dashboard smoke is optional:

```bash
bash install/run-smoke-test.sh --dashboard
```

## Dry-run install

```bash
bash install/install-local-dev.sh
```

## Apply install to local/dev prefix

```bash
bash install/install-local-dev.sh --apply --prefix /opt/unixsee-campaign-gateway --build
```

Optional flags:

```bash
--system-user    create unixsee-cgw system user
--systemd        copy systemd templates, but do not start services automatically
--dashboard      copy read-only dashboard source
```

Example:

```bash
bash install/install-local-dev.sh --apply --prefix /opt/unixsee-campaign-gateway --build --system-user --systemd --dashboard
```

Manual service starts, after review only:

```bash
systemctl start unixsee-mother
systemctl start unixsee-agent
systemctl start unixsee-dashboard
```

## Uninstall local/dev install

Dry-run:

```bash
bash install/uninstall-local-dev.sh
```

Apply:

```bash
bash install/uninstall-local-dev.sh --apply --prefix /opt/unixsee-campaign-gateway --systemd
```

The uninstaller removes only the configured prefix and optional Unixsee systemd templates. It never deletes WordPress files, uploads, databases, public web roots, or unrelated logs.

## Shell safety hardening

R8D.1 removes all `eval` usage from installer/uninstaller scripts and adds strict prefix validation.

Allowed prefixes:

```text
/opt/unixsee-campaign-gateway
/usr/local/unixsee-campaign-gateway
/tmp/unixsee-campaign-gateway-test-*
```

Forbidden prefixes include `/`, `/root`, `/home`, `/var/www`, any `public_html` path, and any prefix containing `..`, quotes, semicolons, ampersands, pipes, or newlines.

Check script:

```bash
bash install/check-shell-safety.sh
```

The scripts never touch WordPress, `public_html`, uploads, database files, `.htaccess`, DirectAdmin, OpenLiteSpeed, or production services automatically.
