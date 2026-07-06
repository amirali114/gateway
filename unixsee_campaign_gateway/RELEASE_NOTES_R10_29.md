# R10.29 — Mother JSON Storage Atomic-Save Concurrency Fix

## Scope

This release fixes a concurrency bug in the Mother (Go) JSON storage engine. **No Dashboard, Agent, PHP Gateway, auth/session/RBAC, enforcement, or remote-command code was touched.** This is the first release in which Mother source is present in this repository, added at `mother/` alongside the existing `dashboard/`.

## Production symptom

```
rename json storage temp: ...mother-state.json.tmp: no such file or directory
```

Reported intermittently under production load, when multiple requests trigger a state save (policy pulls, telemetry pushes, config publishes, event logging, etc.) close together in time.

## Root cause

`mother/internal/storage/json.go`'s `save()` (invoked internally by `persist(ctx)`, which is called by nearly every mutating `JSONStore` method — `RegisterPolicyPull`, `SaveTelemetry`, `SaveDraftConfig`, `PublishDraftConfig`, `AddEvent`, `Resolve/Mute/UnmuteAlert`, etc.) wrote to a **fixed, shared temp file path**: `s.filePath + ".tmp"` (e.g. `mother-state.json.tmp`), with no lock serializing the write-then-rename sequence across concurrent callers.

`JSONStore`'s in-memory map mutations are already protected by `s.mu`, but `save()` released that lock before doing disk I/O, so two goroutines could both reach `save()` at roughly the same time and both operate on the *same* temp file name concurrently:

1. Goroutine A opens/truncates `mother-state.json.tmp`, writes its snapshot, closes it, and renames it to `mother-state.json`.
2. Goroutine B — already partway through its own save on the same fixed temp path — has either already had its file handle silently replaced by A's truncate, or attempts `os.Rename` on a path A already moved away.
3. B's `os.Rename(tmp, s.filePath)` fails with `ENOENT` ("no such file or directory") because the shared temp file no longer exists under that name by the time B tries to rename it.

This is a classic shared-fixed-temp-file race: safe under single-writer conditions (which passed all pre-existing tests, since none exercised concurrent saves), but not under concurrent production traffic.

## Fix

In `mother/internal/storage/json.go`:

1. **Added `saveMu sync.Mutex`** to `JSONStore`, and wrapped the entire disk-write critical section (backup-on-migration copy, temp file create/write/sync/close, rename, directory sync) in `saveMu.Lock()/Unlock()`. This serializes the disk-write phase of concurrent `save()` calls so two saves can never interleave their rename steps, while leaving the (already-locked) in-memory snapshot step unaffected — write throughput is not affected in the common case since encoding still happens outside the lock.
2. **Replaced the fixed temp path** (`s.filePath + ".tmp"`) with `os.CreateTemp(dir, ".mother-state-*.tmp")`, which atomically allocates a unique, collision-free filename per save attempt. Even without the mutex, no two calls can now target the same temp file. Both mitigations are applied together for defense in depth: the unique name prevents *file-identity* collisions, and the mutex prevents *ordering* issues (e.g. a stale save landing after a newer one, or the backup step racing a save).
3. `os.CreateTemp` defaults new files to mode `0600`; added an explicit `Chmod(0o640)` after creation to preserve the original file permission contract (`mother-state.json` and its temp predecessor were previously created with `0640`).
4. Added best-effort `os.Remove(tmpPath)` cleanup on every error path after the temp file is created, so a failed save (e.g. disk full, permission error) never leaves an orphaned `.tmp` file behind in the storage directory.
5. Preserved all existing behavior: JSON payload format, `lastSaveAt`/`lastError`/`writable` status fields, backup-on-migration (`.bak`) semantics, `SyncWrites` fsync-on-write and directory-sync behavior are all unchanged — only the temp-file naming and locking strategy changed.

## Why this fixes it

- **Uniqueness** removes the possibility of two saves ever operating on the same temp file, which was the direct cause of the observed `ENOENT` on rename.
- **Serialization** (`saveMu`) removes any remaining ordering hazards around the backup-copy step and directory fsync, so writes to disk always complete fully (open → write → sync → close → rename → dir-sync) before the next save's disk phase begins — no interleaving is possible even under heavy concurrent load.
- Together, these make `save()` safe to call concurrently from any number of goroutines, which matches how it is actually invoked in production (multiple agents pushing telemetry/pulling policy/publishing configs at overlapping times).

## Tests added

`mother/internal/storage/json_test.go`:

- `TestJSONStoreConcurrentSavesDoNotRace` — spins up 40 goroutines each performing 10 `AddEvent` calls concurrently (400 total concurrent `persist()` invocations against one `JSONStore`), asserts zero save errors, and verifies the resulting state file reloads correctly with all events for a sampled agent intact.
- `TestJSONStoreConcurrentSavesLeaveNoStaleTempFiles` — runs 25 concurrent `AddEvent` calls and asserts no `*.tmp` files are left behind in the storage directory afterward (a leaked temp file would indicate a save that failed to clean up after itself).

Both new tests were confirmed to exercise the fixed code path successfully, including under `go test -race`, with no data races reported.

## Tests run

```
cd unixsee_campaign_gateway/mother && go test ./...
```

Result: **all packages pass**, including the two new concurrency regression tests.

```
?   unixsee-campaign-gateway/mother/cmd/unixsee-mother          [no test files]
?   unixsee-campaign-gateway/mother/cmd/unixsee-mother-migrate  [no test files]
ok  unixsee-campaign-gateway/mother/internal/config
ok  unixsee-campaign-gateway/mother/internal/policy
ok  unixsee-campaign-gateway/mother/internal/security
ok  unixsee-campaign-gateway/mother/internal/server
ok  unixsee-campaign-gateway/mother/internal/storage
```

Also verified with `go build ./...`, `go vet ./...`, and `go test -race ./internal/storage/... -run TestJSONStoreConcurrent` (no data races detected).

## Deployment risk

**Low.**

- Change is confined to a single function (`save()`) in a single file (`mother/internal/storage/json.go`) plus its struct definition (one new unexported mutex field) and its test file.
- No changes to the `Store` interface, `MemoryStore`, on-disk JSON schema/field names, `Options`, or any caller of `persist()`/`save()` — every existing call site is unaffected because the public API surface is unchanged.
- No changes to Dashboard, Agent, PHP Gateway, auth/session/RBAC, enforcement, or remote-command code.
- Fix is strictly additive from a correctness standpoint: it only adds uniqueness and serialization around disk writes that were already happening; it does not change what data is written, when persist is triggered, or the response contract of any JSONStore method.
- Rollback is a single-file revert if ever needed.

## Changed files

- `mother/internal/storage/json.go` — added `saveMu sync.Mutex` field; rewrote `save()` to use `os.CreateTemp` for a unique temp file per save, serialize the disk-write critical section with `saveMu`, preserve `0640` file permissions via explicit `Chmod`, and clean up the temp file on any error path.
- `mother/internal/storage/json_test.go` — added `TestJSONStoreConcurrentSavesDoNotRace` and `TestJSONStoreConcurrentSavesLeaveNoStaleTempFiles` regression tests; added `fmt` and `sync` imports.
- `RELEASE_NOTES_R10_29.md` — this document (new).

No Dashboard files were changed. `dashboard/` is byte-for-byte identical to R10.27/R10.28.
