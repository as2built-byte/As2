<script setup lang="ts">
/**
 * Enterprise Projects List Page - Redesigned UX/UI
 * 
 * Improvements:
 * - Clear visual hierarchy with status cards
 * - Mission count per project
 * - Meaningful icons with context
 * - Better empty state with onboarding
 */

import { useProjectsStore } from '~/stores/projects'
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user, profile, isMember } = useAuth()
const projectsStore = useProjectsStore()
const missionsStore = useMissionsStore()
const router = useRouter()

// Local state
const isRequestingSubscription = ref(false)

// Log canCreateMore value
console.log('🔍 projets/index.vue - canCreateMore:', projectsStore.canCreateMore)
console.log('🔍 projets/index.vue - projectsStore:', projectsStore.$state)

// Watch canCreateMore changes
watch(() => projectsStore.canCreateMore, (newValue, oldValue) => {
    console.log('🔄 canCreateMore changed:', { oldValue, newValue })
})

// Status config interface
interface ProjectStatusConfig { bg: string; text: string; icon: string; label: string }

// Get status config
function getStatusConfig(status: string | undefined | null): ProjectStatusConfig {
    const defaultConfig: ProjectStatusConfig = { 
        bg: 'bg-emerald-100', 
        text: 'text-emerald-700', 
        icon: 'heroicons:play-circle',
        label: 'En cours' 
    }
    const configs: Record<string, ProjectStatusConfig> = {
        active: defaultConfig,
        completed: { 
            bg: 'bg-blue-100', 
            text: 'text-blue-700', 
            icon: 'heroicons:check-circle', 
            label: 'Terminé' 
        },
    
    }
    return configs[status || 'active'] ?? defaultConfig
}

// Get mission count for a project
function getMissionCount(projectId: string): number {
    return missionsStore.missions.filter(m => m.projectId === projectId).length
}

// Fetch projects and missions when user is available
watch(() => user.value?.uid, async (uid) => {
    if (uid) {
        // Load projects first
        if (isMember.value) {
            await projectsStore.fetchMemberProjects(uid)
            // Members: load missions only for their assigned projects
            if (projectsStore.projects.length > 0) {
                const projectIds = projectsStore.projects.map(p => p.id)
                await missionsStore.fetchMissionsForProjects(projectIds)
            }
        } else {
            // Gérant: load all projects and missions
            const enterpriseId = uid
            await Promise.all([
                projectsStore.fetchProjects(enterpriseId),
                missionsStore.fetchMissionsByEnterprise(enterpriseId)
            ])
        }
    }
}, { immediate: true })

// Request subscription
async function handleRequestSubscription() {
    if (!user.value?.uid || !projectsStore.enterpriseProfile?.companyName) return
    
    isRequestingSubscription.value = true
    try {
        await projectsStore.requestSubscription(
            user.value.uid,
            projectsStore.enterpriseProfile.companyName
        )
        // Refresh to get updated subscriptionRequestPending
        await projectsStore.fetchProjects(user.value.uid)
    } finally {
        isRequestingSubscription.value = false
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
    <div class="max-w-7xl mx-auto">
        <!-- Header with stats -->
            <div class="page-header">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                    <h1 class="page-title">Mes Projets</h1>
                    <p class="page-subtitle">Gérez et suivez vos projets de construction BIM</p>
                </div>
                
                <!-- Create button or subscription CTA (gérant only) -->
                <template v-if="!isMember">
                    <div v-if="projectsStore.canCreateMore">
                        <NuxtLink 
                            to="/entreprise/projets/create"
                            class="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
                        >
                            <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                            Nouveau projet
                            <span class="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                                {{ projectsStore.projectsCountString }}
                            </span>
                        </NuxtLink>
                    </div>
                    <div v-else class="flex items-center gap-3">
                        <div class="text-right">
                            <p class="text-sm text-slate-500 mb-2">
                                Limite atteinte : {{ projectsStore.projectsCountString }}
                            </p>
                            <NuxtLink 
                                to="/entreprise/abonnement"
                                class="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 shadow-sm hover:shadow-md transition-all"
                            >
                                <Icon name="heroicons:arrow-up-circle" class="w-5 h-5" />
                                Upgrade
                            </NuxtLink>
                        </div>
                    </div>
                </template>
            </div>
            
            <!-- Quick stats -->
            <div v-if="!projectsStore.loading && projectsStore.projects.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="stat-card">
                    <div class="flex items-center gap-3">
                        <div class="kpi-icon bg-blue-100">
                            <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p class="stat-value">{{ projectsStore.projects.length }}</p>
                            <p class="stat-label">Total projets</p>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="flex items-center gap-3">
                        <div class="kpi-icon bg-emerald-100">
                            <Icon name="heroicons:play-circle" class="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p class="stat-value">{{ projectsStore.projects.filter(p => p.status === 'active').length }}</p>
                            <p class="stat-label">En cours</p>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="flex items-center gap-3">
                        <div class="kpi-icon bg-blue-100">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p class="stat-value">{{ projectsStore.projects.filter(p => p.status === 'completed').length }}</p>
                            <p class="stat-label">Terminés</p>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="flex items-center gap-3">
                        <div class="kpi-icon bg-purple-100">
                            <Icon name="heroicons:briefcase" class="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p class="stat-value">{{ missionsStore.missions.filter(m => m.status === 'accepted').length }}</p>
                            <p class="stat-label">Missions actives</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading state -->
        <div v-if="projectsStore.loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>
        
        <!-- Error state -->
        <div v-else-if="projectsStore.error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ projectsStore.error }}</span>
        </div>
        
        <!-- Empty state with onboarding -->
        <div v-else-if="projectsStore.projects.length === 0" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200 p-12 text-center">
            <div class="max-w-md mx-auto">
                <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="heroicons:building-office-2" class="w-10 h-10 text-blue-600" />
                </div>
                <h3 class="text-2xl font-bold text-slate-900 mb-3">Créez votre premier projet</h3>
                <p class="text-slate-600 mb-6">
                    Commencez à digitaliser vos projets de construction avec la méthodologie BIM. 
                    Ajoutez des missions, collaborez avec des experts certifiés.
                </p>
                
                <!-- Onboarding steps -->
                <div class="bg-white rounded-lg p-6 mb-6 text-left">
                    <p class="text-sm font-semibold text-slate-700 mb-4">Comment ça marche ?</p>
                    <div class="space-y-3">
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                            <p class="text-sm text-slate-600">Créez un projet avec les détails du chantier</p>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                            <p class="text-sm text-slate-600">Ajoutez des missions BIM spécifiques</p>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                            <p class="text-sm text-slate-600">Un expert certifié sera assigné à vos missions</p>
                        </div>
                    </div>
                </div>
                
                <NuxtLink 
                    v-if="projectsStore.canCreateMore"
                    to="/entreprise/projets/create"
                    class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                >
                    <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                    Créer mon premier projet
                    <span class="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                        {{ projectsStore.projectsCountString }}
                    </span>
                </NuxtLink>
                
                <!-- Upgrade message when project limit reached -->
                <UpgradeMessage
                    v-else
                    feature="projects"
                    required-plan="silver"
                    :custom-message="projectsStore.projectLimitMessage"
                />
            </div>
        </div>
        
        <!-- Projects grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NuxtLink
                v-for="project in projectsStore.projects"
                :key="project.id"
                :to="`/entreprise/projets/${project.id}`"
                class="group bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-200"
            >
                <!-- Header with status -->
                <div class="mb-4">
                    <div :class="[getStatusConfig(project.status).bg, getStatusConfig(project.status).text]" 
                         class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium">
                        <Icon :name="getStatusConfig(project.status).icon" class="w-4 h-4" />
                        {{ getStatusConfig(project.status).label }}
                    </div>
                </div>
                
                <!-- Project title and description -->
                <h3 class="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {{ project.title }}
                </h3>
                <p class="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                    {{ project.description }}
                </p>
                
                <!-- Metadata -->
                <div class="space-y-2.5 mb-4">
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="heroicons:map-pin" class="w-4 h-4 text-slate-400" />
                        <span class="truncate">{{ project.address }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="heroicons:calendar-days" class="w-4 h-4 text-slate-400" />
                        <span>Début: {{ formatDate(project.startDate) }}</span>
                    </div>
                </div>
                
                <!-- Mission count -->
                <div class="pt-4 border-t border-slate-100">
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="heroicons:briefcase" class="w-4 h-4 text-purple-500" />
                        <span class="font-medium">{{ getMissionCount(project.id) }} missions</span>
                    </div>
                </div>
            </NuxtLink>
        </div>
        

    </div>
</template>
