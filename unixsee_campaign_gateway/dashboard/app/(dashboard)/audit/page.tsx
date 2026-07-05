import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { requirePermission } from "../../../lib/auth";
import { roleLabel } from "../../../lib/rbac";
import { listAuditEvents } from "../../../lib/user-store";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ action?: string; user?: string; result?: string; target?: string }> };
export default async function AuditPage({ searchParams }: Props) {
  await requirePermission("audit.view");
  const sp = searchParams ? await searchParams : {};
  const allEvents = listAuditEvents(300);
  let events = allEvents;
  if (sp.action) events = events.filter((e) => e.action === sp.action);
  if (sp.user) events = events.filter((e) => e.actor_username.includes(sp.user || ""));
  if (sp.result) events = events.filter((e) => e.result === sp.result);
  if (sp.target) events = events.filter((e) => `${e.target_type}:${e.target_id}`.includes(sp.target || ""));

  const successCount = allEvents.filter((e) => e.result === "success").length;
  const failureCount = allEvents.filter((e) => e.result === "failure").length;
  const actorCount = new Set(allEvents.map((e) => e.actor_username)).size;
  const filtered = events.length !== allEvents.length;

  return (
    <>
      <PageHeader eyebrow="RBAC" title="Audit Trail" description="Local dashboard audit log. IP and user-agent are hashed before storage." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Read-only operation trail.</b> Every dashboard action is recorded here for accountability. This page cannot edit or delete history, and no raw IP or user-agent value is ever stored or shown — only irreversible hashes.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className="hero-badge blue">▤</div>
          <div>
            <div className="hero-label">Audit posture</div>
            <div className="hero-value">{allEvents.length} recorded event{allEvents.length === 1 ? "" : "s"}</div>
            <p className="hero-sub">{failureCount > 0 ? `${failureCount} failed operation${failureCount === 1 ? "" : "s"} recorded across ${actorCount} actor${actorCount === 1 ? "" : "s"}.` : `No failed operations recorded across ${actorCount} actor${actorCount === 1 ? "" : "s"}.`}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Success</span><b>{successCount}</b></div>
          <div className="hero-stat"><span>Failure</span><b>{failureCount}</b></div>
          <div className="hero-stat"><span>Actors</span><b>{actorCount}</b></div>
          <div className="hero-stat"><span>Showing</span><b>{events.length}{filtered ? ` of ${allEvents.length}` : ""}</b></div>
        </div>
      </div>

      <SectionCard title="Filters"><form className="inline-form"><input name="action" placeholder="action" defaultValue={sp.action || ""} /><input name="user" placeholder="user" defaultValue={sp.user || ""} /><select name="result" defaultValue={sp.result || ""}><option value="">all results</option><option value="success">success</option><option value="failure">failure</option></select><input name="target" placeholder="target agent/user" defaultValue={sp.target || ""} /><button type="submit" className="button-secondary">Apply</button></form></SectionCard>

      <SectionCard title="Events" description="Actor, action, target, and result for every recorded dashboard operation.">
        {events.length ? <DataTable><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Target</th><th>Result</th><th>Metadata</th></tr></thead><tbody>{events.map((e) => <tr key={e.id}><td className="mono">{e.timestamp}</td><td className="mono">{e.actor_username}</td><td>{roleLabel(e.actor_role)}</td><td className="mono">{e.action}</td><td className="mono">{e.target_type}:{e.target_id}</td><td><StatusPill value={e.result} /></td><td><RawJsonDrawer data={e.metadata || {}} title="metadata" /></td></tr>)}</tbody></DataTable> : <EmptyState title="No audit events" description={filtered ? "No events match the current filters. Try clearing them." : "User actions will populate this trail."} />}
      </SectionCard>
    </>
  );
}
