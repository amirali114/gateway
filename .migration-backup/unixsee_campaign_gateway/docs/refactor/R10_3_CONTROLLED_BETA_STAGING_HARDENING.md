# R10.3 Controlled Beta Staging Hardening

R10.3 prepares Unixsee Campaign Gateway for a first limited beta-style staging rollout. It does not add enforcement, remote commands, public Agent exposure, or a new runtime decision path.

## Scope

- Beta release gates and summary endpoints.
- Persian RTL Dashboard page `/release`.
- Safe release evidence collection.
- Backup/restore drill wrappers.
- Controlled rollout simulation script.
- Shadow-only safety validation.
- Public exposure hardening validation.
- Incident response and operator checklist documentation.

## Non-goals

- No enforcement mode.
- No enforcement UI.
- No remote shell command execution.
- No public Agent.
- No external notification sender by default.
- No GA/HA claim.

## Architecture unchanged

PHP Gateway remains runtime source of truth. Go Agent remains shadow-only and local-only by default. Dashboard uses Mother APIs only and never sends the Mother management token to the browser. Public PHP remains wrapper-only and the private PHP runtime stays outside webroot.
