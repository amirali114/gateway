export type AgentStatus = "active" | "idle" | "error" | "degraded" | "offline";
export type ReleaseStage = "pending" | "canary" | "rolling" | "stable" | "rollback";
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type PolicyEffect = "allow" | "deny";
export type AuditAction = "create" | "update" | "delete" | "deploy" | "policy_change" | "login" | "logout";

export interface Agent {
  id: string;
  name: string;
  version: string;
  status: AgentStatus;
  region: string;
  uptime: string;
  lastSeen: string;
  requestsPerMin: number;
  errorRate: number;
  latencyMs: number;
  tags: string[];
  endpoint: string;
  meta: Record<string, unknown>;
}

export interface KpiSummary {
  totalAgents: number;
  activeAgents: number;
  errorAgents: number;
  requestsPerMin: number;
  avgLatencyMs: number;
  totalAlertsOpen: number;
  uptimePercent: number;
  gatewayHealth: "healthy" | "degraded" | "down";
}

export interface ReleaseGate {
  id: string;
  name: string;
  version: string;
  stage: ReleaseStage;
  progressPercent: number;
  startedAt: string;
  estimatedCompletion: string;
  gates: {
    name: string;
    passed: boolean;
    label: string;
  }[];
  canaryMetrics: {
    errorRate: number;
    latencyP99: number;
    successRate: number;
  };
  approvedBy?: string;
  notes: string;
}

export interface MotherNode {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  region: string;
  connectedAgents: number;
  syncLag: string;
  cpuPercent: number;
  memPercent: number;
  storagePercent: number;
  lastHeartbeat: string;
}

export interface DiagnosticCheck {
  id: string;
  name: string;
  component: string;
  status: "pass" | "warn" | "fail" | "skip";
  message: string;
  latencyMs?: number;
  checkedAt: string;
}

export interface GatewayRoute {
  id: string;
  path: string;
  method: string;
  upstreamAgent: string;
  status: "active" | "inactive" | "shadow";
  rateLimit: number;
  authRequired: boolean;
  requestsToday: number;
  avgLatencyMs: number;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  resource: string;
  conditions: string[];
  priority: number;
  enabled: boolean;
  createdBy: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: "open" | "acknowledged" | "resolved";
  source: string;
  agentId?: string;
  message: string;
  createdAt: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer" | "auditor";
  status: "active" | "suspended" | "pending";
  lastLogin: string;
  createdAt: string;
  mfaEnabled: boolean;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor: string;
  actorEmail: string;
  resource: string;
  resourceId: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  meta: Record<string, unknown>;
}

export interface DashboardData {
  kpi: KpiSummary;
  agents: Agent[];
  recentAlerts: Alert[];
  activeRelease: ReleaseGate | null;
  topRoutes: GatewayRoute[];
}
