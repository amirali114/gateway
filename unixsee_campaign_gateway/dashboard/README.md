# Unixsee Gateway Dashboard

English LTR Next.js App Router dashboard for the Unixsee Campaign Gateway controlled beta.

Runtime rules:
- Mother API is used server-side only.
- Browser never receives Mother management token.
- PHP Gateway remains the runtime source of truth.
- Agents remain shadow-only.
- Dashboard remains local-only for staging unless protected by a trusted reverse proxy.
