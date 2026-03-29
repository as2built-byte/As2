/**
 * Firebase Configuration for As2Built
 * 
 * Configuration is loaded from Nuxt runtime config (environment variables).
 * The config is set during plugin initialization and consumed by Firebase services.
 */

/**
 * Module-level config holder.
 * Set once by the firebase.client.js plugin at startup,
 * then read by getFirebaseApp() and createUserWithoutSignIn().
 */
let _firebaseConfig = null;

/**
 * Set the Firebase config (called once by plugin).
 */
export function setFirebaseConfig(config) {
    _firebaseConfig = config;
}

/**
 * Get the Firebase config.
 * Throws if called before plugin initialization.
 */
export function getFirebaseConfig() {
    if (!_firebaseConfig) {
        throw new Error(
            '[Firebase] Config not initialized. Ensure the firebase.client.js plugin has loaded.'
        );
    }
    return _firebaseConfig;
}
