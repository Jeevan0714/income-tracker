import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";

export const updateItemPrice = async (cameraId: string, itemName: string, price: number) => {
  if (!cameraId) return;
  const priceRef = ref(db, `cameras/${cameraId}/settings/prices/${itemName.toLowerCase()}`);
  await set(priceRef, price);
};

export const listenToCustomPrices = (cameraId: string, callback: (prices: Record<string, number>) => void) => {
  if (!cameraId) {
    callback({});
    return () => {};
  }
  const pricesRef = ref(db, `cameras/${cameraId}/settings/prices`);
  return onValue(pricesRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
};
