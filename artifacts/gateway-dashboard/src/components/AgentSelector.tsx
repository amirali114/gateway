import type { MotherAgentRecord } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { Link } from "wouter";

export function AgentSelector({ agents, selectedAgentId, basePath = "/gateway" }: { agents: MotherAgentRecord[]; selectedAgentId?: string; basePath?: string }) {
  if (agents.length === 0) return <div className="empty-state">No agents have registered with Mother yet.</div>;
  return (
    <div className="agent-grid">
      {agents.map((agent, index) => {
        const id = agent.agent_id || "";
        const active = id && id === selectedAgentId;
        return (
          <Link key={id || `agent-${index}`} className="agent-card" href={`${basePath}?agent_id=${encodeURIComponent(id)}`}>
            <div className="agent-top">
              <span className="agent-name">{id}</span>
              <StatusPill value={active ? "active" : agent.status || "unknown"} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
