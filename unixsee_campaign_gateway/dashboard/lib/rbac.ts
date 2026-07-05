export const ROLES = ["owner", "admin", "operator", "viewer"] as const;
export type Role = typeof ROLES[number];

export const PERMISSIONS = [
  "dashboard.view",
  "agents.view",
  "gateway.view",
  "gateway.draft.write",
  "gateway.publish",
  "gateway.rollback",
  "gateway.config.validate",
  "gateway.config.publish",
  "gateway.config.rollback",
  "policy.view",
  "diagnostics.view",
  "alerts.view",
  "alerts.manage",
  "release.view",
  "settings.view",
  "users.view",
  "users.manage",
  "audit.view"
] as const;

export type Permission = typeof PERMISSIONS[number];

const rolePermissions: Record<Role, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [
    "dashboard.view",
    "agents.view",
    "gateway.view",
    "gateway.draft.write",
    "gateway.publish",
    "gateway.rollback",
    "gateway.config.validate",
    "gateway.config.publish",
    "gateway.config.rollback",
    "policy.view",
    "diagnostics.view",
    "alerts.view",
    "alerts.manage",
    "release.view",
    "settings.view",
    "users.view",
    "audit.view"
  ],
  operator: [
    "dashboard.view",
    "agents.view",
    "gateway.view",
    "gateway.draft.write",
    "policy.view",
    "diagnostics.view",
    "alerts.view",
    "release.view"
  ],
  viewer: [
    "dashboard.view",
    "agents.view",
    "gateway.view",
    "policy.view",
    "diagnostics.view",
    "alerts.view",
    "release.view"
  ]
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] || [];
}

export function can(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function roleLabel(role: Role | string): string {
  switch (role) {
    case "owner": return "Owner";
    case "admin": return "Admin";
    case "operator": return "Operator";
    case "viewer": return "Viewer";
    default: return "Unknown";
  }
}

export function permissionLabel(permission: Permission | string): string {
  const labels: Record<string, string> = {
    "dashboard.view": "View dashboard",
    "agents.view": "View agents",
    "gateway.view": "View gateway control",
    "gateway.draft.write": "Write config draft",
    "gateway.publish": "Publish config",
    "gateway.rollback": "Rollback config",
    "gateway.config.validate": "Validate config draft",
    "gateway.config.publish": "Publish config (workflow)",
    "gateway.config.rollback": "Rollback config (workflow)",
    "policy.view": "View policies",
    "diagnostics.view": "View diagnostics",
    "alerts.view": "View alerts",
    "alerts.manage": "Manage alerts",
    "release.view": "View release readiness",
    "settings.view": "View settings",
    "users.view": "View users",
    "users.manage": "Manage users",
    "audit.view": "View audit trail"
  };
  return labels[permission] || permission;
}
