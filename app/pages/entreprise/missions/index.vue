<script setup lang="ts">
/**
 * Enterprise Missions List Page - Redesigned UX/UI
 * 
 * Improvements:
 * - Status-specific meaningful icons
 * - Quick status filters
 * - Expert info when assigned
 * - Better visual hierarchy
 * - Completion action for enterprise
 */
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user } = useAuth()
const missionsStore = useMissionsStore()

// Active filter
const activeFilter = ref<string>('all')

// Mission completion state
const completingMission = ref<string | null>(null)

// Fetch missions when user is available
onMounted(async () => {
    if (user.value?.uid) {
        await missionsStore.fetchMissionsByEnterprise(user.value.uid)
    }
})

// Watch for user changes
watch(() => user.value?.uid, async (uid) => {
    if (uid) {
        await missionsStore.fetchMissionsByEnterprise(uid)
    }
})

// Handle mission completion
async function handleCompleteMission(missionId: string) {
    if (!confirm('Êtes-vous sûr de vouloir marquer cette mission comme terminée ?')) return
    
    completingMission.value = missionId
    try {
        const success = await missionsStore.completeMission(missionId)
        if (success && user.value?.uid) {
            await missionsStore.fetchMissionsByEnterprise(user.value.uid)
        }
    } finally {
        completingMission.value = null
    }
}

// Get mission status config
function getMissionStatusConfig(status: string) {
    const configs: Record<string, { bg: string, text: string, icon: string, label: string, description: string }> = {
        pending_admin: { 
            bg: 'bg-amber-50', 
            text: 'text-amber-700', 
            icon: 'heroicons:clock',
            label: 'En attente',
            description: 'En attente d\'assignation par l\'admin'
        },
        proposed: { 
            bg: 'bg-purple-50', 
            text: 'text-purple-700', 
            icon: 'heroicons:user-plus',
            label: 'Proposée',
            description: 'Proposée à un expert BIM'
        },
        accepted: { 
            bg: 'bg-emerald-50', 
            text: 'text-emerald-700', 
            icon: 'heroicons:check-circle',
            label: 'En cours',
            description: 'Acceptée par l\'expert'
        },
        refused: { 
            bg: 'bg-slate-50', 
            text: 'text-slate-500', 
            icon: 'heroicons:x-circle',
            label: 'Refusée',
            description: 'Refusée par l\'expert'
        },
        completed: { 
            bg: 'bg-blue-50', 
            text: 'text-blue-700', 
            icon: 'heroicons:trophy',
            label: 'Terminée',
            description: 'Mission terminée avec succès'
        }
    }
    return configs[status] || configs.pending_admin
}

// Filter missions
const filteredMissions = computed(() => {
    if (activeFilter.value === 'all') {
        return missionsStore.missions
    }
    return missionsStore.missions.filter(m => m.status === activeFilter.value)
})

// Status counts
const statusCounts = computed(() => ({
    all: missionsStore.missions.length,
    pending_admin: missionsStore.missions.filter(m => m.status === 'pending_admin').length,
    proposed: missionsStore.missions.filter(m => m.status === 'proposed').length,
    accepted: missionsStore.missions.filter(m => m.status === 'accepted').length,
    completed: missionsStore.missions.filter(m => m.status === 'completed').length
}))

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
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Mes Missions</h1>
            <p class="text-slate-600">Suivez l'avancement de toutes vos missions BIM</p>
        </div>
        
        <!-- Stats cards -->
        <div v-if="!missionsStore.loading && missionsStore.missions.length > 0" class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <button
                type="button"
                @click="activeFilter = 'all'"
                :class="activeFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'"
                class="p-4 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-2">
                    <Icon name="heroicons:briefcase" class="w-5 h-5 text-slate-600" />
                    <p class="text-xs font-medium text-slate-600">Toutes</p>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ statusCounts.all }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'pending_admin'"
                :class="activeFilter === 'pending_admin' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-white hover:bg-slate-50'"
                class="p-4 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-2">
                    <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
                    <p class="text-xs font-medium text-amber-700">En attente</p>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ statusCounts.pending_admin }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'proposed'"
                :class="activeFilter === 'proposed' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-white hover:bg-slate-50'"
                class="p-4 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-2">
                    <Icon name="heroicons:user-plus" class="w-5 h-5 text-purple-600" />
                    <p class="text-xs font-medium text-purple-700">Proposées</p>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ statusCounts.proposed }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'accepted'"
                :class="activeFilter === 'accepted' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white hover:bg-slate-50'"
                class="p-4 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-2">
                    <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-600" />
                    <p class="text-xs font-medium text-emerald-700">En cours</p>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ statusCounts.accepted }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'completed'"
                :class="activeFilter === 'completed' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'"
                class="p-4 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-2">
                    <Icon name="heroicons:trophy" class="w-5 h-5 text-blue-600" />
                    <p class="text-xs font-medium text-blue-700">Terminées</p>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ statusCounts.completed }}</p>
            </button>
        </div>
        
        <!-- Loading state -->
        <div v-if="missionsStore.loading" class="flex flex-col items-center justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p class="text-slate-600">Chargement de vos missions...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="missionsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
            <p class="text-red-700">{{ missionsStore.error }}</p>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="missionsStore.missions.length === 0" class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-dashed border-purple-200 p-12 text-center">
            <div class="max-w-md mx-auto">
                <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="heroicons:briefcase" class="w-10 h-10 text-purple-600" />
                </div>
                <h3 class="text-2xl font-bold text-slate-900 mb-3">Aucune mission</h3>
                <p class="text-slate-600 mb-6">
                    Créez des missions depuis vos projets pour collaborer avec des experts BIM certifiés.
                </p>
                <NuxtLink 
                    to="/entreprise/projets"
                    class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                >
                    <Icon name="heroicons:folder-open" class="w-5 h-5" />
                    Voir mes projets
                </NuxtLink>
            </div>
        </div>
        
        <!-- No filtered results -->
        <div v-else-if="filteredMissions.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:funnel" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Aucune mission {{ getMissionStatusConfig(activeFilter)?.label?.toLowerCase() || '' }}</h3>
            <button
                type="button"
                @click="activeFilter = 'all'"
                class="text-blue-600 hover:underline font-medium"
            >
                Afficher toutes les missions
            </button>
        </div>
        
        <!-- Missions list -->
        <div v-else class="space-y-4">
            <div
                v-for="mission in filteredMissions"
                :key="mission.id"
                class="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-6"
            >
                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <!-- Mission info -->
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3">
                            <div :class="[getMissionStatusConfig(mission.status)?.bg, getMissionStatusConfig(mission.status)?.text]" 
                                 class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium">
                                <Icon :name="getMissionStatusConfig(mission.status)?.icon || 'heroicons:question-mark-circle'" class="w-4 h-4" />
                                {{ getMissionStatusConfig(mission.status)?.label || mission.status }}
                            </div>
                            <span class="text-sm text-slate-500">
                                <Icon name="heroicons:calendar" class="w-4 h-4 inline mr-1" />
                                {{ formatDate(mission.createdAt) }}
                            </span>
                        </div>
                        
                        <h3 class="text-xl font-bold text-slate-900 mb-2">{{ mission.title }}</h3>
                        <p class="text-slate-600 mb-4 leading-relaxed">{{ mission.description }}</p>
                        
                        <!-- Expert info (if assigned) -->
                        <div v-if="mission.expertId" class="inline-flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                            <Icon name="heroicons:user" class="w-4 h-4 text-blue-600" />
                            <span class="font-medium">
                                {{ (mission as any).expertName ? `Expert: ${(mission as any).expertName}` : 'Expert assigné' }}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex flex-col items-end gap-3">
                        <NuxtLink
                            :to="`/entreprise/projets/${mission.projectId}`"
                            class="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
                        >
                            <Icon name="heroicons:folder-open" class="w-5 h-5" />
                            Voir le projet
                        </NuxtLink>
                        
                        <!-- Complete mission button (only if active/accepted) -->
                        <button
                            v-if="mission.status === 'accepted'"
                            type="button"
                            @click="handleCompleteMission(mission.id)"
                            :disabled="completingMission === mission.id"
                            class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors w-full sm:w-auto justify-center disabled:opacity-50"
                        >
                            <Icon v-if="completingMission === mission.id" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                            <Icon v-else name="heroicons:check-badge" class="w-5 h-5" />
                            Marquer terminée
                        </button>
                    </div>
                </div>
                
                <!-- Status description -->
                <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-sm text-slate-500">
                        <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                        {{ getMissionStatusConfig(mission.status)?.description || 'Mission en cours de traitement' }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
