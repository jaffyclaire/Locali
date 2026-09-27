import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.apiKey.trim() !== "" &&
      firebaseConfig.projectId.trim() !== ""
  );
};

// Initialize Firebase App instance (safeguarding against multiple initializations during fast refresh)
let app: FirebaseApp;
if (getApps().length === 0) {
  // Use config if provided, otherwise provide dummy placeholders so SDK doesn't throw immediate runtime syntax crash
  app = initializeApp({
    apiKey: firebaseConfig.apiKey || "mock-api-key",
    authDomain: firebaseConfig.authDomain || "mock-app.firebaseapp.com",
    projectId: firebaseConfig.projectId || "mock-project-id",
    storageBucket: firebaseConfig.storageBucket || "mock-app.appspot.com",
    messagingSenderId: firebaseConfig.messagingSenderId || "1234567890",
    appId: firebaseConfig.appId || "1:1234567890:web:abcdef123456",
  });
} else {
  app = getApp();
}

// Initialize Auth with AsyncStorage persistence for React Native / mobile platforms
let auth: Auth;
try {
  if (Platform.OS === "web") {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (e) {
  // If already initialized (e.g. during Fast Refresh / HMR), fallback to getAuth
  auth = getAuth(app);
}

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Firebase Storage
import { getStorage, FirebaseStorage } from "firebase/storage";
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
