import { TFirebaseCredentials, TMailOption } from '@/app/@types/system.types';
import { env } from '@/env';

export function mailOption(
  to: string,
  subject: string,
  html: string
): TMailOption {
  const option: TMailOption = {
    from: process.env.SMTP_USER as string,
    to,
    subject,
    html,
  };
  return option;
}

export function getFirebaseCredentials(): TFirebaseCredentials {
  return {
    type: env.FIREBASE_ACCOUNT_TYPE,
    project_id: env.FIREBASE_PROJECT_ID,
    private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
    private_key: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
    client_id: env.FIREBASE_CLIENT_ID,
    auth_uri: env.FIREBASE_AUTH_URI,
    token_uri: env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: env.FIREBASE_UNIVERSE_DOMAIN,
    client_email: env.FIREBASE_CLIENT_EMAIL,
  };
}