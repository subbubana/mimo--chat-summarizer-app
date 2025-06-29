// frontend/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // For authentication services

// Your Firebase configuration (from a previous chat)
const firebaseConfig = {
  apiKey: "AIzaSyDOiaO2gZ42QdbmROUJ80Yvp8ZqhHaH8A8",
  authDomain: "subbus-messenger.firebaseapp.com",
  projectId: "subbus-messenger",
  storageBucket: "subbus-messenger.firebasestorage.app",
  messagingSenderId: "511919968088",
  appId: "1:511919968088:web:ca14ccec7f7e2db9d59f2d",
  measurementId: "G-LP8V2G2M97"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get the authentication service instance

export { app, auth }; // Export app and auth for use in other components