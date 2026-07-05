import type { UnknownRecord } from "../lib/types";

function boolFromConfig(config: UnknownRecord, group: string, key: string, fallback: boolean): boolean {
  const section = config[group];
  if (typeof section === "object" && section !== null && key in section) return Boolean((section as Record<string, unknown>)[key]);
  return fallback;
}
function stringFromConfig(config: UnknownRecord, group: string, key: string, fallback: string): string {
  const section = config[group];
  if (typeof section === "object" && section !== null) {
    const value = (section as Record<string, unknown>)[key];
    return typeof value === "string" && value ? value : fallback;
  }
  return fallback;
}

export function ConfigEditor({ agentId, activeConfig }: { agentId: string; activeConfig: UnknownRecord }) {
  return (
    <div className="stack-form">
      <input type="hidden" name="agent_id" value={agentId} disabled />
      <div className="notice"><b>Shadow-only mode is locked.</b> Draft writes are disabled in this release. This view is read-only and cannot submit changes.</div>
      <div className="grid two">
        <label><span>Gateway enabled</span><input type="checkbox" disabled defaultChecked={boolFromConfig(activeConfig, "gateway", "enabled", true)} /></label>
        <label><span>Campaign enabled</span><input type="checkbox" disabled defaultChecked={boolFromConfig(activeConfig, "campaign", "enabled", true)} /></label>
        <label><span>Default action</span><select disabled defaultValue={stringFromConfig(activeConfig, "gateway", "default_action", "allow")}><option value="allow">allow</option><option value="pass">pass</option></select></label>
        <label><span>Storage fail mode</span><select disabled defaultValue={stringFromConfig(activeConfig, "storage", "fail_mode", "open")}><option value="open">open</option><option value="closed">closed</option></select></label>
      </div>
      <button type="button" disabled>Save draft</button>
    </div>
  );
}
