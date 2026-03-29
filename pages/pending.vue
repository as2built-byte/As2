<script setup lang="ts">
/**
 * Pending Approval Page / Email Confirmation Page
 * 
 * For enterprises and experts: Shows email confirmation success and auto-redirects to dashboard
 */

const { profile, logout, loading, enterprise } = useAuth()
const router = useRouter()

// Auto-redirect active users to dashboard after short delay
onMounted(() => {
  // If user with active status, redirect to dashboard
  if (profile.value?.status === 'active') {
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000) // 3 seconds to read the confirmation message
  }
})

// Format date for display
const formattedDate = computed(() => {
    if (!profile.value?.createdAt) return 'N/A'
    
    const date = profile.value.createdAt instanceof Date 
        ? profile.value.createdAt 
        : new Date(profile.value.createdAt)
    
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
})

// Get role display name
const roleDisplayName = computed(() => {
    switch (profile.value?.role) {
        case 'expert':
            return 'Expert BIM'
        case 'enterprise':
            return 'Entreprise'
        default:
            return profile.value?.role || 'N/A'
    }
})

// Check if user is enterprise or expert (both get immediate access now)
const isEnterprise = computed(() => profile.value?.role === 'enterprise')
const isExpert = computed(() => profile.value?.role === 'expert')
const hasImmediateAccess = computed(() => isEnterprise.value || isExpert.value)

// Handle logout
async function handleLogout() {
    await logout()
    router.push('/')
}

// Go to dashboard
function goToDashboard() {
    router.push('/dashboard')
}
</script>

<template>
    <div class="pending-container">
        <div class="pending-card slide-up">
            <!-- Success Icon (Enterprise or Expert) -->
            <div v-if="hasImmediateAccess" class="pending-icon bg-green-100">
                <Icon name="heroicons:check-circle" class="w-12 h-12 text-green-600" />
            </div>
            <!-- Pending Icon -->
            <div v-else class="pending-icon">
                <Icon name="heroicons:clock" class="w-12 h-12" />
            </div>

            <!-- Title -->
            <h1 v-if="hasImmediateAccess" class="pending-title text-green-700">
                Compte créé avec succès !
            </h1>
            <h1 v-else class="pending-title">
                Compte en attente de validation
            </h1>

            <!-- Message for Enterprise or Expert (Immediate Access) -->
            <div v-if="hasImmediateAccess" class="text-center">
                <p class="pending-message">
                    Votre compte {{ isEnterprise ? 'entreprise' : 'expert' }} a été créé avec succès. 
                    Un email de confirmation vous a été envoyé.
                </p>
                <div v-if="isEnterprise" class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <Icon name="heroicons:information-circle" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div class="text-left">
                            <p class="text-sm text-green-700 font-medium mb-1">
                                Vous bénéficiez du plan GRATUIT
                            </p>
                            <p class="text-sm text-green-600">
                                1 projet, 500MB de stockage, 2 utilisateurs maximum.
                                Vous pouvez commencer immédiatement et mettre à niveau votre plan à tout moment.
                            </p>
                        </div>
                    </div>
                </div>
                <div v-else class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div class="text-left">
                            <p class="text-sm text-blue-700 font-medium mb-1">
                                Votre compte expert est actif
                            </p>
                            <p class="text-sm text-blue-600">
                                Vous pouvez maintenant accéder à votre espace et commencer à travailler sur des projets.
                            </p>
                        </div>
                    </div>
                </div>
                <p class="text-sm text-slate-500 mb-6">
                    Redirection vers votre espace dans quelques secondes...
                </p>
                <button 
                    @click="goToDashboard"
                    class="btn-primary w-full"
                >
                    <Icon name="heroicons:arrow-right" class="w-5 h-5" />
                    <span>Accéder à mon espace maintenant</span>
                </button>
            </div>

            <!-- Message for Expert (Pending) -->
            <template v-else>
                <p class="pending-message">
                    Votre compte a été créé avec succès et est actuellement en cours d'examen 
                    par notre équipe d'administration. Vous pouvez vous déconnecter et vous 
                    reconnecter une fois votre compte activé.
                </p>

                <!-- Account Info -->
                <div class="pending-info">
                    <div class="pending-info-row">
                        <span class="pending-info-label">Type de compte</span>
                        <span class="pending-info-value">{{ roleDisplayName }}</span>
                    </div>
                    <div class="pending-info-row">
                        <span class="pending-info-label">Email</span>
                        <span class="pending-info-value">{{ profile?.email || 'N/A' }}</span>
                    </div>
                    <div class="pending-info-row">
                        <span class="pending-info-label">Date d'inscription</span>
                        <span class="pending-info-value">{{ formattedDate }}</span>
                    </div>
                    <div class="pending-info-row">
                        <span class="pending-info-label">Statut</span>
                        <span class="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            En attente
                        </span>
                    </div>
                </div>

                <!-- Info Box -->
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p class="text-sm text-blue-700 text-left">
                            Le processus de validation prend généralement entre 24 et 48 heures ouvrables. 
                            Si vous n'avez pas reçu de réponse après ce délai, veuillez nous contacter.
                        </p>
                    </div>
                </div>
            </template>

            <!-- Logout Button (only for pending users) -->
            <button 
                v-if="!hasImmediateAccess"
                @click="handleLogout"
                class="btn-secondary w-full"
                :disabled="loading"
            >
                <span v-if="loading" class="spinner-sm"></span>
                <template v-else>
                    <Icon name="heroicons:arrow-left-on-rectangle" class="w-5 h-5" />
                    <span>Se déconnecter</span>
                </template>
            </button>
        </div>
    </div>
</template>
