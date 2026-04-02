<script setup lang="ts">
import type { UserProfile, ProjectMember } from '~/types'
import {
    getMembersByProject,
    getUserProfile,
    getProject,
} from '~/firebase/services/firestore'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile } = useAuth()

const projectId = computed(() => route.params.id as string)

// State
const members = ref<Array<ProjectMember & { profile?: UserProfile; isOnline?: boolean }>>([])
const loading = ref(true)
const error = ref<string | null>(null)
const projectEnterpriseId = ref<string>('')

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
    member: { label: 'Membre', bg: 'bg-blue-100', text: 'text-blue-700' },
}

// Load members
async function loadMembers() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        const projectMembers = await getMembersByProject(projectId.value)
        
        // Load project to get enterprise ID
        const proj = await getProject(projectId.value)
        if (proj) projectEnterpriseId.value = proj.enterpriseId
        
        // Load profiles for each member
        const membersWithProfiles = await Promise.all(
            projectMembers.map(async (m) => {
                const profile = await getUserProfile(m.userId)
                // Simulate online status (would be real in production with presence system)
                const isOnline = Math.random() > 0.3 // Mock: 70% online
                return {
                    ...m,
                    profile: profile || undefined,
                    isOnline,
                }
            })
        )
        
        members.value = membersWithProfiles
    } catch (e) {
        console.error('Error loading members:', e)
        error.value = 'Erreur lors du chargement des membres'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadMembers()
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const isProjectOwner = computed(() => currentUserId.value === projectEnterpriseId.value)

function canManageMembers(): boolean {
    return isProjectOwner.value || profile.value?.role === 'admin'
}

function getRoleDisplay(role: string): string {
    return roleConfig[role]?.label || role
}

function getRoleClasses(role: string): string {
    const config = roleConfig[role]
    if (!config) return 'bg-slate-100 text-slate-700'
    return `${config.bg} ${config.text}`
}

function getMemberName(member: ProjectMember & { profile?: UserProfile }): string {
    if (member.profile) {
        return `${member.profile.firstName} ${member.profile.lastName}`
    }
    return member.userId
}

function getMemberEmail(member: ProjectMember & { profile?: UserProfile }): string {
    return member.profile?.email || '—'
}

function getMemberRole(member: ProjectMember & { profile?: UserProfile }): string {
    // Priority: member.role from project_members > profile.role
    return member.role || member.profile?.role || 'member'
}
</script>

<template>
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon name="heroicons:users" class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Membres du projet</h2>
                    <p class="text-sm text-slate-500">{{ members.length }} membre{{ members.length > 1 ? 's' : '' }}</p>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-600" />
            <span class="text-red-700">{{ error }}</span>
        </div>

        <!-- Members List -->
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div v-if="members.length === 0" class="p-12 text-center">
                <Icon name="heroicons:users" class="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p class="text-slate-500 font-medium">Aucun membre</p>
                <p class="text-sm text-slate-400 mt-1">Ce projet n'a pas encore de membres assignés</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
                <div
                    v-for="member in members"
                    :key="member.userId"
                    class="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                    <!-- Avatar / Online indicator -->
                    <div class="relative flex-shrink-0">
                        <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                            <Icon name="heroicons:user" class="w-6 h-6 text-slate-400" />
                        </div>
                        <!-- Online status indicator -->
                        <div
                            class="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white"
                            :class="member.isOnline ? 'bg-green-500' : 'bg-slate-400'"
                            :title="member.isOnline ? 'En ligne' : 'Hors ligne'"
                        />
                    </div>

                    <!-- Member info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="font-semibold text-slate-800 truncate">
                                {{ getMemberName(member) }}
                            </h4>
                            <!-- Role badge -->
                            <span
                                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                :class="getRoleClasses(getMemberRole(member))"
                            >
                                {{ getRoleDisplay(getMemberRole(member)) }}
                            </span>
                        </div>
                        <p class="text-sm text-slate-500 truncate">{{ getMemberEmail(member) }}</p>
                        <p class="text-xs text-slate-400 mt-0.5">
                            Ajouté le {{ new Date(member.joinedAt).toLocaleDateString('fr-FR') }}
                        </p>
                    </div>

                    <!-- Actions -->
                    <div v-if="canManageMembers() && member.userId !== currentUserId" class="flex items-center gap-1">
                        <button
                            type="button"
                            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Modifier le rôle"
                        >
                            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retirer du projet"
                        >
                            <Icon name="heroicons:trash" class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Legend -->
        <div class="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span class="text-slate-600">En ligne</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-slate-400"></div>
                <span class="text-slate-600">Hors ligne</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.spinner-lg {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
