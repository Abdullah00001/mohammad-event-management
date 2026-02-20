import { TEnv } from '@/app/@types/system.types';
import { getEnv } from '@/app/utils/system.utils';

export const env: TEnv = {
  NODE_ENV: getEnv('NODE_ENV'),
  JWT_ACCESS_TOKEN_SECRET_KEY: getEnv('JWT_ACCESS_TOKEN_SECRET_KEY'),
  JWT_REFRESH_TOKEN_SECRET_KEY: getEnv('JWT_REFRESH_TOKEN_SECRET_KEY'),
  SMTP_HOST: getEnv('SMTP_HOST'),
  SMTP_PORT: Number(getEnv('SMTP_PORT')),
  SMTP_USER: getEnv('SMTP_USER'),
  SMTP_PASS: getEnv('SMTP_PASS'),
  OTP_HASH_SECRET: getEnv('OTP_HASH_SECRET'),
  REDIS_HOST: getEnv('REDIS_HOST'),
  REDIS_PASSWORD: getEnv('REDIS_PASSWORD'),
  REDIS_PORT: Number(getEnv('REDIS_PORT')),
  JWT_VERIFY_OTP_PAGE_SECRET_KEY: getEnv('JWT_VERIFY_OTP_PAGE_SECRET_KEY'),
  S3_ACCESS_KEY: getEnv('S3_ACCESS_KEY'),
  S3_SECRET_KEY: getEnv('S3_SECRET_KEY'),
  S3_REGION: getEnv('S3_REGION'),
  S3_BUCKET_NAME: getEnv('S3_BUCKET_NAME'),
};
