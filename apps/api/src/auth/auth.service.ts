import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import {
  AnalyticsEventType,
  Prisma,
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../database/prisma.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './auth.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';

type UserWithRelations = Prisma.PromiseReturnType<typeof findUserWithRelations>;
type PersistedUserWithRelations = NonNullable<UserWithRelations>;
type JwtSignOptions = NonNullable<Parameters<JwtService['signAsync']>[1]>;
type JwtExpiresIn = JwtSignOptions['expiresIn'];

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

type TokenPayload = {
  sub: string;
  email: string;
  roles: RoleName[];
  type: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const userRole = await this.prisma.role.upsert({
      where: { name: RoleName.USER },
      update: {},
      create: {
        name: RoleName.USER,
        description: 'Default marketplace user',
      },
    });

    const user = await this.prisma.user.create({
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
            provider: 'mock-kyc',
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

    const tokens = await this.issueTokens(user);
    await this.analyticsService.track({
      eventType: AnalyticsEventType.USER_REGISTERED,
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      metadata: {
        verificationStatus: user.verification?.verificationStatus,
      },
    });
    return {
      user: this.serializeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
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

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is not available');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return {
      user: this.serializeUser(user),
      tokens,
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
        throw new UnauthorizedException('Invalid refresh token');
      }

      const foundUser = await findUserWithRelations(this.prisma, payload.sub);

      if (!foundUser || !foundUser.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      const user = foundUser;

      const refreshTokenHash = user.refreshTokenHash!;
      const isRefreshTokenValid = await argon2.verify(
        refreshTokenHash,
        dto.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      const tokens = await this.issueTokens(user);
      return {
        user: this.serializeUser(user),
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return { success: true };
  }

  async me(userId: string) {
    const foundUser = await findUserWithRelations(this.prisma, userId);

    if (!foundUser) {
      throw new BadRequestException('User not found');
    }

    const user = foundUser;
    return this.serializeUser(user);
  }

  private async issueTokens(user: PersistedUserWithRelations) {
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

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiresIn,
    });

    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private serializeUser(user: PersistedUserWithRelations | AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: 'userRoles' in user ? user.userRoles.map((role) => role.role.name) : user.roles,
      verificationStatus:
        'verification' in user
          ? user.verification?.verificationStatus ?? VerificationStatus.NOT_STARTED
          : user.verificationStatus,
    };
  }
}
