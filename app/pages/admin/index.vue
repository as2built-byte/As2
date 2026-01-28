<script setup lang="ts">
/**
 * Admin Dashboard - Clean KPI Cards
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

const adminStore = useAdminStore()
const { stats, usersLoading } = storeToRefs(adminStore)

// Fetch data on mount
onMounted(async () => {
    await adminStore.fetchAllUsers()
})
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <!-- Loading State -->
        <div v-if="usersLoading" class="flex items-center justify-center py-20">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <template v-else>
            <!-- Welcome Message -->
            <div class="mb-8">
                <h1 class="text-2xl font-bold text-slate-800">Bienvenue</h1>
                <p class="text-slate-500 mt-1">Espace d'administration As2Built</p>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <!-- Total Users -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Total utilisateurs</span>
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Icon name="heroicons:users" class="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ stats.totalUsers }}</p>
                    <p class="text-sm text-slate-400 mt-1">experts + entreprises</p>
                </div>

                <!-- Pending -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">En attente</span>
                        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ stats.pendingUsers }}</p>
                    <NuxtLink 
                        v-if="stats.pendingUsers > 0"
                        to="/admin/users?status=pending" 
                        class="text-sm text-amber-600 hover:text-amber-700 font-medium mt-1 inline-block"
                    >
                        Voir les demandes →
                    </NuxtLink>
                    <p v-else class="text-sm text-slate-400 mt-1">aucune demande</p>
                </div>

                <!-- Experts -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Experts BIM</span>
                        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Icon name="heroicons:user" class="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ stats.totalExperts }}</p>
                    <p class="text-sm text-slate-400 mt-1">professionnels certifiés</p>
                </div>

                <!-- Enterprises -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Entreprises</span>
                        <div class="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Icon name="heroicons:building-office" class="w-5 h-5 text-violet-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ stats.totalEnterprises }}</p>
                    <p class="text-sm text-slate-400 mt-1">sociétés inscrites</p>
                </div>
            </div>
        </template>
    </div>
</template>
