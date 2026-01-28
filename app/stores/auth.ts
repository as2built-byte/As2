/**
 * Auth Store - Pinia
 * 
 * Manages authentication state for As2Built
 */

import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
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
    onAuthStateChange
} from '~/firebase/services/auth'
import {
    getUserProfile,
    createUserProfile,
    createExpertProfile,
    createEnterpriseProfile,
    isPhoneRegistered
} from '~/firebase/services/firestore'
import { uploadExpertCV } from '~/firebase/services/storage'

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        profile: null,
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
            } catch (error) {
                console.error('Error fetching profile:', error)
                this.error = 'Erreur lors du chargement du profil'
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
                    status: 'pending',
                })

                // Create expert profile with CV URL
                await createExpertProfile(uid, {
                    cvUrl,
                })

                // Sign out after registration (user needs approval)
                await firebaseSignOut()
                this.user = null
                this.profile = null

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
                    status: 'pending',
                })

                // Create enterprise profile (only companyName)
                await createEnterpriseProfile(uid, {
                    companyName: form.companyName,
                })

                // Sign out after registration (user needs approval)
                await firebaseSignOut()
                this.user = null
                this.profile = null

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
