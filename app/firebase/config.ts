/**
 * Firebase Configuration for As2Built
 * 
 * Configuration is loaded from Nuxt runtime config (environment variables).
 * The config is set during plugin initialization and consumed by Firebase services.
 */

export interface FirebaseConfig {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
    measurementId?: string
}

/**
 * Module-level config holder.
 * Set once by the firebase.client.ts plugin at startup,
 * then read by getFirebaseApp() and createUserWithoutSignIn().
 */
let _firebaseConfig: FirebaseConfig | null = null

/**
 * Set the Firebase config (called once by plugin).
 */
export function setFirebaseConfig(config: FirebaseConfig): void {
    _firebaseConfig = config
}

/**
 * Get the Firebase config.
 * Throws if called before plugin initialization.
 */
export function getFirebaseConfig(): FirebaseConfig {
    if (!_firebaseConfig) {
        throw new Error(
            '[Firebase] Config not initialized. Ensure the firebase.client.ts plugin has loaded.'
        )
    }
    return _firebaseConfig
}
