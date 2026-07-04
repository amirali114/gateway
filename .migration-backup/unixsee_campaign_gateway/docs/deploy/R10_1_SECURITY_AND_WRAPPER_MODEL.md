# R10.1 Security and PHP Wrapper Model

The public PHP path is wrapper-only. The full PHP Gateway runtime remains outside webroot at `/opt/unixsee-campaign-gateway/unixsee_campaign_gateway`.

The allowed public entry is:

`/public_webroot/unixsee-gateway/gateway.php`

The wrapper only resolves and includes the private runtime. It must not contain admin panel code, storage, logs, docs, tools, Mother, Agent, Dashboard, `.env`, YAML, SQLite, or Node artifacts.

Forbidden public webroot artifacts include `ux_config.php`, `ux_admin_panel.php`, `ux_storage.php`, `src/`, `tools/`, `docs/`, `install/`, `mother/`, `agent/`, `dashboard/`, `ux_gateway/`, `*.sqlite`, `*.db`, `*.log`, `*.env`, `*.yml`, `node_modules/`, and `.next/`.

Enforcement is not enabled. Agent remains shadow-only. No remote command execution exists.
