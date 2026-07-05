import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { apiGet } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { ErrorState } from "@/components/ErrorState";
import { roleLabel } from "@/lib/rbac";
import type { UnknownRecord } from "@/lib/types";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor_id?: string;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  result: "success" | "failure";
  metadata?: UnknownRecord;
}

export default function AuditPage() {
  const { auth, loading: authLoading } = useAuth();
  const search = useSearch();
  const sp = new URLSearchParams(search);
  
  const actionFilter = sp.get("action") || "";
  const userFilter = sp.get("user") || "";
  const resultFilter = sp.get("result") || "";
  const targetFilter = sp.get("target") || "";

  const auditQuery = useQuery({
    queryKey: ["audit"],
    queryFn: () => apiGet<{ ok: boolean; events: AuditEvent[] }>("audit"),
  });

  if (authLoading || auditQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("audit.view"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to view the audit trail." />;
  }

  const allEvents = auditQuery.data?.ok ? auditQuery.data.data.events : [];
  
  let events = allEvents;
  if (actionFilter) events = events.filter((e) => e.action === actionFilter);
  if (userFilter) events = events.filter((e) => e.actor_username.includes(userFilter));
  if (resultFilter) events = events.filter((e) => e.result === resultFilter);
  if (targetFilter) events = events.filter((e) => `${e.target_type}:${e.target_id}`.includes(targetFilter));

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

      <SectionCard title="Filters">
        <form className="inline-form">
          <input name="action" placeholder="action" defaultValue={actionFilter} />
          <input name="user" placeholder="user" defaultValue={userFilter} />
          <select name="result" defaultValue={resultFilter}>
            <option value="">all results</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
          </select>
          <input name="target" placeholder="target agent/user" defaultValue={targetFilter} />
          <button type="submit" className="button-secondary">Apply</button>
        </form>
      </SectionCard>

      <SectionCard title="Events" description="Actor, action, target, and result for every recorded dashboard operation.">
        {events.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Result</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.timestamp}</td>
                  <td className="mono">{e.actor_username}</td>
                  <td>{roleLabel(e.actor_role as any)}</td>
                  <td className="mono">{e.action}</td>
                  <td className="mono">{e.target_type}:{e.target_id}</td>
                  <td><StatusPill value={e.result} /></td>
                  <td><RawJsonDrawer data={e.metadata || {}} title="metadata" /></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No audit events" description={filtered ? "No events match the current filters. Try clearing them." : "User actions will populate this trail."} />
        )}
      </SectionCard>
    </>
  );
}
