import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const ttl = Number(configService.get('CACHE_TTL_MS') ?? 60_000);
        const redisUrl = configService.get<string>('REDIS_URL');
        const keyPrefix = configService.get<string>('CACHE_KEY_PREFIX') ?? 'toolshare';

        if (!redisUrl) {
          return {
            ttl,
          };
        }

        return {
          ttl,
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl, {
                namespace: keyPrefix,
                throwOnConnectError: true,
              }),
            }),
          ],
        };
      },
      isGlobal: true,
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}
