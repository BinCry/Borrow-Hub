import type { User } from '../types/domain';

const STAFF_ROLES = [
  'MODERATOR',
  'CUSTOMER_SUPPORT',
  'DISPUTE_OFFICER',
  'ADMIN',
  'SUPER_ADMIN',
];

export function isStaffUser(user?: User) {
  return user?.roles?.some((role) => STAFF_ROLES.includes(role)) ?? false;
}

export function isAdminUser(user?: User) {
  return user?.roles?.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN') ?? false;
}

export function isSuperAdminUser(user?: User) {
  return user?.roles?.includes('SUPER_ADMIN') ?? false;
}
