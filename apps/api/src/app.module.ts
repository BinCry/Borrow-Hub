import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ChatModule } from './chat/chat.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './database/prisma.module';
import { DisputesModule } from './disputes/disputes.module';
import { HealthModule } from './health/health.module';
import { KycModule } from './kyc/kyc.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RentalsModule } from './rentals/rentals.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get('THROTTLE_TTL') ?? 60) * 1000,
            limit: Number(configService.get('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
    PrismaModule,
    AdminModule,
    AuditModule,
    AuthModule,
    CategoriesModule,
    ChatModule,
    AssetsModule,
    UsersModule,
    KycModule,
    NotificationsModule,
    DisputesModule,
    RentalsModule,
    ReviewsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
