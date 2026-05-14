export type TEnv = {
  GEO_PROVIDER: string;
  GOOGLE_MAPS_API_KEY: string;
  NODE_ENV: string;
  JWT_ACCESS_TOKEN_SECRET_KEY: string;
  JWT_REFRESH_TOKEN_SECRET_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  OTP_HASH_SECRET: string;
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  REDIS_PORT: number;
  JWT_VERIFY_OTP_PAGE_SECRET_KEY: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_REGION: string;
  S3_BUCKET_NAME: string;
  STRIPE_API_SECRET_KEY: string;
  // STRIPE_WEBHOOK_SECRET_KEY: string;
  // GOOGLE_CLIENT_ID: string;
  // APPLE_CLIENT_ID: string;
  FIREBASE_ACCOUNT_TYPE: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_ID: string;
  FIREBASE_AUTH_URI: string;
  FIREBASE_TOKEN_URI: string;
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: string;
  FIREBASE_CLIENT_X509_CERT_URL: string;
  FIREBASE_UNIVERSE_DOMAIN: string;
  FIREBASE_CLIENT_EMAIL: string;
};

export type TMailOption = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

export enum PremiumFeature {
  TRAVEL_MODE = 'TRAVEL_MODE',
  ORCA_GRACE_TOKEN = 'ORCA_GRACE_TOKEN',
  PASSPORT_BADGE = 'PASSPORT_BADGE',
  PRIVATE_PODS = 'PRIVATE_PODS',
}

export type TFirebaseCredentials = {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
  client_email: string;
};

export type TSendNotificationPayload={
  fcmToken: string;
  data: {
    title: string;
    description: string;
  },
  userId:string
}