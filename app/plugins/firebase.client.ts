/**
 * Firebase Client Plugin for Nuxt
 * 
 * Initializes Firebase services and provides them via Nuxt app context.
 * Reads Firebase config from Nuxt runtimeConfig (environment variables).
 */

import { setFirebaseConfig } from '~/firebase/config'
import { getFirebaseApp, getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from '~/firebase'

export default defineNuxtPlugin(() => {
    // Read Firebase config from Nuxt runtimeConfig (env variables)
    const config = useRuntimeConfig()

    // Set Firebase config before any service initialization
    setFirebaseConfig({
        apiKey: config.public.firebaseApiKey as string,
        authDomain: config.public.firebaseAuthDomain as string,
        projectId: config.public.firebaseProjectId as string,
        storageBucket: config.public.firebaseStorageBucket as string,
        messagingSenderId: config.public.firebaseMessagingSenderId as string,
        appId: config.public.firebaseAppId as string,
    })

    // Initialize Firebase app and services
    const app = getFirebaseApp()
    const auth = getFirebaseAuth()
    const firestore = getFirebaseFirestore()
    const storage = getFirebaseStorage()

    return {
        provide: {
            // Firebase App
            firebaseApp: app,

            // Firebase Services
            firebaseAuth: auth,
            firebaseFirestore: firestore,
            firebaseStorage: storage,
        },
    }
})
