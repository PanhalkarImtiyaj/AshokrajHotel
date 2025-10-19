import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCp3q2y0qyyTct0AVURH4aCY7-nz9yGxT0",
  authDomain: "hotel-7ef87.firebaseapp.com",
  databaseURL: "https://hotel-7ef87-default-rtdb.firebaseio.com",
  projectId: "hotel-7ef87",
  storageBucket: "hotel-7ef87.firebasestorage.app",
  messagingSenderId: "857732286081",
  appId: "1:857732286081:web:27a1769d30d205871a2f80",
  measurementId: "G-34822P8T6J"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;
