<script setup lang="ts">
/**
 * Project Detail Page - Redesigned UX/UI
 * 
 * Improvements:
 * - Visual workflow timeline
 * - Missions grouped by status with color coding
 * - Progress summary
 * - Quick actions
 */
import { useProjectsStore } from '~/stores/projects'
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const route = useRoute()
const { user } = useAuth()
const projectsStore = useProjectsStore()
const missionsStore = useMissionsStore()

const projectId = computed(() => route.params.id as string)

// Load data on mount, only after user is authenticated
onMounted(async () => {
    const id = projectId.value
    if (!id) return
    
    // Wait for user to be authenticated (middleware ensures this)
    // Add a small delay to ensure auth is fully ready
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (user.value?.uid) {
        try {
            await Promise.all([
                projectsStore.fetchProject(id),
                missionsStore.fetchMissionsByProject(id)
            ])
        } catch (err) {
            console.error('Error loading project data:', err)
        }
    }
})

// Watch for project ID changes (when navigating between projects)
watch(projectId, async (newId, oldId) => {
    if (newId && newId !== oldId && user.value?.uid) {
        try {
            await Promise.all([
                projectsStore.fetchProject(newId),
                missionsStore.fetchMissionsByProject(newId)
            ])
        } catch (err) {
            console.error('Error loading project data:', err)
        }
    }
})

// Watch route to refresh missions when coming back from mission creation  
// This triggers on navigation but missions in store persist during reload
watch(() => route.path, async (newPath, oldPath) => {
    // If we're on project details page and coming from mission create page
    if (newPath.startsWith('/entreprise/projets/') && 
        !newPath.includes('/create') && 
        oldPath?.includes('/missions/create') &&
        projectId.value) {
        // Silently refresh missions - they won't flash because store keeps old data during loading
        await missionsStore.fetchMissionsByProject(projectId.value)
    }
})



// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date)
}

// Status config interfaces
interface ProjectStatusConfig { bg: string; text: string; icon: string; label: string }
interface MissionStatusConfig { bg: string; text: string; border: string; icon: string; label: string }

// Get project status config
function getProjectStatusConfig(status: string | undefined | null): ProjectStatusConfig {
    const defaultConfig: ProjectStatusConfig = { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'heroicons:play-circle', label: 'En cours' }
    const configs: Record<string, ProjectStatusConfig> = {
        active: defaultConfig,
        completed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'heroicons:check-circle', label: 'Terminé' }
    }
    return configs[status || 'active'] ?? defaultConfig
}

// Get mission status config
function getMissionStatusConfig(status: string | undefined | null): MissionStatusConfig {
    const defaultConfig: MissionStatusConfig = { 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        icon: 'heroicons:clock', 
        label: 'En attente admin' 
    }
    const configs: Record<string, MissionStatusConfig> = {
        pending_admin: defaultConfig,
        proposed: { 
            bg: 'bg-purple-50', 
            text: 'text-purple-700', 
            border: 'border-purple-200',
            icon: 'heroicons:user-plus', 
            label: 'Proposée à expert' 
        },
        accepted: { 
            bg: 'bg-emerald-50', 
            text: 'text-emerald-700', 
            border: 'border-emerald-200',
            icon: 'heroicons:check-circle', 
            label: 'En cours' 
        },
        refused: { 
            bg: 'bg-slate-50', 
            text: 'text-slate-500', 
            border: 'border-slate-200',
            icon: 'heroicons:x-circle', 
            label: 'Refusée' 
        },
        completed: { 
            bg: 'bg-blue-50', 
            text: 'text-blue-700', 
            border: 'border-blue-200',
            icon: 'heroicons:trophy', 
            label: 'Terminée' 
        }
    }
    return configs[status || 'pending_admin'] ?? defaultConfig
}

// Group missions by status
const missionsByStatus = computed(() => {
    const groups = {
        pending_admin: missionsStore.missions.filter(m => m.status === 'pending_admin'),
        proposed: missionsStore.missions.filter(m => m.status === 'proposed'),
        accepted: missionsStore.missions.filter(m => m.status === 'accepted'),
        completed: missionsStore.missions.filter(m => m.status === 'completed'),
        refused: missionsStore.missions.filter(m => m.status === 'refused')
    }
    return groups
})

// Calculate progress
const progress = computed(() => {
    const total = missionsStore.missions.length
    const completed = missionsByStatus.value.completed.length
    return total > 0 ? Math.round((completed / total) * 100) : 0
})

// Navigate to project management workspace
function handleGestion() {
    navigateTo(`/projet/${projectId.value}/documents`)
}
</script>

<template>
    <div class="max-w-6xl mx-auto">
        <!-- Back link -->
        <NuxtLink 
            to="/entreprise/projets"
            class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium"
        >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Retour aux projets
        </NuxtLink>
        
        <!-- Loading state -->
        <div v-if="projectsStore.loading" class="flex flex-col items-center justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p class="text-slate-600">Chargement du projet...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="projectsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
            <p class="text-red-700">{{ projectsStore.error }}</p>
        </div>
        
        <!-- Project not found -->
        <div v-else-if="!projectsStore.currentProject" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:folder-open" class="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Projet introuvable</h3>
            <NuxtLink to="/entreprise/projets" class="text-blue-600 hover:underline font-medium">
                Retour à la liste
            </NuxtLink>
        </div>
        
        <!-- Project details -->
        <template v-else>
            <!-- Project header -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-4">
                            <div :class="[getProjectStatusConfig(projectsStore.currentProject?.status).bg, getProjectStatusConfig(projectsStore.currentProject?.status).text]" 
                                 class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium">
                                <Icon :name="getProjectStatusConfig(projectsStore.currentProject?.status).icon" class="w-4 h-4" />
                                {{ getProjectStatusConfig(projectsStore.currentProject?.status).label }}
                            </div>
                        </div>
                        <h1 class="text-3xl font-bold text-slate-900 mb-3">
                            {{ projectsStore.currentProject?.title }}
                        </h1>
                        <p class="text-slate-600 leading-relaxed">
                            {{ projectsStore.currentProject?.description }}
                        </p>
                    </div>
                    
                    <!-- Quick actions -->
                    <div class="flex items-center gap-3">
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                            @click="handleGestion"
                        >
                            <Icon name="heroicons:cog-6-tooth" class="w-5 h-5" />
                            Gestion
                        </button>
                        <NuxtLink 
                            :to="`/entreprise/missions/create?projectId=${projectId}`"
                            class="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                        >
                            <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                            Nouvelle mission
                        </NuxtLink>
                    </div>
                </div>
                
                <!-- Project metadata -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:map-pin" class="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Adresse</p>
                            <p class="text-sm font-semibold text-slate-900">{{ projectsStore.currentProject?.address }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:calendar-days" class="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Date de début</p>
                            <p class="text-sm font-semibold text-slate-900">{{ projectsStore.currentProject?.startDate ? formatDate(projectsStore.currentProject.startDate) : '-' }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Icon name="heroicons:briefcase" class="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Missions</p>
                            <p class="text-sm font-semibold text-slate-900">{{ missionsStore.missions.length }} total</p>
                        </div>
                    </div>
                </div>
                
                <!-- Progress bar -->
                <div v-if="missionsStore.missions.length > 0" class="mt-6 pt-6 border-t border-slate-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-slate-700">Progression du projet</span>
                        <span class="text-sm font-bold text-blue-600">{{ progress }}%</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                            class="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                            :style="{ width: `${progress}%` }"
                        ></div>
                    </div>
                    <p class="text-xs text-slate-500 mt-2">
                        {{ missionsByStatus.completed.length }} mission(s) terminée(s) sur {{ missionsStore.missions.length }}
                    </p>
                </div>
            </div>
            
            <!-- Missions Section -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div class="px-6 py-5 border-b border-slate-200">
                    <h2 class="text-xl font-bold text-slate-900">Missions du projet</h2>
                    <p class="text-sm text-slate-600 mt-1">Suivez l'avancement de vos missions BIM</p>
                </div>
                
                <!-- Missions loading -->
                <div v-if="missionsStore.loading" class="p-12 text-center">
                    <Icon name="heroicons:arrow-path" class="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p class="text-slate-600">Chargement des missions...</p>
                </div>
                
                <!-- Empty missions -->
                <div v-else-if="missionsStore.missions.length === 0" class="p-12 text-center">
                    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="heroicons:briefcase" class="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 class="text-lg font-semibold text-slate-900 mb-2">Aucune mission</h3>
                    <p class="text-sm text-slate-600 mb-6">Créez votre première mission pour ce projet.</p>
                    <NuxtLink 
                        :to="`/entreprise/missions/create?projectId=${projectId}`"
                        class="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
                    >
                        <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                        Créer une mission
                    </NuxtLink>
                </div>
                
                <!-- Missions grouped by status -->
                <div v-else class="p-6 space-y-6">
                    <!-- Pending Admin -->
                    <div v-if="missionsByStatus.pending_admin.length > 0">
                        <div class="flex items-center gap-2 mb-3">
                            <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
                            <h3 class="text-sm font-semibold text-slate-900">En attente d'assignation</h3>
                            <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                {{ missionsByStatus.pending_admin.length }}
                            </span>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="mission in missionsByStatus.pending_admin"
                                :key="mission.id"
                                :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).border]"
                                class="border-2 rounded-lg p-4"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-slate-900 mb-1">{{ mission.title }}</h4>
                                        <p class="text-sm text-slate-600 line-clamp-2">{{ mission.description }}</p>
                                    </div>
                                    <div :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).text]"
                                         class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                        <Icon :name="getMissionStatusConfig(mission.status).icon" class="w-3.5 h-3.5" />
                                        {{ getMissionStatusConfig(mission.status).label }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Proposed to Expert -->
                    <div v-if="missionsByStatus.proposed.length > 0">
                        <div class="flex items-center gap-2 mb-3">
                            <Icon name="heroicons:user-plus" class="w-5 h-5 text-purple-600" />
                            <h3 class="text-sm font-semibold text-slate-900">Proposées à un expert</h3>
                            <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                {{ missionsByStatus.proposed.length }}
                            </span>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="mission in missionsByStatus.proposed"
                                :key="mission.id"
                                :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).border]"
                                class="border-2 rounded-lg p-4"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-slate-900 mb-1">{{ mission.title }}</h4>
                                        <p class="text-sm text-slate-600 line-clamp-2">{{ mission.description }}</p>
                                        <div v-if="(mission as any).expertName" class="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                            <Icon name="heroicons:user" class="w-3 h-3" />
                                            Expert: <span class="font-medium text-slate-700">{{ (mission as any).expertName }}</span>
                                        </div>
                                    </div>
                                    <div :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).text]"
                                         class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                        <Icon :name="getMissionStatusConfig(mission.status).icon" class="w-3.5 h-3.5" />
                                        {{ getMissionStatusConfig(mission.status).label }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- In Progress -->
                    <div v-if="missionsByStatus.accepted.length > 0">
                        <div class="flex items-center gap-2 mb-3">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-600" />
                            <h3 class="text-sm font-semibold text-slate-900">En cours de réalisation</h3>
                            <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                {{ missionsByStatus.accepted.length }}
                            </span>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="mission in missionsByStatus.accepted"
                                :key="mission.id"
                                :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).border]"
                                class="border-2 rounded-lg p-4"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-slate-900 mb-1">{{ mission.title }}</h4>
                                        <p class="text-sm text-slate-600 line-clamp-2">{{ mission.description }}</p>
                                        <div v-if="(mission as any).expertName" class="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                            <Icon name="heroicons:user" class="w-3 h-3" />
                                            Expert: <span class="font-medium text-slate-700">{{ (mission as any).expertName }}</span>
                                        </div>
                                    </div>
                                    <div :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).text]"
                                         class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                        <Icon :name="getMissionStatusConfig(mission.status).icon" class="w-3.5 h-3.5" />
                                        {{ getMissionStatusConfig(mission.status).label }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Completed -->
                    <div v-if="missionsByStatus.completed.length > 0">
                        <div class="flex items-center gap-2 mb-3">
                            <Icon name="heroicons:trophy" class="w-5 h-5 text-blue-600" />
                            <h3 class="text-sm font-semibold text-slate-900">Terminées</h3>
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {{ missionsByStatus.completed.length }}
                            </span>
                        </div>
                        <div class="space-y-2">
                            <div
                                v-for="mission in missionsByStatus.completed"
                                :key="mission.id"
                                :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).border]"
                                class="border-2 rounded-lg p-4"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-slate-900 mb-1">{{ mission.title }}</h4>
                                        <p class="text-sm text-slate-600 line-clamp-2">{{ mission.description }}</p>
                                        <div v-if="(mission as any).expertName" class="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                            <Icon name="heroicons:user" class="w-3 h-3" />
                                            Expert: <span class="font-medium text-slate-700">{{ (mission as any).expertName }}</span>
                                        </div>
                                    </div>
                                    <div :class="[getMissionStatusConfig(mission.status).bg, getMissionStatusConfig(mission.status).text]"
                                         class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                        <Icon :name="getMissionStatusConfig(mission.status).icon" class="w-3.5 h-3.5" />
                                        {{ getMissionStatusConfig(mission.status).label }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
