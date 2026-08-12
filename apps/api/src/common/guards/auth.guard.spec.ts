import { UnauthorizedException } from '@nestjs/common';
import {
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const jwtService = {
    verifyAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(
      reflector as never,
      jwtService as never,
      configService as never,
      prisma as never,
    );
  });

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const request = { headers: {} };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).not.toHaveProperty('user');
  });

  it('attaches a user on public routes when a bearer token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      roles: [RoleName.USER],
      type: 'access',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User One',
      status: UserStatus.ACTIVE,
      userRoles: [{ role: { name: RoleName.USER } }],
      verification: {
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'user@example.com',
      }),
    );
  });

  it('ignores an invalid bearer token on public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    jwtService.verifyAsync.mockRejectedValue(new UnauthorizedException('Invalid token'));
    const request = {
      headers: {
        authorization: 'Bearer bad-token',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).not.toHaveProperty('user');
  });
});
