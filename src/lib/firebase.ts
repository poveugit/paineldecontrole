import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { ProductItem, ChannelFee, FixedExpenses, CompetitorItem } from '../types/pricing';

// Configuration supporting both runtime Vercel environment variables and local json file
export const firebaseConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId:
    import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (with multi-database support if specified)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Keep track of auth user
let currentAuthUser: User | null = null;
export const getAuthUser = () => currentAuthUser;

let authInitPromise: Promise<User | null> | null = null;

// Ensure authentication session (anonymous sign-in allows immediate access under security rules if available)
export const initAuth = async (): Promise<User | null> => {
  if (currentAuthUser) return currentAuthUser;
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 1500);

      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          unsubscribe();
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          if (user) {
            currentAuthUser = user;
            resolve(user);
          } else {
            try {
              const cred = await signInAnonymously(auth);
              currentAuthUser = cred.user;
              resolve(cred.user);
            } catch {
              // Proceed gracefully if anonymous auth provider is not active
              resolve(null);
            }
          }
        });
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    });
  }
  return authInitPromise;
};

// Validate live connection to Firestore
export const testFirestoreConnection = async (): Promise<{
  connected: boolean;
  databaseId: string;
  projectId: string;
  error?: string;
}> => {
  try {
    await initAuth();
    // Test document check as required by Firebase integration guidelines
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      connected: true,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      projectId: firebaseConfig.projectId,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // If document doesn't exist, the connection itself still reached Firestore successfully!
    if (errorMsg.includes('No document to update') || !errorMsg.includes('offline')) {
      return {
        connected: true,
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
        projectId: firebaseConfig.projectId,
      };
    }
    return {
      connected: false,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      projectId: firebaseConfig.projectId,
      error: errorMsg,
    };
  }
};

// ================= FIRESTORE CRUD & REALTIME HELPERS =================

// Save a single product
export const dbSaveProduct = async (product: ProductItem): Promise<void> => {
  try {
    await initAuth();
    const docRef = doc(db, 'products', product.id);
    const cleanData = JSON.parse(JSON.stringify(product));
    await setDoc(docRef, { ...cleanData, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving product:', err);
    throw err;
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Delete a product
export const dbDeleteProduct = async (productId: string): Promise<void> => {
  const path = `products/${productId}`;
  try {
    await initAuth();
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// Batch seed or overwrite products
export const dbSaveProductsBatch = async (products: ProductItem[]): Promise<void> => {
  try {
    await initAuth();
    const batch = writeBatch(db);
    for (const prod of products) {
      const docRef = doc(db, 'products', prod.id);
      const cleanData = JSON.parse(JSON.stringify(prod));
      batch.set(docRef, { ...cleanData, updatedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Error batch saving products:', err);
    throw err;
  }
};

// Save Channel Fees
export const dbSaveChannels = async (channels: ChannelFee[]): Promise<void> => {
  try {
    await initAuth();
    const batch = writeBatch(db);
    for (const channel of channels) {
      const docRef = doc(db, 'channels', channel.id);
      const cleanData = JSON.parse(JSON.stringify(channel));
      batch.set(docRef, { ...cleanData, updatedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Error saving channels:', err);
    throw err;
  }
};

// Save Fixed Expenses
export const dbSaveFixedExpenses = async (expenses: FixedExpenses): Promise<void> => {
  try {
    await initAuth();
    const docRef = doc(db, 'settings', 'fixed_expenses');
    await setDoc(
      docRef,
      {
        id: 'fixed_expenses',
        type: 'fixed_expenses',
        data: expenses,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[Firestore] Error saving fixed expenses:', err);
    throw err;
  }
};

// Save Competitors
export const dbSaveCompetitors = async (competitors: CompetitorItem[]): Promise<void> => {
  try {
    await initAuth();
    const batch = writeBatch(db);
    for (const comp of competitors) {
      const docRef = doc(db, 'competitors', comp.id);
      const cleanData = JSON.parse(JSON.stringify(comp));
      batch.set(docRef, cleanData, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Error saving competitors:', err);
    throw err;
  }
};

// Subscribe to real-time products
export const dbSubscribeProducts = (
  onData: (products: ProductItem[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const prods: ProductItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ProductItem;
        prods.push({ ...data, id: docSnap.id });
      });
      onData(prods);
    },
    (err) => {
      console.warn('[Firestore] Realtime subscription error:', err);
      onError?.(err);
    }
  );
};

// Seed database if empty
export const dbSeedIfEmpty = async (
  initialProducts: ProductItem[],
  initialChannels: ChannelFee[],
  initialExpenses: FixedExpenses,
  initialCompetitors: CompetitorItem[]
): Promise<boolean> => {
  try {
    await initAuth();
    const prodsSnap = await getDocs(collection(db, 'products'));
    if (prodsSnap.empty && initialProducts.length > 0) {
      console.log('[Firestore] Database is empty. Seeding initial catalog data...');
      await dbSaveProductsBatch(initialProducts);
      await dbSaveChannels(initialChannels);
      await dbSaveFixedExpenses(initialExpenses);
      await dbSaveCompetitors(initialCompetitors);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Firestore] Seed check error:', err);
    return false;
  }
};
