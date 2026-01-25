/**
 * Firebase Authentication Service
 * 
 * Provides authentication functionality for As2Built.
 * Supports: Entreprises, BIM Experts, and Back Office Admins
 */

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    type Auth,
    type User,
    type UserCredential,
    type Unsubscribe
} from 'firebase/auth'
import { getFirebaseApp } from '../index'

let authInstance: Auth | null = null

/**
 * Get the Firebase Auth instance
 * Lazy initialization ensures app is ready before accessing auth
 */
export function getFirebaseAuth(): Auth {
    if (authInstance) {
        return authInstance
    }

    const app = getFirebaseApp()
    authInstance = getAuth(app)
    return authInstance
}

// ========================================
// Authentication Functions
// ========================================

/**
 * Sign in with email and password
 * @param email User email
 * @param password User password
 * @returns UserCredential on success
 */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    return signInWithEmailAndPassword(auth, email, password)
}

/**
 * Create a new user with email and password
 * @param email User email
 * @param password User password
 * @returns UserCredential on success
 */
export async function signUpWithEmail(
    email: string,
    password: string
): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    return createUserWithEmailAndPassword(auth, email, password)
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    const auth = getFirebaseAuth()
    return firebaseSignOut(auth)
}

/**
 * Get the currently authenticated user
 * @returns Current user or null
 */
export function getCurrentUser(): User | null {
    const auth = getFirebaseAuth()
    return auth.currentUser
}

/**
 * Subscribe to auth state changes
 * @param callback Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
    callback: (user: User | null) => void
): Unsubscribe {
    const auth = getFirebaseAuth()
    return firebaseOnAuthStateChanged(auth, callback)
}

/**
 * Wait for the initial auth state to be determined
 * Useful for SSR/hydration scenarios
 */
export function waitForAuthReady(): Promise<User | null> {
    return new Promise((resolve) => {
        const auth = getFirebaseAuth()
        const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
            unsubscribe()
            resolve(user)
        })
    })
}