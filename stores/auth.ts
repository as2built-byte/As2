/**
 * Auth Store - Pinia
 * 
 * Manages authentication state for As2Built
 */

import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import { 
    type Firestore,
    collection, 
    addDoc, 
    Timestamp 
} from 'firebase/firestore'
import type {
    AuthState,
    UserProfile,
    ExpertRegistrationForm,
    EnterpriseRegistrationForm
} from '~/types'
import {
    signInWithEmail,
    signUpWithEmail,
    signOut as firebaseSignOut,
    onAuthStateChange,
    signInWithGoogle,
    signInAnonymouslyUser,
    initRecaptchaVerifier,
    sendPhoneVerificationCode,
    confirmPhoneCode,
    clearRecaptchaVerifier,
    linkAnonymousWithEmail,
    linkAnonymousWithGoogle,
    sendVerificationEmail,
    sendPasswordResetEmailToUser,
    verifyAndUpdateEmail,
    isEmailVerified
} from '~/firebase/services/auth'
import {
    getUserProfile,
    createUserProfile,
    createExpertProfile,
    createEnterpriseProfile,
    getEnterpriseProfile,
    isPhoneRegistered
} from '~/firebase/services/firestore'
import { uploadExpertCV } from '~/firebase/services/storage'

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        profile: null,
        enterprise: null,
        loading: true,
        error: null,
    }),

    getters: {
        /** Check if user is authenticated */
        isAuthenticated: (state): boolean => state.user !== null,

        /** Get user role */
        userRole: (state): string | null => state.profile?.role || null,

        /** Check if account is pending approval */
        isPending: (state): boolean => state.profile?.status === 'pending',

        /** Check if account is active */
        isActive: (state): boolean => state.profile?.status === 'active',

        /** Check if user is an admin */
        isAdmin: (state): boolean => state.profile?.role === 'admin',

        /** Check if user is an expert */
        isExpert: (state): boolean => state.profile?.role === 'expert',

        /** Check if user is an enterprise */
        isEnterprise: (state): boolean => state.profile?.role === 'enterprise',

        /** Check if user is an enterprise owner (gérant) - enterprise without enterpriseOwnerId */
        isGerant: (state): boolean => state.profile?.role === 'enterprise' && !state.profile?.enterpriseOwnerId,

        /** Check if user is an enterprise member (project manager) - enterprise with enterpriseOwnerId */
        isMember: (state): boolean => state.profile?.role === 'enterprise' && !!state.profile?.enterpriseOwnerId,

        /** Get full name from firstName and lastName */
        fullName: (state): string => {
            if (!state.profile) return ''
            return `${state.profile.firstName} ${state.profile.lastName}`.trim()
        },
    },

    actions: {
        /**
         * Initialize auth state listener
         * Call this on app mount
         */
        initAuthListener() {
            this.loading = true

            onAuthStateChange(async (firebaseUser: User | null) => {
                if (firebaseUser) {
                    this.user = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                    }

                    // Fetch user profile from Firestore
                    await this.fetchProfile()
                } else {
                    this.user = null
                    this.profile = null
                }

                this.loading = false
            })
        },

        /**
         * Fetch user profile from Firestore
         */
        async fetchProfile() {
            if (!this.user?.uid) return

            try {
                const profile = await getUserProfile(this.user.uid)
                this.profile = profile

                // If gérant, also fetch enterprise data
                if (profile?.role === 'enterprise' && !profile.enterpriseOwnerId) {
                    await this.fetchEnterprise()
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
                this.error = 'Erreur lors du chargement du profil'
            }
        },

        /**
         * Fetch enterprise data for gérant
         */
        async fetchEnterprise() {
            if (!this.user?.uid) return

            try {
                const enterprise = await getEnterpriseProfile(this.user.uid)
                this.enterprise = enterprise
            } catch (error) {
                console.error('Error fetching enterprise:', error)
            }
        },

        /**
         * Login with email and password
         */
        async login(email: string, password: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await signInWithEmail(email, password)
                this.user = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                }

                await this.fetchProfile()
                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }

                // French error messages
                switch (firebaseError.code) {
                    case 'auth/invalid-credential':
                    case 'auth/wrong-password':
                    case 'auth/user-not-found':
                        this.error = 'Email ou mot de passe incorrect'
                        break
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/user-disabled':
                        this.error = 'Ce compte a été désactivé'
                        break
                    case 'auth/too-many-requests':
                        this.error = 'Trop de tentatives. Veuillez réessayer plus tard'
                        break
                    default:
                        this.error = 'Une erreur est survenue lors de la connexion'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Register a new expert
         */
        async registerExpert(form: ExpertRegistrationForm): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                // Check if phone is already registered
                const phoneExists = await isPhoneRegistered(form.phone)
                if (phoneExists) {
                    this.error = 'Ce numéro de téléphone est déjà utilisé'
                    return false
                }

                // Create Firebase Auth user
                const credential = await signUpWithEmail(form.email, form.password)
                const uid = credential.user.uid

                // Upload CV if provided
                let cvUrl: string | null = null
                if (form.cvFile) {
                    cvUrl = await uploadExpertCV(uid, form.cvFile)
                }

                // Create user profile in Firestore (no displayName)
                await createUserProfile(uid, {
                    email: form.email,
                    firstName: form.firstName,
                    lastName: form.lastName,
                    phone: form.phone,
                    role: 'expert',
                    status: 'active',
                })

                // Create expert profile with CV URL
                await createExpertProfile(uid, {
                    cvUrl,
                })

                // Send email verification
                try {
                    await sendVerificationEmail()
                } catch (verifyError) {
                    console.error('Error sending verification email:', verifyError)
                }

                // Keep user logged in (account is active immediately)
                // Load the profile data
                await this.fetchProfile()

                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }

                switch (firebaseError.code) {
                    case 'auth/email-already-in-use':
                        this.error = 'Cette adresse email est déjà utilisée'
                        break
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/weak-password':
                        this.error = 'Le mot de passe doit contenir au moins 6 caractères'
                        break
                    default:
                        this.error = 'Une erreur est survenue lors de l\'inscription'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Register a new enterprise
         */
        async registerEnterprise(form: EnterpriseRegistrationForm): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                // Check if phone is already registered
                const phoneExists = await isPhoneRegistered(form.phone)
                if (phoneExists) {
                    this.error = 'Ce numéro de téléphone est déjà utilisé'
                    return false
                }

                // Create Firebase Auth user
                const credential = await signUpWithEmail(form.email, form.password)
                const uid = credential.user.uid

                // Create user profile in Firestore (no displayName)
                await createUserProfile(uid, {
                    email: form.email,
                    firstName: form.firstName,
                    lastName: form.lastName,
                    phone: form.phone,
                    role: 'enterprise',
                    status: 'active',
                })

                // Create enterprise profile (only companyName)
                await createEnterpriseProfile(uid, {
                    companyName: form.companyName,
                })

                // Send email verification
                try {
                    await sendVerificationEmail()
                } catch (verifyError) {
                    console.error('Error sending verification email:', verifyError)
                }

                // Keep user logged in (account is active immediately)
                // Load the profile data
                await this.fetchProfile()
                await this.fetchEnterprise()

                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }

                switch (firebaseError.code) {
                    case 'auth/email-already-in-use':
                        this.error = 'Cette adresse email est déjà utilisée'
                        break
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/weak-password':
                        this.error = 'Le mot de passe doit contenir au moins 6 caractères'
                        break
                    default:
                        this.error = 'Une erreur est survenue lors de l\'inscription'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Login with Google
         */
        async loginWithGoogle(): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await signInWithGoogle()
                this.user = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                }

                // Check if profile exists, if not create it
                await this.fetchProfile()
                if (!this.profile) {
                    // Create new profile for Google user
                    await createUserProfile(this.user.uid, {
                        email: this.user.email,
                        firstName: credential.user.displayName?.split(' ')[0] || '',
                        lastName: credential.user.displayName?.split(' ').slice(1).join(' ') || '',
                        phone: credential.user.phoneNumber || '',
                        role: 'enterprise', // Default role
                        status: 'pending',
                        authProvider: 'google'
                    })
                    await this.fetchProfile()
                }

                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/popup-closed-by-user':
                        this.error = 'Fenêtre fermée avant la connexion'
                        break
                    case 'auth/popup-blocked':
                        this.error = 'La fenêtre popup a été bloquée'
                        break
                    case 'auth/account-exists-with-different-credential':
                        this.error = 'Un compte existe déjà avec cet email'
                        break
                    default:
                        this.error = 'Erreur lors de la connexion avec Google'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Login anonymously (Guest)
         */
        async loginAnonymous(): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await signInAnonymouslyUser()
                this.user = {
                    uid: credential.user.uid,
                    email: null,
                }

                // Create temporary profile for anonymous user
                await createUserProfile(credential.user.uid, {
                    email: null,
                    firstName: 'Invité',
                    lastName: '',
                    phone: '',
                    role: 'guest',
                    status: 'active',
                    authProvider: 'anonymous',
                    isAnonymous: true
                })

                await this.fetchProfile()
                return true
            } catch (error) {
                console.error('Anonymous login error:', error)
                this.error = 'Erreur lors de la connexion anonyme'
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Send verification email after registration
         */
        async sendVerificationEmail(): Promise<boolean> {
            try {
                await sendVerificationEmail()
                return true
            } catch (error) {
                console.error('Error sending verification email:', error)
                this.error = 'Erreur lors de l\'envoi de l\'email de vérification'
                return false
            }
        },

        /**
         * Convert anonymous account to permanent account with email
         */
        async convertAnonymousToEmail(email: string, password: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await linkAnonymousWithEmail(email, password)
                this.user = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                }

                // Update profile
                await this.fetchProfile()
                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/email-already-in-use':
                        this.error = 'Cette adresse email est déjà utilisée'
                        break
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/weak-password':
                        this.error = 'Le mot de passe doit contenir au moins 6 caractères'
                        break
                    default:
                        this.error = 'Erreur lors de la conversion du compte'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Convert anonymous account to Google account
         */
        async convertAnonymousToGoogle(): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await linkAnonymousWithGoogle()
                this.user = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                }

                await this.fetchProfile()
                return true
            } catch (error) {
                console.error('Error converting to Google account:', error)
                this.error = 'Erreur lors de la conversion du compte'
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Initialize phone authentication recaptcha
         */
        initPhoneRecaptcha(containerId: string) {
            return initRecaptchaVerifier(containerId)
        },

        /**
         * Send SMS verification code
         */
        async sendPhoneCode(phoneNumber: string) {
            try {
                const confirmationResult = await sendPhoneVerificationCode(phoneNumber)
                return confirmationResult
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/invalid-phone-number':
                        this.error = 'Numéro de téléphone invalide'
                        break
                    case 'auth/too-many-requests':
                        this.error = 'Trop de tentatives. Veuillez réessayer plus tard'
                        break
                    default:
                        this.error = 'Erreur lors de l\'envoi du code SMS'
                }
                throw error
            }
        },

        /**
         * Verify SMS code and sign in
         */
        async verifyPhoneCode(confirmationResult: any, verificationCode: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const credential = await confirmPhoneCode(confirmationResult, verificationCode)
                this.user = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                }

                // Check if profile exists, if not create it
                await this.fetchProfile()
                if (!this.profile) {
                    await createUserProfile(this.user.uid, {
                        email: this.user.email,
                        firstName: '',
                        lastName: '',
                        phone: credential.user.phoneNumber || '',
                        role: 'enterprise',
                        status: 'pending',
                        authProvider: 'phone'
                    })
                    await this.fetchProfile()
                }

                // Clear recaptcha
                clearRecaptchaVerifier()
                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/invalid-verification-code':
                        this.error = 'Code de vérification invalide'
                        break
                    case 'auth/code-expired':
                        this.error = 'Code expiré'
                        break
                    default:
                        this.error = 'Erreur lors de la vérification du code'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Clear recaptcha verifier
         */
        clearPhoneRecaptcha() {
            clearRecaptchaVerifier()
        },

        /**
         * Send password reset email
         * @param email User email address
         * @returns true on success, false on error
         */
        async sendPasswordReset(email: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await sendPasswordResetEmailToUser(email)
                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/user-not-found':
                        this.error = 'Aucun compte trouvé avec cette adresse email'
                        break
                    default:
                        this.error = 'Erreur lors de l\'envoi de l\'email de réinitialisation'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Send verification email to new address before updating
         * This sends a verification email to the new address
         * @param newEmail The new email address
         * @returns true on success, false on error
         */
        async updateEmail(newEmail: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await verifyAndUpdateEmail(newEmail)
                return true
            } catch (error: unknown) {
                const firebaseError = error as { code?: string }
                switch (firebaseError.code) {
                    case 'auth/invalid-email':
                        this.error = 'Adresse email invalide'
                        break
                    case 'auth/email-already-in-use':
                        this.error = 'Cette adresse email est déjà utilisée'
                        break
                    case 'auth/requires-recent-login':
                        this.error = 'Veuillez vous reconnecter pour changer votre email'
                        break
                    default:
                        this.error = 'Erreur lors de la mise à jour de l\'email'
                }
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Check if user email is verified
         * @returns true if email is verified
         */
        checkEmailVerified(): boolean {
            return isEmailVerified()
        },

        /**
         * Send MFA activation notification email
         * Triggered when user enables SMS authentication
         * @param phoneNumber The phone number that was enrolled
         * @returns true on success, false on error
         */
        async sendMFAActivationEmail(phoneNumber: string): Promise<boolean> {
            try {
                // This creates an in-app notification that can trigger an email
                // via Firebase Functions or similar backend trigger
                const { $firebaseFirestore } = useNuxtApp()
                const db = $firebaseFirestore as Firestore

                const notificationsRef = collection(db, 'notifications')
                await addDoc(notificationsRef, {
                    type: 'mfa_enabled',
                    title: 'Authentification à deux facteurs activée',
                    message: `L'authentification par SMS a été activée pour le numéro ${phoneNumber}`,
                    targetUserId: this.user?.uid,
                    targetRole: this.profile?.role,
                    data: {
                        phoneNumber,
                        method: 'sms',
                        enabledAt: new Date().toISOString()
                    },
                    read: false,
                    createdAt: Timestamp.now(),
                    createdBy: this.user?.uid || 'system'
                })

                return true
            } catch (error) {
                console.error('Error sending MFA activation notification:', error)
                return false
            }
        },

        /**
         * Logout the current user
         */
        async logout(): Promise<void> {
            this.loading = true

            try {
                await firebaseSignOut()
                this.user = null
                this.profile = null
            } catch (error) {
                console.error('Error during logout:', error)
                this.error = 'Erreur lors de la déconnexion'
            } finally {
                this.loading = false
            }
        },

        /**
         * Clear any errors
         */
        clearError() {
            this.error = null
        },
    },
})
