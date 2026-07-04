# R10.1 Deployment Artifact Manifest

This manifest defines what goes where for the first real staging deployment.

| Path | Type | Target | Public-safe | May contain secrets | Backup | Owner | Mode |
|---|---|---|---:|---:|---:|---|---|
| `deploy/scripts/install-core.sh` | script | core server | no | no | no | root | 0755 |
| `deploy/scripts/update-core.sh` | script | core server | no | no | yes | root | 0755 |
| `deploy/scripts/rollback-core.sh` | script | core server | no | no | no | root | 0755 |
| `deploy/scripts/install-agent.sh` | script | client server | no | no | no | root | 0755 |
| `deploy/scripts/update-agent.sh` | script | client server | no | no | yes | root | 0755 |
| `deploy/scripts/rollback-agent.sh` | script | client server | no | no | no | root | 0755 |
| `deploy/scripts/install-php-gateway-runtime.sh` | script | private runtime | no | no | yes | root | 0755 |
| `deploy/scripts/install-php-gateway-wrapper.sh` | script | public wrapper | no | no | yes | root/webserver | 0755 |
| `deploy/php-wrapper/gateway.php` | minimal wrapper | `/public_webroot/unixsee-gateway/gateway.php` | yes | no | yes | web user | 0644 |
| `gateway.php` | PHP runtime | `/opt/unixsee-campaign-gateway/unixsee_campaign_gateway/gateway.php` | no | no | yes | root/unixsee | 0644 |
| `deploy/systemd/unixsee-mother.service.example` | systemd | `/etc/systemd/system/unixsee-mother.service` | no | no | yes | root | 0644 |
| `deploy/systemd/unixsee-agent.service.example` | systemd | `/etc/systemd/system/unixsee-agent.service` | no | no | yes | root | 0644 |
| `deploy/systemd/unixsee-dashboard.service.example` | systemd | `/etc/systemd/system/unixsee-dashboard.service` | no | no | yes | root | 0644 |
| `deploy/examples/core/mother.staging.yml` | config example | `/etc/unixsee-gateway/mother.yml` | no | placeholder only | yes | root/unixsee | 0640 |
| `deploy/examples/client/agent.staging.yml` | config example | `/etc/unixsee-gateway/agent.yml` | no | placeholder only | yes | root/unixsee-agent | 0640 |
| `deploy/examples/dashboard/dashboard.env.example` | env example | `/etc/unixsee-gateway/dashboard.env` | no | yes after copy | yes | root/unixsee | 0640 |

Machine-readable manifest: `deploy/R10_1_ARTIFACT_MANIFEST.json`.

Public webroot safe means safe to copy under the PHP site's public directory. In R10.1 only the minimal wrapper is public-safe.
