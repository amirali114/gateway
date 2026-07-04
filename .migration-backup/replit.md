# Unixsee Gateway

داشبورد کنترل عملیاتی برای Unixsee Gateway — پنل مدیریت یکپارچه عاملان هوش مصنوعی، گیت‌وی API، سیاست‌ها، انتشار و تشخیص سیستم.

## Run & Operate

- `pnpm --filter @workspace/unixsee-gateway run dev` — run the dashboard UI (port from workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, wouter routing
- Font: Vazirmatn (Persian RTL)
- UI: Radix UI primitives, Lucide icons, shadcn/ui components
- API: Express 5 (api-server)
- DB: PostgreSQL + Drizzle ORM (not yet used — mock adapter only)
- Build: Vite (frontend), esbuild (API CJS bundle)

## Where things live

- `artifacts/unixsee-gateway/src/` — dashboard frontend
- `artifacts/unixsee-gateway/src/lib/contracts.ts` — TypeScript interfaces (source of truth)
- `artifacts/unixsee-gateway/src/lib/mock-data.ts` — all mock data
- `artifacts/unixsee-gateway/src/lib/adapters/dashboard-data.ts` — adapter layer (swap for real API later)
- `artifacts/unixsee-gateway/src/components/` — DashboardShell, Sidebar, Topbar, KpiCard, StatusPill, AgentCard, ReleaseGatePanel, RawJsonDrawer
- `artifacts/unixsee-gateway/src/pages/` — one file per route
- `artifacts/api-server/` — Express API server skeleton
- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- **Mock adapter pattern**: all data goes through `lib/adapters/dashboard-data.ts` — swap async functions for real API calls without touching components.
- **RTL-first**: `html { direction: rtl }` globally; technical values (IDs, URLs, JSON, tokens) use `.ltr` / `.ltr-text` CSS classes.
- **Raw JSON gated**: `RawJsonDrawer` collapsible component — no raw JSON on main screens.
- **Persian font**: Vazirmatn loaded from Google Fonts; fallback Tahoma.
- **Dark theme only**: deep navy/indigo color scheme via CSS variables in `index.css`.

## Product

Operational control panel for Unixsee Gateway with:
- **داشبورد** — KPI overview, active agents, current release, recent alerts
- **عاملان** — filterable agent grid with per-agent detail pages
- **انتشار** — Canary release pipeline with gates and metrics
- **مادر** — Mother node cluster health and resource usage
- **تشخیص** — System-wide diagnostic checks
- **دروازه** — API route management and traffic overview
- **سیاست** — Access control policy management
- **هشدارها** — Alert management with severity triage
- **کاربران** — User management with roles and MFA status
- **حسابرسی** — Audit log with expandable metadata
- **تنظیمات** — System settings and production environment config
- **ورود** — Persian RTL login page with MFA

## User preferences

- UI text must be Persian RTL; technical values (IDs, URLs, JSON, HTTP paths, version strings) stay LTR
- No large raw JSON on main screens — only inside `RawJsonDrawer` (collapsible)
- Dark theme, compact density, production-grade polish

## Gotchas

- wouter's `<Link>` already renders an `<a>` tag — never wrap it in `<a>`. Use `<Link href="..." className="...">` directly.
- `direction: rtl` is set globally on `<html>` — use `.ltr` utility class for technical values
- Mock adapter functions are async to match the real API shape — keep them async even with mock data

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
