// Replace this with your actual Firebase config
// npm install firebase

// import { initializeApp } from 'firebase/app';
// import { getDatabase, ref, onValue } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// const app = initializeApp(firebaseConfig);
// export const db = getDatabase(app);

// Example listener setup for the React Native App
/*
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
    }
  });
};
*/
