import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtsINs53v1WBgnRSh2pNuOgc6v6HSUI_I",
  authDomain: "ordinal-mountain-hcf5x.firebaseapp.com",
  projectId: "ordinal-mountain-hcf5x",
  storageBucket: "ordinal-mountain-hcf5x.firebasestorage.app",
  messagingSenderId: "606930003825",
  appId: "1:606930003825:web:ced3ef3e629e8e1f9a78d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom Database ID
export const db = getFirestore(app, "ai-studio-gestordesublimac-53ac1963-2c81-4a56-be07-106c4a57c422");
