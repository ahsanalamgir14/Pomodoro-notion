import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseEnvPresent = !!process.env.FIREBASE_API_KEY && !!process.env.FIREBASE_PROJECT_ID;

let firebaseApp: any = null;
let db: any = null;

try {
  if (firebaseEnvPresent && process.env.DISABLE_FIREBASE !== "true") {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
  }
} catch (e) {
  firebaseApp = null;
  db = null;
}

export { firebaseApp, db };
