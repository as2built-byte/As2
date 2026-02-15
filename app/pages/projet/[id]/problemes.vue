<script setup lang="ts">
import type { ProjectProblem, ProblemSeverity, UserProfile } from '~/types'
import {
    getProblemsByProject,
    createProblem,
    updateProblem,
    deleteProblem,
    getUserProfile,
    getProject,
    isUserAssignedToProject,
} from '~/firebase/services/firestore'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile } = useAuth()

const projectId = computed(() => route.params.id as string)

// State
const problems = ref<ProjectProblem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const severityFilter = ref<'all' | ProblemSeverity>('all')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)

// Create form
const showCreateForm = ref(false)
const createTitle = ref('')
const createDescription = ref('')
const createSeverity = ref<ProblemSeverity>('medium')
const creating = ref(false)

// Edit state
const editingProblem = ref<ProjectProblem | null>(null)
const editTitle = ref('')
const editDescription = ref('')
const editSeverity = ref<ProblemSeverity>('medium')
const saving = ref(false)

// Delete state
const deletingProblemId = ref<string | null>(null)

// Sender profiles cache
const senderProfiles = ref<Record<string, UserProfile>>({})

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
}

// Severity display config
const severityConfig: Record<ProblemSeverity, { label: string; bg: string; text: string; icon: string; border: string }> = {
    low: { label: 'Faible', bg: 'bg-sky-100', text: 'text-sky-700', icon: 'heroicons:information-circle', border: 'border-l-sky-400' },
    medium: { label: 'Moyen', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'heroicons:exclamation-triangle', border: 'border-l-amber-400' },
    high: { label: 'Élevé', bg: 'bg-red-100', text: 'text-red-700', icon: 'heroicons:fire', border: 'border-l-red-500' },
}

// Load problems
async function loadProblems() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        problems.value = await getProblemsByProject(projectId.value)
        const senderIds = [...new Set(problems.value.map(p => p.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading problems:', e)
        error.value = 'Erreur lors du chargement des problèmes'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
    try {
        const proj = await getProject(projectId.value)
        if (proj) projectEnterpriseId.value = proj.enterpriseId
        if (user.value?.uid && profile.value?.enterpriseOwnerId) {
            isAssignedMember.value = await isUserAssignedToProject(user.value.uid, projectId.value)
        }
    } catch (e) { /* ignore */ }
    await loadProblems()
})

// Filtered problems
const filteredProblems = computed(() => {
    return problems.value.filter(p => {
        if (severityFilter.value !== 'all' && p.severity !== severityFilter.value) return false
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase()
            return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        }
        return true
    })
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const currentRole = computed(() => profile.value?.role || '')

function canEdit(problem: ProjectProblem): boolean {
    return problem.senderId === currentUserId.value
}

function canDelete(problem: ProjectProblem): boolean {
    return problem.senderId === currentUserId.value || currentUserId.value === projectEnterpriseId.value || isAssignedMember.value
}

// Create problem
async function handleCreate() {
    if (!createTitle.value.trim() || !createDescription.value.trim() || !currentUserId.value) return

    creating.value = true
    try {
        await createProblem(projectId.value, currentUserId.value, {
            title: createTitle.value.trim(),
            description: createDescription.value.trim(),
            severity: createSeverity.value,
        })

        // Reset form
        createTitle.value = ''
        createDescription.value = ''
        createSeverity.value = 'medium'
        showCreateForm.value = false

        await loadProblems()
    } catch (e) {
        console.error('Error creating problem:', e)
        alert('Erreur lors de la création du problème')
    } finally {
        creating.value = false
    }
}

// Start editing
function startEdit(problem: ProjectProblem) {
    editingProblem.value = problem
    editTitle.value = problem.title
    editDescription.value = problem.description
    editSeverity.value = problem.severity
}

// Save edit
async function saveEdit() {
    if (!editingProblem.value || !editTitle.value.trim() || !editDescription.value.trim()) return
    saving.value = true
    try {
        await updateProblem(editingProblem.value.id, {
            title: editTitle.value.trim(),
            description: editDescription.value.trim(),
            severity: editSeverity.value,
        })
        editingProblem.value = null
        await loadProblems()
    } catch (e) {
        console.error('Error updating problem:', e)
        alert('Erreur lors de la modification')
    } finally {
        saving.value = false
    }
}

// Delete problem
async function handleDelete(problem: ProjectProblem) {
    if (!confirm(`Supprimer "${problem.title}" ?`)) return
    deletingProblemId.value = problem.id
    try {
        await deleteProblem(problem.id)
        await loadProblems()
    } catch (e) {
        console.error('Error deleting problem:', e)
        alert('Erreur lors de la suppression')
    } finally {
        deletingProblemId.value = null
    }
}

function getSenderName(senderId: string): string {
    const p = senderProfiles.value[senderId]
    return p ? `${p.firstName} ${p.lastName}` : '—'
}

function getSenderRole(senderId: string): string {
    return senderProfiles.value[senderId]?.role || ''
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

// Stats
const stats = computed(() => ({
    total: problems.value.length,
    high: problems.value.filter(p => p.severity === 'high').length,
    medium: problems.value.filter(p => p.severity === 'medium').length,
    low: problems.value.filter(p => p.severity === 'low').length,
}))
</script>

<template>
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Problèmes</h2>
                    <p class="text-sm text-slate-500">{{ problems.length }} problème{{ problems.length > 1 ? 's' : '' }}</p>
                </div>
            </div>
            <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 shadow-sm transition-colors"
                @click="showCreateForm = !showCreateForm"
            >
                <Icon :name="showCreateForm ? 'heroicons:x-mark' : 'heroicons:plus-circle'" class="w-5 h-5" />
                {{ showCreateForm ? 'Annuler' : 'Signaler un problème' }}
            </button>
        </div>

        <!-- Stats -->
        <div v-if="!loading && problems.length > 0" class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:fire" class="w-4 h-4 text-red-500" />
                    <span class="text-lg font-bold text-red-600">{{ stats.high }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Élevé</span>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-amber-500" />
                    <span class="text-lg font-bold text-amber-600">{{ stats.medium }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Moyen</span>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:information-circle" class="w-4 h-4 text-sky-500" />
                    <span class="text-lg font-bold text-sky-600">{{ stats.low }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Faible</span>
            </div>
        </div>

        <!-- Create Form -->
        <Transition name="slide">
            <div v-if="showCreateForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Nouveau problème</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
                        <input
                            v-model="createTitle"
                            type="text"
                            placeholder="Titre du problème"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Sévérité *</label>
                        <select
                            v-model="createSeverity"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        >
                            <option value="low">Faible</option>
                            <option value="medium">Moyen</option>
                            <option value="high">Élevé</option>
                        </select>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Description *</label>
                    <textarea
                        v-model="createDescription"
                        rows="3"
                        placeholder="Décrivez le problème en détail..."
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                </div>
                <div class="flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        :disabled="!createTitle.trim() || !createDescription.trim() || creating"
                        @click="handleCreate"
                    >
                        <Icon v-if="creating" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <Icon v-else name="heroicons:plus" class="w-4 h-4" />
                        {{ creating ? 'Création...' : 'Créer' }}
                    </button>
                </div>
            </div>
        </Transition>

        <!-- Filters -->
        <div v-if="!loading && problems.length > 0" class="flex flex-col sm:flex-row gap-3 mb-5">
            <div class="relative flex-1">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher..."
                    class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
            </div>
            <div class="flex items-center gap-2">
                <button
                    v-for="(cfg, key) in { all: { label: 'Tous' }, ...severityConfig }"
                    :key="key"
                    type="button"
                    class="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                    :class="severityFilter === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="severityFilter = key as any"
                >
                    {{ cfg.label }}
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="spinner-lg text-amber-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredProblems.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:exclamation-triangle" class="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <p class="text-slate-500 font-medium mb-1">
                {{ searchQuery || severityFilter !== 'all' ? 'Aucun problème trouvé' : 'Aucun problème' }}
            </p>
            <p v-if="!searchQuery && severityFilter === 'all'" class="text-sm text-slate-400">
                Aucun problème signalé pour le moment
            </p>
        </div>

        <!-- Problems List -->
        <div v-else class="space-y-3">
            <div
                v-for="problem in filteredProblems"
                :key="problem.id"
                class="bg-white rounded-xl border border-slate-200 border-l-4 p-4 hover:shadow-sm transition-all"
                :class="severityConfig[problem.severity]?.border"
            >
                <!-- Edit mode -->
                <div v-if="editingProblem?.id === problem.id" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            v-model="editTitle"
                            type="text"
                            placeholder="Titre du problème"
                            class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <select
                            v-model="editSeverity"
                            class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        >
                            <option value="low">Faible</option>
                            <option value="medium">Moyen</option>
                            <option value="high">Élevé</option>
                        </select>
                    </div>
                    <textarea
                        v-model="editDescription"
                        rows="3"
                        placeholder="Description..."
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                    <div class="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="editingProblem = null"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                            :disabled="!editTitle.trim() || !editDescription.trim() || saving"
                            @click="saveEdit"
                        >
                            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
                            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                        </button>
                    </div>
                </div>

                <!-- View mode -->
                <div v-else>
                    <div class="flex flex-col sm:flex-row sm:items-start gap-3">
                        <!-- Icon + Info -->
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                            <div
                                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                :class="severityConfig[problem.severity]?.bg"
                            >
                                <Icon
                                    :name="severityConfig[problem.severity]?.icon"
                                    class="w-5 h-5"
                                    :class="severityConfig[problem.severity]?.text"
                                />
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="text-sm font-semibold text-slate-900">{{ problem.title }}</h4>
                                <p class="text-sm text-slate-600 mt-1 whitespace-pre-line">{{ problem.description }}</p>
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                                    <span
                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        :class="[severityConfig[problem.severity]?.bg, severityConfig[problem.severity]?.text]"
                                    >
                                        {{ severityConfig[problem.severity]?.label }}
                                    </span>
                                    <span
                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        :class="[roleConfig[getSenderRole(problem.senderId)]?.bg, roleConfig[getSenderRole(problem.senderId)]?.text]"
                                    >
                                        {{ roleConfig[getSenderRole(problem.senderId)]?.label || getSenderRole(problem.senderId) }}
                                    </span>
                                    <span class="text-xs text-slate-500">{{ getSenderName(problem.senderId) }}</span>
                                    <span class="text-xs text-slate-300">&middot;</span>
                                    <span class="text-xs text-slate-400">{{ formatDate(problem.createdAt) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button
                                v-if="canEdit(problem)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifier"
                                @click="startEdit(problem)"
                            >
                                <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                            </button>
                            <button
                                v-if="canDelete(problem)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                :disabled="deletingProblemId === problem.id"
                                title="Supprimer"
                                @click="handleDelete(problem)"
                            >
                                <Icon
                                    :name="deletingProblemId === problem.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                    class="w-4 h-4"
                                    :class="{ 'animate-spin': deletingProblemId === problem.id }"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
    transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
