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

const { user, profile } = useAuth()
const projectsStore = useProjectsStore()
const missionsStore = useMissionsStore()
const router = useRouter()

// Local state
const isRequestingSubscription = ref(false)

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
        await Promise.all([
            projectsStore.fetchProjects(uid),
            missionsStore.fetchMissionsByEnterprise(uid)
        ])
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
        <div class="mb-8">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Mes Projets</h1>
                    <p class="text-slate-600 mt-2">Gérez et suivez vos projets de construction BIM</p>
                </div>
                
                <!-- Create button or subscription CTA -->
                <div v-if="projectsStore.canCreateMore">
                    <NuxtLink 
                        to="/entreprise/projets/create"
                        class="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
                    >
                        <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                        Nouveau projet
                    </NuxtLink>
                </div>
                <div v-else-if="!projectsStore.subscriptionRequestPending" class="text-right">
                    <div class="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                        <Icon name="heroicons:star" class="w-5 h-5 text-blue-600" />
                        <div class="text-left">
                            <p class="text-sm font-semibold text-slate-900">Limite atteinte</p>
                            <p class="text-xs text-slate-600">Vous avez utilisé votre projet gratuit</p>
                        </div>
                        <button
                            type="button"
                            class="ms-2 text-sm font-medium text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
                            :disabled="isRequestingSubscription"
                            @click="handleRequestSubscription"
                        >
                            {{ isRequestingSubscription ? 'Envoi...' : 'Demander un abonnement' }}
                        </button>
                    </div>
                </div>
                <div v-else class="text-right">
                    <div class="inline-flex items-center gap-2 px-5 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">
                        <Icon name="heroicons:check-circle" class="w-5 h-5" />
                        Demande d'abonnement envoyée (en attente)
                    </div>
                </div>
            </div>
            
            <!-- Quick stats -->
            <div v-if="!projectsStore.loading && projectsStore.projects.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg border border-slate-200 p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-900">{{ projectsStore.projects.length }}</p>
                            <p class="text-xs text-slate-500">Total projets</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg border border-slate-200 p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Icon name="heroicons:play-circle" class="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-900">{{ projectsStore.projects.filter(p => p.status === 'active').length }}</p>
                            <p class="text-xs text-slate-500">En cours</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg border border-slate-200 p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-900">{{ projectsStore.projects.filter(p => p.status === 'completed').length }}</p>
                            <p class="text-xs text-slate-500">Terminés</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg border border-slate-200 p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Icon name="heroicons:briefcase" class="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-900">0</p>
                            <p class="text-xs text-slate-500">Missions actives</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading state -->
        <div v-if="projectsStore.loading" class="flex flex-col items-center justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p class="text-slate-600">Chargement de vos projets...</p>
        </div>
        
        <!-- Error state -->
        <div v-else-if="projectsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
            <p class="text-red-700">{{ projectsStore.error }}</p>
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
                </NuxtLink>
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
