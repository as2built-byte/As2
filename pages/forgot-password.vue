<script setup lang="ts">
/**
 * Forgot Password Page - As2Built
 * 
 * Allows users to request a password reset email
 */

definePageMeta({
    middleware: ['guest'],
    layout: false
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
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div class="w-full max-w-md">
            <!-- Back Link -->
            <NuxtLink 
                to="/login" 
                class="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors text-sm font-medium"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Retour à la connexion</span>
            </NuxtLink>

            <!-- Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-8">
                <!-- Logo -->
                <div class="flex justify-center mb-6">
                    <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                        <Icon name="heroicons:lock-open" class="w-10 h-10 text-blue-400" />
                    </div>
                </div>

                <!-- Title -->
                <div class="text-center mb-6">
                    <h1 class="text-2xl font-bold text-white mb-2">Mot de passe oublié ?</h1>
                    <p class="text-slate-400 text-sm">
                        Saisissez votre adresse email pour recevoir un lien de réinitialisation
                    </p>
                </div>

                <!-- Success Message -->
                <div v-if="message" class="mb-6 p-4 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
                    <Icon name="heroicons:check-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{{ message }}</span>
                </div>

                <!-- Error Alert -->
                <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 flex items-start gap-3">
                    <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{{ error }}</span>
                </div>

                <!-- Forgot Password Form -->
                <form v-if="!message" @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
                            Adresse email
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:envelope" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="email"
                                v-model="email"
                                type="email"
                                placeholder="exemple@email.com"
                                class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                :class="{ 'border-red-500': emailError }"
                                autocomplete="email"
                            />
                        </div>
                        <span v-if="emailError" class="text-red-400 text-sm mt-1">{{ emailError }}</span>
                    </div>

                    <!-- Submit Button -->
                    <button 
                        type="submit" 
                        class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        :disabled="isSubmitting"
                        :class="{ 'opacity-70 cursor-not-allowed': isSubmitting }"
                    >
                        <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>{{ isSubmitting ? 'Envoi...' : 'Envoyer le lien' }}</span>
                    </button>
                </form>

                <!-- Back to Login -->
                <div class="mt-6 text-center">
                    <NuxtLink to="/login" class="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                        <span>Retour à la connexion</span>
                    </NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Remove default browser margins */
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

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
