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
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    linkWithCredential,
    EmailAuthProvider,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    sendEmailVerification,
    verifyBeforeUpdateEmail,
    sendPasswordResetEmail,
    confirmPasswordReset as firebaseConfirmPasswordReset,
    type Auth,
    type User,
    type UserCredential,
    type Unsubscribe,
    type ConfirmationResult
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
 * Create a new Firebase Auth user WITHOUT signing in as that user.
 * Uses a temporary secondary Firebase app instance to avoid disrupting the current session.
 * Used by the gérant to create member accounts.
 */
export async function createUserWithoutSignIn(
    email: string,
    password: string
): Promise<string> {
    const { initializeApp, deleteApp } = await import('firebase/app')
    const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth')
    const { getFirebaseConfig } = await import('../config')

    const secondaryApp = initializeApp(getFirebaseConfig(), 'secondary-' + Date.now())
    try {
        const secondaryAuth = getAuth(secondaryApp)
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        return credential.user.uid
    } finally {
        await deleteApp(secondaryApp)
    }
}

export function waitForAuthReady(): Promise<User | null> {
    return new Promise((resolve) => {
        const auth = getFirebaseAuth()
        const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
            unsubscribe()
            resolve(user)
        })
    })
}

// ========================================
// Google Authentication
// ========================================

/**
 * Sign in with Google using popup
 * @returns UserCredential on success
 */
export async function signInWithGoogle(): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    return signInWithPopup(auth, provider)
}

// ========================================
// Phone (SMS) Authentication
// ========================================

let recaptchaVerifier: RecaptchaVerifier | null = null

/**
 * Initialize RecaptchaVerifier for phone authentication
 * @param containerId HTML element ID where recaptcha will be rendered
 * @returns RecaptchaVerifier instance
 */
export function initRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    const auth = getFirebaseAuth()
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'normal',
        callback: () => {
            // reCAPTCHA solved - allow signInWithPhoneNumber
        },
        'expired-callback': () => {
            // Response expired - ask user to solve reCAPTCHA again
            recaptchaVerifier?.clear()
        }
    })
    return recaptchaVerifier
}

/**
 * Send SMS verification code
 * @param phoneNumber Phone number with country code (e.g., +33612345678)
 * @returns ConfirmationResult to verify code
 */
export async function sendPhoneVerificationCode(phoneNumber: string): Promise<ConfirmationResult> {
    const auth = getFirebaseAuth()
    if (!recaptchaVerifier) {
        throw new Error('RecaptchaVerifier not initialized')
    }
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
}

/**
 * Confirm SMS verification code
 * @param confirmationResult Result from sendPhoneVerificationCode
 * @param verificationCode SMS code entered by user
 * @returns UserCredential on success
 */
export async function confirmPhoneCode(
    confirmationResult: ConfirmationResult,
    verificationCode: string
): Promise<UserCredential> {
    return confirmationResult.confirm(verificationCode)
}

/**
 * Clear recaptcha verifier
 */
export function clearRecaptchaVerifier(): void {
    recaptchaVerifier?.clear()
    recaptchaVerifier = null
}

// ========================================
// Email Verification/Validation
// ========================================

/**
 * Check if email format is valid
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Check if email already exists in Firebase Auth
 * Uses fetchSignInMethodsForEmail (deprecated) alternative with signInWithEmailAndPassword trick
 * Note: This creates a dummy call to check existence without actually signing in
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    const auth = getFirebaseAuth()
    
    try {
        // Try to send password reset - this will fail if email doesn't exist
        // But we can't use this client-side for security reasons
        // Alternative: Try to sign in with a wrong password
        await signInWithEmailAndPassword(auth, email, 'dummy_wrong_password_12345')
        // If we get here, password was correct (unlikely), so email exists
        return true
    } catch (error: any) {
        // Check the error code
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            // Email doesn't exist
            return false
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-password') {
            // Email exists but password is wrong
            return true
        }
        // For other errors, assume email might exist to be safe
        return true
    }
}

/**
 * Validate email format and check if it looks like a real email
 * This is a client-side validation only - doesn't check Firebase
 */
export function validateEmailFormat(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim() === '') {
        return { valid: false, error: 'L\'email est requis' }
    }
    
    if (!isValidEmail(email)) {
        return { valid: false, error: 'Format d\'email invalide' }
    }
    
    // Check for obviously fake domains
    const fakeDomains = ['test.com', 'fake.com', 'example.com', 'tempmail.com', 'yopmail.com', 'mailinator.com']
    const domain = email.split('@')[1]?.toLowerCase()
    
    if (fakeDomains.includes(domain || '')) {
        return { valid: false, error: 'Veuillez utiliser une adresse email professionnelle' }
    }
    
    return { valid: true }
}

/**
 * Sign in anonymously
 * @returns UserCredential on success
 */
export async function signInAnonymouslyUser(): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    return signInAnonymously(auth)
}

/**
 * Check if user is anonymous
 * @returns true if user is anonymous
 */
export function isUserAnonymous(): boolean {
    const auth = getFirebaseAuth()
    return auth.currentUser?.isAnonymous ?? false
}

/**
 * Link anonymous account with email/password
 * @param email User email
 * @param password User password
 * @returns UserCredential on success
 */
export async function linkAnonymousWithEmail(
    email: string,
    password: string
): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user || !user.isAnonymous) {
        throw new Error('No anonymous user to link')
    }
    const credential = EmailAuthProvider.credential(email, password)
    return linkWithCredential(user, credential)
}

/**
 * Link anonymous account with Google
 * @returns UserCredential on success
 */
export async function linkAnonymousWithGoogle(): Promise<UserCredential> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user || !user.isAnonymous) {
        throw new Error('No anonymous user to link')
    }
    const provider = new GoogleAuthProvider()
    const credential = GoogleAuthProvider.credentialFromResult(
        await signInWithPopup(auth, provider)
    )
    if (!credential) {
        throw new Error('Failed to get Google credential')
    }
    return linkWithCredential(user, credential)
}

// ========================================
// Email Verification
// ========================================

/**
 * Send email verification to current user
 */
export async function sendVerificationEmail(): Promise<void> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) {
        throw new Error('No user is signed in')
    }
    return sendEmailVerification(user)
}

/**
 * Check if user email is verified
 * @returns true if email is verified
 */
export function isEmailVerified(): boolean {
    const auth = getFirebaseAuth()
    return auth.currentUser?.emailVerified ?? false
}

// ========================================
// Email Update (Secure)
// ========================================

/**
 * Send verification email to new address before updating
 * This is the secure way to change email in Firebase
 * @param newEmail The new email address to verify and update to
 * @param actionCodeSettings Optional settings for the verification email
 */
export async function verifyAndUpdateEmail(
    newEmail: string,
    actionCodeSettings?: { url: string; handleCodeInApp: boolean }
): Promise<void> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) {
        throw new Error('No user is signed in')
    }
    
    // Use default redirect URL if not provided
    const settings = actionCodeSettings || {
        url: 'https://as2-54b34.firebaseapp.com/__/auth/action',
        handleCodeInApp: true
    }
    
    return verifyBeforeUpdateEmail(user, newEmail, settings)
}

// ========================================
// Password Reset
// ========================================

/**
 * Send password reset email
 * @param email User email address
 * @param actionCodeSettings Optional settings for the reset email
 */
export async function sendPasswordResetEmailToUser(
    email: string,
    actionCodeSettings?: { url: string; handleCodeInApp: boolean }
): Promise<void> {
    const auth = getFirebaseAuth()
    
    // Use default redirect URL if not provided
    const settings = actionCodeSettings || {
        url: 'https://as2-54b34.firebaseapp.com/__/auth/action',
        handleCodeInApp: true
    }
    
    return sendPasswordResetEmail(auth, email, settings)
}

/**
 * Confirm password reset with oobCode
 * @param oobCode One-time code from password reset email
 * @param newPassword New password to set
 */
export async function confirmPasswordReset(
    oobCode: string,
    newPassword: string
): Promise<void> {
    const auth = getFirebaseAuth()
    return firebaseConfirmPasswordReset(auth, oobCode, newPassword)
}