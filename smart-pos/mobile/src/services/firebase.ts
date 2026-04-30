import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, push, remove, set } from "firebase/database";
import { 
  initializeAuth, 
  getReactNativePersistence, 
  getAuth,
  Auth
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDsLuOuaWxEjM8MDBs1gsBcZ9RaJCeC_4E",
  authDomain: "income-tracker-f37cf.firebaseapp.com",
  databaseURL: "https://income-tracker-f37cf-default-rtdb.firebaseio.com",
  projectId: "income-tracker-f37cf",
  storageBucket: "income-tracker-f37cf.firebasestorage.app",
  messagingSenderId: "398179853269",
  appId: "1:398179853269:web:8a0b079d6c3fa09443d35c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

// Initialize Auth based on platform to prevent bundling errors on Web/EAS
let firebaseAuth: Auth;
if (Platform.OS === 'web') {
  firebaseAuth = getAuth(app);
} else {
  try {
    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    firebaseAuth = getAuth(app);
  }
}
export const auth = firebaseAuth;

export const listenToScans = (cameraId: string, callback: (data: any) => void) => {
  if (!cameraId) {
    callback([]);
    return () => {};
  }
  const scansRef = ref(db, `cameras/${cameraId}/scans/`);
  return onValue(scansRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
       const parsedScans = Object.keys(data)
         .map(key => ({
           id: key,
           ...data[key]
         }));
       callback(parsedScans.reverse());
    } else {
       callback([]);
    }
  });
};

export const listenToInventory = (cameraId: string, callback: (data: any) => void) => {
  if (!cameraId) {
    callback({});
    return () => {};
  }
  const invRef = ref(db, `cameras/${cameraId}/inventory/`);
  return onValue(invRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || {});
  });
};

export const completeOrder = async (cameraId: string, scans: any[], total: number) => {
  if (scans.length === 0 || !cameraId) return;
  const ordersRef = ref(db, `cameras/${cameraId}/orders/`);
  await push(ordersRef, {
    items: scans,
    total: total,
    timestamp: Date.now(),
    scanner_id: cameraId
  });
  for (const scan of scans) {
    if (scan.id) {
      await remove(ref(db, `cameras/${cameraId}/scans/${scan.id}`));
    }
  }
};

export const pairCameraToUser = async (cameraId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  await set(ref(db, `users/${userId}/paired_camera`), cameraId);
};

export const unpairCamera = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  await set(ref(db, `users/${userId}/paired_camera`), null);
};

export const listenToPairedCamera = (callback: (cameraId: string | null) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    callback(null);
    return () => {};
  }
  
  return onValue(ref(db, `users/${userId}/paired_camera`), (snapshot) => {
    callback(snapshot.val());
  });
};

export const setVendorType = async (cameraId: string, vendor: string) => {
  if (!cameraId) return;
  // Set for the camera specifically
  await set(ref(db, `cameras/${cameraId}/settings/vendor_type`), vendor);
};

export const listenToVendorType = (cameraId: string, callback: (data: string) => void) => {
  if (!cameraId) {
    callback('food_truck'); // default fallback
    return () => {};
  }
  return onValue(ref(db, `cameras/${cameraId}/settings/vendor_type`), (snapshot) => {
    callback(snapshot.val() || '');
  });
};

export const listenToOrders = (cameraId: string, callback: (data: any[]) => void) => {
  if (!cameraId) {
    callback([]);
    return () => {};
  }
  return onValue(ref(db, `cameras/${cameraId}/orders/`), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      callback(list.reverse());
    } else {
      callback([]);
    }
  });
};
