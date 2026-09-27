// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDGODRBUtb9TFUqySGj_0ZQc58IGRhx6VM",
  authDomain: "locali-dca58.firebaseapp.com",
  projectId: "locali-dca58",
  storageBucket: "locali-dca58.firebasestorage.app",
  messagingSenderId: "569916464684",
  appId: "1:569916464684:web:5bc5a54e55554896ae3b89",
  measurementId: "G-3RW751H097"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);