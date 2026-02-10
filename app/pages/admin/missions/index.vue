<script setup lang="ts">
/**
 * Admin Missions Page - Redesigned UX/UI
 * 
 * Improvements:
 * - Enterprise info card for each mission
 * - Expert skills/availability in dropdown
 * - Mission details preview
 * - Better visual hierarchy
 */
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'admin',
    middleware: ['auth']
})

const missionsStore = useMissionsStore()

// Fetch pending missions on mount
onMounted(async () => {
    await missionsStore.fetchPendingMissions()
    await missionsStore.fetchAvailableExperts()
})

// Selected expert for assignment
const selectedExpert = ref<Record<string, string>>({})

// Assigning state per mission
const assigningMission = ref<string | null>(null)

// Assign expert to mission
async function handleAssignExpert(missionId: string) {
    const expertId = selectedExpert.value[missionId]
    if (!expertId) return
    
    assigningMission.value = missionId
    try {
        const success = await missionsStore.assignExpert(missionId, expertId)
        if (success) {
            // Refresh the list
            await missionsStore.fetchPendingMissions()
            // Clear selection
            delete selectedExpert.value[missionId]
        }
    } finally {
        assigningMission.value = null
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

// Get expert initials
function getExpertInitials(expert: any): string {
    return `${expert.firstName?.charAt(0) || ''}${expert.lastName?.charAt(0) || ''}`
}
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Assignation des Missions</h1>
            <p class="text-slate-600">Affectez des experts BIM qualifiés aux missions des entreprises</p>
        </div>
        
        <!-- Stats -->
        <div v-if="!missionsStore.loading" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div class="bg-white rounded-lg border border-slate-200 p-5">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Icon name="heroicons:clock" class="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-slate-900">{{ missionsStore.missions.length }}</p>
                        <p class="text-sm text-slate-600">Missions en attente</p>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-slate-200 p-5">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Icon name="heroicons:user-group" class="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-slate-900">{{ missionsStore.availableExperts.length }}</p>
                        <p class="text-sm text-slate-600">Experts disponibles</p>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-slate-200 p-5">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon name="heroicons:building-office" class="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-slate-900">{{ new Set(missionsStore.missions.map(m => m.enterpriseId)).size }}</p>
                        <p class="text-sm text-slate-600">Entreprises actives</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading state -->
        <div v-if="missionsStore.loading" class="flex flex-col items-center justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p class="text-slate-600">Chargement des missions...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="missionsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
            <p class="text-red-700">{{ missionsStore.error }}</p>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="missionsStore.missions.length === 0" class="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border-2 border-dashed border-emerald-200 p-12 text-center">
            <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="heroicons:check-circle" class="w-10 h-10 text-emerald-600" />
            </div>
            <h3 class="text-2xl font-bold text-slate-900 mb-3">Tout est à jour !</h3>
        </div>
        
        <!-- Missions list -->
        <div v-else class="space-y-6">
            <div
                v-for="mission in missionsStore.missions"
                :key="mission.id"
                class="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden"
            >
                <!-- Mission header with enterprise info -->
                <div class="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex items-start gap-4 flex-1">
                            <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Icon name="heroicons:building-office-2" class="w-6 h-6 text-blue-600" />
                            </div>
                            <div class="flex-1">
                                <p class="text-xs font-medium text-slate-500 mb-1">Entreprise</p>
                                <p class="font-semibold text-slate-900">Nom de l'entreprise</p>
                                <p class="text-sm text-slate-600 mt-1">
                                    <Icon name="heroicons:calendar" class="w-4 h-4 inline mr-1" />
                                    Demandée le {{ formatDate(mission.createdAt) }}
                                </p>
                            </div>
                        </div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            <Icon name="heroicons:clock" class="w-4 h-4" />
                            En attente
                        </div>
                    </div>
                </div>
                
                <!-- Mission details -->
                <div class="p-6">
                    <h3 class="text-xl font-bold text-slate-900 mb-3">{{ mission.title }}</h3>
                    <p class="text-slate-600 leading-relaxed mb-6">{{ mission.description }}</p>
                    
                    <!-- Expert assignment section -->
                    <div class="bg-slate-50 rounded-lg p-5 border border-slate-200">
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Icon name="heroicons:user-plus" class="w-5 h-5 text-blue-600" />
                            </div>
                            <div class="flex-1">
                                <p class="font-semibold text-slate-900 mb-1">Assigner un expert BIM</p>
                                <p class="text-sm text-slate-600 mb-4">Sélectionnez un expert disponible pour cette mission</p>
                                
                                <div v-if="missionsStore.availableExperts.length === 0" class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                    <Icon name="heroicons:exclamation-triangle" class="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <p class="text-sm text-amber-700 font-medium">Aucun expert disponible</p>
                                </div>
                                
                                <div v-else class="space-y-3">
                                    <select
                                        v-model="selectedExpert[mission.id]"
                                        class="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                                    >
                                        <option value="">Sélectionner un expert...</option>
                                        <option 
                                            v-for="expert in missionsStore.availableExperts" 
                                            :key="expert.uid" 
                                            :value="expert.uid"
                                        >
                                            {{ expert.firstName }} {{ expert.lastName }}
                                        </option>
                                    </select>
                                    
                                    <button
                                        type="button"
                                        class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        :disabled="!selectedExpert[mission.id] || assigningMission === mission.id"
                                        @click="handleAssignExpert(mission.id)"
                                    >
                                        <Icon 
                                            v-if="assigningMission === mission.id" 
                                            name="heroicons:arrow-path" 
                                            class="w-5 h-5 animate-spin" 
                                        />
                                        <Icon v-else name="heroicons:check-circle" class="w-5 h-5" />
                                        {{ assigningMission === mission.id ? 'Assignation en cours...' : 'Assigner cette mission' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Available experts panel -->
        <div v-if="missionsStore.availableExperts.length > 0 && !missionsStore.loading" class="mt-8 bg-white rounded-xl border border-slate-200 p-6">
            <div class="flex items-center gap-3 mb-4">
                <Icon name="heroicons:user-group" class="w-6 h-6 text-emerald-600" />
                <h3 class="text-lg font-semibold text-slate-900">Experts BIM disponibles</h3>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div 
                    v-for="expert in missionsStore.availableExperts" 
                    :key="expert.uid"
                    class="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {{ getExpertInitials(expert) }}
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-semibold text-slate-900">{{ expert.firstName }}</p>
                        <p class="text-xs text-slate-600">{{ expert.lastName }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
