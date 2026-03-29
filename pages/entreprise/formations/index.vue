<script setup lang="ts">
/**
 * Enterprise Formations Page - Modern UI
 * 
 * Features:
 * - Beautiful cards with status badges
 * - Responsive design for mobile/tablet
 * - Modern UI with Nuxt UI components
 * - Smooth animations and transitions
 */

import { 
    getFormationsWithStatus, 
    getPacksWithStatus,
    type FormationWithStatus,
    type PackWithDetails 
} from '~/services/formationsClient'

definePageMeta({
    layout: 'default',
    middleware: ['auth']
})

const { user, profile } = useAuth()

// State
const activeTab = ref<'catalogue' | 'en-cours' | 'completees'>('catalogue')
const formations = ref<FormationWithStatus[]>([])
const packs = ref<PackWithDetails[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')

// Filtered formations by tab
const catalogueFormations = computed(() => 
    formations.value.filter(f => f.status === 'available')
)

const enCoursFormations = computed(() => 
    formations.value.filter(f => f.status === 'in-progress')
)

const completeesFormations = computed(() => 
    formations.value.filter(f => f.status === 'completed')
)

// Filtered packs (only show available packs in catalogue)
const availablePacks = computed(() => 
    packs.value.filter(p => p.status === 'available')
)

// Tab counts
const tabCounts = computed(() => ({
    catalogue: catalogueFormations.value.length + availablePacks.value.length,
    'en-cours': enCoursFormations.value.length,
    completees: completeesFormations.value.length
}))

// Type definitions for current items
interface CurrentItem {
  id: string
  type: 'pack' | 'formation'
  title: string
  description: string
  status: 'available' | 'in-progress' | 'completed'
  badge: { label: string; color: string }
  price?: number
  discount?: number
  durationHours?: number
  progress?: number
  completedAt?: Date
  coverUrl?: string | null
}

// Current tab items
const currentItems = computed((): CurrentItem[] => {
    const items: CurrentItem[] = []
    
    if (activeTab.value === 'catalogue') {
        // Add packs
        availablePacks.value.forEach((pack: any) => {
            items.push({
                ...pack,
                type: 'pack',
                title: (pack as any).name || 'Pack sans nom',
                description: (pack as any).description || 'Description du pack',
                status: 'available',
                badge: { label: 'Pack', color: 'purple' },
                price: (pack as any).price || 0,
                discount: (pack as any).discountPercent || 0,
                coverUrl: (pack as any).coverUrl || null,
                id: pack.id
            })
        })
        // Add formations
        catalogueFormations.value.forEach((formation: any) => {
            items.push({
                ...formation,
                type: 'formation',
                title: formation.title,
                description: formation.description,
                status: 'available',
                badge: { label: 'Formation', color: 'blue' },
                price: formation.price,
                durationHours: formation.durationHours,
                coverUrl: formation.coverUrl,
                id: formation.id
            })
        })
    } else if (activeTab.value === 'en-cours') {
        enCoursFormations.value.forEach((formation: any) => {
            items.push({
                ...formation,
                type: 'formation',
                title: formation.title,
                description: formation.description,
                status: 'in-progress',
                badge: { label: 'En cours', color: 'yellow' },
                progress: 50, // Default progress
                coverUrl: formation.coverUrl,
                id: formation.id
            })
        })
    } else {
        completeesFormations.value.forEach((formation: any) => {
            items.push({
                ...formation,
                type: 'formation',
                title: formation.title,
                description: formation.description,
                status: 'completed',
                badge: { label: 'Terminé', color: 'green' },
                completedAt: new Date(),
                coverUrl: formation.coverUrl,
                id: formation.id
            })
        })
    }
    
    return items
})

// Filtered items based on search
const filteredItems = computed(() => {
    if (!searchQuery.value.trim()) return currentItems.value
    
    const query = searchQuery.value.toLowerCase()
    return currentItems.value.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    )
})

// Load formations and packs
async function loadData() {
    if (process.server) return;
    if (!user.value?.uid) return;
    
    loading.value = true
    error.value = null
    
    try {
        const [formationsData, packsData] = await Promise.all([
            getFormationsWithStatus(user.value.uid, 'enterprise'),
            getPacksWithStatus(user.value.uid, 'enterprise')
        ])
        formations.value = formationsData
        packs.value = packsData
    } catch (err) {
        console.error('Error loading data:', err)
        error.value = 'Erreur lors du chargement des formations'
    } finally {
        loading.value = false
    }
}

// Load on mount
onMounted(() => {
    loadData()
})

// Tab configuration
const tabs = [
    { 
        key: 'catalogue', 
        label: 'Catalogue', 
        icon: 'i-heroicons-book-open',
        description: 'Formations et packs disponibles'
    },
    { 
        key: 'en-cours', 
        label: 'En cours', 
        icon: 'i-heroicons-clock',
        description: 'Formations en cours de suivi'
    },
    { 
        key: 'completees', 
        label: 'Terminées', 
        icon: 'i-heroicons-check-badge',
        description: 'Formations certifiées'
    }
] as const

// Status badge variants
const statusVariants: Record<string, { color: string; variant: string }> = {
    'available': { color: 'blue', variant: 'soft' },
    'in-progress': { color: 'yellow', variant: 'soft' },
    'completed': { color: 'green', variant: 'soft' },
    'blocked': { color: 'red', variant: 'soft' }
}
</script>

<template>
  <div class="min-h-full">
    <!-- Page Header -->
    <div class="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
      <div class="px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-white">
              Formations & Packs
            </h1>
            <p class="mt-2 text-slate-300">
              Développez vos compétences avec nos formations BIM spécialisées
            </p>
          </div>
          
          <!-- Search -->
          <div class="w-full sm:w-auto">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher une formation..."
              icon="i-heroicons-magnifying-glass"
              size="lg"
              class="w-full sm:w-80"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex space-x-8 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap"
            :class="[
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-gray-300'
            ]"
          >
            <Icon :name="tab.icon" class="h-5 w-5" />
            <span>{{ tab.label }}</span>
            <UBadge
              v-if="tabCounts[tab.key] > 0"
              :color="activeTab === tab.key ? 'blue' : 'gray'"
              variant="soft"
              size="xs"
              class="ml-2"
            >
              {{ tabCounts[tab.key] }}
            </UBadge>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <!-- Loading State with Skeletons -->
      <div v-if="loading" class="space-y-6">
        <!-- Skeleton Header -->
        <div class="space-y-4">
          <USkeleton class="h-8 w-48" />
          <USkeleton class="h-4 w-96" />
        </div>
        
        <!-- Skeleton Tabs -->
        <div class="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
          <USkeleton v-for="i in 3" :key="i" class="h-12 w-24" />
        </div>
        
        <!-- Skeleton Cards Grid -->
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="i in 6" :key="i" class="space-y-4">
            <USkeleton class="h-48 w-full rounded-t-lg" />
            <div class="p-4 space-y-3">
              <USkeleton class="h-6 w-3/4" />
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-4 w-2/3" />
              <div class="flex justify-between">
                <USkeleton class="h-4 w-16" />
                <USkeleton class="h-6 w-20" />
              </div>
            </div>
            <div class="p-4">
              <USkeleton class="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <Icon name="i-heroicons-exclamation-circle" class="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Erreur de chargement
        </h3>
        <p class="text-red-600 dark:text-red-300 mb-4">{{ error }}</p>
        <UButton @click="loadData" color="red" variant="soft">
          Réessayer
        </UButton>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Empty State -->
        <div v-if="filteredItems.length === 0" class="text-center py-12">
          <Icon name="i-heroicons-book-open" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-white mb-2">
            {{ searchQuery ? 'Aucun résultat trouvé' : 'Aucune formation disponible' }}
          </h3>
          <p class="text-slate-300">
            {{ searchQuery ? 'Essayez une autre recherche' : 'Revenez plus tard pour découvrir nos nouvelles formations' }}
          </p>
        </div>

        <!-- Cards Grid -->
        <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <UCard
            v-for="item in filteredItems"
            :key="item.id"
            class="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-blue-500/50 border-2 border-transparent"
            :ui="{
              body: { padding: 'p-0' },
              header: { padding: 'p-4' },
              footer: { padding: 'p-4' },
              base: 'transition-all duration-300 hover:border-blue-500/50'
            }"
          >
            <!-- Card Header with Image -->
            <template #header>
              <div class="relative">
                <img
                  :src="item.coverUrl || '/images/default-formation.svg'"
                  :alt="item.title"
                  class="h-48 w-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
                  @error="(e: Event) => { const target = e.target as HTMLImageElement; target.src = '/images/default-formation.svg' }"
                />
                <div class="absolute top-2 right-2">
                  <UBadge
                    :color="item.badge.color"
                    variant="solid"
                    size="sm"
                    class="shadow-lg"
                  >
                    {{ item.badge.label }}
                  </UBadge>
                </div>
                
                <!-- Status Badge -->
                <div class="absolute top-2 left-2">
                  <UBadge
                    :color="statusVariants[item.status]?.color || 'gray'"
                    :variant="statusVariants[item.status]?.variant || 'soft'"
                    size="sm"
                    class="shadow-lg"
                  >
                    {{ item.status === 'available' ? 'Disponible' : 
                       item.status === 'in-progress' ? 'En cours' : 
                       item.status === 'completed' ? 'Terminé' : 'Bloqué' }}
                  </UBadge>
                </div>
              </div>
            </template>

            <!-- Card Body -->
            <div class="p-4">
              <h3 class="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors duration-200">
                {{ item.title }}
              </h3>
              <p class="text-slate-300 text-sm mb-4 line-clamp-3">
                {{ item.description }}
              </p>

              <!-- Additional Info -->
              <div class="space-y-2">
                <!-- Price for available items -->
                <div v-if="item.status === 'available' && item.price" class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">Prix</span>
                  <div class="text-right">
                    <span v-if="item.discount" class="text-sm text-slate-500 line-through">
                      {{ item.price }}€
                    </span>
                    <span class="text-lg font-bold text-blue-400 ml-2">
                      {{ Math.round(item.price * (1 - (item.discount || 0) / 100)) }}€
                    </span>
                    <UBadge v-if="item.discount" color="red" variant="soft" size="xs" class="ml-2">
                      -{{ item.discount }}%
                    </UBadge>
                  </div>
                </div>

                <!-- Progress for in-progress items -->
                <div v-else-if="item.status === 'in-progress'" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-400">Progression</span>
                    <span class="text-sm font-medium text-blue-400">
                      {{ item.progress || 0 }}%
                    </span>
                  </div>
                  <UProgress
                    :value="item.progress || 0"
                    color="blue"
                    class="h-2"
                  />
                </div>

                <!-- Completion date for completed items -->
                <div v-else-if="item.status === 'completed'" class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">Terminée le</span>
                  <span class="text-sm text-green-400">
                    {{ new Date().toLocaleDateString('fr-FR') }}
                  </span>
                </div>

                <!-- Duration for catalogue items -->
                <div v-if="item.durationHours" class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">Durée</span>
                  <span class="text-sm text-slate-200">
                    {{ item.durationHours }}h
                  </span>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <template #footer>
              <div class="flex space-x-2">
                <UButton
                  v-if="item.status === 'available'"
                  color="blue"
                  variant="solid"
                  size="sm"
                  class="flex-1 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  @click="navigateTo(item.type === 'pack' ? `/entreprise/packs/${item.id}` : `/entreprise/formations/${item.id}`)"
                >
                  {{ item.type === 'pack' ? 'Voir le pack' : 'S\'inscrire' }}
                </UButton>
                
                <UButton
                  v-else-if="item.status === 'in-progress'"
                  color="blue"
                  variant="outline"
                  size="sm"
                  class="flex-1 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  @click="navigateTo(`/entreprise/formations/${item.id}`)"
                >
                  Continuer
                </UButton>
                
                <UButton
                  v-else-if="item.status === 'completed'"
                  color="green"
                  variant="outline"
                  size="sm"
                  class="flex-1 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  @click="navigateTo(`/entreprise/formations/${item.id}/certificate`)"
                >
                  Voir le certificat
                </UButton>
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 3;
  -webkit-line-clamp: 3;
}
</style>
