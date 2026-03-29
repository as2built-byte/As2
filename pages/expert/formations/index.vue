<script setup lang="ts">
/**
 * Expert Formations Page
 * 
 * Main formations page with 3 tabs:
 * - Catalogue: Available formations and packs to purchase
 * - En cours: Paid but not certified
 * - Complétées: Certified, can view certificate
 */

import { 
    getFormationsWithStatus, 
    getPacksWithStatus,
    type FormationWithStatus,
    type PackWithDetails 
} from '~/services/formationsClient'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth']
})

const { user, profile } = useAuth()

// State
const activeTab = ref<'catalogue' | 'en-cours' | 'completees'>('catalogue')
const formations = ref<FormationWithStatus[]>([])
const packs = ref<PackWithDetails[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

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

// Current tab formations
const currentFormations = computed(() => {
    switch (activeTab.value) {
        case 'catalogue':
            return catalogueFormations.value
        case 'en-cours':
            return enCoursFormations.value
        case 'completees':
            return completeesFormations.value
        default:
            return []
    }
})

// Tabs config
const tabs = [
    { id: 'catalogue', label: 'Catalogue', icon: 'heroicons:book-open' },
    { id: 'en-cours', label: 'En cours', icon: 'heroicons:clock' },
    { id: 'completees', label: 'Complétées', icon: 'heroicons:check-badge' }
] as const

// Load formations and packs
async function loadData() {
    if (!user.value?.uid) return
    
    loading.value = true
    error.value = null
    
    try {
        const [formationsData, packsData] = await Promise.all([
            getFormationsWithStatus(user.value.uid, 'expert'),
            getPacksWithStatus(user.value.uid, 'expert')
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
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Formations & Packs</h1>
            <p class="page-subtitle">Consultez le catalogue et suivez vos formations</p>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-xl border border-slate-200 mb-6">
            <div class="flex border-b border-slate-200">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
                    :class="activeTab === tab.id 
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = tab.id"
                >
                    <Icon :name="tab.icon" class="w-4 h-4" />
                    {{ tab.label }}
                    <span 
                        v-if="tabCounts[tab.id] > 0"
                        class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
                    >
                        {{ tabCounts[tab.id] }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
                <span>{{ error }}</span>
                <button 
                    type="button"
                    class="ml-4 text-red-700 underline font-medium text-sm"
                    @click="loadData"
                >
                    Réessayer
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else>
            <!-- Catalogue Tab Content -->
            <template v-if="activeTab === 'catalogue'">
                <!-- Packs Section -->
                <div v-if="availablePacks.length > 0" class="mb-8">
                    <div class="mb-4">
                        <h3 class="text-lg font-bold text-slate-800">Packs - Économisez jusqu'à {{ Math.max(...availablePacks.map(p => p.discountPercent)) }}%</h3>
                        <p class="text-sm text-slate-500">Regroupez vos formations et bénéficiez de réductions</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <PackCard
                            v-for="pack in availablePacks"
                            :key="pack.id"
                            :pack="pack"
                            link-prefix="/expert/packs"
                        />
                    </div>
                </div>

                <!-- Formations Section -->
                <div v-if="catalogueFormations.length > 0">
                    <div class="mb-4">
                        <h3 class="text-lg font-bold text-slate-800">Formations</h3>
                        <p class="text-sm text-slate-500">Choisissez la formation qui vous convient</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormationCard
                            v-for="formation in catalogueFormations"
                            :key="formation.id"
                            :formation="formation"
                            :show-status="false"
                            link-prefix="/expert/formations"
                        />
                    </div>
                </div>

                <!-- Empty State for Catalogue -->
                <div v-if="catalogueFormations.length === 0 && availablePacks.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Icon name="heroicons:book-open" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 class="text-lg font-medium text-slate-800">Aucune formation disponible</h3>
                    <p class="mt-2 text-slate-500">De nouvelles formations seront bientôt disponibles.</p>
                </div>
            </template>

            <!-- En cours / Complétées Tab Content -->
            <template v-else>
                <!-- Formations Grid -->
                <div v-if="currentFormations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormationCard
                        v-for="formation in currentFormations"
                        :key="formation.id"
                        :formation="formation"
                        :show-status="true"
                        link-prefix="/expert/formations"
                    />
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <template v-if="activeTab === 'en-cours'">
                        <Icon name="heroicons:clock" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-slate-800">Aucune formation en cours</h3>
                        <p class="mt-2 text-slate-500">Inscrivez-vous à une formation pour la voir ici.</p>
                        <button 
                            type="button"
                            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            @click="activeTab = 'catalogue'"
                        >
                            Voir le catalogue
                        </button>
                    </template>
                    <template v-else>
                        <Icon name="heroicons:check-badge" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-slate-800">Aucune formation complétée</h3>
                        <p class="mt-2 text-slate-500">Vos formations certifiées apparaîtront ici.</p>
                    </template>
                </div>
            </template>
        </div>
    </div>
</template>
