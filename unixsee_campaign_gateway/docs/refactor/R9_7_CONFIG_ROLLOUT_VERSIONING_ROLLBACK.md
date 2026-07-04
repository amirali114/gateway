# R9.7 — Config Rollout Versioning and Rollback

R9.7 turns the Mother-backed config flow into a staging-grade rollout system. PHP Gateway remains the runtime source of truth and the Go Agent remains shadow-only. No enforcement, remote commands, direct site writes, PostgreSQL, or public Agent exposure were added.

## What changed

Mother now stores immutable per-agent config versions. Publishing a draft creates a new version with a deterministic config hash. Rollback creates a new version copied from a previous version; older versions are not edited except for operational status metadata such as `superseded`, `delivered`, or `acknowledged`.

Added API endpoints:

```text
GET  /v1/agents/{agent_id}/config/draft
POST /v1/agents/{agent_id}/config/draft
POST /v1/agents/{agent_id}/config/validate
GET  /v1/agents/{agent_id}/config/diff
POST /v1/agents/{agent_id}/config/publish
GET  /v1/agents/{agent_id}/config/active
GET  /v1/agents/{agent_id}/config/versions
GET  /v1/agents/{agent_id}/config/versions/{version}
POST /v1/agents/{agent_id}/config/rollback
```

Existing endpoints remain compatible:

```text
GET  /v1/agents/{agent_id}/config
POST /v1/agents/{agent_id}/config/draft
POST /v1/agents/{agent_id}/config/publish
GET  /v1/agents/{agent_id}/config/history
```

## Version model

Each published config version includes:

```text
agent_id
version
config_hash
config
created_at
created_by
published_at
source: draft_publish | rollback
rollback_from_version
note
status: published | delivered | acknowledged | superseded | rollback_created
```

The hash is deterministic and is calculated from the config object only. It excludes timestamps, status, notes, delivery metadata, and acknowledgement metadata.

## Draft model

Each agent has one editable draft. Drafts include:

```text
config
updated_at
updated_by
base_version
validation_status
dirty
config_hash
```

`dirty=true` means the draft hash differs from the active config hash.

## Publish and rollback

Publishing validates the draft and creates a new immutable version. The previous active version is marked `superseded`. Rollback requires an existing target version and creates a new active version using the target config.

Rollback never mutates the target version and never writes to site files.

## Delivery and acknowledgement

When the Agent pulls policy/config, Mother includes control-plane metadata:

```json
{
  "control_plane": {
    "agent_id": "iran-staging-agent",
    "config_version": 7,
    "config_hash": "...",
    "published_at": "...",
    "source": "mother"
  }
}
```

Mother marks the active version as delivered on policy pull. The Agent includes the same control-plane metadata in telemetry. Mother marks the version as acknowledged when telemetry reports the active version/hash.

Registry fields include:

```text
active_config_version
active_config_hash
last_config_delivered_at
last_config_ack_at
acknowledged_config_version
acknowledged_config_hash
config_sync_status
```

Status values:

```text
pending_delivery
delivered
acknowledged
stale
missing
```

## Dashboard changes

The Persian RTL dashboard now shows rollout state in:

```text
/gateway
/agents/[agent_id]
/diagnostics
/settings
```

`/gateway` includes draft dirty state, diff preview, publish note, version history, rollback per previous version, and sync status.

## Safety model

- PHP Gateway remains source of truth.
- Agent remains shadow-only.
- Publish only changes Mother config state.
- Agent pulls metadata on the next interval.
- No remote command execution.
- No direct Dashboard-to-Agent production calls.
- No direct Dashboard writes to webroot or site files.
- No PostgreSQL in this phase.

## Automated validation summary

Run:

```bash
php tools/uxgw_selftest.php
php tools/uxgw_release_scan.php
cd agent && go test ./... && go build ./cmd/unixsee-agent
cd ../mother && go test ./... && go build ./cmd/unixsee-mother
cd ../dashboard && npm ci && npm run build
```

## Known limitations

- Agent runtime enforcement remains disabled.
- Config acknowledgement is metadata-only.
- PostgreSQL is not implemented.
- Multi-user RBAC is not implemented.
- JSON storage is staging-grade, not HA storage.
- Rollback creates a new version; it does not mutate old versions.
