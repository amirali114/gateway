---
name: Go atomic file save concurrency pattern
description: How to make a JSON/state file "atomic save" (write-temp + rename) safe under concurrent callers, and how to test it.
---

A common bug pattern: an "atomic save" function writes to a **fixed** temp path (e.g. `state.json.tmp`) then renames it into place. This is atomic for a single writer, but under concurrent callers two goroutines can race on the same temp filename — one renames it away while the other still holds/targets it, producing `rename ...: no such file or directory`.

**Fix (two layers, apply both):**
1. Use `os.CreateTemp(dir, ".name-*.tmp")` for a unique temp file per save attempt (removes filename collisions). Note: `CreateTemp` defaults to mode `0600` — `Chmod` afterward if the original file needs different permissions (e.g. `0640`).
2. Wrap the whole write→fsync→close→rename→dir-sync sequence in a dedicated mutex (separate from any in-memory-state lock) so concurrent saves' disk phases never interleave (matters for backup-file steps that run alongside the rename).
3. On every error path after temp-file creation, best-effort `os.Remove(tmpPath)` so failed saves don't leak stray `.tmp` files.

**Why:** uniqueness alone prevents identity collisions; the mutex alone prevents ordering hazards (e.g. backup copy racing a rename). Both together make the save fully safe under concurrent load without changing the on-disk format or public API.

**How to test:** spin up N goroutines (e.g. 25-40) each calling the mutating/save-triggering method concurrently, assert zero errors, and separately assert no stray `*.tmp` files remain in the storage dir afterward. Run with `go test -race` for extra confidence — this bug reproduces reliably even without `-race` given enough concurrent goroutines.
