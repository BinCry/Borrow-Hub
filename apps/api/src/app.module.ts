import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ChatModule } from './chat/chat.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { DisputesModule } from './disputes/disputes.module';
import { FinanceModule } from './finance/finance.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { KycModule } from './kyc/kyc.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { RequestLogsModule } from './request-logs/request-logs.module';
import { RentalsModule } from './rentals/rentals.module';
import { RiskModule } from './risk/risk.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';
import { RequestContextModule } from './common/request-context.module';
import { PaymentModule } from './payment/payment.module';
import { StorageModule } from './storage/storage.module';
import { AppCacheModule } from './cache/cache.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    AppCacheModule,
    RequestContextModule,
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
    AnalyticsModule,
    AuditModule,
    AuthModule,
    CategoriesModule,
    ChatModule,
    AssetsModule,
    FavoritesModule,
    FinanceModule,
    UsersModule,
    KycModule,
    NotificationsModule,
    ReportsModule,
    RequestLogsModule,
    DisputesModule,
    RentalsModule,
    RiskModule,
    ReviewsModule,
    SupportModule,
    HealthModule,
    PaymentModule,
    StorageModule,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
