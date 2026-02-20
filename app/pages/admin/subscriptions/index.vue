<script setup lang="ts">
/**
 * Admin Subscriptions Page
 * 
 * Displays enterprises that need subscription approval.
 */
import { getEnterprisesNeedingSubscription, approveSubscription } from '~/firebase/services/firestore'
import type { EnterpriseProfile, UserProfile } from '~/types'

definePageMeta({
    layout: 'admin',
    middleware: ['auth']
})

// State
const enterprises = ref<Array<EnterpriseProfile & { user?: UserProfile }>>([])
const loading = ref(true)
const error = ref<string | null>(null)
const approvingId = ref<string | null>(null)

// Fetch enterprises needing subscription
onMounted(async () => {
    await fetchEnterprises()
})

async function fetchEnterprises() {
    loading.value = true
    error.value = null
    
    try {
        enterprises.value = await getEnterprisesNeedingSubscription()
    } catch (err) {
        console.error('Error fetching enterprises:', err)
        error.value = 'Erreur lors du chargement des entreprises'
    } finally {
        loading.value = false
    }
}

// Approve subscription
async function handleApprove(enterpriseId: string) {
    approvingId.value = enterpriseId
    
    try {
        await approveSubscription(enterpriseId)
        // Remove from list
        enterprises.value = enterprises.value.filter(e => e.uid !== enterpriseId)
    } catch (err) {
        console.error('Error approving subscription:', err)
        alert('Erreur lors de l\'approbation')
    } finally {
        approvingId.value = null
    }
}

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Demandes d'abonnement</h1>
            <p class="page-subtitle">Approuvez les entreprises pour qu'elles puissent créer plus de projets</p>
        </div>
        
        <!-- Loading state -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>
        
        <!-- Error state -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ error }}</span>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="enterprises.length === 0" class="state-empty">
            <div class="state-empty-icon bg-emerald-100">
                <Icon name="heroicons:check-circle" class="w-8 h-8 text-emerald-500" />
            </div>
            <h3 class="state-empty-title">Aucune demande en attente</h3>
            <p class="state-empty-text">Toutes les demandes d'abonnement ont été traitées.</p>
        </div>
        
        <!-- Enterprises list -->
        <div v-else class="space-y-4">
            <div
                v-for="enterprise in enterprises"
                :key="enterprise.uid"
                class="bg-white rounded-xl border border-slate-200 p-6"
            >
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <!-- Enterprise info -->
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-slate-800">{{ enterprise.companyName }}</h3>
                                <p v-if="enterprise.user" class="text-sm text-slate-500">
                                    {{ enterprise.user.firstName }} {{ enterprise.user.lastName }} • {{ enterprise.user.email }}
                                </p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-4 text-sm text-slate-500 mt-3">
                            <span class="flex items-center gap-1">
                                <Icon name="heroicons:folder" class="w-4 h-4" />
                                {{ enterprise.projectCount }} projet(s)
                            </span>
                            <span class="flex items-center gap-1">
                                <Icon name="heroicons:calendar" class="w-4 h-4" />
                                Inscrit le {{ formatDate(enterprise.createdAt) }}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <button
                        type="button"
                        class="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        :disabled="approvingId === enterprise.uid"
                        @click="handleApprove(enterprise.uid)"
                    >
                        <Icon 
                            v-if="approvingId === enterprise.uid" 
                            name="heroicons:arrow-path" 
                            class="w-5 h-5 animate-spin" 
                        />
                        <Icon v-else name="heroicons:check" class="w-5 h-5" />
                        Approuver l'abonnement
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Info box -->
        <div class="mt-8 bg-blue-50 rounded-xl p-6">
            <div class="flex items-start gap-3">
                <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Comment fonctionne l'abonnement ?</p>
                    <ul class="list-disc list-inside space-y-1 text-blue-600">
                        <li>Chaque entreprise peut créer 1 projet gratuitement</li>
                        <li>Pour créer plus de projets, elle doit demander un abonnement</li>
                        <li>Après approbation, l'entreprise peut créer des projets illimités</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
