// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
// import { getAnalytics } from "firebase/analytics"; // Uncomment if analytics is needed

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8kTTftLNRLa_GTJjubUMucnx1Tll8r4A",
  authDomain: "tawsellah3.firebaseapp.com",
  databaseURL: "https://tawsellah3-default-rtdb.firebaseio.com",
  projectId: "tawsellah3",
  storageBucket: "tawsellah3.firebasestorage.app",
  messagingSenderId: "483733605153",
  appId: "1:483733605153:web:1f63e97390d1be760a0c60",
  measurementId: "G-J3DT6794Q3"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Database = getDatabase(app);
// const analytics = getAnalytics(app); // Uncomment if analytics is needed elsewhere

export { app, db };
