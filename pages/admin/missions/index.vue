<script setup lang="ts">
/**
 * Admin Missions Page - Full Dashboard
 * 
 * Complete vision & control over ALL missions:
 * - View all missions across all statuses
 * - Filter by status tabs
 * - Assign experts to pending missions
 * - Cancel expert assignments
 * - Delete missions
 * - See enterprise, project, and expert info
 */
import { useMissionsStore } from '~/stores/missions'
import type { MissionWithDetails } from '~/types'

definePageMeta({
    layout: 'admin',
    middleware: ['auth']
})

const missionsStore = useMissionsStore()

// Active status filter tab
const activeTab = ref<string>('all')

// Search query
const searchQuery = ref('')

// Fetch all missions on mount
onMounted(async () => {
    await missionsStore.fetchAllMissions()
    await missionsStore.fetchAvailableExperts()
})

// Status tabs config
const statusTabs = [
    { key: 'all', label: 'Toutes', icon: 'heroicons:squares-2x2', color: 'blue' },
    { key: 'pending_admin', label: 'En attente', icon: 'heroicons:clock', color: 'amber' },
    { key: 'proposed', label: 'Proposées', icon: 'heroicons:paper-airplane', color: 'violet' },
    { key: 'accepted', label: 'En cours', icon: 'heroicons:play-circle', color: 'emerald' },
    { key: 'completed', label: 'Terminées', icon: 'heroicons:check-circle', color: 'slate' },
]

// Status config for badges
const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending_admin: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    proposed: { label: 'Proposée', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    accepted: { label: 'En cours', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    refused: { label: 'Refusée', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    completed: { label: 'Terminée', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
}

// Count missions by status
function countByStatus(status: string): number {
    if (status === 'all') return missionsStore.missions.length
    return missionsStore.missions.filter(m => m.status === status).length
}

// Filtered missions
const filteredMissions = computed(() => {
    let missions = missionsStore.missions as MissionWithDetails[]
    
    // Filter by status tab
    if (activeTab.value !== 'all') {
        missions = missions.filter(m => m.status === activeTab.value)
    }
    
    // Filter by search query
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase()
        missions = missions.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q) ||
            m.enterpriseName?.toLowerCase().includes(q) ||
            m.projectTitle?.toLowerCase().includes(q) ||
            m.expertName?.toLowerCase().includes(q)
        )
    }
    
    // Sort: pending first, then by date desc
    return [...missions].sort((a, b) => {
        const statusOrder: Record<string, number> = { pending_admin: 0, proposed: 1, accepted: 2, completed: 3 }
        const aOrder = statusOrder[a.status] ?? 4
        const bOrder = statusOrder[b.status] ?? 4
        if (aOrder !== bOrder) return aOrder - bOrder
        return b.createdAt.getTime() - a.createdAt.getTime()
    })
})

// Selected expert for assignment per mission
const selectedExpert = ref<Record<string, string>>({})

// Action states
const assigningMission = ref<string | null>(null)
const cancellingMission = ref<string | null>(null)
const deletingMission = ref<string | null>(null)

// Assign expert to mission
async function handleAssignExpert(missionId: string) {
    const expertId = selectedExpert.value[missionId]
    if (!expertId) return
    
    assigningMission.value = missionId
    try {
        const success = await missionsStore.assignExpert(missionId, expertId)
        if (success) {
            // Refresh all missions
            await missionsStore.fetchAllMissions()
            await missionsStore.fetchAvailableExperts()
            delete selectedExpert.value[missionId]
        }
    } finally {
        assigningMission.value = null
    }
}

// Cancel expert from mission
async function handleCancelExpert(missionId: string, expertId: string) {
    if (!confirm('Voulez-vous vraiment retirer cet expert de cette mission ?')) return
    
    cancellingMission.value = missionId
    try {
        const success = await missionsStore.cancelExpert(missionId, expertId)
        if (success) {
            await missionsStore.fetchAllMissions()
            await missionsStore.fetchAvailableExperts()
        }
    } finally {
        cancellingMission.value = null
    }
}

// Delete mission
async function handleDeleteMission(missionId: string) {
    if (!confirm('Voulez-vous vraiment supprimer cette mission ? Cette action est irréversible.')) return
    
    deletingMission.value = missionId
    try {
        const success = await missionsStore.deleteMission(missionId)
        if (success) {
            await missionsStore.fetchAllMissions()
        }
    } finally {
        deletingMission.value = null
    }
}

// Refresh data
async function refreshData() {
    await missionsStore.fetchAllMissions()
    await missionsStore.fetchAvailableExperts()
}

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// Expanded mission panels
const expandedMissions = ref<Set<string>>(new Set())

function toggleExpand(missionId: string) {
    if (expandedMissions.value.has(missionId)) {
        expandedMissions.value.delete(missionId)
    } else {
        expandedMissions.value.add(missionId)
    }
}
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 page-header">
            <div>
                <h1 class="page-title">Gestion des Missions</h1>
                <p class="page-subtitle">Vision complète et contrôle de toutes les missions</p>
            </div>
            <button
                @click="refreshData"
                class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                :disabled="missionsStore.loading"
            >
                <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="{ 'animate-spin': missionsStore.loading }" />
                Actualiser
            </button>
        </div>

        <!-- Stats Cards -->
        <div v-if="!missionsStore.loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <button
                v-for="tab in statusTabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                class="relative bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md"
                :class="activeTab === tab.key ? `border-${tab.color}-400 shadow-md ring-1 ring-${tab.color}-200` : 'border-slate-200'"
            >
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                        :class="{
                            'bg-blue-100': tab.color === 'blue',
                            'bg-amber-100': tab.color === 'amber',
                            'bg-violet-100': tab.color === 'violet',
                            'bg-emerald-100': tab.color === 'emerald',
                            'bg-slate-100': tab.color === 'slate',
                        }"
                    >
                        <Icon :name="tab.icon" class="w-4 h-4"
                            :class="{
                                'text-blue-600': tab.color === 'blue',
                                'text-amber-600': tab.color === 'amber',
                                'text-violet-600': tab.color === 'violet',
                                'text-emerald-600': tab.color === 'emerald',
                                'text-slate-600': tab.color === 'slate',
                            }"
                        />
                    </div>
                </div>
                <p class="text-2xl font-bold text-slate-900">{{ countByStatus(tab.key) }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ tab.label }}</p>
                <!-- Active indicator -->
                <div v-if="activeTab === tab.key" class="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                    :class="{
                        'bg-blue-500': tab.color === 'blue',
                        'bg-amber-500': tab.color === 'amber',
                        'bg-violet-500': tab.color === 'violet',
                        'bg-emerald-500': tab.color === 'emerald',
                        'bg-slate-500': tab.color === 'slate',
                    }"
                ></div>
            </button>
        </div>

        <!-- Search bar -->
        <div class="mb-5">
            <div class="relative">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher par titre, entreprise, projet ou expert..."
                    class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                />
                <button
                    v-if="searchQuery"
                    @click="searchQuery = ''"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="missionsStore.loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="missionsStore.error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
                <span>{{ missionsStore.error }}</span>
                <button @click="refreshData" class="ml-4 text-red-700 underline font-medium text-sm">Réessayer</button>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredMissions.length === 0" class="state-empty">
            <div class="state-empty-icon">
                <Icon name="heroicons:inbox" class="w-8 h-8 text-slate-400" />
            </div>
            <h3 class="state-empty-title">
                {{ searchQuery ? 'Aucun résultat' : 'Aucune mission' }}
            </h3>
            <p class="text-sm text-slate-500">
                {{ searchQuery ? 'Essayez un autre terme de recherche' : 'Il n\'y a aucune mission dans cette catégorie' }}
            </p>
        </div>

        <!-- Missions Table -->
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <!-- Table Header -->
            <div class="hidden lg:grid lg:grid-cols-12 gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div class="col-span-3">Mission</div>
                <div class="col-span-2">Entreprise</div>
                <div class="col-span-2">Projet</div>
                <div class="col-span-2">Expert</div>
                <div class="col-span-2">Statut</div>
                <div class="col-span-1"></div>
            </div>

            <!-- Mission Rows -->
            <div
                v-for="(mission, index) in filteredMissions"
                :key="mission.id"
                class="border-b border-slate-100 last:border-0"
            >
                <!-- Main Row -->
                <div
                    class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors cursor-pointer"
                    @click="toggleExpand(mission.id)"
                >
                    <!-- Mission Title -->
                    <div class="lg:col-span-3 flex items-center gap-2 min-w-0">
                        <Icon
                            name="heroicons:chevron-right"
                            class="w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 hidden lg:block"
                            :class="{ 'rotate-90': expandedMissions.has(mission.id) }"
                        />
                        <div class="min-w-0 flex-1">
                            <p class="font-semibold text-slate-900 text-sm truncate">{{ mission.title }}</p>
                            <p class="text-xs text-slate-400">{{ formatDate(mission.createdAt) }}</p>
                        </div>
                    </div>

                    <!-- Enterprise -->
                    <div class="lg:col-span-2 min-w-0">
                        <p class="text-sm text-slate-700 truncate" :title="mission.enterpriseName">{{ mission.enterpriseName || '...' }}</p>
                    </div>

                    <!-- Project -->
                    <div class="lg:col-span-2 min-w-0">
                        <p class="text-sm text-slate-600 truncate" :title="mission.projectTitle">{{ mission.projectTitle || '...' }}</p>
                    </div>

                    <!-- Expert -->
                    <div class="lg:col-span-2 min-w-0">
                        <p v-if="mission.expertId && mission.expertName" class="text-sm text-emerald-700 font-medium truncate" :title="mission.expertName">
                            {{ mission.expertName }}
                        </p>
                        <p v-else class="text-sm text-slate-400 italic">—</p>
                    </div>

                    <!-- Status -->
                    <div class="lg:col-span-2">
                        <span
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                            :class="[statusConfig[mission.status]?.bg, statusConfig[mission.status]?.text]"
                        >
                            <span class="w-1.5 h-1.5 rounded-full" :class="statusConfig[mission.status]?.dot"></span>
                            {{ statusConfig[mission.status]?.label || mission.status }}
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="lg:col-span-1 flex items-center justify-end gap-1" @click.stop>
                        <!-- Cancel Expert (for proposed/accepted) -->
                        <button
                            v-if="mission.expertId && (mission.status === 'proposed' || mission.status === 'accepted')"
                            @click="handleCancelExpert(mission.id, mission.expertId!)"
                            :disabled="cancellingMission === mission.id"
                            class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Retirer l'expert"
                        >
                            <Icon v-if="cancellingMission === mission.id" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                            <Icon v-else name="heroicons:user-minus" class="w-4 h-4" />
                        </button>

                        <!-- Expand toggle -->
                        <button
                            @click="toggleExpand(mission.id)"
                            class="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
                        >
                            <Icon name="heroicons:chevron-down" class="w-4 h-4" :class="{ 'rotate-180': expandedMissions.has(mission.id) }" />
                        </button>
                    </div>
                </div>

                <!-- Expanded Panel -->
                <div v-if="expandedMissions.has(mission.id)" class="px-5 pb-5">
                    <div class="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-4">
                        <!-- Description -->
                        <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                            <p class="text-sm text-slate-700 leading-relaxed">{{ mission.description || 'Aucune description' }}</p>
                        </div>

                        <!-- Info grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Entreprise</p>
                                <div class="flex items-center gap-2">
                                    <Icon name="heroicons:building-office-2" class="w-4 h-4 text-blue-600" />
                                    <span class="text-sm font-medium text-slate-900">{{ mission.enterpriseName || 'Chargement...' }}</span>
                                </div>
                            </div>
                            <div>
                                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Projet</p>
                                <div class="flex items-center gap-2">
                                    <Icon name="heroicons:folder" class="w-4 h-4 text-indigo-600" />
                                    <span class="text-sm font-medium text-slate-900">{{ mission.projectTitle || 'Chargement...' }}</span>
                                </div>
                            </div>
                            <div>
                                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expert assigné</p>
                                <div v-if="mission.expertName" class="flex items-center gap-2">
                                    <Icon name="heroicons:user" class="w-4 h-4 text-emerald-600" />
                                    <span class="text-sm font-medium text-emerald-700">{{ mission.expertName }}</span>
                                </div>
                                <span v-else class="text-sm text-slate-400 italic">Aucun expert assigné</span>
                            </div>
                        </div>

                        <!-- Date info -->
                        <div class="flex items-center gap-4 text-xs text-slate-500">
                            <span><strong>Créée:</strong> {{ formatDate(mission.createdAt) }}</span>
                            <span><strong>Modifiée:</strong> {{ formatDate(mission.updatedAt) }}</span>
                        </div>

                        <!-- Expert Assignment Section (only for pending_admin) -->
                        <div v-if="mission.status === 'pending_admin'" class="border-t border-slate-200 pt-4">
                            <p class="text-sm font-semibold text-slate-800 mb-3">
                                <Icon name="heroicons:user-plus" class="w-4 h-4 inline mr-1 text-blue-600" />
                                Assigner un expert
                            </p>
                            
                            <div v-if="missionsStore.availableExperts.length === 0" class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                <p class="text-xs text-amber-700 font-medium">Aucun expert disponible actuellement</p>
                            </div>
                            
                            <div v-else class="flex flex-col sm:flex-row gap-3">
                                <select
                                    v-model="selectedExpert[mission.id]"
                                    class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    @click.stop
                                >
                                    <option value="">Sélectionner un expert...</option>
                                    <option 
                                        v-for="expert in missionsStore.availableExperts" 
                                        :key="expert.uid" 
                                        :value="expert.uid"
                                    >
                                        {{ expert.firstName }} {{ expert.lastName }} ({{ expert.email }})
                                    </option>
                                </select>
                                
                                <button
                                    type="button"
                                    class="inline-flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    :disabled="!selectedExpert[mission.id] || assigningMission === mission.id"
                                    @click.stop="handleAssignExpert(mission.id)"
                                >
                                    <Icon 
                                        v-if="assigningMission === mission.id" 
                                        name="heroicons:arrow-path" 
                                        class="w-4 h-4 animate-spin" 
                                    />
                                    <Icon v-else name="heroicons:check" class="w-4 h-4" />
                                    {{ assigningMission === mission.id ? 'Assignation...' : 'Assigner' }}
                                </button>
                            </div>
                        </div>

                        <!-- Cancel Expert Section (for proposed/accepted) -->
                        <div v-if="mission.expertId && (mission.status === 'proposed' || mission.status === 'accepted')" class="border-t border-slate-200 pt-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-slate-800">Expert actuel: <span class="text-emerald-700">{{ mission.expertName }}</span></p>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        {{ mission.status === 'proposed' ? 'En attente de réponse de l\'expert' : 'Mission en cours' }}
                                    </p>
                                </div>
                                <button
                                    @click.stop="handleCancelExpert(mission.id, mission.expertId!)"
                                    :disabled="cancellingMission === mission.id"
                                    class="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                    <Icon v-if="cancellingMission === mission.id" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                    <Icon v-else name="heroicons:user-minus" class="w-4 h-4" />
                                    Retirer l'expert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
