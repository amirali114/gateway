# Security Checklist

Before staging validation:

- Agent binds to `127.0.0.1:8731`.
- Mother binds to `127.0.0.1:8732`.
- Dashboard binds to `127.0.0.1:8740` when used.
- No public dashboard exposure without authentication and reverse proxy protection.
- No secrets in `.env.example`, `*.example.yml`, or docs.
- No real `.env` files in release ZIP.
- Management writes are disabled by default.
- Dashboard has no write UI.
- No remote command buttons or shell actions exist.
- PHP remains source of truth.
- Agent remains shadow-only.
- Mother is not in the user request hot path.
- PostgreSQL is not faked.
- Release scanner passes before packaging.

## Installer shell safety

- Installer and uninstaller contain no `eval` usage.
- Run `bash install/check-shell-safety.sh` before staging execution.
- Installer defaults to dry-run.
- Only these prefixes are allowed: `/opt/unixsee-campaign-gateway`, `/usr/local/unixsee-campaign-gateway`, `/tmp/unixsee-campaign-gateway-test-*`.
- `/`, `/root`, `/home`, `/var/www`, and any `public_html` path are refused.
- WordPress/public_html is never modified or removed automatically.

## R9.5 HTTPS / reverse proxy checklist

- Dashboard process binds to `127.0.0.1:8740` only.
- Public access goes through HTTPS reverse proxy only.
- Reverse proxy sends `X-Forwarded-Proto` and `X-Forwarded-Host`.
- `DASHBOARD_TRUST_PROXY=true` only when the proxy is trusted.
- `DASHBOARD_PUBLIC_BASE_URL` uses the final HTTPS panel URL.
- Mother management token is configured server-side only.
- Agent port `8731` is never public.
- Mother port `8732` is internal by default; if remote Agents need it, firewall to trusted IPs only and require signatures.
- Dashboard static bundles must not contain management token or session secret.
