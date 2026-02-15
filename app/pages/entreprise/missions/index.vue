<script setup lang="ts">
/**
 * Enterprise Missions List Page - Grouped by Project
 * 
 * Features:
 * - Missions grouped by project
 * - Delete mission functionality
 * - Status filters
 * - Expert info when assigned
 */
import { useMissionsStore } from '~/stores/missions'
import { useProjectsStore } from '~/stores/projects'
import type { Project, MissionWithDetails } from '~/types'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user, isMember, profile } = useAuth()
const missionsStore = useMissionsStore()
const projectsStore = useProjectsStore()

// Active filter
const activeFilter = ref<string>('all')

// Mission states
const completingMission = ref<string | null>(null)
const deletingMission = ref<string | null>(null)
const cancellingExpert = ref<string | null>(null)

// Load data based on role
async function loadData() {
    const uid = user.value?.uid
    if (!uid) return

    if (isMember.value) {
        // Member: load assigned projects, then missions for those projects
        await projectsStore.fetchMemberProjects(uid)
        if (projectsStore.projects.length > 0) {
            const projectIds = projectsStore.projects.map(p => p.id)
            await missionsStore.fetchMissionsForProjects(projectIds)
        }
    } else {
        // Gérant: load all enterprise projects and missions
        await Promise.all([
            projectsStore.fetchProjects(uid),
            missionsStore.fetchMissionsByEnterprise(uid)
        ])
    }
}

onMounted(loadData)
watch(() => user.value?.uid, loadData)

// Handle mission completion
async function handleCompleteMission(missionId: string) {
    if (!confirm('Êtes-vous sûr de vouloir marquer cette mission comme terminée ?')) return
    
    completingMission.value = missionId
    try {
        const success = await missionsStore.completeMission(missionId)
        if (success) {
            await loadData()
        }
    } finally {
        completingMission.value = null
    }
}

// Handle cancel expert
async function handleCancelExpert(missionId: string, expertId: string) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet expert ?\n\nSa disponibilité sera désactivée et la mission retournera en attente d\'assignation.')) {
        return
    }
    
    cancellingExpert.value = missionId
    try {
        const success = await missionsStore.cancelExpert(missionId, expertId)
        if (!success) {
            alert('Erreur lors de l\'annulation de l\'expert')
        }
    } finally {
        cancellingExpert.value = null
    }
}

// Handle mission deletion
async function handleDeleteMission(missionId: string, missionTitle: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la mission "${missionTitle}" ?\n\nCette action est irréversible.`)) {
        return
    }
    
    deletingMission.value = missionId
    try {
        const success = await missionsStore.deleteMission(missionId)
        if (!success) {
            alert('Erreur lors de la suppression de la mission')
        }
    } finally {
        deletingMission.value = null
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

// Group missions by project
const missionsByProject = computed(() => {
    const grouped = new Map<string, { project: Project, missions: MissionWithDetails[] }>()
    
    filteredMissions.value.forEach(mission => {
        if (!grouped.has(mission.projectId)) {
            const project = projectsStore.projects.find(p => p.id === mission.projectId)
            if (project) {
                grouped.set(mission.projectId, { project, missions: [] })
            }
        }
        grouped.get(mission.projectId)?.missions.push(mission)
    })
    
    return Array.from(grouped.values())
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
            <p class="text-slate-600">Suivez l'avancement de toutes vos missions BIM, organisées par projet</p>
        </div>
        
        <!-- Stats cards -->
        <div v-if="!missionsStore.loading && missionsStore.missions.length > 0" class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
            <button
                type="button"
                @click="activeFilter = 'all'"
                :class="activeFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'"
                class="p-3 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icon name="heroicons:briefcase" class="w-4 h-4 text-slate-600" />
                    <p class="text-xs font-medium text-slate-600">Toutes</p>
                </div>
                <p class="text-xl font-bold text-slate-900">{{ statusCounts.all }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'pending_admin'"
                :class="activeFilter === 'pending_admin' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-white hover:bg-slate-50'"
                class="p-3 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icon name="heroicons:clock" class="w-4 h-4 text-amber-600" />
                    <p class="text-xs font-medium text-amber-700">En attente</p>
                </div>
                <p class="text-xl font-bold text-slate-900">{{ statusCounts.pending_admin }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'proposed'"
                :class="activeFilter === 'proposed' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-white hover:bg-slate-50'"
                class="p-3 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icon name="heroicons:user-plus" class="w-4 h-4 text-purple-600" />
                    <p class="text-xs font-medium text-purple-700">Proposées</p>
                </div>
                <p class="text-xl font-bold text-slate-900">{{ statusCounts.proposed }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'accepted'"
                :class="activeFilter === 'accepted' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white hover:bg-slate-50'"
                class="p-3 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
                    <p class="text-xs font-medium text-emerald-700">En cours</p>
                </div>
                <p class="text-xl font-bold text-slate-900">{{ statusCounts.accepted }}</p>
            </button>
            
            <button
                type="button"
                @click="activeFilter = 'completed'"
                :class="activeFilter === 'completed' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'"
                class="p-3 rounded-lg border border-slate-200 transition-all text-left"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icon name="heroicons:trophy" class="w-4 h-4 text-blue-600" />
                    <p class="text-xs font-medium text-blue-700">Terminées</p>
                </div>
                <p class="text-xl font-bold text-slate-900">{{ statusCounts.completed }}</p>
            </button>
        </div>
        
        <!-- Loading state -->
        <div v-if="missionsStore.loading || projectsStore.loading" class="flex flex-col items-center justify-center py-20">
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
        <div v-else-if="missionsByProject.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
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
        
        <!-- Missions grouped by project -->
        <div v-else class="space-y-8">
            <div v-for="{ project, missions } in missionsByProject" :key="project.id">
                <!-- Project Header -->
                <div class="bg-white border-2 border-slate-200 border-b-0 rounded-t-xl px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Icon name="heroicons:folder" class="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h2 class="text-base font-bold text-slate-900">{{ project.title }}</h2>
                                <p class="text-xs text-slate-500">{{ missions.length }} mission(s)</p>
                            </div>
                        </div>
                        <NuxtLink
                            :to="`/entreprise/projets/${project.id}`"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Icon name="heroicons:folder-open" class="w-4 h-4" />
                            Voir le projet
                        </NuxtLink>
                    </div>
                </div>
                
                <!-- Missions List -->
                <div class="bg-white rounded-b-xl border-2 border-t-0 border-slate-200 divide-y divide-slate-100">
                    <div
                        v-for="mission in missions"
                        :key="mission.id"
                        class="px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                        <!-- Row 1: Status + Title + Date + Actions (compact single row) -->
                        <div class="flex items-center gap-3">
                            <!-- Status badge (compact) -->
                            <div :class="[getMissionStatusConfig(mission.status)?.bg, getMissionStatusConfig(mission.status)?.text]" 
                                 class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                <Icon :name="getMissionStatusConfig(mission.status)?.icon || 'heroicons:question-mark-circle'" class="w-3.5 h-3.5" />
                                {{ getMissionStatusConfig(mission.status)?.label || mission.status }}
                            </div>
                            
                            <!-- Title + description -->
                            <div class="flex-1 min-w-0">
                                <h3 class="text-sm font-semibold text-slate-900 truncate">{{ mission.title }}</h3>
                                <p class="text-xs text-slate-500 truncate">{{ mission.description }}</p>
                            </div>
                            
                            <!-- Expert info (compact, only when accepted+) -->
                            <div v-if="mission.expertId && mission.status !== 'proposed'" class="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                                <Icon name="heroicons:user" class="w-3.5 h-3.5 text-emerald-600" />
                                <span class="font-medium text-emerald-700">
                                    {{ mission.expertName || 'Expert assigné' }}
                                </span>
                            </div>
                            
                            <!-- Date -->
                            <span class="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                                <Icon name="heroicons:calendar" class="w-3.5 h-3.5" />
                                {{ formatDate(mission.createdAt) }}
                            </span>
                            
                            <!-- Action buttons (compact, inline) -->
                            <div class="flex items-center gap-1.5">
                                <!-- Complete mission (accepted only) -->
                                <button
                                    v-if="mission.status === 'accepted'"
                                    type="button"
                                    @click="handleCompleteMission(mission.id)"
                                    :disabled="completingMission === mission.id"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                                    title="Marquer terminée"
                                >
                                    <Icon v-if="completingMission === mission.id" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
                                    <Icon v-else name="heroicons:check-badge" class="w-3.5 h-3.5" />
                                    Terminée
                                </button>

                                
                                <!-- Delete button -->
                                <button
                                    type="button"
                                    @click="handleDeleteMission(mission.id, mission.title)"
                                    :disabled="deletingMission === mission.id"
                                    class="inline-flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition-colors disabled:opacity-50"
                                    title="Supprimer cette mission"
                                >
                                    <Icon v-if="deletingMission === mission.id" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin" />
                                    <Icon v-else name="heroicons:trash" class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
