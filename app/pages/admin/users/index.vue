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

// Action states
const actionLoading = ref<string | null>(null)

// Fetch on mount
onMounted(async () => {
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
    if (user.role === 'enterprise' && user.enterpriseProfile?.companyName) {
        return {
            primary: user.enterpriseProfile.companyName,
            secondary: `${user.firstName} ${user.lastName}`
        }
    }
    return { primary: `${user.firstName} ${user.lastName}` }
}
</script>

<template>
    <div>
        <!-- Page Header -->
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-800">Utilisateurs</h1>
            <p class="text-slate-500 mt-1">Gérer les comptes experts et entreprises</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div class="flex flex-col lg:flex-row lg:items-center gap-4">
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
                            :class="userStatusFilter === 'pending' 
                                ? 'bg-amber-100 text-amber-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('pending')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            En attente
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
                            :class="userStatusFilter === 'rejected' 
                                ? 'bg-red-100 text-red-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="setStatusFilter('rejected')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Refusés
                        </button>
                    </div>
                </div>
            </div>

            <!-- Results count -->
            <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span class="text-sm text-slate-500">
                    <strong class="text-slate-800">{{ filteredUsers.length }}</strong> utilisateur(s) trouvé(s)
                </span>
                <button 
                    v-if="userRoleFilter !== 'all' || userStatusFilter !== 'all'"
                    type="button"
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    @click="setRoleFilter('all'); setStatusFilter('all')"
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
                                    'bg-red-100 text-red-700': user.status === 'rejected'
                                }"
                            >
                                {{ user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : user.status === 'rejected' ? 'Refusé' : 'Inactif' }}
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

                                <!-- Reject (for pending users) -->
                                <button 
                                    v-if="user.status === 'pending'"
                                    type="button"
                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    :disabled="actionLoading === user.uid"
                                    title="Refuser l'inscription"
                                    @click="rejectUser(user.uid)"
                                >
                                    <Icon name="heroicons:no-symbol" class="w-4 h-4" />
                                </button>

                                <!-- Deactivate -->
                                <button 
                                    v-if="user.status === 'active'"
                                    type="button"
                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    :disabled="actionLoading === user.uid"
                                    title="Désactiver"
                                    @click="deactivateUser(user.uid)"
                                >
                                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
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
                                        'bg-red-100 text-red-700': user.status === 'rejected'
                                    }"
                                >
                                    {{ user.status === 'active' ? 'Actif' : user.status === 'pending' ? 'En attente' : user.status === 'rejected' ? 'Refusé' : 'Inactif' }}
                                </span>
                            </div>
                            
                            <p v-if="getDisplayName(user).secondary" class="text-xs text-slate-400">
                                {{ getDisplayName(user).secondary }}
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
                                v-if="user.status === 'pending'"
                                type="button"
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                :disabled="actionLoading === user.uid"
                                title="Refuser l'inscription"
                                @click="rejectUser(user.uid)"
                            >
                                <Icon name="heroicons:no-symbol" class="w-5 h-5" />
                            </button>
                            <button 
                                v-if="user.status === 'active'"
                                type="button"
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                :disabled="actionLoading === user.uid"
                                title="Désactiver"
                                @click="deactivateUser(user.uid)"
                            >
                                <Icon name="heroicons:x-mark" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
