<script setup lang="ts">
/**
 * Enterprise Pack Detail Page
 */

import { getPacksWithStatus, type PackWithDetails } from '~/services/formationsClient'

definePageMeta({
    layout: 'entreprise' as const,
    middleware: ['auth']
})

const route = useRoute()
const { user } = useAuth()

const packId = computed(() => route.params.id as string)

// State
const pack = ref<PackWithDetails | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Format price in DZD
function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DA'
}

// Format duration
function formatDuration(hours: number): string {
    return `${hours}h`
}

// Load pack
async function loadPack() {
    if (!user.value?.uid || !packId.value) return
    
    loading.value = true
    error.value = null
    
    try {
        const packs = await getPacksWithStatus(user.value.uid, 'enterprise')
        pack.value = packs.find(p => p.id === packId.value) || null
        
        if (!pack.value) {
            error.value = 'Pack non trouvé'
        }
    } catch (err) {
        console.error('Error loading pack:', err)
        error.value = 'Erreur lors du chargement du pack'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadPack()
})
</script>

<template>
    <div>
        <!-- Back Button -->
        <NuxtLink 
            to="/entreprise/formations"
            class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Retour aux formations
        </NuxtLink>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3 text-slate-500">
                <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                Chargement...
            </div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p class="text-red-700">{{ error }}</p>
        </div>

        <!-- Pack Detail -->
        <div v-else-if="pack" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Pack Header -->
                <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Icon name="heroicons:cube" class="w-6 h-6 text-white" />
                                </div>
                                <div 
                                    v-if="pack.discountPercent > 0"
                                    class="px-3 py-1.5 bg-amber-400 text-amber-900 rounded-full text-sm font-bold"
                                >
                                    -{{ pack.discountPercent }}%
                                </div>
                            </div>
                            <h1 class="text-2xl font-bold">{{ pack.title }}</h1>
                            <p class="mt-2 text-white/80">
                                {{ pack.formations.length }} formation{{ pack.formations.length > 1 ? 's' : '' }} incluse{{ pack.formations.length > 1 ? 's' : '' }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Included Formations -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 class="text-lg font-semibold text-slate-800 mb-4">
                        Formations incluses dans ce pack
                    </h2>
                    
                    <div class="space-y-4">
                        <div 
                            v-for="formation in pack.formations" 
                            :key="formation.id"
                            class="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                        >
                            <div class="w-20 h-14 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                                <img 
                                    v-if="formation.coverUrl"
                                    :src="formation.coverUrl"
                                    :alt="formation.title"
                                    class="w-full h-full object-cover"
                                />
                                <div v-else class="w-full h-full flex items-center justify-center">
                                    <Icon name="heroicons:academic-cap" class="w-6 h-6 text-slate-400" />
                                </div>
                            </div>
                            
                            <div class="flex-1 min-w-0">
                                <h3 class="font-medium text-slate-800 truncate">
                                    {{ formation.title }}
                                </h3>
                                <p class="text-sm text-slate-500">
                                    {{ formatDuration(formation.durationHours) }} de formation
                                </p>
                            </div>
                            
                            <div class="text-right">
                                <span class="text-slate-500 line-through text-sm">
                                    {{ formatPrice(formation.price) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <!-- Price Card -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <div class="text-center">
                        <div 
                            v-if="pack.discountPercent > 0"
                            class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4"
                        >
                            <Icon name="heroicons:gift" class="w-4 h-4" />
                            Économisez {{ formatPrice(pack.totalOriginalPrice - pack.price) }}
                        </div>
                        
                        <p v-if="pack.discountPercent > 0" class="text-slate-400 line-through">
                            {{ formatPrice(pack.totalOriginalPrice) }}
                        </p>
                        
                        <p class="text-3xl font-bold text-blue-600">
                            {{ formatPrice(pack.price) }}
                        </p>
                    </div>

                    <div class="mt-6">
                        <NuxtLink 
                            v-if="pack.status === 'available'"
                            :to="`/entreprise/packs/payment/${pack.id}`"
                            class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Icon name="heroicons:credit-card" class="w-5 h-5" />
                            S'inscrire au pack
                        </NuxtLink>

                        <div 
                            v-else-if="pack.status === 'in-progress'"
                            class="text-center"
                        >
                            <div class="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium">
                                <Icon name="heroicons:clock" class="w-5 h-5" />
                                Pack en cours
                            </div>
                            <p class="mt-3 text-sm text-slate-500">
                                Vous êtes inscrit à ce pack
                            </p>
                        </div>

                        <div 
                            v-else-if="pack.status === 'completed'"
                            class="text-center"
                        >
                            <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                                <Icon name="heroicons:check-badge" class="w-5 h-5" />
                                Pack complété
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pack Benefits -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 class="font-semibold text-slate-800 mb-4">Avantages du pack</h3>
                    <ul class="space-y-3">
                        <li class="flex items-start gap-3 text-sm text-slate-600">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>Économisez {{ pack.discountPercent }}% sur le prix total</span>
                        </li>
                        <li class="flex items-start gap-3 text-sm text-slate-600">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>Accès à {{ pack.formations.length }} formations</span>
                        </li>
                        <li class="flex items-start gap-3 text-sm text-slate-600">
                            <Icon name="heroicons:check-circle" class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>Un seul paiement, plusieurs certifications</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
