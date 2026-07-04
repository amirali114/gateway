# R10.0 Installation

## Standard paths

Core/Mother server:
- `/opt/unixsee-campaign-gateway/unixsee_campaign_gateway`
- `/etc/unixsee-gateway/mother.yml`
- `/etc/unixsee-gateway/mother.env`
- `/etc/unixsee-gateway/dashboard.env`
- `/var/lib/unixsee-gateway/mother`
- `/var/lib/unixsee-gateway/dashboard`
- `/var/log/unixsee-gateway`

Client/Site server:
- PHP private runtime outside webroot
- public wrapper only: `/unixsee-gateway/gateway.php`
- `/etc/unixsee-gateway/agent.yml`
- `/etc/unixsee-gateway/mother-agent.secret`
- `/var/lib/unixsee-gateway/agent`
- `/var/log/unixsee-gateway`

## Safe install flow

Run every script first with `DRY_RUN=1`.

```bash
DRY_RUN=1 deploy/scripts/install-core.sh
DRY_RUN=1 deploy/scripts/install-agent.sh
DRY_RUN=1 deploy/scripts/install-php-gateway-wrapper.sh
```

Apply only after reviewing output:

```bash
DRY_RUN=0 deploy/scripts/install-core.sh
```

The scripts preserve env files, secrets, storage, Dashboard user store, Mother state, Agent state, and PHP private runtime.
