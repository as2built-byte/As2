<script setup lang="ts">
import { getAllProjects, getAllMissionsForAdmin, getEnterpriseProfile } from '~/firebase/services/firestore'
import type { Project, Mission } from '~/types'

definePageMeta({ layout: 'admin', middleware: ['auth'] })

const loading = ref(true)
const projects = ref<Project[]>([])
const missions = ref<Mission[]>([])
const enterpriseNames = ref<Record<string, string>>({})
const searchQuery = ref('')
const filterStatus = ref<'all' | 'active' | 'completed'>('all')

onMounted(async () => {
  try {
    const [p, m] = await Promise.all([getAllProjects(), getAllMissionsForAdmin()])
    projects.value = p
    missions.value = m
    const uniqueIds = [...new Set(p.map(proj => proj.enterpriseId))]
    const profiles = await Promise.all(uniqueIds.map(async (id) => {
      try { const profile = await getEnterpriseProfile(id); return { id, name: profile?.companyName || 'Entreprise' } }
      catch { return { id, name: 'Entreprise' } }
    }))
    const namesMap: Record<string, string> = {}
    profiles.forEach(p => { namesMap[p.id] = p.name })
    enterpriseNames.value = namesMap
  } catch (e) { console.error('Error:', e) }
  finally { loading.value = false }
})

const stats = computed(() => ({
  all: projects.value.length,
  active: projects.value.filter(p => p.status === 'active').length,
  completed: projects.value.filter(p => p.status === 'completed').length
}))

const filteredProjects = computed(() => {
  let result = projects.value
  if (filterStatus.value !== 'all') result = result.filter(p => p.status === filterStatus.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => p.title.toLowerCase().includes(q) || (enterpriseNames.value[p.enterpriseId] || '').toLowerCase().includes(q))
  }
  return result
})

const getMissionCount = (id: string) => missions.value.filter(m => m.projectId === id).length
const formatDate = (d: Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
    
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Projets</h1>
      <p class="text-slate-500 dark:text-slate-400">Tous les projets de la plateforme</p>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="relative flex-1 max-w-xl">
        <Icon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher un projet..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>
      <div class="flex gap-2">
        <button 
          @click="filterStatus = 'all'" 
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          :class="filterStatus === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'"
        >
          Tous ({{ stats.all }})
        </button>
        <button 
          @click="filterStatus = 'active'" 
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          :class="filterStatus === 'active' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'"
        >
          Actifs ({{ stats.active }})
        </button>
        <button 
          @click="filterStatus = 'completed'" 
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          :class="filterStatus === 'completed' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'"
        >
          Termines ({{ stats.completed }})
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Icon name="i-heroicons-arrow-path" class="w-6 h-6 text-slate-400 animate-spin" />
    </div>

    <!-- Projects List -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="p in filteredProjects" 
        :key="p.id"
        :to="`/admin/projets/${p.id}`"
        class="block bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ p.title }}</h3>
            <span 
              class="px-2.5 py-1 rounded-full text-xs font-medium"
              :class="p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'"
            >
              {{ p.status === 'active' ? 'Actif' : 'Termine' }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Icon name="i-heroicons-briefcase" class="w-4 h-4" />
            <span class="text-sm">{{ getMissionCount(p.id) }} missions</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
          <Icon name="i-heroicons-building-office" class="w-4 h-4" />
          <span class="text-sm font-medium">{{ enterpriseNames[p.enterpriseId] || 'Entreprise' }}</span>
        </div>

        <p class="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">{{ p.description || 'Aucune description' }}</p>

        <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-1">
            <Icon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
            <span class="truncate max-w-[200px]">{{ p.address }}</span>
          </div>
          <div v-if="p.startDate" class="flex items-center gap-1">
            <Icon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
            <span>{{ formatDate(p.startDate) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <Icon name="i-heroicons-clock" class="w-3.5 h-3.5" />
            <span>Cree le {{ formatDate(p.createdAt) }}</span>
          </div>
        </div>
      </NuxtLink>

      <!-- Empty State -->
      <div v-if="filteredProjects.length === 0" class="text-center py-12">
        <Icon name="i-heroicons-folder-open" class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <p class="text-slate-500 dark:text-slate-400">Aucun projet trouve</p>
      </div>

      <p v-else class="text-center text-xs text-slate-400 mt-6">{{ filteredProjects.length }} projets affiches</p>
    </div>
  </div>
</template>
