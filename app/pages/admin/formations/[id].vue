<script setup lang="ts">
/**
 * Formation Detail Page
 * 
 * Displays full formation details and list of buyers
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { getFormation, getFormationBuyers } from '~/firebase/services/firestore'
import type { Formation, UserProfile } from '~/types'

const route = useRoute()
const router = useRouter()

const formationId = computed(() => route.params.id as string)
const formation = ref<Formation | null>(null)
const buyers = ref<UserProfile[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Fetch formation and buyers on mount
onMounted(async () => {
    try {
        // Fetch formation first
        formation.value = await getFormation(formationId.value)
        
        if (!formation.value) {
            error.value = 'Formation non trouvée'
            loading.value = false
            return
        }
        
        // Try to fetch buyers - don't fail if this errors (payments collection might not exist)
        try {
            buyers.value = await getFormationBuyers(formationId.value)
        } catch (buyersError) {
            console.warn('Could not fetch buyers:', buyersError)
            // Keep buyers as empty array, don't block the page
        }
    } catch (e) {
        console.error('Error fetching formation details:', e)
        error.value = 'Erreur lors du chargement de la formation'
    } finally {
        loading.value = false
    }
})

function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DZD'
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(date)
}

function goBack() {
    router.push('/admin/formations')
}
</script>

<template>
    <div>
        <!-- Back Button -->
        <button 
            type="button"
            class="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            @click="goBack"
        >
            <Icon name="heroicons:arrow-left" class="w-5 h-5" />
            Retour aux formations
        </button>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-20">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
            <p class="text-red-700 mt-3">{{ error }}</p>
            <button
                type="button"
                class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                @click="goBack"
            >
                Retourner à la liste
            </button>
        </div>

        <!-- Formation Details -->
        <template v-else-if="formation">
            <!-- Header Card -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="flex flex-col md:flex-row">
                    <!-- Cover Image -->
                    <div class="w-full md:w-64 h-48 md:h-auto bg-slate-100 flex-shrink-0">
                        <img 
                            v-if="formation.coverUrl" 
                            :src="formation.coverUrl" 
                            :alt="formation.title"
                            class="w-full h-full object-cover"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center">
                            <Icon name="heroicons:photo" class="w-16 h-16 text-slate-300" />
                        </div>
                    </div>
                    
                    <!-- Details -->
                    <div class="flex-1 p-6">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h1 class="text-2xl font-bold text-slate-800">{{ formation.title }}</h1>
                                <span 
                                    class="inline-block mt-2 text-xs px-2 py-1 rounded font-medium"
                                    :class="formation.isActive 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-slate-100 text-slate-500'"
                                >
                                    {{ formation.isActive ? 'Active' : 'Inactive' }}
                                </span>
                            </div>
                        </div>
                        
                        <p class="text-slate-600 mt-4">{{ formation.description }}</p>
                        
                        <div class="flex flex-wrap gap-6 mt-6 pt-6 border-t border-slate-100">
                            <div>
                                <p class="text-xs text-slate-400 uppercase">Durée</p>
                                <p class="text-lg font-semibold text-slate-800">{{ formation.durationHours }}h</p>
                            </div>
                            <div>
                                <p class="text-xs text-slate-400 uppercase">Prix</p>
                                <p class="text-lg font-semibold text-slate-800">{{ formatPrice(formation.price) }}</p>
                            </div>
                            <div>
                                <p class="text-xs text-slate-400 uppercase">Créée le</p>
                                <p class="text-lg font-semibold text-slate-800">{{ formatDate(formation.createdAt) }}</p>
                            </div>
                            <div>
                                <p class="text-xs text-slate-400 uppercase">Inscrits</p>
                                <p class="text-lg font-semibold text-blue-600">{{ buyers.length }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Buyers List -->
            <div class="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="p-4 border-b border-slate-200">
                    <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Icon name="heroicons:users" class="w-5 h-5 text-blue-600" />
                        Inscrits ({{ buyers.length }})
                    </h2>
                </div>

                <div v-if="buyers.length === 0" class="py-12 text-center">
                    <Icon name="heroicons:user-group" class="w-12 h-12 text-slate-300 mx-auto" />
                    <p class="text-slate-500 mt-3">Aucun inscrit pour cette formation</p>
                </div>

                <table v-else class="w-full hidden md:table">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Téléphone</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rôle</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="buyer in buyers" :key="buyer.uid" class="hover:bg-slate-50">
                            <td class="px-4 py-3">
                                <span class="font-medium text-slate-800">{{ buyer.firstName }} {{ buyer.lastName }}</span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="text-sm text-slate-600">{{ buyer.email }}</span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="text-sm text-slate-600">{{ buyer.phone }}</span>
                            </td>
                            <td class="px-4 py-3">
                                <span 
                                    class="text-xs px-2 py-1 rounded font-medium"
                                    :class="buyer.role === 'expert' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'"
                                >
                                    {{ buyer.role === 'expert' ? 'Expert' : 'Entreprise' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Mobile Cards -->
                <div class="md:hidden divide-y divide-slate-100">
                    <div v-for="buyer in buyers" :key="buyer.uid" class="p-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Icon name="heroicons:user" class="w-5 h-5 text-blue-600" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-slate-800">{{ buyer.firstName }} {{ buyer.lastName }}</p>
                                <p class="text-sm text-slate-500 truncate">{{ buyer.email }}</p>
                            </div>
                            <span 
                                class="text-xs px-2 py-1 rounded font-medium"
                                :class="buyer.role === 'expert' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-purple-100 text-purple-700'"
                            >
                                {{ buyer.role === 'expert' ? 'Expert' : 'Entreprise' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
