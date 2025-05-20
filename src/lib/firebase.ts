// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Config 1: For main app data (trips, etc.) - "tawsellah3"
const firebaseConfigPrimary = {
  apiKey: "AIzaSyC8kTTftLNRLa_GTJjubUMucnx1Tll8r4A",
  authDomain: "tawsellah3.firebaseapp.com",
  databaseURL: "https://tawsellah3-default-rtdb.firebaseio.com",
  projectId: "tawsellah3",
  storageBucket: "tawsellah3.firebasestorage.app",
  messagingSenderId: "483733605153",
  appId: "1:483733605153:web:1f63e97390d1be760a0c60",
  measurementId: "G-J3DT6794Q3"
};

// Config 2: For user authentication and rider profiles - "tawsellah-rider"
const firebaseConfigRider = {
  apiKey: "AIzaSyCYYK1I3FPl_C2NevytM7ZsiaX0zasGIzo",
  authDomain: "tawsellah-rider.firebaseapp.com",
  databaseURL: "https://tawsellah-rider-default-rtdb.firebaseio.com",
  projectId: "tawsellah-rider",
  storageBucket: "tawsellah-rider.firebasestorage.app",
  messagingSenderId: "496851476815",
  appId: "1:496851476815:web:c46582c3d38243d336a53a",
  measurementId: "G-SPYSDNSMNX" // Rider app's measurementId
};

let appPrimary: FirebaseApp;
let appRider: FirebaseApp;
let dbPrimary: Database;
let dbRider: Database;
let authRider: Auth;
let analyticsPrimary: Analytics | null = null;

// Initialize Primary App (tawsellah3)
// This is the default app if no name is provided in getApp() or if using a single app.
if (!getApps().find(app => app.name === '[DEFAULT]')) {
  appPrimary = initializeApp(firebaseConfigPrimary);
} else {
  appPrimary = getApp(); // Gets the default app
}
dbPrimary = getDatabase(appPrimary);

if (typeof window !== 'undefined') {
  // Initialize Analytics only on the client-side
  analyticsPrimary = getAnalytics(appPrimary);
}

// Initialize Rider App (tawsellah-rider) as a named secondary app
const RIDER_APP_NAME = "riderApp"; // Unique name for the secondary app
let riderAppAlreadyInitialized = false;
getApps().forEach(app => {
  if (app.name === RIDER_APP_NAME) {
    riderAppAlreadyInitialized = true;
    appRider = app;
  }
});

if (!riderAppAlreadyInitialized) {
  appRider = initializeApp(firebaseConfigRider, RIDER_APP_NAME);
} else {
  // This case should ideally not be hit if the above find works, but as a fallback:
  appRider = getApp(RIDER_APP_NAME);
}

authRider = getAuth(appRider);
dbRider = getDatabase(appRider); // Database instance for the rider app

// Note: If you need Analytics for the rider app, initialize it similarly:
// let analyticsRider: Analytics | null = null;
// if (typeof window !== 'undefined') {
//   analyticsRider = getAnalytics(appRider);
// }
// And export analyticsRider

export { appPrimary, dbPrimary, authRider, dbRider, analyticsPrimary };
