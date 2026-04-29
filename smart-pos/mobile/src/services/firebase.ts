// Replace this with your actual Firebase config
// npm install firebase

// import { initializeApp } from 'firebase/app';
// import { getDatabase, ref, onValue } from 'firebase/database';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyDsLuOuaWxEjM8MDBs1gsBcZ9RaJCeC_4E",
  authDomain: "income-tracker-f37cf.firebaseapp.com",
  projectId: "income-tracker-f37cf",
  storageBucket: "income-tracker-f37cf.firebasestorage.app",
  messagingSenderId: "398179853269",
  appId: "1:398179853269:web:8a0b079d6c3fa09443d35c"
};

import { getDatabase, ref, onValue } from "firebase/database";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Example listener setup for the React Native App
export const listenToScans = (callback: (data: any) => void) => {
  const scansRef = ref(db, 'scans/');
  onValue(scansRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
       // Convert object to array
       const parsedScans = Object.keys(data).map(key => ({
         id: key,
         ...data[key]
       }));
       callback(parsedScans.reverse()); // latest first
    } else {
       callback([]);
    }
  });
};
