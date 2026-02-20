<script setup lang="ts">
/**
 * Expert Missions Page - Redesigned UX/UI
 * 
 * Improvements:
 * - Prominent invitation cards with deadline info
 * - Enterprise information display
 * - Clear Accept/Decline CTAs with consequences
 * - Tabs with counts
 * - Mission details panel
 */
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'expert',
    middleware: ['auth']
})

const { user } = useAuth()
const missionsStore = useMissionsStore()

// Active tab
type TabId = 'invitations' | 'in_progress' | 'history'
const activeTab = ref<TabId>('invitations')

// Fetch missions on mount
onMounted(async () => {
    if (user.value?.uid) {
        await missionsStore.fetchMissionsByExpert(user.value.uid)
    }
})

// Watch for user changes
watch(() => user.value?.uid, async (uid) => {
    if (uid) {
        await missionsStore.fetchMissionsByExpert(uid)
    }
})

// Filtered missions per tab
const invitations = computed(() => missionsStore.missionsByStatus('proposed'))
const inProgress = computed(() => missionsStore.missionsByStatus('accepted'))
const history = computed(() => missionsStore.missions.filter(m => m.status === 'completed' || m.status === 'refused'))

// Tab counts
const tabCounts = computed(() => ({
    invitations: invitations.value.length,
    in_progress: inProgress.value.length,
    history: history.value.length
}))

// Current missions for active tab
const currentMissions = computed(() => {
    switch (activeTab.value) {
        case 'invitations': return invitations.value
        case 'in_progress': return inProgress.value
        case 'history': return history.value
        default: return []
    }
})

// Action states
const processingMission = ref<string | null>(null)

// Accept mission
async function handleAccept(missionId: string) {
    processingMission.value = missionId
    try {
        const success = await missionsStore.acceptMission(missionId)
        if (success && user.value?.uid) {
            await missionsStore.fetchMissionsByExpert(user.value.uid)
        }
    } finally {
        processingMission.value = null
    }
}

// Refuse mission
async function handleRefuse(missionId: string) {
    processingMission.value = missionId
    try {
        const success = await missionsStore.refuseMission(missionId)
        if (success && user.value?.uid) {
            await missionsStore.fetchMissionsByExpert(user.value.uid)
        }
    } finally {
        processingMission.value = null
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

// Get status config
function getStatusConfig(status: string) {
    const configs: Record<string, { bg: string, text: string, icon: string, label: string }> = {
        proposed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'heroicons:inbox', label: 'Invitation' },
        accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'heroicons:check-circle', label: 'En cours' },
        completed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'heroicons:trophy', label: 'Terminée' },
        refused: { bg: 'bg-slate-100', text: 'text-slate-500', icon: 'heroicons:x-circle', label: 'Refusée' }
    }
    return configs[status] || configs.proposed
}
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Mes Missions BIM</h1>
            <p class="page-subtitle">Gérez vos invitations et missions en cours</p>
        </div>
        
        <!-- Tabs with counts -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div class="flex border-b border-slate-200 overflow-x-auto">
                <button
                    type="button"
                    @click="activeTab = 'invitations'"
                    :class="activeTab === 'invitations' ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                    class="flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap"
                >
                    <Icon name="heroicons:inbox" class="w-5 h-5" />
                    <span>Invitations</span>
                    <span v-if="tabCounts.invitations > 0" 
                          :class="activeTab === 'invitations' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'"
                          class="px-2 py-0.5 rounded-full text-xs font-bold">
                        {{ tabCounts.invitations }}
                    </span>
                </button>
                <button
                    type="button"
                    @click="activeTab = 'in_progress'"
                    :class="activeTab === 'in_progress' ? 'border-b-2 border-emerald-600 text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                    class="flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap"
                >
                    <Icon name="heroicons:play-circle" class="w-5 h-5" />
                    <span>En cours</span>
                    <span v-if="tabCounts.in_progress > 0" 
                          :class="activeTab === 'in_progress' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                          class="px-2 py-0.5 rounded-full text-xs font-bold">
                        {{ tabCounts.in_progress }}
                    </span>
                </button>
                <button
                    type="button"
                    @click="activeTab = 'history'"
                    :class="activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
                    class="flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap"
                >
                    <Icon name="heroicons:clock" class="w-5 h-5" />
                    <span>Historique</span>
                    <span v-if="tabCounts.history > 0" 
                          :class="activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'"
                          class="px-2 py-0.5 rounded-full text-xs font-bold">
                        {{ tabCounts.history }}
                    </span>
                </button>
            </div>
            
            <!-- Loading state -->
            <div v-if="missionsStore.loading" class="state-loading">
                <div class="spinner-lg text-blue-600"></div>
            </div>
            
            <!-- Error state -->
            <div v-else-if="missionsStore.error" class="p-8">
                <div class="alert-error fade-in">
                    <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{{ missionsStore.error }}</span>
                </div>
            </div>
            
            <!-- Empty state -->
            <div v-else-if="currentMissions.length === 0" class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon :name="activeTab === 'invitations' ? 'heroicons:inbox' : activeTab === 'in_progress' ? 'heroicons:play-circle' : 'heroicons:clock'" 
                          class="w-8 h-8 text-slate-400" />
                </div>
                <h3 class="text-lg font-semibold text-slate-900 mb-2">
                    {{ activeTab === 'invitations' ? 'Aucune invitation' : activeTab === 'in_progress' ? 'Aucune mission en cours' : 'Aucun historique' }}
                </h3>
                <p class="text-sm text-slate-600">
                    {{ activeTab === 'invitations' ? 'Vous recevrez des invitations lorsque des entreprises auront besoin de vos compétences.' : 
                       activeTab === 'in_progress' ? 'Acceptez des invitations pour commencer à travailler sur des missions.' : 
                       'Vos missions terminées et refusées apparaîtront ici.' }}
                </p>
            </div>
            
            <!-- Missions content -->
            <div v-else class="divide-y divide-slate-100">
                <!-- Invitations (compact cards) -->
                <template v-if="activeTab === 'invitations'">
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="px-4 sm:px-6 py-4 hover:bg-purple-50/30 transition-colors"
                    >
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span class="inline-flex items-center px-2.5 py-0.5 bg-purple-600 text-white rounded-full text-xs font-bold">
                                        NOUVELLE INVITATION
                                    </span>
                                    <span class="text-xs text-slate-500">{{ formatDate(mission.createdAt) }}</span>
                                </div>
                                <h3 class="text-base font-bold text-slate-900 truncate">{{ mission.title }}</h3>
                                <p class="text-sm text-slate-600 line-clamp-1 mt-0.5 mb-2">{{ mission.description }}</p>
                                
                                <div class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                    <Icon name="heroicons:building-office-2" class="w-4 h-4 text-purple-600" />
                                    {{ (mission as any).enterpriseName || 'Entreprise inconnue' }}
                                </div>
                            </div>
                            
                            <!-- Action buttons (small, inline) -->
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    @click="handleAccept(mission.id)"
                                    :disabled="processingMission === mission.id"
                                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                    <Icon v-if="processingMission === mission.id" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                    <Icon v-else name="heroicons:check" class="w-4 h-4" />
                                    Accepter
                                </button>
                                <button
                                    type="button"
                                    @click="handleRefuse(mission.id)"
                                    :disabled="processingMission === mission.id"
                                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    <Icon v-if="processingMission === mission.id" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                    <Icon v-else name="heroicons:x-mark" class="w-4 h-4" />
                                    Refuser
                                </button>
                            </div>
                        </div>
                    </div>
                </template>
                
                <!-- In Progress missions (compact) -->
                <template v-else-if="activeTab === 'in_progress'">
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="px-4 sm:px-6 py-4 hover:bg-emerald-50/30 transition-colors"
                    >
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span :class="[getStatusConfig(mission.status)?.bg, getStatusConfig(mission.status)?.text]" 
                                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                        {{ getStatusConfig(mission.status)?.label || mission.status }}
                                    </span>
                                    <span class="text-xs text-slate-500">Acceptée le {{ formatDate(mission.createdAt) }}</span>
                                </div>
                                <h3 class="text-base font-bold text-slate-900 truncate">{{ mission.title }}</h3>
                                <p class="text-sm text-slate-600 line-clamp-1 mt-0.5 mb-2">{{ mission.description }}</p>
                                
                                <div class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                    <Icon name="heroicons:building-office-2" class="w-4 h-4 text-emerald-600" />
                                    {{ (mission as any).enterpriseName || 'Entreprise inconnue' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                
                <!-- History (compact) -->
                <template v-else>
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span :class="[getStatusConfig(mission.status)?.bg, getStatusConfig(mission.status)?.text]" 
                                          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                        {{ getStatusConfig(mission.status)?.label || mission.status }}
                                    </span>
                                    <span class="text-xs text-slate-500">{{ formatDate(mission.createdAt) }}</span>
                                </div>
                                <h3 class="text-base font-bold text-slate-900 truncate">{{ mission.title }}</h3>
                                <p class="text-sm text-slate-600 line-clamp-1 mt-0.5 mb-2">{{ mission.description }}</p>
                                
                                <div class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                    <Icon name="heroicons:building-office-2" class="w-4 h-4 text-slate-500" />
                                    {{ (mission as any).enterpriseName || 'Entreprise inconnue' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
