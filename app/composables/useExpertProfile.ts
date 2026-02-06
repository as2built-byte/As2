/**
 * Expert Profile Composable
 * 
 * Provides functionality for experts to manage their profile:
 * - View and update personal information
 * - Upload/replace CV
 * - Toggle availability
 */

import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import {
    getUserProfile,
    updateUserProfile,
    getExpertProfile,
    updateExpertProfile
} from '~/firebase/services/firestore'
import { uploadExpertCV, deleteExpertCVByUrl } from '~/firebase/services/storage'
import type { UserProfile, ExpertProfile } from '~/types'

export function useExpertProfile() {
    const authStore = useAuthStore()

    // Form data
    const firstName = ref('')
    const lastName = ref('')
    const phone = ref('')
    const availability = ref(true)
    const cvFile = ref<File | null>(null)
    const currentCvUrl = ref<string | null>(null)

    // States
    const loading = ref(false)
    const saving = ref(false)
    const uploadingCV = ref(false)
    const error = ref<string | null>(null)
    const successMessage = ref<string | null>(null)

    /**
     * Load expert profile data
     */
    async function loadProfile(): Promise<void> {
        if (!authStore.user?.uid) return

        loading.value = true
        error.value = null

        try {
            // Load user profile
            const userProfile = await getUserProfile(authStore.user.uid)
            if (userProfile) {
                firstName.value = userProfile.firstName
                lastName.value = userProfile.lastName
                phone.value = userProfile.phone
            }

            // Load expert profile
            const expertProfile = await getExpertProfile(authStore.user.uid)
            if (expertProfile) {
                availability.value = expertProfile.availability
                currentCvUrl.value = expertProfile.cvUrl
            }
        } catch (err) {
            console.error('Error loading profile:', err)
            error.value = 'Erreur lors du chargement du profil'
        } finally {
            loading.value = false
        }
    }

    /**
     * Validate phone number format
     */
    function validatePhone(phoneNumber: string): boolean {
        // Phone must be in format +213XXXXXXXXX (10 digits after +213)
        const phoneRegex = /^\+213\d{9}$/
        return phoneRegex.test(phoneNumber)
    }

    /**
     * Validate CV file
     */
    function validateCVFile(file: File | null): boolean {
        if (!file) return true // CV is optional for update

        // Check file type
        if (file.type !== 'application/pdf') {
            error.value = 'Le CV doit être un fichier PDF'
            return false
        }

        // Check file size (5 MB max)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            error.value = 'Le CV ne doit pas dépasser 5 MB'
            return false
        }

        return true
    }

    /**
     * Update profile information
     */
    async function updateProfile(): Promise<boolean> {
        if (!authStore.user?.uid) return false

        saving.value = true
        error.value = null
        successMessage.value = null

        try {
            // Validate phone
            if (!validatePhone(phone.value)) {
                error.value = 'Format de téléphone invalide. Utilisez +213XXXXXXXXX'
                return false
            }

            // Validate CV if provided
            if (!validateCVFile(cvFile.value)) {
                return false
            }

            // Update user profile (firstName, lastName, phone)
            await updateUserProfile(authStore.user.uid, {
                firstName: firstName.value,
                lastName: lastName.value,
                phone: phone.value,
            })

            // Update expert profile (availability)
            await updateExpertProfile(authStore.user.uid, {
                availability: availability.value,
            })

            // Upload new CV if provided
            if (cvFile.value) {
                uploadingCV.value = true

                // Delete old CV if exists
                if (currentCvUrl.value) {
                    await deleteExpertCVByUrl(currentCvUrl.value)
                }

                // Upload new CV
                const newCvUrl = await uploadExpertCV(authStore.user.uid, cvFile.value)

                // Update expert profile with new CV URL
                await updateExpertProfile(authStore.user.uid, {
                    cvUrl: newCvUrl,
                })

                currentCvUrl.value = newCvUrl
                cvFile.value = null // Reset file input
                uploadingCV.value = false
            }

            // Refresh auth store profile
            await authStore.fetchProfile()

            successMessage.value = 'Profil mis à jour avec succès'
            return true
        } catch (err) {
            console.error('Error updating profile:', err)
            error.value = 'Erreur lors de la mise à jour du profil'
            return false
        } finally {
            saving.value = false
        }
    }

    /**
     * Clear messages
     */
    function clearMessages(): void {
        error.value = null
        successMessage.value = null
    }

    return {
        // Form data
        firstName,
        lastName,
        phone,
        availability,
        cvFile,
        currentCvUrl,

        // States
        loading,
        saving,
        uploadingCV,
        error,
        successMessage,

        // Functions
        loadProfile,
        updateProfile,
        clearMessages,
    }
}
