import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { setFirebaseConfig } from "~/firebase/config";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;

  const firebaseConfig = {
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId,
  };

  // 1. INDISPENSABLE : On transmet la config à tes services internes
  setFirebaseConfig(firebaseConfig);

  // 2. Initialisation (on vérifie si une instance existe déjà)
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // 3. On expose auth et db pour les composants Vue
  return {
    provide: {
      auth: getAuth(app),
      db: getFirestore(app)
    }
  };
});
