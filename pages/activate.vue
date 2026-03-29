<script setup lang="ts">
/**
 * Self-activation page for enterprise accounts
 * Users can activate their own account if it's pending
 */

const { profile, enterprise, user, fetchEnterprise } = useAuth()
const router = useRouter()

const loading = ref(false)
const message = ref('')
const error = ref('')

// Auto-activate if user is logged in
onMounted(async () => {
    if (!user.value?.uid) {
        error.value = 'Veuillez vous connecter d\'abord'
        return
    }
    
    if (profile.value?.role !== 'enterprise') {
        error.value = 'Cette page est réservée aux comptes entreprise'
        return
    }
    
    // Try to activate
    await activateMyAccount()
})

async function activateMyAccount() {
    if (!user.value?.uid) return
    
    loading.value = true
    error.value = ''
    message.value = ''
    
    try {
        const { getFirebaseFirestore } = await import('~/firebase/services/firestore')
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
        
        const db = getFirebaseFirestore()
        const enterpriseRef = doc(db, 'enterprises', user.value.uid)
        
        await updateDoc(enterpriseRef, {
            status: 'active',
            plan: 'free',
            updatedAt: serverTimestamp()
        })
        
        // Refresh enterprise data
        await fetchEnterprise()
        
        message.value = 'Votre compte a été activé avec succès ! Redirection...'
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            router.push('/dashboard')
        }, 2000)
        
    } catch (err: any) {
        // If document doesn't exist, we need to create it
        if (err.code === 'not-found') {
            error.value = 'Document entreprise introuvable. Veuillez contacter le support.'
        } else {
            error.value = `Erreur: ${err.message}`
        }
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card max-w-md text-center">
            <h1 class="text-2xl font-bold text-slate-800 mb-4">Activation du compte</h1>
            
            <div v-if="loading" class="py-8">
                <div class="spinner mb-4"></div>
                <p class="text-slate-600">Activation en cours...</p>
            </div>
            
            <div v-else-if="message" class="py-8">
                <Icon name="heroicons:check-circle" class="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <p class="text-emerald-600 font-medium">{{ message }}</p>
            </div>
            
            <div v-else-if="error" class="py-4">
                <div class="alert-error mb-4">{{ error }}</div>
                <button @click="activateMyAccount" class="btn-primary">
                    Réessayer l'activation
                </button>
            </div>
            
            <div v-else class="py-4">
                <p class="text-slate-600 mb-4">Cliquez pour activer votre compte :</p>
                <button @click="activateMyAccount" class="btn-primary btn-lg">
                    <Icon name="heroicons:bolt" class="w-5 h-5" />
                    <span>Activer mon compte</span>
                </button>
            </div>
        </div>
    </div>
</template>
