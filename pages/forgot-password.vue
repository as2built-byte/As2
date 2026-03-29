<script setup lang="ts">
/**
 * Forgot Password Page - As2Built
 * 
 * Allows users to request a password reset email
 */

definePageMeta({
    middleware: ['guest'],
})

// Firebase imports
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

const router = useRouter()

// Form state
const email = ref('')
const isSubmitting = ref(false)
const message = ref('')
const error = ref('')

// Form validation
const emailError = ref('')

function validateEmail(): boolean {
    emailError.value = ''
    
    if (!email.value.trim()) {
        emailError.value = 'L\'email est requis'
        return false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        emailError.value = 'Email invalide'
        return false
    }
    
    return true
}

// Handle form submission
async function handleSubmit() {
    error.value = ''
    message.value = ''
    
    if (!validateEmail()) {
        return
    }
    
    isSubmitting.value = true
    
    try {
        const auth = getAuth()
        await sendPasswordResetEmail(auth, email.value)
        message.value = 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.'
        email.value = ''
    } catch (err: any) {
        console.error('Password reset error:', err)
        
        // Handle specific Firebase errors
        switch (err.code) {
            case 'auth/user-not-found':
                error.value = 'Aucun compte associé à cet email'
                break
            case 'auth/invalid-email':
                error.value = 'Email invalide'
                break
            case 'auth/too-many-requests':
                error.value = 'Trop de tentatives. Veuillez réessayer plus tard.'
                break
            default:
                error.value = 'Une erreur est survenue. Veuillez réessayer.'
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card slide-up">
            <!-- Logo -->
            <div class="auth-logo">
                <img 
                    src="~/assets/images/logo.jpeg" 
                    alt="As2Built Logo"
                    class="w-full h-full object-cover"
                />
            </div>

            <!-- Title -->
            <h1 class="auth-title">Mot de passe oublié ?</h1>
            <p class="auth-subtitle">
                Saisissez votre adresse email pour recevoir un lien de réinitialisation
            </p>

            <!-- Success Message -->
            <div v-if="message" class="alert-success mb-6 fade-in">
                <Icon name="heroicons:check-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{{ message }}</span>
            </div>

            <!-- Error Alert -->
            <div v-if="error" class="alert-error mb-6 fade-in">
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{{ error }}</span>
            </div>

            <!-- Forgot Password Form -->
            <form v-if="!message" @submit.prevent="handleSubmit" class="auth-form">
                <!-- Email -->
                <div class="input-group">
                    <label for="email" class="input-label">Adresse email</label>
                    <div class="input-wrapper">
                        <Icon name="heroicons:envelope" class="input-icon" />
                        <input
                            id="email"
                            v-model="email"
                            type="email"
                            placeholder="exemple@email.com"
                            class="input input-with-icon"
                            :class="{ 'input-error': emailError }"
                            autocomplete="email"
                        />
                    </div>
                    <span v-if="emailError" class="input-error-message">
                        {{ emailError }}
                    </span>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    class="btn-primary btn-lg w-full mt-4"
                    :disabled="isSubmitting"
                >
                    <span v-if="isSubmitting" class="spinner-sm"></span>
                    <span>{{ isSubmitting ? 'Envoi...' : 'Envoyer le lien' }}</span>
                </button>
            </form>

            <!-- Back to Login -->
            <div class="mt-6 text-center">
                <NuxtLink to="/" class="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
                    <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                    Retour à la connexion
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.alert-success {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0.5rem;
    color: #15803d;
    font-size: 0.875rem;
}
</style>
