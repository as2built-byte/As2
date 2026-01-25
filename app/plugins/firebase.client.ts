/**
 * Firebase Client Plugin for Nuxt
 * 
 * Initializes Firebase services and provides them via Nuxt app context.
 * Uses the modular Firebase structure from ~/firebase
 */

import { getFirebaseApp, getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from '~/firebase'

export default defineNuxtPlugin(() => {
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
