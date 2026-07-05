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

export function ConfigEditor({ agentId, activeConfig, action, disabled = true }: { agentId: string; activeConfig: UnknownRecord; action: (formData: FormData) => Promise<void>; disabled?: boolean }) {
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="agent_id" value={agentId} />
      <div className="notice"><b>Shadow-only mode is locked.</b> Draft writes remain disabled in this visual release unless existing RBAC and safe APIs explicitly allow them.</div>
      <div className="grid two">
        <label><span>Gateway enabled</span><input type="checkbox" name="gateway_enabled" disabled={disabled} defaultChecked={boolFromConfig(activeConfig, "gateway", "enabled", true)} /></label>
        <label><span>Campaign enabled</span><input type="checkbox" name="campaign_enabled" disabled={disabled} defaultChecked={boolFromConfig(activeConfig, "campaign", "enabled", true)} /></label>
        <label><span>Default action</span><select name="default_action" disabled={disabled} defaultValue={stringFromConfig(activeConfig, "gateway", "default_action", "allow")}><option value="allow">allow</option><option value="pass">pass</option></select></label>
        <label><span>Storage fail mode</span><select name="storage_fail_mode" disabled={disabled} defaultValue={stringFromConfig(activeConfig, "storage", "fail_mode", "open")}><option value="open">open</option><option value="closed">closed</option></select></label>
      </div>
      <button type="submit" disabled={disabled}>Save draft</button>
    </form>
  );
}
