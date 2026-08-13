import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
  AuthenticatedRequest,
} from '../interfaces/authenticated-request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const token = this.extractBearerToken(request);
      if (token) {
        try {
          await this.attachAuthenticatedUser(request, token);
        } catch {
          // Public routes stay accessible even when an optional bearer token is invalid.
        }
      }
      return true;
    }

    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      await this.attachAuthenticatedUser(request, token);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private async attachAuthenticatedUser(
    request: AuthenticatedRequest,
    token: string,
  ) {
    request.user = await this.authService.validateAccessToken(token);
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
