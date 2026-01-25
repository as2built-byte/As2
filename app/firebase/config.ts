/**
 * Firebase Configuration for As2Built
 * 
 * Environment-based configuration for Firebase services.
 * This file contains the Firebase project credentials.
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
 * Firebase configuration object
 * 
 * TODO: Move to environment variables for production:
 * - NUXT_PUBLIC_FIREBASE_API_KEY
 * - NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - etc.
 */
export const firebaseConfig: FirebaseConfig = {
    apiKey: 'AIzaSyCAC-0eoR5c09x-8wTby50HlwSuXJltoFQ',
    authDomain: 'as2built-14cb6.firebaseapp.com',
    projectId: 'as2built-14cb6',
    storageBucket: 'as2built-14cb6.firebasestorage.app',
    messagingSenderId: '433501108234',
    appId: '1:433501108234:web:db20bbde80b8eda5e307f3',
}
