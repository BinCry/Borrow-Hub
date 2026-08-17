type EnvValue = string | undefined;

const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'production']);
const REDIS_PROTOCOLS = new Set(['redis:', 'rediss:']);

function getString(raw: Record<string, unknown>, key: string): EnvValue {
  const value = raw[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireString(raw: Record<string, unknown>, key: string): string {
  const value = getString(raw, key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function requireInteger(
  raw: Record<string, unknown>,
  key: string,
  minimum: number,
): number {
  const value = requireString(raw, key);
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${key} must be an integer greater than or equal to ${minimum}`);
  }

  return parsed;
}

function requirePercent(raw: Record<string, unknown>, key: string): number {
  const value = Number(requireString(raw, key));

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${key} must be a number between 0 and 100`);
  }

  return value;
}

function requireUrl(raw: Record<string, unknown>, key: string): string {
  const value = requireString(raw, key);

  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${key} must be a valid absolute URL`);
  }
}

function optionalRedisUrl(raw: Record<string, unknown>, key: string): string | undefined {
  const value = getString(raw, key);

  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    if (!REDIS_PROTOCOLS.has(parsed.protocol)) {
      throw new Error();
    }

    return value;
  } catch {
    throw new Error(`${key} must start with redis:// or rediss://`);
  }
}

function requireSecret(raw: Record<string, unknown>, key: string): string {
  const value = requireString(raw, key);

  if (value.length < 24) {
    throw new Error(`${key} must be at least 24 characters long`);
  }

  return value;
}

export function validateEnv(raw: Record<string, unknown>) {
  const nodeEnv = getString(raw, 'NODE_ENV') ?? 'development';

  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV must be one of development, test, production');
  }

  return {
    NODE_ENV: nodeEnv,
    HOST: getString(raw, 'HOST') ?? '0.0.0.0',
    PORT: requireInteger(raw, 'PORT', 1),
    APP_URL: requireUrl(raw, 'APP_URL'),
    DATABASE_URL: requireString(raw, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: requireSecret(raw, 'JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: requireSecret(raw, 'JWT_REFRESH_SECRET'),
    JWT_ACCESS_TTL: requireString(raw, 'JWT_ACCESS_TTL'),
    JWT_REFRESH_TTL: requireString(raw, 'JWT_REFRESH_TTL'),
    THROTTLE_TTL: requireInteger(raw, 'THROTTLE_TTL', 1),
    THROTTLE_LIMIT: requireInteger(raw, 'THROTTLE_LIMIT', 1),
    CACHE_TTL_MS: requireInteger(raw, 'CACHE_TTL_MS', 1),
    CACHE_KEY_PREFIX: requireString(raw, 'CACHE_KEY_PREFIX'),
    REDIS_URL: optionalRedisUrl(raw, 'REDIS_URL'),
    PLATFORM_FEE_PERCENT: requirePercent(raw, 'PLATFORM_FEE_PERCENT'),
    OWNER_COMMISSION_PERCENT: requirePercent(raw, 'OWNER_COMMISSION_PERCENT'),
    LATE_FEE_RATE: requireInteger(raw, 'LATE_FEE_RATE', 0),
    MAX_NEW_USER_ASSET_VALUE: requireInteger(raw, 'MAX_NEW_USER_ASSET_VALUE', 0),
    REVIEW_EDIT_HOURS: requireInteger(raw, 'REVIEW_EDIT_HOURS', 0),
    CONTRACT_VERSION: requireString(raw, 'CONTRACT_VERSION'),
    POSTGRES_DB: getString(raw, 'POSTGRES_DB'),
    POSTGRES_USER: getString(raw, 'POSTGRES_USER'),
    POSTGRES_PASSWORD: getString(raw, 'POSTGRES_PASSWORD'),
    API_PORT: getString(raw, 'API_PORT'),
  };
}
