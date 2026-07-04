import type { MotherAgentRecord } from "../lib/types";
import { valueOrDash } from "../lib/api";
import { StatusPill } from "./StatusPill";

function formatRate(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—";
}

export function AgentCard({ agent, href }: { agent: MotherAgentRecord; href?: string }) {
  const id = agent.agent_id || "unknown-agent";
  return (
    <article className="agent-card">
      <div className="agent-top">
        <div><div className="agent-name">{href ? <a href={href}>{id}</a> : id}</div><div className="agent-id">{valueOrDash(agent.last_source_ip)}</div></div>
        <StatusPill value={agent.status || "unknown"} />
      </div>
      <div className="agent-metrics">
        <div className="agent-metric"><span>Match rate</span><b>{formatRate(agent.last_match_rate)}</b></div>
        <div className="agent-metric"><span>Received</span><b>{valueOrDash(agent.last_received)}</b></div>
        <div className="agent-metric"><span>Mismatched</span><b>{valueOrDash(agent.last_mismatched)}</b></div>
      </div>
      <div className="agent-tags">
        <span className="tag">cfg:{valueOrDash(agent.active_config_version)}</span>
        <span className="tag">policy:{valueOrDash(agent.last_policy_version)}</span>
        <StatusPill value={agent.telemetry_status || "missing"} />
      </div>
      <div className="agent-foot">
        <span>Last seen</span>
        <span className="mono">{valueOrDash(agent.last_seen_at)}</span>
      </div>
    </article>
  );
}
