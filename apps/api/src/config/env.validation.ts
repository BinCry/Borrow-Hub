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

function parseBoolean(raw: Record<string, unknown>, key: string): boolean {
  const value = requireString(raw, key).toLowerCase();

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${key} must be either true or false`);
}

function booleanWithDefault(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  return getString(raw, key) ? parseBoolean(raw, key) : fallback;
}

function integerWithDefault(
  raw: Record<string, unknown>,
  key: string,
  minimum: number,
  fallback: number,
) {
  return getString(raw, key)
    ? requireInteger(raw, key, minimum)
    : fallback;
}

function readMailConfig(raw: Record<string, unknown>, nodeEnv: string) {
  const mailKeys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'PASSWORD_RESET_URL',
    'ACCOUNT_DELETION_URL',
    'SUPPORT_EMAIL',
  ];
  const hasMailConfiguration = mailKeys.some((key) => getString(raw, key));

  if (nodeEnv !== 'production' && !hasMailConfiguration) {
    return {
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_SECURE: undefined,
      SMTP_USER: undefined,
      SMTP_PASSWORD: undefined,
      SMTP_FROM: undefined,
      PASSWORD_RESET_URL: undefined,
      ACCOUNT_DELETION_URL: undefined,
      SUPPORT_EMAIL: undefined,
    };
  }

  const smtpUser = getString(raw, 'SMTP_USER');
  const smtpPassword = getString(raw, 'SMTP_PASSWORD');

  if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be provided together');
  }

  return {
    SMTP_HOST: requireString(raw, 'SMTP_HOST'),
    SMTP_PORT: requireInteger(raw, 'SMTP_PORT', 1),
    SMTP_SECURE: parseBoolean(raw, 'SMTP_SECURE'),
    SMTP_USER: smtpUser,
    SMTP_PASSWORD: smtpPassword,
    SMTP_FROM: requireString(raw, 'SMTP_FROM'),
    PASSWORD_RESET_URL: requireUrl(raw, 'PASSWORD_RESET_URL'),
    ACCOUNT_DELETION_URL: requireUrl(raw, 'ACCOUNT_DELETION_URL'),
    SUPPORT_EMAIL: requireString(raw, 'SUPPORT_EMAIL'),
  };
}

function readSepayConfig(raw: Record<string, unknown>, nodeEnv: string) {
  const enabled = booleanWithDefault(
    raw,
    'SEPAY_ENABLED',
    nodeEnv === 'production',
  );

  if (nodeEnv === 'production' && !enabled) {
    throw new Error('SEPAY_ENABLED must be true in production');
  }

  if (!enabled) {
    return {
      SEPAY_ENABLED: false,
      SEPAY_ACCOUNT_NUMBER: undefined,
      SEPAY_ACCOUNT_NAME: undefined,
      SEPAY_BANK_NAME: undefined,
      SEPAY_WEBHOOK_SECRET: undefined,
    };
  }

  return {
    SEPAY_ENABLED: true,
    SEPAY_ACCOUNT_NUMBER: requireString(raw, 'SEPAY_ACCOUNT_NUMBER'),
    SEPAY_ACCOUNT_NAME: requireString(raw, 'SEPAY_ACCOUNT_NAME'),
    SEPAY_BANK_NAME: requireString(raw, 'SEPAY_BANK_NAME'),
    SEPAY_WEBHOOK_SECRET: requireSecret(raw, 'SEPAY_WEBHOOK_SECRET'),
  };
}

export function validateEnv(raw: Record<string, unknown>) {
  const nodeEnv = getString(raw, 'NODE_ENV') ?? 'development';

  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV must be one of development, test, production');
  }

  const mailConfig = readMailConfig(raw, nodeEnv);
  const sepayConfig = readSepayConfig(raw, nodeEnv);
  const corsOrigins =
    nodeEnv === 'production'
      ? requireString(raw, 'CORS_ORIGINS')
      : (getString(raw, 'CORS_ORIGINS') ??
        'http://localhost:8081,http://localhost:19006');
  const storageSigningSecret =
    nodeEnv === 'production'
      ? requireSecret(raw, 'STORAGE_SIGNING_SECRET')
      : getString(raw, 'STORAGE_SIGNING_SECRET');

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
    CORS_ORIGINS: corsOrigins,
    STORAGE_SIGNING_SECRET: storageSigningSecret,
    UPLOADS_DIR: getString(raw, 'UPLOADS_DIR'),
    LOGS_DIR: getString(raw, 'LOGS_DIR'),
    LOG_TO_FILES: booleanWithDefault(raw, 'LOG_TO_FILES', false),
    SWAGGER_ENABLED: booleanWithDefault(
      raw,
      'SWAGGER_ENABLED',
      nodeEnv !== 'production',
    ),
    REQUEST_LOG_RETENTION_DAYS: integerWithDefault(
      raw,
      'REQUEST_LOG_RETENTION_DAYS',
      1,
      30,
    ),
    ...sepayConfig,
    ...mailConfig,
  };
}
