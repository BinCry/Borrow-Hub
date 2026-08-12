import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
  AuthenticatedRequest,
} from '../interfaces/authenticated-request.interface';

type AccessTokenPayload = {
  sub: string;
  email: string;
  roles: RoleName[];
  type: 'access' | 'refresh';
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          verification: true,
        },
      });

      if (
        !user ||
        user.status === UserStatus.BANNED ||
        user.status === UserStatus.DELETED
      ) {
        throw new UnauthorizedException('Account is unavailable');
      }

      request.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roles: user.userRoles.map((userRole) => userRole.role.name),
        verificationStatus:
          user.verification?.verificationStatus ??
          VerificationStatus.NOT_STARTED,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
