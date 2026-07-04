# R10.3 Controlled Rollout Simulation

Use `deploy/scripts/simulate-controlled-rollout.sh` to validate a candidate shadow-only config without mutating real agents.

Read-only simulation:

```bash
AGENT_ID=example-agent MOTHER_URL=http://127.0.0.1:8732 deploy/scripts/simulate-controlled-rollout.sh
```

Dummy mutation test:

```bash
TEST_MODE=1 DUMMY_AGENT_ID=dummy-beta-agent UNIXSEE_MOTHER_MANAGEMENT_TOKEN=... deploy/scripts/simulate-controlled-rollout.sh
```

Never run TEST_MODE against a real beta agent. The script refuses mutation unless `TEST_MODE=1` and `DUMMY_AGENT_ID` are explicit.
