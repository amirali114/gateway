# R10.7 Dashboard English Replit UI Final

- Reworked Dashboard as an English LTR dark operational UI inspired by the Replit design reference.
- Kept R10.3 runtime, auth/session, RBAC, Mother API client, storage, Mother Go, Agent Go, and PHP Gateway untouched.
- Added dashboard UI components: DashboardShell, Sidebar, Topbar, KpiCard, StatusPill, AgentCard, ReleaseGatePanel, RawJsonDrawer, DataTable, SectionCard.
- Kept Mother reads server-side only; no browser-to-Mother fetch and no management token exposure.
- Removed Persian dashboard copy and removed unrelated AI/inference mock terms.
- Kept raw JSON inside collapsible drawers instead of primary page surfaces.
