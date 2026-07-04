# R9.5 Secure HTTPS Deployment Profile

## Architecture

```text
Browser
  -> HTTPS reverse proxy on Core/Germany (Nginx or OpenLiteSpeed)
  -> Dashboard on 127.0.0.1:8740
  -> Mother API through server-side URL, normally http://127.0.0.1:8732

Client/Iran WordPress
  -> public PHP Gateway wrapper only
  -> local Agent on 127.0.0.1:8731
  -> Agent pulls policy/config and pushes telemetry to Mother
```

The Agent is never public. The Dashboard talks to Mother only. The browser never receives the Mother management token.

## Core/Germany flow

1. Build and install Mother as a local service.
2. Build and install Dashboard as a local service bound to `127.0.0.1:8740`.
3. Put Nginx or OpenLiteSpeed in front of Dashboard with HTTPS.
4. Set Dashboard env:

```env
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_ADMIN_USERNAME=admin
DASHBOARD_ADMIN_PASSWORD_HASH=$2b$12$replace.with.generated.hash.example.only
DASHBOARD_SESSION_SECRET=change-me-long-random-secret-for-staging-only
DASHBOARD_PUBLIC_BASE_URL=https://panel.example.com
DASHBOARD_TRUST_PROXY=true
UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732
UNIXSEE_MOTHER_MANAGEMENT_TOKEN=change-me
```

5. Keep Mother on `127.0.0.1:8732` unless remote Agents must connect directly.

## Client/Iran flow

The client site exposes only the PHP Gateway wrapper under `/unixsee-gateway/gateway.php`. The private PHP runtime stays outside webroot. The local Agent binds to `127.0.0.1:8731` and reaches Mother over its outbound path.

## Mother remote Agent option

If remote Agents need to reach Mother directly, set an explicit remote bind in a controlled config:

```yaml
server:
  listen_addr: "0.0.0.0:8732"
security:
  allow_remote_bind: true
  require_signature: true
```

Then firewall port `8732` to trusted Agent source or proxy egress IPs only. This is required for Iran-access/proxy setups where the Agent reaches Germany through a fixed egress IP.

## Reverse proxy profiles

Examples are included:

```text
deploy/nginx/dashboard-reverse-proxy.example.conf
deploy/openlitespeed/dashboard-vhost.example.conf
```

Both profiles keep Dashboard local and forward these headers:

```text
X-Forwarded-Proto
X-Forwarded-Host
X-Real-IP
```

Set `DASHBOARD_TRUST_PROXY=true` so Dashboard can make correct secure-cookie decisions behind HTTPS.

## Cookie and session behavior

Dashboard uses signed, HTTP-only cookies. Cookies become secure when the request is HTTPS through the reverse proxy or when `DASHBOARD_PUBLIC_BASE_URL` starts with `https://`. Secrets are server-side only and must never be exposed in client bundles.

## Firewall guidance

Use `deploy/firewall/csf-dashboard-rules.example.txt` as guidance. The important rules are:

- expose only 80/443 for the reverse proxy
- do not expose 8740
- do not expose 8731
- expose 8732 only for trusted Agent source IPs when required

## Validation

Run from package root:

```bash
bash deploy/scripts/preflight-dashboard.sh
bash deploy/scripts/validate-runtime-exposure.sh
DASHBOARD_URL=https://panel.example.com PROXY_URL=https://panel.example.com bash deploy/scripts/validate-dashboard-security.sh
```

The scripts do not modify services and do not print secrets.

## Rollback

1. Disable or remove the public reverse proxy vhost.
2. Stop Dashboard service.
3. Keep Mother internal or stop it if this was only a staging test.
4. Disable PHP shadow config if it was enabled on staging.
5. Do not delete WordPress uploads or databases.

## Known limitations

- PostgreSQL persistence is not included.
- Dashboard uses single-admin staging auth, not multi-user RBAC.
- Certificates are deployment responsibility.
- Agent remains shadow-only.
