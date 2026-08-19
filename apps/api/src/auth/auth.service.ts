import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AnalyticsEventType,
  Prisma,
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';

type UserWithRelations = Prisma.PromiseReturnType<typeof findUserWithRelations>;
type PersistedUserWithRelations = NonNullable<UserWithRelations>;
type JwtSignOptions = NonNullable<Parameters<JwtService['signAsync']>[1]>;
type JwtExpiresIn = JwtSignOptions['expiresIn'];

type TokenPayload = {
  sub: string;
  email: string;
  roles: RoleName[];
  type: 'access' | 'refresh';
};

type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
};

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const findUserWithRelations = (prisma: PrismaService, userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      verification: true,
    },
  });

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeIdentifier(identifier: string) {
  const normalized = identifier.trim();
  return normalized.includes('@')
    ? normalized.toLowerCase()
    : normalized.replace(/\s/g, '');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let user: PersistedUserWithRelations;

    try {
      user = await this.prisma.$transaction(async (tx) => {
        const userRole = await tx.role.upsert({
          where: { name: RoleName.USER },
          update: {},
          create: {
            name: RoleName.USER,
            description: 'Default marketplace user',
          },
        });

        return tx.user.create({
          data: {
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            fullName: dto.fullName,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            status: UserStatus.ACTIVE,
            userRoles: {
              create: {
                roleId: userRole.id,
              },
            },
            verification: {
              create: {
                provider: 'borrowhub-manual',
                verificationStatus: VerificationStatus.NOT_STARTED,
              },
            },
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
            verification: true,
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or phone already exists');
      }

      throw error;
    }

    const issuedTokens = await this.createTokens(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: issuedTokens.refreshTokenHash },
    });

    await this.analyticsService
      .track({
        eventType: AnalyticsEventType.USER_REGISTERED,
        userId: user.id,
        entityType: 'user',
        entityId: user.id,
        metadata: {
          verificationStatus: user.verification?.verificationStatus,
        },
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Registration analytics failed: ${message}`);
      });

    return {
      user: this.serializeUser(user),
      tokens: this.publicTokens(issuedTokens),
    };
  }

  async login(dto: LoginDto) {
    const identifier = normalizeIdentifier(dto.identifier);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        verification: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2
      .verify(user.passwordHash, dto.password)
      .catch(() => false);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertActiveUser(user.status);

    const issuedTokens = await this.createTokens(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: issuedTokens.refreshTokenHash,
      },
    });

    return {
      user: this.serializeUser(user),
      tokens: this.publicTokens(issuedTokens),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      const user = await findUserWithRelations(this.prisma, payload.sub);

      if (!user?.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      this.assertActiveUser(user.status);

      const previousRefreshTokenHash = user.refreshTokenHash;
      const isRefreshTokenValid = await argon2
        .verify(previousRefreshTokenHash, dto.refreshToken)
        .catch(() => false);

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      const issuedTokens = await this.createTokens(user);
      const rotated = await this.prisma.user.updateMany({
        where: {
          id: user.id,
          refreshTokenHash: previousRefreshTokenHash,
          status: UserStatus.ACTIVE,
        },
        data: {
          refreshTokenHash: issuedTokens.refreshTokenHash,
        },
      });

      if (rotated.count !== 1) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      return {
        user: this.serializeUser(user),
        tokens: this.publicTokens(issuedTokens),
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return { success: true };
  }

  async me(userId: string) {
    const user = await findUserWithRelations(this.prisma, userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.serializeUser(user);
  }

  async validateAccessToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await findUserWithRelations(this.prisma, payload.sub);

      if (!user) {
        throw new UnauthorizedException('Account is unavailable');
      }

      this.assertActiveUser(user.status);
      return this.serializeUser(user) as AuthenticatedUser;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = hashPasswordResetToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const delivered = await this.mailService.sendPasswordReset({
      email: user.email,
      fullName: user.fullName,
      token: resetToken,
    });

    if (!delivered) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        await this.prisma.user.updateMany({
          where: {
            id: user.id,
            passwordResetTokenHash: resetTokenHash,
          },
          data: {
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
          },
        });
        return { success: true };
      }

      return {
        success: true,
        developmentResetToken: resetToken,
      };
    }

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetTokenHash = hashPasswordResetToken(dto.token);
    const user = await this.prisma.user.findUnique({
      where: { passwordResetTokenHash: resetTokenHash },
      select: {
        id: true,
        status: true,
        passwordResetExpiresAt: true,
      },
    });

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });
    const updated = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        status: UserStatus.ACTIVE,
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { success: true };
  }

  private assertActiveUser(status: UserStatus) {
    if (status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not available');
    }
  }

  private async createTokens(
    user: PersistedUserWithRelations,
  ): Promise<IssuedTokens> {
    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const accessTokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles,
      type: 'access',
    };
    const refreshTokenPayload: TokenPayload = {
      ...accessTokenPayload,
      type: 'refresh',
    };

    const accessTokenExpiresIn = (
      this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m'
    ) as JwtExpiresIn;
    const refreshTokenExpiresIn = (
      this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d'
    ) as JwtExpiresIn;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);
    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
    };
  }

  private publicTokens(tokens: IssuedTokens) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  private serializeUser(user: PersistedUserWithRelations | AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      phone: 'phone' in user ? user.phone : undefined,
      avatarUrl: 'avatarUrl' in user ? user.avatarUrl : undefined,
      trustScore: 'trustScore' in user ? user.trustScore : undefined,
      createdAt: 'createdAt' in user ? user.createdAt : undefined,
      roles:
        'userRoles' in user
          ? user.userRoles.map((userRole) => userRole.role.name)
          : user.roles,
      verificationStatus:
        'verification' in user
          ? (user.verification?.verificationStatus ??
            VerificationStatus.NOT_STARTED)
          : user.verificationStatus,
    };
  }
}
