/**
 * Firebase Services Index
 * 
 * Re-exports all Firebase service modules for clean imports.
 */

// Auth Service
export {
    getFirebaseAuth,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getCurrentUser,
    onAuthStateChange,
    waitForAuthReady
} from './auth'

// Firestore Service
export {
    getFirebaseFirestore,
    COLLECTIONS,
    createUserProfile,
    getUserProfile,
    updateUserProfile,
    createExpertProfile,
    getExpertProfile,
    createEnterpriseProfile,
    getEnterpriseProfile
} from './firestore'

// Storage Service
export { getFirebaseStorage } from './storage'
