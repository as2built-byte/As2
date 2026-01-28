<script setup lang="ts">
/**
 * Admin User Profile Page
 * 
 * Detailed view of a user profile with role-specific information
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { getUserWithDetails } from '~/firebase/services/firestore'
import type { UserWithDetails } from '~/types'

const route = useRoute()
const router = useRouter()

const uid = computed(() => route.params.uid as string)

// State
const user = ref<UserWithDetails | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Fetch user on mount
onMounted(async () => {
    await fetchUser()
})

async function fetchUser() {
    loading.value = true
    error.value = null
    
    try {
        user.value = await getUserWithDetails(uid.value)
        if (!user.value) {
            error.value = 'Utilisateur non trouvé'
        }
    } catch (e) {
        console.error('Error fetching user:', e)
        error.value = 'Erreur lors du chargement du profil'
    } finally {
        loading.value = false
    }
}

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(date)
}

// Open CV in new tab
function openCV(url: string) {
    window.open(url, '_blank')
}

// Go back
function goBack() {
    router.push('/admin/users')
}
</script>

<template>
    <div>
        <!-- Header with Back Button -->
        <div class="flex items-center gap-4 mb-6">
            <button 
                type="button"
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                @click="goBack"
            >
                <Icon name="heroicons:arrow-left" class="w-5 h-5" />
            </button>
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Profil Utilisateur</h1>
                <p class="text-slate-500 mt-0.5">Détails du compte</p>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-20">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
            <p class="text-slate-600 mt-3">{{ error }}</p>
            <button 
                type="button"
                class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                @click="goBack"
            >
                Retour à la liste
            </button>
        </div>

        <!-- User Profile -->
        <div v-else-if="user" class="space-y-6">
            <!-- Main Info Card -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                    <!-- Avatar -->
                    <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon 
                            :name="user.role === 'expert' ? 'heroicons:user' : 'heroicons:building-office-2'" 
                            class="w-8 h-8 text-blue-600" 
                        />
                    </div>
                    
                    <div class="flex-1">
                        <!-- Name -->
                        <h2 class="text-xl font-bold text-slate-800">
                            {{ user.role === 'enterprise' && user.enterpriseProfile?.companyName 
                                ? user.enterpriseProfile.companyName 
                                : `${user.firstName} ${user.lastName}` 
                            }}
                        </h2>
                        
                        <!-- Subtitle for enterprise -->
                        <p v-if="user.role === 'enterprise'" class="text-slate-500">
                            Gérant: {{ user.firstName }} {{ user.lastName }}
                        </p>
                        
                        <!-- Badges -->
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                                {{ user.role === 'expert' ? 'Expert' : 'Entreprise' }}
                            </span>
                            <span 
                                class="text-xs px-2 py-1 rounded font-medium"
                                :class="{
                                    'bg-green-100 text-green-700': user.status === 'active',
                                    'bg-amber-100 text-amber-700': user.status === 'pending',
                                    'bg-slate-100 text-slate-500': user.status === 'inactive'
                                }"
                            >
                                {{ user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : 'Inactif' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contact Info -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
                <h3 class="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Informations de contact</h3>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:envelope" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">Email</p>
                            <p class="text-sm text-slate-800">{{ user.email }}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:phone" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">Téléphone</p>
                            <p class="text-sm text-slate-800">{{ user.phone }}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:calendar" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">Date d'inscription</p>
                            <p class="text-sm text-slate-800">{{ formatDate(user.createdAt) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expert Specific Info -->
            <div v-if="user.role === 'expert' && user.expertProfile" class="bg-white rounded-xl border border-slate-200 p-6">
                <h3 class="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Informations Expert</h3>
                
                <div class="space-y-4">
                    <!-- Availability -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:clock" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">Disponibilité</p>
                            <p class="text-sm">
                                <span 
                                    class="px-2 py-0.5 rounded text-xs font-medium"
                                    :class="user.expertProfile.availability 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-slate-100 text-slate-500'"
                                >
                                    {{ user.expertProfile.availability ? 'Disponible' : 'Non disponible' }}
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    <!-- CV -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon name="heroicons:document-text" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div class="flex-1">
                            <p class="text-xs text-slate-400">CV</p>
                            <div v-if="user.expertProfile.cvUrl">
                                <button 
                                    type="button"
                                    class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    @click="openCV(user.expertProfile.cvUrl!)"
                                >
                                    <Icon name="heroicons:eye" class="w-4 h-4" />
                                    Voir le CV
                                </button>
                            </div>
                            <p v-else class="text-sm text-slate-400">Non fourni</p>
                        </div>
                    </div>
                    
                    <!-- Certifications -->
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Icon name="heroicons:academic-cap" class="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p class="text-xs text-slate-400">Certifications</p>
                            <div v-if="user.expertProfile.certifications && user.expertProfile.certifications.length > 0" class="flex flex-wrap gap-2 mt-1">
                                <span 
                                    v-for="cert in user.expertProfile.certifications" 
                                    :key="cert"
                                    class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700"
                                >
                                    {{ cert }}
                                </span>
                            </div>
                            <p v-else class="text-sm text-slate-400">Aucune certification</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Enterprise Specific Info -->
            <div v-if="user.role === 'enterprise' && user.enterpriseProfile" class="bg-white rounded-xl border border-slate-200 p-6">
                <h3 class="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Informations Entreprise</h3>
                
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon name="heroicons:building-office-2" class="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                        <p class="text-xs text-slate-400">Nom de l'entreprise</p>
                        <p class="text-sm text-slate-800 font-medium">{{ user.enterpriseProfile.companyName }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
