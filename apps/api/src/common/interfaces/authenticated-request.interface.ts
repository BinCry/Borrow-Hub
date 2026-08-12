import type { Request } from 'express';
import { RoleName, UserStatus, VerificationStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  roles: RoleName[];
  status: UserStatus;
  verificationStatus: VerificationStatus;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

