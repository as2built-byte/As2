/**
 * Firebase Plugin - Universal (Client + Server)
 * 
 * Initializes Firebase configuration for both client and server rendering.
 * On server, only sets the config. On client, initializes the full Firebase app.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { setFirebaseConfig } from "~/firebase/config";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public;

  const firebaseConfig = {
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId,
  };

  // Always set the config (needed by both client and server)
  setFirebaseConfig(firebaseConfig);

  // Only initialize Firebase app on client side
  if (process.client) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    return {
      provide: {
        auth: getAuth(app),
        db: getFirestore(app)
      }
    };
  }

  // On server, just return empty provides (Firebase will be lazy-loaded when needed)
  return {
    provide: {
      auth: null,
      db: null
    }
  };
});
