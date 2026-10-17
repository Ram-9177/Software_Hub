import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to current dir .env

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/command_center',
  DB_CLIENT: process.env.DB_CLIENT || 'pg',
  USE_IN_MEMORY_DB: process.env.USE_IN_MEMORY_DB === 'true' || true, // default resilient

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  USE_MOCK_REDIS: process.env.USE_MOCK_REDIS === 'true' || true, // default resilient

  // JWT RS256
  JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH || './keys/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || './keys/jwt-public.pem',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Microsoft OpenID Connect SSO
  MS_OIDC_CLIENT_ID: process.env.MS_OIDC_CLIENT_ID || 'mock-client-id',
  MS_OIDC_CLIENT_SECRET: process.env.MS_OIDC_CLIENT_SECRET || 'mock-client-secret',
  MS_OIDC_TENANT_ID: process.env.MS_OIDC_TENANT_ID || 'common',
  MS_OIDC_REDIRECT_URI: process.env.MS_OIDC_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
  ENABLE_MOCK_SSO: process.env.ENABLE_MOCK_SSO !== 'false',

  // Nodemailer
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || 'mock@softwarehub2.org',
  SMTP_PASS: process.env.SMTP_PASS || 'mock_pass',
  SMTP_FROM: process.env.SMTP_FROM || 'Command Center <notifications@softwarehub2.org>',

  // Web-Push VAPID
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BDm-dummy-public-key',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'dummy-private-key',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@softwarehub2.org',

  // Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};
