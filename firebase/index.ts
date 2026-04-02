/**
 * Firebase App Initialization
 * 
 * Central module for Firebase app instance management.
 * Ensures singleton pattern for Firebase initialization.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirebaseConfig } from './config'

let firebaseApp: FirebaseApp | null = null

/**
 * Get or initialize the Firebase app instance
 * Implements singleton pattern to prevent duplicate initialization
 */
export function getFirebaseApp(): FirebaseApp {
    if (firebaseApp) {
        return firebaseApp
    }

    // Check if Firebase is already initialized (e.g., by another module)
    if (getApps().length > 0) {
        firebaseApp = getApps()[0]!
        return firebaseApp
    }

    // Initialize new Firebase app
    firebaseApp = initializeApp(getFirebaseConfig())
    return firebaseApp
}

// Re-export config utilities
export { getFirebaseConfig, setFirebaseConfig } from './config'

// Re-export all services
export * from './services'
