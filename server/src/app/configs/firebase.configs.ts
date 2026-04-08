// ./src/app/configs/firebase.configs.ts

import admin from 'firebase-admin';

import { getFirebaseCredentials } from '@/app/utils/system.utils';

admin.initializeApp({
  credential: admin.credential.cert(
    getFirebaseCredentials() as admin.ServiceAccount
  ),
});

