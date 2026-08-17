export const CACHE_TTL_MS = {
  adminDashboard: 30_000,
  adminUsers: 60_000,
  adminRoles: 5 * 60_000,
  adminSystemConfigs: 60_000,
  adminAuditLogs: 15_000,
  adminRequestLogs: 15_000,
} as const;

export const CACHE_KEYS = {
  adminDashboard: 'admin:dashboard',
  adminUsers: 'admin:users',
  adminRoles: 'admin:roles',
  adminSystemConfigs: 'admin:system-configs',
  adminAuditLogs: 'admin:audit-logs',
  adminRequestLogs: (queryKey: string) => `admin:request-logs:${queryKey}`,
} as const;
