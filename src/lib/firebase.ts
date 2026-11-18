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
import {
  ProductItem,
  ChannelFee,
  FixedExpenses,
  CompetitorItem,
  ExternalSyncConfig,
  ExternalSyncRunLog,
} from '../types/pricing';

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

// Batch seed or overwrite products (chunked at 400 ops to respect Firestore 500-write batch limit)
export const dbSaveProductsBatch = async (products: ProductItem[]): Promise<void> => {
  if (!products || products.length === 0) return;
  try {
    await initAuth();
    const CHUNK_SIZE = 400;
    const nowIso = new Date().toISOString();
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const slice = products.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const prod of slice) {
        const docRef = doc(db, 'products', prod.id);
        const cleanData = JSON.parse(JSON.stringify(prod));
        batch.set(docRef, { ...cleanData, updatedAt: nowIso }, { merge: true });
      }
      await batch.commit();
    }
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
  if (!competitors || competitors.length === 0) return;
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

// Delete a Competitor
export const dbDeleteCompetitor = async (competitorId: string): Promise<void> => {
  const path = `competitors/${competitorId}`;
  try {
    await initAuth();
    await deleteDoc(doc(db, 'competitors', competitorId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// Save Custom Product Categories
export const dbSaveCustomCategories = async (categories: string[]): Promise<void> => {
  const path = 'settings/custom_categories';
  try {
    await initAuth();
    const docRef = doc(db, 'settings', 'custom_categories');
    await setDoc(
      docRef,
      {
        id: 'custom_categories',
        type: 'custom_categories',
        items: categories,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// Subscribe to Custom Product Categories
export const dbSubscribeCustomCategories = (
  onData: (categories: string[]) => void,
  onError?: (err: Error) => void
) => {
  const docRef = doc(db, 'settings', 'custom_categories');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as { items?: unknown };
        if (Array.isArray(data.items)) {
          onData(data.items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0));
        }
      }
    },
    (err) => {
      console.warn('[Firestore] Custom categories subscription error:', err);
      onError?.(err);
    }
  );
};

// Save External Sync Configuration
export const dbSaveSyncConfig = async (config: ExternalSyncConfig): Promise<void> => {
  const path = 'settings/external_sync_config';
  try {
    await initAuth();
    const docRef = doc(db, 'settings', 'external_sync_config');
    const cleanData = JSON.parse(JSON.stringify(config));
    await setDoc(
      docRef,
      {
        id: 'external_sync_config',
        type: 'external_sync_config',
        data: cleanData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// Subscribe to External Sync Configuration
export const dbSubscribeSyncConfig = (
  onData: (config: ExternalSyncConfig) => void,
  onError?: (err: Error) => void
) => {
  const path = 'settings/external_sync_config';
  const docRef = doc(db, 'settings', 'external_sync_config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data() as { data?: ExternalSyncConfig };
        if (docData?.data && typeof docData.data === 'object') {
          onData(docData.data);
        }
      }
    },
    (err) => {
      console.warn('[Firestore] Sync config subscription error:', err);
      onError?.(err);
      if (err?.message?.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }
  );
};

// Save External Sync Run History (keeps latest 40 runs)
export const dbSaveSyncHistory = async (runs: ExternalSyncRunLog[]): Promise<void> => {
  const path = 'settings/external_sync_history';
  try {
    await initAuth();
    const docRef = doc(db, 'settings', 'external_sync_history');
    const cleanRuns = JSON.parse(JSON.stringify(runs.slice(0, 40)));
    await setDoc(
      docRef,
      {
        id: 'external_sync_history',
        type: 'external_sync_history',
        runs: cleanRuns,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// Subscribe to External Sync Run History
export const dbSubscribeSyncHistory = (
  onData: (runs: ExternalSyncRunLog[]) => void,
  onError?: (err: Error) => void
) => {
  const path = 'settings/external_sync_history';
  const docRef = doc(db, 'settings', 'external_sync_history');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data() as { runs?: ExternalSyncRunLog[] };
        if (Array.isArray(docData?.runs)) {
          onData(docData.runs);
        }
      }
    },
    (err) => {
      console.warn('[Firestore] Sync history subscription error:', err);
      onError?.(err);
      if (err?.message?.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }
  );
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
      if (initialCompetitors.length > 0) {
        await dbSaveCompetitors(initialCompetitors);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Firestore] Seed check error:', err);
    return false;
  }
};
