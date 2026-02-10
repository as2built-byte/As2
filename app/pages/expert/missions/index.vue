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
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Mes Missions BIM</h1>
            <p class="text-slate-600">Gérez vos invitations et missions en cours</p>
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
            <div v-if="missionsStore.loading" class="p-12 text-center">
                <Icon name="heroicons:arrow-path" class="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p class="text-slate-600">Chargement de vos missions...</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="missionsStore.error" class="p-8 text-center">
                <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 class="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
                <p class="text-red-700">{{ missionsStore.error }}</p>
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
            <div v-else class="p-6 space-y-4">
                <!-- Invitations (prominent cards) -->
                <template v-if="activeTab === 'invitations'">
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6 shadow-sm"
                    >
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Icon name="heroicons:inbox" class="w-7 h-7 text-purple-600" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold">
                                        <Icon name="heroicons:sparkles" class="w-3.5 h-3.5" />
                                        NOUVELLE INVITATION
                                    </span>
                                    <span class="text-sm text-slate-600">
                                        <Icon name="heroicons:calendar" class="w-4 h-4 inline mr-1" />
                                        {{ formatDate(mission.createdAt) }}
                                    </span>
                                </div>
                                <h3 class="text-2xl font-bold text-slate-900 mb-2">{{ mission.title }}</h3>
                                <p class="text-slate-700 leading-relaxed mb-4">{{ mission.description }}</p>
                                
                                <!-- Enterprise info -->
                                <div class="bg-white rounded-lg border border-purple-200 p-4 mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Icon name="heroicons:building-office" class="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p class="text-xs text-slate-500 font-medium">Entreprise</p>
                                            <p class="font-semibold text-slate-900">{{ (mission as any).enterpriseName || 'Entreprise inconnue' }}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Action buttons -->
                                <div class="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        @click="handleAccept(mission.id)"
                                        :disabled="processingMission === mission.id"
                                        class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        <Icon v-if="processingMission === mission.id" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                                        <Icon v-else name="heroicons:check-circle" class="w-5 h-5" />
                                        Accepter la mission
                                    </button>
                                    <button
                                        type="button"
                                        @click="handleRefuse(mission.id)"
                                        :disabled="processingMission === mission.id"
                                        class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50"
                                    >
                                        <Icon v-if="processingMission === mission.id" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                                        <Icon v-else name="heroicons:x-circle" class="w-5 h-5" />
                                        Refuser
                                    </button>
                                </div>
                                
                                <!-- Consequences info -->
                                <div class="mt-4 flex items-start gap-2 text-sm text-slate-600 bg-white/50 rounded-lg p-3">
                                    <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p>
                                        <span class="font-semibold">En acceptant,</span> vous vous engagez à réaliser cette mission BIM. 
                                        <span class="font-semibold">En refusant,</span> l'entreprise sera notifiée et pourra proposer la mission à un autre expert.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                
                <!-- In Progress missions -->
                <template v-else-if="activeTab === 'in_progress'">
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="bg-white rounded-xl border-2 border-emerald-200 p-6 hover:shadow-lg transition-all"
                    >
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <Icon name="heroicons:check-circle" class="w-6 h-6 text-emerald-600" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span :class="[getStatusConfig(mission.status)?.bg, getStatusConfig(mission.status)?.text]" 
                                          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
                                        <Icon :name="getStatusConfig(mission.status)?.icon || 'heroicons:question-mark-circle'" class="w-3.5 h-3.5" />
                                        {{ getStatusConfig(mission.status)?.label || mission.status }}
                                    </span>
                                    <span class="text-sm text-slate-600">
                                        <Icon name="heroicons:calendar" class="w-4 h-4 inline mr-1" />
                                        Acceptée le {{ formatDate(mission.createdAt) }}
                                    </span>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 mb-2">{{ mission.title }}</h3>
                                <p class="text-slate-600 leading-relaxed mb-2">{{ mission.description }}</p>
                                <div class="flex items-center gap-2 text-sm text-slate-500">
                                    <Icon name="heroicons:building-office" class="w-4 h-4" />
                                    <span>{{ (mission as any).enterpriseName || 'Entreprise inconnue' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                
                <!-- History -->
                <template v-else>
                    <div
                        v-for="mission in currentMissions"
                        :key="mission.id"
                        class="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all"
                    >
                        <div class="flex items-start gap-4">
                            <div :class="mission.status === 'completed' ? 'bg-blue-100' : 'bg-slate-100'" 
                                 class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon :name="getStatusConfig(mission.status)?.icon || 'heroicons:question-mark-circle'" 
                                      :class="mission.status === 'completed' ? 'text-blue-600' : 'text-slate-500'"
                                      class="w-6 h-6" />
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span :class="[getStatusConfig(mission.status)?.bg, getStatusConfig(mission.status)?.text]" 
                                          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
                                        <Icon :name="getStatusConfig(mission.status)?.icon || 'heroicons:question-mark-circle'" class="w-3.5 h-3.5" />
                                        {{ getStatusConfig(mission.status)?.label || mission.status }}
                                    </span>
                                    <span class="text-sm text-slate-600">
                                        <Icon name="heroicons:calendar" class="w-4 h-4 inline mr-1" />
                                        {{ formatDate(mission.createdAt) }}
                                    </span>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 mb-2">{{ mission.title }}</h3>
                                <p class="text-slate-600 leading-relaxed mb-2">{{ mission.description }}</p>
                                <div class="flex items-center gap-2 text-sm text-slate-500">
                                    <Icon name="heroicons:building-office" class="w-4 h-4" />
                                    <span>{{ (mission as any).enterpriseName || 'Entreprise inconnue' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
