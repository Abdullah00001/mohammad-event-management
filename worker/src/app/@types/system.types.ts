export type TEnv = {
  GEO_PROVIDER: string;
  GEO_USER_AGENT: string;
  GOOGLE_MAPS_API_KEY: string;
  NODE_ENV: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  REDIS_PORT: number;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_REGION: string;
  S3_BUCKET_NAME: string;
};

export type TMailOption = {
  from: string;
  to: string;
  subject: string;
  html: string;
};
