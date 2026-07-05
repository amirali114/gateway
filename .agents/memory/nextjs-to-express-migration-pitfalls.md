---
name: Next.js-to-Express/Vite migration pitfalls
description: Recurring bug classes found when porting a Next.js App Router app's auth/API layer to a separate Express backend + Vite/React frontend.
---

When migrating a Next.js app's cookie-session auth into a standalone Express API + separate SPA frontend, watch for these three bug classes — they are easy to introduce and typecheck-clean, so they only surface at runtime:

1. **Reading the just-set session cookie from the same request.** After calling `res.cookie(...)` to set a session, the incoming `req.cookies` object does NOT reflect that cookie yet (it's set on the outgoing response, not the incoming request). If a login handler does `setSession(req, res, user); const session = currentSession(req);`, `currentSession` will return `null`/incomplete because it reads `req.cookies`. Fix: build the session response directly from the `user` object you already have, not by re-reading `req`.
   **Why:** caused login to silently return `{ok:true, session:null}` — a 200 response with no usable payload, which is easy to miss since the auth flow *looks* correct.
   **How to apply:** whenever a login/session-creation endpoint needs to return the session payload immediately after setting the cookie, construct it from in-memory data, never via a cookie-reading helper against the same request.

2. **Response-shape/wrapper mismatches between subagent-ported frontend and hand-written backend.** When frontend pages are ported by a subagent guessing at API shapes (e.g. assuming `GET /users` returns `User[]` directly, or endpoint is `/audit/events` instead of `/audit`), it typechecks fine (generics hide the mismatch) but crashes at runtime (`.filter is not a function`) or silently shows empty data. Always diff actual backend route paths/response envelopes (e.g. `{ok, users: [...]}`) against every frontend `apiGet<T>(...)` call site after a parallel-ported migration.

3. **`read(result!)` non-null assertions on React Query `data`.** `useQuery().data` is `undefined` while loading; asserting it non-null with `!` to satisfy TypeScript causes a hard runtime crash (`Cannot read properties of undefined`) on first render before the query resolves. Fix `read()` itself to accept `T | undefined` and short-circuit, rather than patching every call site.
