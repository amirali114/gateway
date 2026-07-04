import {
  mockKpi, mockAgents, mockActiveRelease, mockMotherNodes,
  mockDiagnostics, mockGatewayRoutes, mockPolicies,
  mockAlerts, mockUsers, mockAuditLogs,
} from "../mock-data";
import type {
  Agent, KpiSummary, ReleaseGate, MotherNode, DiagnosticCheck,
  GatewayRoute, Policy, Alert, User, AuditLog, DashboardData,
} from "../contracts";

// Simulate async adapter — swap these functions for real API calls later

export async function getDashboardData(): Promise<DashboardData> {
  return {
    kpi: mockKpi,
    agents: mockAgents,
    recentAlerts: mockAlerts.filter(a => a.status !== "resolved").slice(0, 5),
    activeRelease: mockActiveRelease,
    topRoutes: mockGatewayRoutes.filter(r => r.status === "active").slice(0, 5),
  };
}

export async function getKpi(): Promise<KpiSummary> {
  return mockKpi;
}

export async function getAgents(): Promise<Agent[]> {
  return mockAgents;
}

export async function getAgent(id: string): Promise<Agent | null> {
  return mockAgents.find(a => a.id === id) ?? null;
}

export async function getActiveRelease(): Promise<ReleaseGate | null> {
  return mockActiveRelease;
}

export async function getMotherNodes(): Promise<MotherNode[]> {
  return mockMotherNodes;
}

export async function getDiagnostics(): Promise<DiagnosticCheck[]> {
  return mockDiagnostics;
}

export async function getGatewayRoutes(): Promise<GatewayRoute[]> {
  return mockGatewayRoutes;
}

export async function getPolicies(): Promise<Policy[]> {
  return mockPolicies;
}

export async function getAlerts(): Promise<Alert[]> {
  return mockAlerts;
}

export async function getUsers(): Promise<User[]> {
  return mockUsers;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return mockAuditLogs;
}
