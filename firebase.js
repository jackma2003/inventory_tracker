// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPQzzPSQNfaUwdwv835CmXSaEXtWPOlgs",
  authDomain: "inventory-management-1ccc1.firebaseapp.com",
  projectId: "inventory-management-1ccc1",
  storageBucket: "inventory-management-1ccc1.appspot.com",
  messagingSenderId: "406837107496",
  appId: "1:406837107496:web:c9f72b49f8a8e95c85ce1d",
  measurementId: "G-B8364TSGC3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { firestore, storage, auth, googleProvider, signInWithPopup, signOut };