# R9.7 Config Rollout Validation

This validation is safe by default. It does not write unless `TEST_MODE=1` is explicitly set.

## Read-only validation

```bash
deploy/scripts/validate-config-rollout.sh
```

The script checks:

```text
/v1/agents
/v1/agents/{agent_id}/config
/v1/agents/{agent_id}/config/draft
/v1/agents/{agent_id}/config/active
/v1/agents/{agent_id}/config/versions
/v1/agents/{agent_id}/config/diff
```

If no agent exists, it uses a safe dummy agent id for read checks.

## Optional write validation

Only on backup/staging:

```bash
TEST_MODE=1 UNIXSEE_MOTHER_MANAGEMENT_TOKEN='replace-with-token' deploy/scripts/validate-config-rollout.sh
```

This creates a safe draft, publishes it, and attempts a rollback. It never touches PHP files, WordPress, public_html, vhost configs, or Agent runtime files.

## Rollback behavior

A rollback creates a new config version from an old version. It never edits the old version and never pushes commands to the Agent.

## Pass criteria

- Mother remains healthy.
- Agent remains shadow-only.
- PHP Gateway behavior is unchanged.
- Versions and history are visible.
- Delivery is marked on policy pull.
- Acknowledgement is marked only after telemetry reports matching version/hash.
