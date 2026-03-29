<script setup lang="ts">
/**
 * Admin Users Management
 * 
 * Clean user management with filters and actions
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'
import type { UserWithDetails, UserStatus } from '~/types'

const adminStore = useAdminStore()
const router = useRouter()
const { filteredUsers, usersLoading, userRoleFilter, userStatusFilter } = storeToRefs(adminStore)
const searchQuery = computed({
    get: () => adminStore.userSearchQuery,
    set: (val: string) => adminStore.setUserSearchQuery(val),
})
const nameEmailQuery = computed({
    get: () => adminStore.userNameEmailQuery,
    set: (val: string) => adminStore.setUserNameEmailQuery(val),
})
const companyQuery = computed({
    get: () => adminStore.userCompanyQuery,
    set: (val: string) => adminStore.setUserCompanyQuery(val),
})

// Computed map des entreprises pour optimiser la recherche
const enterpriseMap = computed(() => {
    const map = new Map<string, string>()
    adminStore.users.forEach(user => {
        if (user.enterpriseProfile?.companyName) {
            map.set(user.uid, user.enterpriseProfile.companyName)
        }
    })
    return map
})

// Action states
const actionLoading = ref<string | null>(null)

// Fetch on mount
onMounted(async () => {
    // Forcer le rafraîchissement complet des utilisateurs pour récupérer le enterpriseOwnerId
    await adminStore.fetchAllUsers()
})

// Filters
function setRoleFilter(role: 'all' | 'expert' | 'enterprise') {
    adminStore.setRoleFilter(role)
}

function setStatusFilter(status: 'all' | UserStatus) {
    adminStore.setStatusFilter(status)
}

// Actions
async function activateUser(uid: string) {
    actionLoading.value = uid
    await adminStore.activateUser(uid)
    actionLoading.value = null
}

async function deactivateUser(uid: string) {
    actionLoading.value = uid
    await adminStore.deactivateUser(uid)
    actionLoading.value = null
}

async function rejectUser(uid: string) {
    actionLoading.value = uid
    await adminStore.rejectUser(uid)
    actionLoading.value = null
}

async function deleteUser(uid: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible.')) {
        return
    }
    actionLoading.value = uid
    await adminStore.deleteUser(uid)
    actionLoading.value = null
}

// Navigate to user profile
function viewProfile(uid: string) {
    router.push(`/admin/users/${uid}`)
}

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// Get display name based on role
function getDisplayName(user: UserWithDetails): { primary: string; secondary?: string } {
    // Pour les entreprises et les membres ajoutés par une entreprise
    if (user.role === 'enterprise') {
        // Si l'utilisateur a un profil entreprise, afficher le nom de l'entreprise en premier
        if (user.enterpriseProfile?.companyName) {
            return {
                primary: user.enterpriseProfile.companyName,
                secondary: `${user.firstName} ${user.lastName}`
            }
        }
        // Si l'utilisateur est un membre ajouté par une entreprise (avec enterpriseOwnerId)
        else if (user.enterpriseOwnerId) {
            // Chercher l'entreprise parente parmi TOUS les utilisateurs (pas seulement les filtrés)
            const parentEnterprise = adminStore.users.find(u => 
                u.uid === user.enterpriseOwnerId && u.enterpriseProfile?.companyName
            )
            if (parentEnterprise?.enterpriseProfile?.companyName) {
                return {
                    primary: parentEnterprise.enterpriseProfile.companyName,
                    secondary: `${user.firstName} ${user.lastName}`
                }
            }
            // Si on ne trouve pas l'entreprise parente, afficher un indicateur
            else {
                return {
                    primary: `${user.firstName} ${user.lastName}`,
                    secondary: 'Membre d\'entreprise'
                }
            }
        }
    }
    
    // Pour les experts, afficher simplement leur nom
    return { primary: `${user.firstName} ${user.lastName}` }
}

// Fonction pour obtenir le nom de l'entreprise parente
function getParentEnterpriseName(user: UserWithDetails): string {
    console.log('Ligne Islem - OwnerID recherché:', user.enterpriseOwnerId)
    
    // Si l'utilisateur a son propre nom d'entreprise (gérant comme Minou)
    if (user.enterpriseProfile?.companyName) {
        return user.enterpriseProfile.companyName
    }
    
    // Si l'utilisateur est un membre avec un enterpriseOwnerId
    if (user.enterpriseOwnerId) {
        // Chercher directement dans la liste des utilisateurs
        const parentEnterprise = adminStore.users.find(otherUser => {
            return otherUser.uid === user.enterpriseOwnerId
        })
        
        console.log('Parent trouvé:', parentEnterprise?.firstName, 'Company:', parentEnterprise?.enterpriseProfile?.companyName)
        
        if (parentEnterprise?.enterpriseProfile?.companyName) {
            return parentEnterprise.enterpriseProfile.companyName
        }
    }
    
    return ''
}
</script>

<template>
    <div>
        <!-- Page Header -->
        <div class="page-header">
            <h1 class="page-title">Utilisateurs</h1>
            <p class="page-subtitle">Gérer les comptes experts et entreprises</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <!-- First Row: Role and Status Filters -->
            <div class="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                <!-- Role Filter -->
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-2">Type de compte</label>
                    <div class="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
                            :class="userRoleFilter === 'all' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setRoleFilter('all')"
                        >
                            Tous
                        </button>
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
                            :class="userRoleFilter === 'expert' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setRoleFilter('expert')"
                        >
                            <Icon name="heroicons:user" class="w-4 h-4" />
                            Experts
                        </button>
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
                            :class="userRoleFilter === 'enterprise' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setRoleFilter('enterprise')"
                        >
                            <Icon name="heroicons:building-office" class="w-4 h-4" />
                            Entreprises
                        </button>
                    </div>
                </div>

                <!-- Status Filter -->
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-2">Statut</label>
                    <div class="inline-flex flex-wrap rounded-lg border border-slate-200 p-1 bg-slate-50">
                        <button 
                            type="button"
                            class="px-2.5 py-1.5 text-sm font-medium rounded-md transition-all"
                            :class="userStatusFilter === 'all' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('all')"
                        >
                            Tous
                        </button>
                        <button 
                            type="button"
                            class="px-2.5 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                            :class="userStatusFilter === 'active' 
                                ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('active')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Actifs
                        </button>
                        <button 
                            type="button"
                            class="px-2.5 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                            :class="userStatusFilter === 'inactive' 
                                ? 'bg-slate-200 text-slate-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('inactive')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactifs
                        </button>
                        <button 
                            type="button"
                            class="px-2.5 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                            :class="userStatusFilter === 'deleted' 
                                ? 'bg-red-100 text-red-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('deleted')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Supprimés
                        </button>
                    </div>
                </div>
            </div>

            <!-- Second Row: Search Filters -->
            <div class="border-t border-slate-100 pt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Name/Email Search -->
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-2">Recherche par nom ou email</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Icon name="heroicons:user" class="w-4 h-4" />
                            </span>
                            <input
                                v-model="nameEmailQuery"
                                type="text"
                                placeholder="Rechercher par nom ou email..."
                                class="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <!-- Company Name Search -->
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-2">Recherche par entreprise</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Icon name="heroicons:building-office" class="w-4 h-4" />
                            </span>
                            <input
                                v-model="companyQuery"
                                type="text"
                                placeholder="Rechercher par nom d'entreprise..."
                                class="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results count -->
            <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span class="text-sm text-slate-500">
                    <strong class="text-slate-800">{{ filteredUsers.length }}</strong> utilisateur(s) trouvé(s)
                </span>
                <button 
                    v-if="userRoleFilter !== 'all' || userStatusFilter !== 'all' || nameEmailQuery || companyQuery"
                    type="button"
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    @click="setRoleFilter('all'); setStatusFilter('all'); nameEmailQuery = ''; companyQuery = ''"
                >
                    Réinitialiser
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="usersLoading" class="flex justify-center py-20">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Content -->
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <!-- Empty State -->
            <div v-if="filteredUsers.length === 0" class="py-16 text-center">
                <Icon name="heroicons:users" class="w-12 h-12 text-slate-300 mx-auto" />
                <p class="text-slate-500 mt-3">Aucun utilisateur trouvé</p>
            </div>

            <!-- Desktop Table -->
            <table v-else class="w-full hidden md:table">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entreprise</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rôle</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="user in filteredUsers" :key="user.uid" class="hover:bg-slate-50">
                        <!-- User -->
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <!-- Blue Role Icon -->
                                <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Icon 
                                        :name="user.role === 'expert' ? 'heroicons:user' : 'heroicons:building-office-2'" 
                                        class="w-5 h-5 text-blue-600" 
                                    />
                                </div>
                                <div class="min-w-0">
                                    <p class="font-medium text-slate-800 truncate">{{ getDisplayName(user).primary }}</p>
                                    <p v-if="getDisplayName(user).secondary" class="text-xs text-slate-400 truncate">
                                        {{ getDisplayName(user).secondary }}
                                    </p>
                                </div>
                            </div>
                        </td>

                        <!-- Enterprise -->
                        <td class="px-4 py-3">
                            <p v-if="user.enterpriseProfile?.companyName" class="text-sm text-slate-800 truncate">
                                {{ user.enterpriseProfile.companyName }}
                            </p>
                            <p v-else-if="user.enterpriseOwnerId" class="text-sm text-slate-800 truncate">
                                {{ (user as any).companyName || user.enterpriseProfile?.companyName || (adminStore.users.find((u: any) => u.uid === user.enterpriseOwnerId)?.enterpriseProfile?.companyName) || (adminStore.users.find((u: any) => u.uid === user.enterpriseOwnerId)?.companyName) || 'ID: ' + (user.enterpriseOwnerId || 'VIDE') }}
                            </p>
                            <p v-else class="text-sm text-slate-400">-</p>
                        </td>

                        <!-- Contact -->
                        <td class="px-4 py-3">
                            <p class="text-sm text-slate-800 truncate max-w-[180px]">{{ user.email }}</p>
                            <p class="text-xs text-slate-400">{{ user.phone }}</p>
                        </td>

                        <!-- Role -->
                        <td class="px-4 py-3">
                            <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                                {{ user.role === 'expert' ? 'Expert' : 'Entreprise' }}
                            </span>
                        </td>

                        <!-- Status -->
                        <td class="px-4 py-3">
                            <span 
                                class="text-xs px-2 py-1 rounded font-medium whitespace-nowrap"
                                :class="{
                                    'bg-green-100 text-green-700': user.status === 'active',
                                    'bg-amber-100 text-amber-700': user.status === 'pending',
                                    'bg-slate-100 text-slate-500': user.status === 'inactive',
                                    'bg-red-100 text-red-700': user.status === 'deleted'
                                }"
                            >
                                {{ user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : user.status === 'deleted' ? 'Supprimé' : 'Inactif' }}
                            </span>
                        </td>

                        <!-- Date -->
                        <td class="px-4 py-3">
                            <span class="text-sm text-slate-400 whitespace-nowrap">{{ formatDate(user.createdAt) }}</span>
                        </td>

                        <!-- Actions -->
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-1">
                                <!-- View Profile -->
                                <button 
                                    type="button"
                                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Voir profil"
                                    @click="viewProfile(user.uid)"
                                >
                                    <Icon name="heroicons:eye" class="w-4 h-4" />
                                </button>

                                <!-- Activate -->
                                <button 
                                    v-if="user.status !== 'active'"
                                    type="button"
                                    class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                    :disabled="actionLoading === user.uid"
                                    title="Activer"
                                    @click="activateUser(user.uid)"
                                >
                                    <Icon name="heroicons:check" class="w-4 h-4" />
                                </button>

                                <!-- Deactivate (Suspend) -->
                                <button 
                                    v-if="user.status === 'active'"
                                    type="button"
                                    class="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                    :disabled="actionLoading === user.uid"
                                    title="Suspendre le compte"
                                    @click="deactivateUser(user.uid)"
                                >
                                    <Icon name="heroicons:pause" class="w-4 h-4" />
                                </button>

                                <!-- Delete -->
                                <button 
                                    v-if="user.status !== 'deleted'"
                                    type="button"
                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    :disabled="actionLoading === user.uid"
                                    title="Supprimer le compte"
                                    @click="deleteUser(user.uid)"
                                >
                                    <Icon name="heroicons:trash" class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Mobile Cards -->
            <div class="md:hidden divide-y divide-slate-100">
                <div v-for="user in filteredUsers" :key="user.uid" class="p-4">
                    <div class="flex items-start gap-3">
                        <!-- Blue Role Icon -->
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Icon 
                                :name="user.role === 'expert' ? 'heroicons:user' : 'heroicons:building-office-2'" 
                                class="w-5 h-5 text-blue-600" 
                            />
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <!-- Name & Role Badge -->
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-medium text-slate-800">{{ getDisplayName(user).primary }}</p>
                                <span 
                                    class="text-xs px-1.5 py-0.5 rounded font-medium"
                                    :class="{
                                        'bg-green-100 text-green-700': user.status === 'active',
                                        'bg-amber-100 text-amber-700': user.status === 'pending',
                                        'bg-slate-100 text-slate-500': user.status === 'inactive',
                                        'bg-red-100 text-red-700': user.status === 'deleted'
                                    }"
                                >
                                    {{ user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : user.status === 'deleted' ? 'Supprimé' : 'Inactif' }}
                                </span>
                            </div>
                            
                            <p v-if="getDisplayName(user).secondary" class="text-xs text-slate-400">
                                {{ getDisplayName(user).secondary }}
                            </p>
                            
                            <!-- Enterprise -->
                            <p v-if="user.enterpriseProfile?.companyName" class="text-xs text-slate-600 mt-1">
                                {{ user.enterpriseProfile.companyName }}
                            </p>
                            <p v-else-if="user.enterpriseOwnerId" class="text-xs text-slate-600 mt-1">
                                {{ getParentEnterpriseName(user) }}
                            </p>
                            
                            <!-- Contact -->
                            <p class="text-sm text-slate-600 mt-1 truncate">{{ user.email }}</p>
                            <p class="text-xs text-slate-400">{{ user.phone }}</p>
                            
                            <!-- Date & Role -->
                            <div class="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {{ user.role === 'expert' ? 'Expert' : 'Entreprise' }}
                                </span>
                                <span>{{ formatDate(user.createdAt) }}</span>
                            </div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex items-center gap-1">
                            <button 
                                type="button"
                                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Voir profil"
                                @click="viewProfile(user.uid)"
                            >
                                <Icon name="heroicons:eye" class="w-5 h-5" />
                            </button>
                            <button 
                                v-if="user.status !== 'active'"
                                type="button"
                                class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                :disabled="actionLoading === user.uid"
                                title="Activer"
                                @click="activateUser(user.uid)"
                            >
                                <Icon name="heroicons:check" class="w-5 h-5" />
                            </button>
                            <button 
                                v-if="user.status === 'active'"
                                type="button"
                                class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                :disabled="actionLoading === user.uid"
                                title="Suspendre le compte"
                                @click="deactivateUser(user.uid)"
                            >
                                <Icon name="heroicons:pause" class="w-5 h-5" />
                            </button>
                            <button 
                                v-if="user.status !== 'deleted'"
                                type="button"
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                :disabled="actionLoading === user.uid"
                                title="Supprimer le compte"
                                @click="deleteUser(user.uid)"
                            >
                                <Icon name="heroicons:trash" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
