# R9.5 Secure HTTPS Deployment Profile

## Summary

R9.5 adds a safe staging deployment profile for exposing the authenticated Mother-backed Dashboard behind HTTPS/reverse proxy while keeping Agent and internal services private.

## Files added

```text
deploy/openlitespeed/dashboard-vhost.example.conf
deploy/nginx/dashboard-reverse-proxy.example.conf
deploy/systemd/unixsee-dashboard.service.example
deploy/systemd/unixsee-mother.service.example
deploy/firewall/csf-dashboard-rules.example.txt
deploy/scripts/preflight-dashboard.sh
deploy/scripts/validate-runtime-exposure.sh
deploy/scripts/validate-dashboard-security.sh
docs/deploy/R9_5_SECURE_HTTPS_DEPLOYMENT.md
```

## Dashboard changes

- `DASHBOARD_PUBLIC_BASE_URL` added for HTTPS deployments.
- `DASHBOARD_TRUST_PROXY` added for reverse proxy deployments.
- Session secure-cookie logic now understands trusted proxy headers and public HTTPS base URL.
- Settings page shows proxy, public URL, cookie mode, bind recommendation, and exposure checklist.

## Security model

- Dashboard stays bound to `127.0.0.1:8740` by default.
- Mother stays internal by default.
- Agent stays local-only and is never exposed.
- Browser never receives Mother management token.
- Dashboard writes only to Mother server-side APIs.
- No remote shell commands are added.

## Remaining limitations

- PostgreSQL is still not included.
- Dashboard auth is single-admin staging auth.
- Full RBAC, audit persistence, and production certificate automation are future work.

## Automated test summary

Run during release preparation:

```text
PHP lint/self-test/release scan
agent gofmt/go test/go build
mother gofmt/go test/go build
dashboard npm ci/npm audit/npm run build
security grep checks
final ZIP scan
```
