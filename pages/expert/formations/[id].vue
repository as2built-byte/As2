<script setup lang="ts">
/**
 * Formation Detail Page
 * 
 * Shows formation details with action based on status:
 * - Available: Show payment button
 * - In progress: Show progress info
 * - Completed: Show certificate button
 */

import { getFormationsWithStatus, type FormationWithStatus } from '~/services/formationsClient'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth']
})

const route = useRoute()
const { user } = useAuth()

const formationId = computed(() => route.params.id as string)

// State
const formation = ref<FormationWithStatus | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Format price in DZD
function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DA'
}

// Format duration
function formatDuration(hours: number): string {
    return `${hours}h`
}

// Load formation
async function loadFormation() {
    if (!user.value?.uid || !formationId.value) return
    
    loading.value = true
    error.value = null
    
    try {
        const formations = await getFormationsWithStatus(user.value.uid, 'expert')
        formation.value = formations.find(f => f.id === formationId.value) || null
        
        if (!formation.value) {
            error.value = 'Formation non trouvée'
        }
    } catch (err) {
        console.error('Error loading formation:', err)
        error.value = 'Erreur lors du chargement de la formation'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadFormation()
})
</script>

<template>
    <div>
        <!-- Back Button -->
        <NuxtLink 
            to="/expert/formations"
            class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Retour aux formations
        </NuxtLink>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3 text-slate-500">
                <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                Chargement...
            </div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p class="text-red-700">{{ error }}</p>
        </div>

        <!-- Formation Detail -->
        <div v-else-if="formation" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Cover -->
                <div class="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                    <img 
                        v-if="formation.coverUrl"
                        :src="formation.coverUrl"
                        :alt="formation.title"
                        class="w-full h-full object-cover"
                    />
                    <div 
                        v-else 
                        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
                    >
                        <Icon name="heroicons:academic-cap" class="w-16 h-16 text-slate-400" />
                    </div>
                </div>

                <!-- Info -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <h1 class="text-2xl font-bold text-slate-800">{{ formation.title }}</h1>
                    
                    <p class="mt-4 text-slate-600 leading-relaxed">
                        {{ formation.description }}
                    </p>
                    
                    <div class="mt-6 flex items-center gap-6 text-sm text-slate-500">
                        <span class="flex items-center gap-2">
                            <Icon name="heroicons:clock" class="w-5 h-5" />
                            {{ formatDuration(formation.durationHours) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <!-- Price Card -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <div class="text-center">
                        <p class="text-3xl font-bold text-blue-600">
                            {{ formatPrice(formation.price) }}
                        </p>
                        <!-- <p class="mt-1 text-sm text-slate-500">TTC</p> -->
                    </div>

                    <!-- Action Button -->
                    <div class="mt-6">
                        <!-- Available: Pay button -->
                        <NuxtLink 
                            v-if="formation.status === 'available'"
                            :to="`/expert/formations/payment/${formation.id}`"
                            class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Icon name="heroicons:credit-card" class="w-5 h-5" />
                            S'inscrire maintenant
                        </NuxtLink>

                        <!-- In Progress: Status -->
                        <div 
                            v-else-if="formation.status === 'in-progress'"
                            class="text-center"
                        >
                            <div class="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium">
                                <Icon name="heroicons:clock" class="w-5 h-5" />
                                Formation en cours
                            </div>
                            <p class="mt-3 text-sm text-slate-500">
                                Vous êtes inscrit à cette formation
                            </p>
                        </div>

                        <!-- Completed: Certificate -->
                        <NuxtLink 
                            v-else-if="formation.status === 'completed'"
                            :to="`/expert/formations/certificate/${formation.id}`"
                            class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Icon name="heroicons:document-text" class="w-5 h-5" />
                            Voir mon certificat
                        </NuxtLink>
                    </div>
                </div>

                <!-- Status Badge -->
                <div 
                    v-if="formation.status !== 'available'"
                    class="bg-white rounded-xl border border-slate-200 p-4"
                >
                    <div class="flex items-center gap-3">
                        <div 
                            class="w-10 h-10 rounded-lg flex items-center justify-center"
                            :class="formation.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'"
                        >
                            <Icon 
                                :name="formation.status === 'completed' ? 'heroicons:check-badge' : 'heroicons:clock'"
                                class="w-5 h-5"
                                :class="formation.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'"
                            />
                        </div>
                        <div>
                            <p class="font-medium text-slate-800">
                                {{ formation.status === 'completed' ? 'Certifié' : 'En cours' }}
                            </p>
                            <p v-if="formation.paymentDate" class="text-sm text-slate-500">
                                Inscrit le {{ new Date(formation.paymentDate).toLocaleDateString('fr-FR') }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
