import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App | undefined;
let adminAuth: Auth | undefined;

function getFirebaseAdmin(): App {
  if (app) return app;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (getApps().length > 0) {
    app = getApps()[0];
    adminAuth = getAuth(app);
    return app;
  }

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({ credential: cert(serviceAccount) });
    } catch {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.');
      app = initializeApp({});
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set. Firebase Admin token verification will fail.');
    app = initializeApp({});
  }

  adminAuth = getAuth(app);
  return app;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    getFirebaseAdmin();
  }
  return adminAuth!;
}

/**
 * Verify a Firebase ID token server-side.
 * Returns the decoded token if valid, null if invalid.
 */
export async function verifyIdToken(idToken: string) {
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.error('Firebase ID token verification failed:', err);
    return null;
  }
}
