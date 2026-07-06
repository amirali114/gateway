export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status?: number; error: string };

export type UnknownRecord = Record<string, unknown>;

export interface HealthResponse {
  ok?: boolean;
  service?: string;
  mode?: string;
}

export interface ReadyResponse {
  ok?: boolean;
  storage?: string;
  storage_engine?: string;
  policy?: string;
  policy_source?: string;
  policy_status?: string;
  error?: string;
}

export interface MotherPolicySummary {
  id?: string;
  profile_id?: string;
  version?: number;
  source?: string;
  is_default?: boolean;
}

export interface MotherPoliciesResponse {
  ok?: boolean;
  policies?: MotherPolicySummary[];
}

export interface MotherPolicyRecord extends MotherPolicySummary {
  profile?: UnknownRecord;
}

export interface MotherPolicyResponse {
  ok?: boolean;
  policy?: MotherPolicyRecord;
}

export interface MotherPolicyAssignmentResponse {
  ok?: boolean;
  agent_id?: string;
  assigned?: boolean;
  policy_id?: string;
}

export interface MotherAgentRecord {
  agent_id?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  last_policy_pull_at?: string;
  last_policy_profile_id?: string;
  last_policy_version?: number;
  last_source_ip?: string;
  pull_count?: number;
  status?: "online" | "stale" | "unknown" | string;
  stale_after_seconds?: number;
  last_telemetry_at?: string;
  telemetry_status?: "fresh" | "stale" | "missing" | string;
  last_match_rate?: number;
  last_received?: number;
  last_mismatched?: number;
  active_config_version?: number;
  active_config_hash?: string;
  last_config_delivered_at?: string;
  last_config_ack_at?: string;
  acknowledged_config_version?: number;
  acknowledged_config_hash?: string;
  config_sync_status?: string;
}

export interface MotherAgentsResponse {
  ok?: boolean;
  agents?: MotherAgentRecord[];
}

export interface ControlPlaneConfigRecord {
  agent_id?: string;
  version?: number;
  published_at?: string;
  created_at?: string;
  source?: string;
  status?: string;
  config_hash?: string;
  note?: string;
  rollback_from_version?: number;
  delivered_at?: string;
  acknowledged_at?: string;
  updated_at?: string;
  base_version?: number;
  validation_status?: string;
  dirty?: boolean;
  config?: UnknownRecord;
}

export interface MotherAgentResponse {
  ok?: boolean;
  agent?: MotherAgentRecord;
  policy_assignment?: MotherPolicyAssignmentResponse;
  active_config?: ControlPlaneConfigRecord | UnknownRecord;
  draft_config?: ControlPlaneConfigRecord | UnknownRecord;
}

export interface MotherControlPlaneResponse extends MotherAgentResponse {
  mode?: string;
  history?: UnknownRecord[];
}

export interface MotherConfigResponse {
  ok?: boolean;
  active_config?: ControlPlaneConfigRecord | UnknownRecord;
  draft_config?: ControlPlaneConfigRecord | UnknownRecord;
}

export interface MotherConfigHistoryResponse {
  ok?: boolean;
  agent_id?: string;
  history?: UnknownRecord[];
}



export interface MotherConfigDiffResponse {
  ok?: boolean;
  agent_id?: string;
  diff?: {
    active_version?: number;
    draft_version?: number;
    active_hash?: string;
    draft_hash?: string;
    dirty?: boolean;
    added?: string[];
    removed?: string[];
    changed?: string[];
  };
}

export interface MotherConfigVersionsResponse {
  ok?: boolean;
  agent_id?: string;
  versions?: ControlPlaneConfigRecord[];
}

export interface MotherConfigValidationResponse {
  ok?: boolean;
  validation?: { valid?: boolean; error?: string; config_hash?: string; status?: string };
}

export interface MotherTelemetryRecord {
  agent_id?: string;
  received_at?: string;
  remote_addr?: string;
  payload?: UnknownRecord;
}

export interface MotherTelemetryResponse {
  ok?: boolean;
  agent_id?: string;
  telemetry?: MotherTelemetryRecord | null;
  message?: string;
}

export interface MotherEventRecord {
  id?: string;
  timestamp?: string;
  agent_id?: string;
  type?: string;
  severity?: "info" | "warn" | "error" | string;
  message?: string;
  metadata?: UnknownRecord;
}

export interface MotherEventsResponse {
  ok?: boolean;
  agent_id?: string;
  events?: MotherEventRecord[];
}


export interface MotherAlertRecord {
  id?: string;
  timestamp?: string;
  updated_at?: string;
  agent_id?: string;
  scope?: string;
  type?: string;
  severity?: "info" | "warn" | "critical" | string;
  status?: "active" | "resolved" | "muted" | string;
  title?: string;
  message?: string;
  metadata?: UnknownRecord;
  first_seen_at?: string;
  last_seen_at?: string;
  resolved_at?: string;
  occurrence_count?: number;
  fingerprint?: string;
}

export interface MotherAlertsResponse {
  ok?: boolean;
  alerts?: MotherAlertRecord[];
}

export interface MotherAlertResponse {
  ok?: boolean;
  alert?: MotherAlertRecord;
}

export interface MotherAlertSummaryResponse {
  ok?: boolean;
  active_total?: number;
  critical?: number;
  warn?: number;
  info?: number;
  muted?: number;
  resolved_24h?: number;
  by_scope?: Record<string, number>;
  latest?: MotherAlertRecord[];
  generated_at?: string;
}


export interface MotherReleaseGate {
  id?: string;
  title?: string;
  category?: string;
  status?: "pass" | "warn" | "fail" | "skipped" | "unknown" | string;
  severity?: "info" | "warn" | "critical" | string;
  message?: string;
  evidence?: UnknownRecord;
  remediation_hint?: string;
  last_checked_at?: string;
}

export interface MotherReleaseGateSummary {
  ok?: boolean;
  ready?: boolean;
  label?: string;
  total?: number;
  pass?: number;
  warn?: number;
  fail?: number;
  skipped?: number;
  unknown?: number;
  blockers?: MotherReleaseGate[];
  warnings?: MotherReleaseGate[];
  generated_at?: string;
}

export interface MotherReleaseGatesResponse {
  ok?: boolean;
  gates?: MotherReleaseGate[];
  summary?: MotherReleaseGateSummary;
}

export type MotherEvidenceGateID = "php-wrapper-model" | "backup-restore-drill" | "release-evidence-collected";
export type MotherEvidenceStatus = "pass" | "fail" | "accepted_risk" | "not_applicable";

export interface MotherEvidenceRecord {
  id?: string;
  gate_id?: MotherEvidenceGateID | string;
  status?: MotherEvidenceStatus | string;
  summary?: string;
  artifact_refs?: string[];
  metadata?: UnknownRecord;
  expires_at?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface MotherEvidenceListResponse {
  ok?: boolean;
  evidence?: MotherEvidenceRecord[];
}

export interface MotherEvidenceResponse {
  ok?: boolean;
  evidence?: MotherEvidenceRecord;
  error?: string;
}

export interface MotherDiagnosticsResponse {
  ok?: boolean;
  diagnostics?: {
    agent_id?: string;
    telemetry?: MotherTelemetryRecord | null;
    events?: MotherEventRecord[];
  };
}

export interface MotherDiagnosticsSummary {
  total_agents?: number;
  online_agents?: number;
  stale_agents?: number;
  unknown_agents?: number;
  telemetry_fresh?: number;
  telemetry_stale?: number;
  telemetry_missing?: number;
  average_match_rate?: number;
  total_received?: number;
  total_mismatched?: number;
  stale_agent_ids?: string[];
  mismatched_agent_ids?: string[];
  recent_events?: MotherEventRecord[];
  configs_published_total?: number;
  configs_pending_delivery?: number;
  configs_delivered?: number;
  configs_acknowledged?: number;
  configs_stale?: number;
  rollbacks_total?: number;
  latest_config_events?: MotherEventRecord[];
}

export interface MotherDiagnosticsSummaryResponse {
  ok?: boolean;
  summary?: MotherDiagnosticsSummary;
}

export interface MotherStorageStatusResponse {
  ok?: boolean;
  engine?: string;
  path?: string;
  writable?: boolean;
  last_load_at?: string;
  last_save_at?: string;
  last_error?: string;
  persisted_objects?: Record<string, number>;
  database_connected?: boolean;
  schema_version?: number;
  migration_status?: string;
  last_query_at?: string;
  tables?: Record<string, number>;
  dsn_redacted?: string;
}

export interface MotherHealthReportResponse {
  ok?: boolean;
  healthz?: UnknownRecord;
  readyz?: UnknownRecord;
  storage?: MotherStorageStatusResponse;
  agent_registry?: { total?: number; agents?: MotherAgentRecord[] };
  telemetry_summary?: UnknownRecord;
  config_rollout_summary?: UnknownRecord;
  alert_summary?: MotherAlertSummaryResponse;
  release_gate_summary?: MotherReleaseGateSummary;
  release_gates?: MotherReleaseGate[];
  blockers?: MotherReleaseGate[];
  warnings?: MotherReleaseGate[];
  backup_restore_status?: string;
  shadow_only_safety_status?: string;
  public_exposure_status?: string;
  recent_critical_events?: MotherEventRecord[];
  security_configuration?: UnknownRecord;
}
