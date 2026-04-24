/**
 * ============================================
 * NIKAH PAKISTAN V2 - FIREBASE CONFIGURATION
 * ============================================
 * This file initializes Firebase core services
 * (Auth, Firestore, Storage) and exposes them globally.
 * 
 * IMPORTANT: Replace the placeholder values below with
 * your actual Firebase project configuration from the
 * Firebase Console → Project Settings → Your Apps.
 * ============================================
 */

'use strict';

// ---------- FIREBASE SDK IMPORTS (CDN) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ---------- FIREBASE CONFIGURATION OBJECT ----------
// TODO: Replace each placeholder with your actual Firebase project values.
// You can find these in your Firebase Console:
//   → Project Settings → General → Your Apps → Web App → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyD05ZII0yFGnBsgoSRhBbZ7TGUzAYh7B5o",
  authDomain: "nikah-pakistan-v2.firebaseapp.com",
  projectId: "nikah-pakistan-v2",
  storageBucket: "nikah-pakistan-v2.firebasestorage.app",
  messagingSenderId: "863677926985",
  appId: "1:863677926985:web:93ec8a9b363f6962c63998",
  measurementId: "G-MD55TVZRS8"
};

// ---------- INITIALIZE FIREBASE ----------
let app;
let auth;
let db;
let storage;

try {
    // Initialize the Firebase application
    app = initializeApp(firebaseConfig);
    
    // Initialize individual services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // ---------- OPTIONAL: ENABLE OFFLINE PERSISTENCE ----------
    // Uncomment the lines below to enable offline data persistence.
    // This allows Firestore to cache data locally, improving performance.
    // Note: This requires importing enableIndexedDbPersistence from firebase-firestore.js
    // import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    // enableIndexedDbPersistence(db).catch((err) => {
    //     if (err.code === 'failed-precondition') {
    //         console.warn('Firestore persistence unavailable – multiple tabs open?');
    //     } else if (err.code === 'unimplemented') {
    //         console.warn('Current browser does not support Firestore persistence.');
    //     }
    // });
    
    // ---------- OPTIONAL: CONNECT TO FIREBASE EMULATOR (LOCAL DEV) ----------
    // Uncomment these if you are using Firebase Emulator for local development.
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectStorageEmulator(storage, 'localhost', 9199);
    
    // Success log
    console.log('Firebase initialized successfully for Nikah Pakistan.');
    console.log(`Project ID: ${firebaseConfig.projectId}`);
    
} catch (error) {
    console.error('Firebase initialization failed:', error.message);
    console.error('Please check your API keys in firebase/firebase-config.js');
    
    // Fallback: Set to null so the app can degrade gracefully
    app = null;
    auth = null;
    db = null;
    storage = null;
    
    // Optionally display a user-friendly banner if the document is ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            const errorBanner = document.createElement('div');
            errorBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #EF4444;
                color: white;
                text-align: center;
                padding: 12px 20px;
                z-index: 9999;
                font-family: sans-serif;
                font-size: 14px;
            `;
            errorBanner.textContent = 'Firebase configuration error. Please contact the administrator.';
            document.body.prepend(errorBanner);
        });
    }
}

// ---------- EXPOSE SERVICES GLOBALLY ----------
// Attach to window for easy access in any script
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebaseApp = app;

// ---------- NAMED EXPORTS (FOR ES MODULE IMPORTS) ----------
// This allows other files to import these services directly:
//   import { auth, db, storage } from '../../firebase/firebase-config.js';
export { app, auth, db, storage };
