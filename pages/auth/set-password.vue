<script setup lang="ts">
/**
 * Set Password Page
 * 
 * Allows new members to set their password after email invitation
 */

definePageMeta({
    layout: 'auth',
    middleware: ['guest']
})

import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Form state
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

// Get token from URL
const setupToken = computed(() => route.query.token as string)

// Validation
const isValid = computed(() => {
    return (
        newPassword.value.length >= 6 &&
        newPassword.value === confirmPassword.value &&
        setupToken.value
    )
})

async function handleSetPassword() {
    if (!isValid.value) return

    loading.value = true
    error.value = ''
    success.value = ''

    try {
        // Import Firebase functions
        const { getFirebaseFirestore } = await import('~/firebase/index')
        const { doc, getDoc, deleteDoc, updateDoc } = await import('firebase/firestore')
        const { updatePassword } = await import('firebase/auth')
        
        // Get the setup token data from Firestore
        const db = getFirebaseFirestore()
        const setupDoc = await getDoc(doc(db, 'passwordSetups', setupToken.value))
        
        if (!setupDoc.exists()) {
            error.value = 'Lien de configuration invalide ou expiré.'
            return
        }
        
        const setupData = setupDoc.data()
        
        // Check if token has expired
        if (new Date() > setupData.expiresAt.toDate()) {
            error.value = 'Lien de configuration expiré. Veuillez demander un nouveau lien.'
            await deleteDoc(doc(db, 'passwordSetups', setupToken.value))
            return
        }
        
        // Update the user's password in Firebase Auth
        const { getAuth } = await import('firebase/auth')
        const auth = getAuth()
        
        // First, sign in with the temp password
        const { signInWithEmailAndPassword } = await import('firebase/auth')
        const userCredential = await signInWithEmailAndPassword(auth, setupData.email, setupData.tempPassword)
        
        // Update the password
        await updatePassword(userCredential.user, newPassword.value)
        
        // Clean up the setup token
        await deleteDoc(doc(db, 'passwordSetups', setupToken.value))
        
        // Sign out the user
        const { signOut } = await import('firebase/auth')
        await signOut(auth)
        
        success.value = 'Mot de passe configuré avec succès ! Redirection...'
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            router.push('/login')
        }, 2000)
        
    } catch (err: any) {
        console.error('Error setting password:', err)
        
        // Handle specific error codes
        switch (err.code) {
            case 'auth/expired-action-code':
                error.value = 'Le lien a expiré. Veuillez demander un nouveau lien.'
                break
            case 'auth/invalid-action-code':
                error.value = 'Lien invalide. Veuillez vérifier votre email.'
                break
            case 'auth/user-disabled':
                error.value = 'Ce compte a été désactivé.'
                break
            case 'auth/user-not-found':
                error.value = 'Compte introuvable.'
                break
            case 'auth/weak-password':
                error.value = 'Le mot de passe est trop faible. Choisissez au moins 6 caractères.'
                break
            default:
                error.value = 'Erreur lors de la configuration du mot de passe.'
        }
    } finally {
        loading.value = false
    }
}

// Check if setupToken is present
onMounted(() => {
    if (!setupToken.value) {
        error.value = 'Lien de configuration invalide. Veuillez vérifier votre email.'
    }
})
</script>

<template>
    <div class="auth-container">
        <div class="auth-card max-w-md">
            <div class="text-center mb-8">
                <h1 class="text-2xl font-bold text-slate-800 mb-2">
                    Configuration du mot de passe
                </h1>
                <p class="text-slate-600">
                    Bienvenue ! Configurez votre mot de passe pour accéder à votre compte.
                </p>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-start gap-3">
                    <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p class="text-sm text-red-800">{{ error }}</p>
                </div>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-start gap-3">
                    <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p class="text-sm text-green-800">{{ success }}</p>
                </div>
            </div>

            <!-- Form -->
            <form v-if="!success" @submit.prevent="handleSetPassword" class="space-y-6">
                <!-- New Password -->
                <div>
                    <label for="newPassword" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Nouveau mot de passe <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <input
                            id="newPassword"
                            v-model="newPassword"
                            :type="showPassword ? 'text' : 'password'"
                            required
                            minlength="6"
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder="Minimum 6 caractères"
                        />
                        <button
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            @click="showPassword = !showPassword"
                        >
                            <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                        </button>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Confirmer le mot de passe <span class="text-red-500">*</span>
                    </label>
                    <input
                        id="confirmPassword"
                        v-model="confirmPassword"
                        :type="showPassword ? 'text' : 'password'"
                        required
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Retapez le mot de passe"
                    />
                    <p
                        v-if="confirmPassword && newPassword !== confirmPassword"
                        class="text-xs text-red-500 mt-1"
                    >
                        Les mots de passe ne correspondent pas
                    </p>
                </div>

                <!-- Submit -->
                <div class="pt-2">
                    <button
                        type="submit"
                        :disabled="!isValid || loading"
                        class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Icon v-if="loading" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                        {{ loading ? 'Configuration...' : 'Configurer mon mot de passe' }}
                    </button>
                </div>
            </form>

            <!-- Back to login -->
            <div v-if="!success" class="mt-6 text-center">
                <NuxtLink
                    to="/login"
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    ← Retour à la connexion
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-container {
    @apply min-h-screen flex items-center justify-center bg-slate-50 px-4;
}

.auth-card {
    @apply bg-white rounded-xl shadow-lg p-8 w-full;
}
</style>
