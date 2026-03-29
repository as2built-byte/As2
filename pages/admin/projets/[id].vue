<script setup lang="ts">
import { getProject, getMissionsByProject, getEnterpriseProfile } from '~/firebase/services/firestore'
import type { Project, Mission } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

const route = useRoute()
const projectId = route.params.id as string

const loading = ref(true)
const project = ref<Project | null>(null)
const missions = ref<Mission[]>([])
const enterpriseName = ref('Entreprise')

onMounted(async () => {
  try {
    const p = await getProject(projectId)
    if (p) {
      project.value = p
      const profile = await getEnterpriseProfile(p.enterpriseId)
      enterpriseName.value = profile?.companyName || 'Entreprise'
    }
    missions.value = await getMissionsByProject(projectId)
  } catch (e) {
    console.error('Error loading project:', e)
  } finally {
    loading.value = false
  }
})

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: 'emerald' },
  completed: { label: 'Terminé', color: 'blue' },
}

const missionStatusConfig: Record<string, { label: string; color: string }> = {
  pending_admin: { label: 'En attente', color: 'amber' },
  proposed: { label: 'Proposée', color: 'violet' },
  accepted: { label: 'En cours', color: 'emerald' },
  refused: { label: 'Refusée', color: 'red' },
  completed: { label: 'Terminée', color: 'blue' },
}

const formatDate = (date: Date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const formatFullDate = (date: Date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon name="i-heroicons-arrow-path" class="w-8 h-8 text-slate-400 animate-spin" />
    </div>

    <!-- Not Found -->
    <div v-else-if="!project" class="text-center py-20">
      <Icon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h1 class="text-xl font-bold text-slate-900 mb-2">Projet non trouvé</h1>
      <p class="text-slate-500 mb-6">Le projet que vous recherchez n'existe pas ou a été supprimé.</p>
      <NuxtLink to="/admin/projets">
        <UButton color="blue" variant="solid" icon="i-heroicons-arrow-left" label="Retour aux projets" />
      </NuxtLink>
    </div>

    <!-- Project Detail -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink to="/admin/projets" class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <Icon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Retour aux projets
        </NuxtLink>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">{{ project.title }}</h1>
            <p class="text-lg text-slate-600 dark:text-slate-400">{{ enterpriseName }}</p>
          </div>
          <UBadge :color="statusConfig[project.status].color" :label="statusConfig[project.status].label" variant="soft" size="lg" />
        </div>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Adresse</p>
          <p class="text-sm text-slate-900 dark:text-white">{{ project.address }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Date de création</p>
          <p class="text-sm text-slate-900 dark:text-white">{{ formatDate(project.createdAt) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Missions</p>
          <p class="text-sm text-slate-900 dark:text-white">{{ missions.length }} mission(s)</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Progression</p>
          <p class="text-sm text-slate-900 dark:text-white">
            {{ missions.filter(m => m.status === 'completed').length }} / {{ missions.length }} terminées
          </p>
        </div>
      </div>

      <!-- Description -->
      <div class="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 mb-8">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Description</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">{{ project.description || 'Aucune description' }}</p>
      </div>

      <!-- Missions -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Missions associées</h2>
        </div>
        
        <div v-if="missions.length === 0" class="p-6 text-center text-slate-500">
          <Icon name="i-heroicons-briefcase" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p>Aucune mission pour ce projet</p>
        </div>
        
        <div v-else class="divide-y divide-slate-200 dark:divide-slate-800">
          <div v-for="mission in missions" :key="mission.id" class="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-slate-900 dark:text-white">{{ mission.title }}</h3>
              <UBadge 
                :color="missionStatusConfig[mission.status].color" 
                :label="missionStatusConfig[mission.status].label" 
                variant="soft" 
                size="xs" 
              />
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{{ mission.description || 'Aucune description' }}</p>
            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>Créée le {{ formatFullDate(mission.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
