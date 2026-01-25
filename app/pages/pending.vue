<script setup lang="ts">
/**
 * Pending Approval Page
 * 
 * Shown when user logs in but their account is pending admin approval
 */

const { profile, logout, loading } = useAuth()
const router = useRouter()

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

// Handle logout
async function handleLogout() {
    await logout()
    router.push('/')
}
</script>

<template>
    <div class="pending-container">
        <div class="pending-card slide-up">
            <!-- Pending Icon -->
            <div class="pending-icon">
                <Icon name="heroicons:clock" class="w-12 h-12" />
            </div>

            <!-- Title -->
            <h1 class="pending-title">Compte en attente de validation</h1>

            <!-- Message -->
            <p class="pending-message">
                Votre compte a été créé avec succès et est actuellement en cours d'examen 
                par notre équipe d'administration. Vous recevrez une notification dès que 
                votre compte sera activé.
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

            <!-- Logout Button -->
            <button 
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
