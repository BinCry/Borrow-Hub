import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validEnv = {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: '3000',
    APP_URL: 'https://api.borrowhub.vn',
    DATABASE_URL: 'postgresql://borrowhub:super-secret-password@postgres:5432/borrowhub?schema=public',
    JWT_ACCESS_SECRET: '12345678901234567890123456789012',
    JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '30d',
    THROTTLE_TTL: '60',
    THROTTLE_LIMIT: '120',
    CACHE_TTL_MS: '60000',
    CACHE_KEY_PREFIX: 'borrowhub',
    REDIS_URL: 'redis://redis:6379',
    PLATFORM_FEE_PERCENT: '5',
    OWNER_COMMISSION_PERCENT: '10',
    LATE_FEE_RATE: '10000',
    MAX_NEW_USER_ASSET_VALUE: '3000000',
    REVIEW_EDIT_HOURS: '24',
    CONTRACT_VERSION: 'v1',
  };

  it('returns normalized configuration for valid environment values', () => {
    const result = validateEnv(validEnv);

    expect(result.NODE_ENV).toBe('production');
    expect(result.PORT).toBe(3000);
    expect(result.APP_URL).toBe('https://api.borrowhub.vn');
    expect(result.REDIS_URL).toBe('redis://redis:6379');
    expect(result.CACHE_TTL_MS).toBe(60000);
  });

  it('rejects invalid redis urls', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        REDIS_URL: 'http://redis:6379',
      }),
    ).toThrow('REDIS_URL must start with redis:// or rediss://');
  });

  it('rejects short jwt secrets', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        JWT_ACCESS_SECRET: 'short-secret',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be at least 24 characters long');
  });
});
