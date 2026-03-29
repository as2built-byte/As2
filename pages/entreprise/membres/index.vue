<script setup lang="ts">
/**
 * Enterprise Members List Page
 * 
 * Allows the gérant to view, create, and manage member accounts (project managers).
 */

import type { UserProfile, SubscriptionPlan } from '~/types'
import { getMembersByEnterprise, deleteMember, getAssignmentsByMember, getEnterpriseProfile } from '~/firebase/services/firestore'
import { PLAN_LIMITS } from '~/types'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth'],
})

const { user, isGerant } = useAuth()

// Redirect members away — only gérant can access this page
onMounted(() => {
    if (!isGerant.value) {
        navigateTo('/entreprise')
    }
})

const loading = ref(true)
const error = ref<string | null>(null)
const members = ref<(UserProfile & { assignedCount: number })[]>([])
const deletingId = ref<string | null>(null)

// Member limits
const enterpriseProfile = ref<any>(null)
const canAddMoreMembers = ref(true)

// Get member limits
const membersCountString = computed(() => {
    if (!enterpriseProfile.value) return "0/1"
    const plan: SubscriptionPlan = enterpriseProfile.value.plan || 'free'
    const maxMembers = PLAN_LIMITS[plan].maxUsers
    return `${members.value.length}/${maxMembers}`
})

const remainingMembers = computed(() => {
    if (!enterpriseProfile.value) return 0
    const plan: SubscriptionPlan = enterpriseProfile.value.plan || 'free'
    const maxMembers = PLAN_LIMITS[plan].maxUsers
    return Math.max(0, maxMembers - members.value.length)
})

async function loadMembers() {
    if (!user.value?.uid) return
    loading.value = true
    error.value = null
    try {
        // Load enterprise profile first
        enterpriseProfile.value = await getEnterpriseProfile(user.value.uid)
        
        const rawMembers = await getMembersByEnterprise(user.value.uid)
        // Load assignment counts in parallel
        const withCounts = await Promise.all(
            rawMembers.map(async (m) => {
                const assignments = await getAssignmentsByMember(m.uid)
                return { ...m, assignedCount: assignments.length }
            })
        )
        members.value = withCounts
        
        // Check if can add more members
        const plan: SubscriptionPlan = enterpriseProfile.value.plan || 'free'
        const maxMembers = PLAN_LIMITS[plan].maxUsers
        canAddMoreMembers.value = members.value.length < maxMembers
        
        console.log('🔍 Members limit check:', {
            plan: enterpriseProfile.value.plan,
            maxMembers,
            currentCount: members.value.length,
            canAddMore: canAddMoreMembers.value
        })
    } catch (e) {
        console.error('Error loading members:', e)
        error.value = 'Erreur lors du chargement des membres'
    } finally {
        loading.value = false
    }
}

async function deleteMemberAccount(member: UserProfile & { assignedCount: number }) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${member.firstName} ${member.lastName} ?\n\nCette action est irréversible et supprimera :\n- Toutes les assignations de projets\n- Le profil utilisateur\n- L'accès à la plateforme`)) {
        return
    }
    
    deletingId.value = member.uid
    try {
        await deleteMember(member.uid)
        await loadMembers()
    } catch (e) {
        console.error('Error deleting member:', e)
        alert('Erreur lors de la suppression du membre')
    } finally {
        deletingId.value = null
    }
}

onMounted(loadMembers)
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 page-header">
            <div>
                <h1 class="page-title">Membres</h1>
                <p class="page-subtitle">Gérez les chefs de projet de votre entreprise</p>
            </div>
            <div v-if="canAddMoreMembers">
                <NuxtLink
                    to="/entreprise/membres/create"
                    class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                    Nouveau membre
                    <span class="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                        {{ membersCountString }}
                    </span>
                </NuxtLink>
            </div>
            <div v-else class="flex items-center gap-3">
                <div class="text-right">
                    <p class="text-sm text-slate-500 mb-2">
                        Limite atteinte : {{ membersCountString }}
                    </p>
                    <NuxtLink 
                        to="/entreprise/abonnement"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 shadow-sm transition-colors"
                    >
                        <Icon name="heroicons:arrow-up-circle" class="w-5 h-5" />
                        Upgrade
                    </NuxtLink>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty state -->
        <div v-else-if="members.length === 0" class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="heroicons:user-group" class="w-8 h-8 text-blue-600" />
            </div>
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Aucun membre</h3>
            <p class="text-slate-500 mb-6 max-w-sm mx-auto">
                Créez des comptes pour vos chefs de projet. Ils pourront gérer les projets que vous leur assignez.
            </p>
            <NuxtLink
                to="/entreprise/membres/create"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
                <Icon name="heroicons:plus-circle" class="w-5 h-5" />
                Créer un membre
            </NuxtLink>
        </div>

        <!-- Members list -->
        <div v-else class="space-y-3">
            <div
                v-for="member in members"
                :key="member.uid"
                class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm transition-shadow"
            >
                <!-- Avatar + Info -->
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <div class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                         :class="member.status === 'active' ? 'bg-blue-100' : 'bg-slate-100'">
                        <Icon name="heroicons:user" class="w-5 h-5"
                              :class="member.status === 'active' ? 'text-blue-600' : 'text-slate-400'" />
                    </div>
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-800 truncate">
                            {{ member.firstName }} {{ member.lastName }}
                        </p>
                        <p class="text-sm text-slate-500 truncate">{{ member.email }}</p>
                    </div>
                </div>

                <!-- Stats -->
                <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-1.5 text-slate-500">
                        <Icon name="heroicons:folder-open" class="w-4 h-4" />
                        <span>{{ member.assignedCount }} projet{{ member.assignedCount > 1 ? 's' : '' }}</span>
                    </div>
                    <span
                        class="px-2.5 py-1 rounded-full text-xs font-medium"
                        :class="member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'"
                    >
                        {{ member.status === 'active' ? 'Actif' : 'Inactif' }}
                    </span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        :disabled="deletingId === member.uid"
                        title="Supprimer"
                        @click="deleteMemberAccount(member)"
                    >
                        <Icon
                            :name="deletingId === member.uid
                                ? 'heroicons:arrow-path'
                                : 'heroicons:trash'"
                            class="w-5 h-5"
                            :class="{ 'animate-spin': deletingId === member.uid }"
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
