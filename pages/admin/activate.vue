<script setup lang="ts">
/**
 * Admin Tool - Activate Enterprise Account
 * 
 * Usage: Place this component in a page temporarily to activate an account
 * Access it, enter the UID, click activate
 */

const uid = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

async function activateAccount() {
    if (!uid.value) {
        error.value = 'Veuillez entrer un UID'
        return
    }
    
    loading.value = true
    error.value = ''
    message.value = ''
    
    try {
        const { getFirebaseFirestore } = await import('~/firebase/services/firestore')
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
        
        const db = getFirebaseFirestore()
        const enterpriseRef = doc(db, 'enterprises', uid.value)
        
        await updateDoc(enterpriseRef, {
            status: 'active',
            plan: 'free',
            updatedAt: serverTimestamp()
        })
        
        message.value = `Compte ${uid.value} activé avec succès !`
        uid.value = ''
    } catch (err) {
        error.value = `Erreur: ${err}`
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card max-w-md">
            <h1 class="text-2xl font-bold text-slate-800 mb-6">Activer un compte entreprise</h1>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">UID du compte</label>
                    <input 
                        v-model="uid" 
                        type="text" 
                        placeholder="Collez l'UID ici"
                        class="form-input"
                    />
                </div>
                
                <button 
                    @click="activateAccount" 
                    class="btn-primary w-full"
                    :disabled="loading"
                >
                    <span v-if="loading" class="spinner-sm"></span>
                    <span v-else>Activer le compte</span>
                </button>
            </div>
            
            <div v-if="message" class="alert-success mt-4">
                {{ message }}
            </div>
            
            <div v-if="error" class="alert-error mt-4">
                {{ error }}
            </div>
            
            <div class="mt-6 p-4 bg-slate-100 rounded-lg text-sm text-slate-600">
                <p class="font-medium mb-2">Comment trouver l'UID :</p>
                <ol class="list-decimal list-inside space-y-1">
                    <li>Firebase Console → Authentication</li>
                    <li>Trouvez l'email a.atman@kmark.it</li>
                    <li>Copiez l'UID (chaîne de caractères)</li>
                    <li>Collez-la ci-dessus</li>
                </ol>
            </div>
        </div>
    </div>
</template>
