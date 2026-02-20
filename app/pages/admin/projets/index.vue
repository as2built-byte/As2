<script setup lang="ts">
/**
 * Admin Projects List - All platform projects
 * 
 * Simple responsive list with status, address, date, and mission count
 */

import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'
import { getAllProjects, getAllMissionsForAdmin, getEnterpriseProfile } from '~/firebase/services/firestore'
import type { Project, Mission } from '~/types'

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

const loading = ref(true)
const error = ref<string | null>(null)
const projects = ref<Project[]>([])
const missions = ref<Mission[]>([])
const searchQuery = ref('')
const enterpriseNames = ref<Record<string, string>>({})
const statusFilter = ref<'all' | 'active' | 'completed'>('all')

// Fetch data
onMounted(async () => {
    try {
        const [p, m] = await Promise.all([
            getAllProjects(),
            getAllMissionsForAdmin()
        ])
        projects.value = p
        missions.value = m

        // Fetch enterprise names for all projects
        const uniqueEnterpriseIds = [...new Set(p.map(proj => proj.enterpriseId))]
        const profiles = await Promise.all(
            uniqueEnterpriseIds.map(async (id) => {
                try {
                    const profile = await getEnterpriseProfile(id)
                    return { id, name: profile?.companyName || 'Entreprise inconnue' }
                } catch {
                    return { id, name: 'Entreprise inconnue' }
                }
            })
        )
        const namesMap: Record<string, string> = {}
        profiles.forEach(p => { namesMap[p.id] = p.name })
        enterpriseNames.value = namesMap
    } catch (e) {
        console.error('Error loading projects:', e)
        error.value = 'Erreur lors du chargement des projets'
    } finally {
        loading.value = false
    }
})

// Filtered projects
const filteredProjects = computed(() => {
    return projects.value.filter(p => {
        if (statusFilter.value !== 'all' && p.status !== statusFilter.value) return false
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase()
            const eName = (enterpriseNames.value[p.enterpriseId] || '').toLowerCase()
            return (
                p.title.toLowerCase().includes(q) ||
                p.address.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                eName.includes(q)
            )
        }
        return true
    })
})

// Mission count for a project
function getMissionCount(projectId: string): number {
    return missions.value.filter(m => m.projectId === projectId).length
}

// Status helpers
function statusLabel(status: string): string {
    if (status === 'completed') return 'Terminé'
    return 'Actif'
}

function statusClasses(status: string): string {
    if (status === 'completed') return 'bg-blue-100 text-blue-700'
    return 'bg-emerald-100 text-emerald-700'
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
    <div class="page-container">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Projets</h1>
            <p class="page-subtitle">Tous les projets de la plateforme</p>
        </div>

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-3 mb-6">
            <!-- Search -->
            <div class="relative flex-1">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher un projet..."
                    class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <!-- Status filter -->
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                    :class="statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="statusFilter = 'all'"
                >
                    Tous ({{ projects.length }})
                </button>
                <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                    :class="statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="statusFilter = 'active'"
                >
                    Actifs ({{ projects.filter(p => p.status === 'active').length }})
                </button>
                <button
                    type="button"
                    class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                    :class="statusFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="statusFilter = 'completed'"
                >
                    Terminés ({{ projects.filter(p => p.status === 'completed').length }})
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredProjects.length === 0" class="state-empty">
            <div class="state-empty-icon">
                <Icon name="heroicons:folder-open" class="w-8 h-8 text-slate-400" />
            </div>
            <h3 class="state-empty-title">
                {{ searchQuery || statusFilter !== 'all' ? 'Aucun projet trouvé' : 'Aucun projet sur la plateforme' }}
            </h3>
        </div>

        <!-- Projects List -->
        <div v-else class="space-y-3">
            <NuxtLink
                v-for="project in filteredProjects"
                :key="project.id"
                :to="`/projet/${project.id}/documents`"
                class="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
            >
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                    <!-- Left: Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-1.5">
                            <h3 class="text-base font-semibold text-slate-900 truncate">{{ project.title }}</h3>
                            <span
                                class="flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                                :class="statusClasses(project.status)"
                            >
                                {{ statusLabel(project.status) }}
                            </span>
                        </div>
                        <div v-if="enterpriseNames[project.enterpriseId]" class="flex items-center gap-1.5 mb-1.5">
                            <Icon name="heroicons:building-office-2" class="w-3.5 h-3.5 text-blue-500" />
                            <span class="text-sm font-medium text-blue-600">{{ enterpriseNames[project.enterpriseId] }}</span>
                        </div>
                        <p class="text-sm text-slate-500 line-clamp-1 mb-2">{{ project.description }}</p>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span class="flex items-center gap-1">
                                <Icon name="heroicons:map-pin" class="w-3.5 h-3.5" />
                                {{ project.address }}
                            </span>
                            <span class="flex items-center gap-1">
                                <Icon name="heroicons:calendar-days" class="w-3.5 h-3.5" />
                                {{ formatDate(project.startDate) }}
                            </span>
                            <span class="flex items-center gap-1">
                                <Icon name="heroicons:clock" class="w-3.5 h-3.5" />
                                Créé le {{ formatDate(project.createdAt) }}
                            </span>
                        </div>
                    </div>

                    <!-- Right: Mission count -->
                    <div class="flex items-center gap-4 sm:flex-shrink-0">
                        <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                            <Icon name="heroicons:briefcase" class="w-4 h-4 text-indigo-500" />
                            <span class="text-sm font-semibold text-slate-700">{{ getMissionCount(project.id) }}</span>
                            <span class="text-xs text-slate-400">missions</span>
                        </div>
                    </div>
                </div>
            </NuxtLink>
        </div>

        <!-- Count footer -->
        <div v-if="!loading && filteredProjects.length > 0" class="mt-4 text-center">
            <p class="text-xs text-slate-400">{{ filteredProjects.length }} projet{{ filteredProjects.length > 1 ? 's' : '' }} affiché{{ filteredProjects.length > 1 ? 's' : '' }}</p>
        </div>
    </div>
</template>
