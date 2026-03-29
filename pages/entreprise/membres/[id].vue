<script setup lang="ts">
/**
 * Member Detail Page
 * 
 * Allows the gérant to view member info and assign/unassign projects.
 */

import type { UserProfile, Project, ProjectMember } from '~/types'
import {
    getUserProfile,
    getProjectsByEnterprise,
    getAssignmentsByMember,
    assignMemberToProject,
    unassignMemberFromProject,
} from '~/firebase/services/firestore'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth'],
})

const route = useRoute()
const { user, isGerant } = useAuth()

// Redirect members away
onMounted(() => {
    if (!isGerant.value) {
        navigateTo('/entreprise')
    }
})

const memberId = computed(() => route.params.id as string)

const loading = ref(true)
const error = ref<string | null>(null)
const member = ref<UserProfile | null>(null)
const allProjects = ref<Project[]>([])
const assignments = ref<ProjectMember[]>([])
const togglingProjectId = ref<string | null>(null)

// Which projects are assigned to this member
const assignedProjectIds = computed(() => new Set(assignments.value.map(a => a.projectId)))

function isAssigned(projectId: string): boolean {
    return assignedProjectIds.value.has(projectId)
}

async function loadData() {
    if (!user.value?.uid || !memberId.value) return
    loading.value = true
    error.value = null
    try {
        const [memberData, projectsData, assignmentsData] = await Promise.all([
            getUserProfile(memberId.value),
            getProjectsByEnterprise(user.value.uid),
            getAssignmentsByMember(memberId.value),
        ])

        if (!memberData || memberData.enterpriseOwnerId !== user.value.uid) {
            error.value = 'Membre introuvable'
            return
        }

        member.value = memberData
        allProjects.value = projectsData
        assignments.value = assignmentsData
    } catch (e) {
        console.error('Error loading member data:', e)
        error.value = 'Erreur lors du chargement'
    } finally {
        loading.value = false
    }
}

async function toggleProject(projectId: string) {
    if (!user.value?.uid) return
    togglingProjectId.value = projectId
    try {
        if (isAssigned(projectId)) {
            await unassignMemberFromProject(projectId, memberId.value)
        } else {
            await assignMemberToProject(projectId, memberId.value, user.value.uid)
        }
        // Refresh assignments
        assignments.value = await getAssignmentsByMember(memberId.value)
    } catch (e: unknown) {
        console.error('Error toggling project assignment:', e)
        alert((e as Error).message || 'Erreur lors de l\'assignation')
    } finally {
        togglingProjectId.value = null
    }
}

onMounted(loadData)
</script>

<template>
    <div class="max-w-3xl mx-auto">
        <!-- Back link -->
        <NuxtLink
            to="/entreprise/membres"
            class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Retour aux membres
        </NuxtLink>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <Icon name="heroicons:exclamation-circle" class="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p class="text-red-700">{{ error }}</p>
        </div>

        <template v-else-if="member">
            <!-- Member Info Card -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon name="heroicons:user" class="w-7 h-7 text-blue-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <h1 class="text-xl font-bold text-slate-800">
                            {{ member.firstName }} {{ member.lastName }}
                        </h1>
                        <div class="flex flex-wrap items-center gap-3 mt-1">
                            <span class="text-sm text-slate-500 flex items-center gap-1">
                                <Icon name="heroicons:envelope" class="w-4 h-4" />
                                {{ member.email }}
                            </span>
                            <span class="text-sm text-slate-500 flex items-center gap-1">
                                <Icon name="heroicons:phone" class="w-4 h-4" />
                                {{ member.phone }}
                            </span>
                        </div>
                    </div>
                    <span
                        class="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
                        :class="member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'"
                    >
                        {{ member.status === 'active' ? 'Actif' : 'Inactif' }}
                    </span>
                </div>
            </div>

            <!-- Project Assignments -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6">
                <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Icon name="heroicons:folder-open" class="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-slate-800">Projets assignés</h2>
                        <p class="text-sm text-slate-500">
                            {{ assignedProjectIds.size }} projet{{ assignedProjectIds.size > 1 ? 's' : '' }} assigné{{ assignedProjectIds.size > 1 ? 's' : '' }}
                        </p>
                    </div>
                </div>

                <!-- No projects -->
                <div v-if="allProjects.length === 0" class="text-center py-8">
                    <Icon name="heroicons:folder" class="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p class="text-slate-500">Aucun projet dans votre entreprise</p>
                </div>

                <!-- Project list with toggles -->
                <div v-else class="space-y-2">
                    <div
                        v-for="project in allProjects"
                        :key="project.id"
                        class="flex items-center gap-4 p-4 rounded-lg border transition-colors"
                        :class="isAssigned(project.id)
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-slate-200 bg-white'"
                    >
                        <!-- Project info -->
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-slate-800 truncate">{{ project.title }}</p>
                            <div class="flex items-center gap-3 mt-1">
                                <span class="text-xs text-slate-500 flex items-center gap-1">
                                    <Icon name="heroicons:map-pin" class="w-3 h-3" />
                                    {{ project.address }}
                                </span>
                                <span
                                    class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    :class="project.status === 'completed'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-emerald-100 text-emerald-700'"
                                >
                                    {{ project.status === 'completed' ? 'Terminé' : 'Actif' }}
                                </span>
                            </div>
                        </div>

                        <!-- Toggle button -->
                        <button
                            type="button"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            :class="isAssigned(project.id)
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
                            :disabled="togglingProjectId === project.id"
                            @click="toggleProject(project.id)"
                        >
                            <Icon
                                v-if="togglingProjectId === project.id"
                                name="heroicons:arrow-path"
                                class="w-4 h-4 animate-spin"
                            />
                            <Icon
                                v-else
                                :name="isAssigned(project.id) ? 'heroicons:minus-circle' : 'heroicons:plus-circle'"
                                class="w-4 h-4"
                            />
                            {{ isAssigned(project.id) ? 'Retirer' : 'Assigner' }}
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
