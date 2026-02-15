<script setup lang="ts">
import type { ProjectSubmission, SubmissionStatus, UserProfile } from '~/types'
import {
    getSubmissionsByProject,
    createSubmission,
    updateSubmission,
    updateSubmissionStatus,
    deleteSubmission,
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
const submissions = ref<ProjectSubmission[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const statusFilter = ref<'all' | SubmissionStatus>('all')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)

// Create form
const showCreateForm = ref(false)
const createTitle = ref('')
const createDescription = ref('')
const creating = ref(false)

// Edit state
const editingSubmission = ref<ProjectSubmission | null>(null)
const editTitle = ref('')
const editDescription = ref('')
const saving = ref(false)

// Delete state
const deletingSubmissionId = ref<string | null>(null)

// Status change loading
const changingStatusId = ref<string | null>(null)

// Expanded submission
const expandedId = ref<string | null>(null)

// Sender profiles cache
const senderProfiles = ref<Record<string, UserProfile>>({})

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
}

// Status display config
const statusConfig: Record<SubmissionStatus, { label: string; bg: string; text: string; icon: string; border: string }> = {
    pending: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'heroicons:clock', border: 'border-l-amber-400' },
    approved: { label: 'Approuvée', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'heroicons:check-circle', border: 'border-l-emerald-400' },
    rejected: { label: 'Rejetée', bg: 'bg-red-100', text: 'text-red-700', icon: 'heroicons:x-circle', border: 'border-l-red-400' },
}

// Load submissions
async function loadSubmissions() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        submissions.value = await getSubmissionsByProject(projectId.value)
        const senderIds = [...new Set(submissions.value.map(s => s.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading submissions:', e)
        error.value = 'Erreur lors du chargement des soumissions'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
    try {
        const proj = await getProject(projectId.value)
        if (proj) projectEnterpriseId.value = proj.enterpriseId
        // Check if current user is an assigned member for this project
        if (user.value?.uid && profile.value?.enterpriseOwnerId) {
            isAssignedMember.value = await isUserAssignedToProject(user.value.uid, projectId.value)
        }
    } catch (e) { /* ignore */ }
    await loadSubmissions()
})

// Filtered submissions
const filteredSubmissions = computed(() => {
    return submissions.value.filter(s => {
        if (statusFilter.value !== 'all' && s.status !== statusFilter.value) return false
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase()
            return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
        }
        return true
    })
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const currentRole = computed(() => profile.value?.role || '')
const isExpert = computed(() => currentRole.value === 'expert')
const isAdmin = computed(() => currentRole.value === 'admin')
const isEnterpriseOwner = computed(() => currentUserId.value === projectEnterpriseId.value || isAssignedMember.value)

// Experts and admin can create submissions
const canCreate = computed(() => isExpert.value || isAdmin.value)

// Only the creator (expert) can edit their own pending submissions
function canEdit(submission: ProjectSubmission): boolean {
    return submission.senderId === currentUserId.value && submission.status === 'pending'
}

// Creator can delete their own pending submissions only
function canDelete(submission: ProjectSubmission): boolean {
    return submission.senderId === currentUserId.value && submission.status === 'pending'
}

// Only enterprise owner can approve/reject submissions
function canChangeStatus(submission: ProjectSubmission): boolean {
    return isEnterpriseOwner.value && submission.status === 'pending'
}

// Create submission
async function handleCreate() {
    if (!createTitle.value.trim() || !createDescription.value.trim() || !currentUserId.value) return

    creating.value = true
    try {
        await createSubmission(projectId.value, currentUserId.value, {
            title: createTitle.value.trim(),
            description: createDescription.value.trim(),
        })

        createTitle.value = ''
        createDescription.value = ''
        showCreateForm.value = false

        await loadSubmissions()
    } catch (e) {
        console.error('Error creating submission:', e)
        alert('Erreur lors de la création de la soumission')
    } finally {
        creating.value = false
    }
}

// Start editing
function startEdit(submission: ProjectSubmission) {
    editingSubmission.value = submission
    editTitle.value = submission.title
    editDescription.value = submission.description
}

// Save edit
async function saveEdit() {
    if (!editingSubmission.value || !editTitle.value.trim() || !editDescription.value.trim()) return
    saving.value = true
    try {
        await updateSubmission(editingSubmission.value.id, {
            title: editTitle.value.trim(),
            description: editDescription.value.trim(),
        })
        editingSubmission.value = null
        await loadSubmissions()
    } catch (e) {
        console.error('Error updating submission:', e)
        alert('Erreur lors de la modification')
    } finally {
        saving.value = false
    }
}

// Change status (enterprise owner only)
async function handleStatusChange(submission: ProjectSubmission, newStatus: SubmissionStatus) {
    if (!canChangeStatus(submission) || submission.status === newStatus) return
    changingStatusId.value = submission.id
    try {
        await updateSubmissionStatus(submission.id, newStatus)
        await loadSubmissions()
    } catch (e) {
        console.error('Error changing status:', e)
        alert('Erreur lors du changement de statut')
    } finally {
        changingStatusId.value = null
    }
}

// Delete submission
async function handleDelete(submission: ProjectSubmission) {
    if (!confirm(`Supprimer "${submission.title}" ?`)) return
    deletingSubmissionId.value = submission.id
    try {
        await deleteSubmission(submission.id)
        await loadSubmissions()
    } catch (e) {
        console.error('Error deleting submission:', e)
        alert('Erreur lors de la suppression')
    } finally {
        deletingSubmissionId.value = null
    }
}

function toggleExpand(id: string) {
    expandedId.value = expandedId.value === id ? null : id
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
    total: submissions.value.length,
    pending: submissions.value.filter(s => s.status === 'pending').length,
    approved: submissions.value.filter(s => s.status === 'approved').length,
    rejected: submissions.value.filter(s => s.status === 'rejected').length,
}))
</script>

<template>
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Icon name="heroicons:paper-airplane" class="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Soumissions</h2>
                    <p class="text-sm text-slate-500">{{ submissions.length }} soumission{{ submissions.length > 1 ? 's' : '' }}</p>
                </div>
            </div>
            <button
                v-if="canCreate"
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
                @click="showCreateForm = !showCreateForm"
            >
                <Icon :name="showCreateForm ? 'heroicons:x-mark' : 'heroicons:plus-circle'" class="w-5 h-5" />
                {{ showCreateForm ? 'Annuler' : 'Nouvelle soumission' }}
            </button>
        </div>

        <!-- Stats -->
        <div v-if="!loading && submissions.length > 0" class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:clock" class="w-4 h-4 text-amber-500" />
                    <span class="text-lg font-bold text-amber-600">{{ stats.pending }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">En attente</span>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-500" />
                    <span class="text-lg font-bold text-emerald-600">{{ stats.approved }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Approuvées</span>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div class="flex items-center justify-center gap-1.5 mb-1">
                    <Icon name="heroicons:x-circle" class="w-4 h-4 text-red-500" />
                    <span class="text-lg font-bold text-red-600">{{ stats.rejected }}</span>
                </div>
                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Rejetées</span>
            </div>
        </div>

        <!-- Create Form -->
        <Transition name="slide">
            <div v-if="showCreateForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Nouvelle soumission</h3>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
                    <input
                        v-model="createTitle"
                        type="text"
                        placeholder="Titre de la soumission"
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Description *</label>
                    <textarea
                        v-model="createDescription"
                        rows="4"
                        placeholder="Décrivez votre soumission en détail..."
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                </div>
                <div class="flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        :disabled="!createTitle.trim() || !createDescription.trim() || creating"
                        @click="handleCreate"
                    >
                        <Icon v-if="creating" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4" />
                        {{ creating ? 'Envoi...' : 'Soumettre' }}
                    </button>
                </div>
            </div>
        </Transition>

        <!-- Filters -->
        <div v-if="!loading && submissions.length > 0" class="flex flex-col sm:flex-row gap-3 mb-5">
            <div class="relative flex-1">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher..."
                    class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
            </div>
            <div class="flex items-center gap-2">
                <button
                    v-for="(cfg, key) in { all: { label: 'Tous' }, ...statusConfig }"
                    :key="key"
                    type="button"
                    class="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                    :class="statusFilter === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="statusFilter = key as any"
                >
                    {{ cfg.label }}
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="spinner-lg text-emerald-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredSubmissions.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:paper-airplane" class="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <p class="text-slate-500 font-medium mb-1">
                {{ searchQuery || statusFilter !== 'all' ? 'Aucune soumission trouvée' : 'Aucune soumission' }}
            </p>
            <p v-if="!searchQuery && statusFilter === 'all'" class="text-sm text-slate-400">
                Aucune soumission pour le moment
            </p>
        </div>

        <!-- Submissions List -->
        <div v-else class="space-y-3">
            <div
                v-for="submission in filteredSubmissions"
                :key="submission.id"
                class="bg-white rounded-xl border border-slate-200 border-l-4 hover:shadow-sm transition-all"
                :class="statusConfig[submission.status]?.border"
            >
                <!-- Edit mode -->
                <div v-if="editingSubmission?.id === submission.id" class="p-4 space-y-3">
                    <input
                        v-model="editTitle"
                        type="text"
                        placeholder="Titre"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <textarea
                        v-model="editDescription"
                        rows="3"
                        placeholder="Description..."
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                    <div class="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="editingSubmission = null"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            :disabled="!editTitle.trim() || !editDescription.trim() || saving"
                            @click="saveEdit"
                        >
                            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
                            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                        </button>
                    </div>
                </div>

                <!-- View mode -->
                <div v-else class="p-4 cursor-pointer" @click="toggleExpand(submission.id)">
                    <div class="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                            <!-- Status icon -->
                            <div
                                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                :class="statusConfig[submission.status]?.bg"
                            >
                                <Icon
                                    :name="statusConfig[submission.status]?.icon"
                                    class="w-5 h-5"
                                    :class="statusConfig[submission.status]?.text"
                                />
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="text-sm font-semibold text-slate-900">{{ submission.title }}</h4>
                                <!-- Collapsed -->
                                <p v-if="expandedId !== submission.id" class="text-sm text-slate-500 mt-1 truncate">
                                    {{ submission.description }}
                                </p>
                                <!-- Expanded -->
                                <p v-else class="text-sm text-slate-600 mt-1 whitespace-pre-line">
                                    {{ submission.description }}
                                </p>
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                                    <span
                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        :class="[statusConfig[submission.status]?.bg, statusConfig[submission.status]?.text]"
                                    >
                                        {{ statusConfig[submission.status]?.label }}
                                    </span>
                                    <span
                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        :class="[roleConfig[getSenderRole(submission.senderId)]?.bg, roleConfig[getSenderRole(submission.senderId)]?.text]"
                                    >
                                        {{ roleConfig[getSenderRole(submission.senderId)]?.label || getSenderRole(submission.senderId) }}
                                    </span>
                                    <span class="text-xs text-slate-500">{{ getSenderName(submission.senderId) }}</span>
                                    <span class="text-xs text-slate-300">&middot;</span>
                                    <span class="text-xs text-slate-400">{{ formatDate(submission.createdAt) }}</span>
                                </div>

                                <!-- Status change buttons (enterprise owner only, only when pending) -->
                                <div v-if="canChangeStatus(submission)" class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100" @click.stop>
                                    <span class="text-xs text-slate-500 mr-1">Décision :</span>
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                                        :disabled="changingStatusId === submission.id"
                                        @click="handleStatusChange(submission, 'approved')"
                                    >
                                        <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                                        Approuver
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                                        :disabled="changingStatusId === submission.id"
                                        @click="handleStatusChange(submission, 'rejected')"
                                    >
                                        <Icon name="heroicons:x-circle" class="w-3.5 h-3.5" />
                                        Rejeter
                                    </button>
                                    <Icon v-if="changingStatusId === submission.id" name="heroicons:arrow-path" class="w-4 h-4 text-slate-400 animate-spin" />
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
                            <button
                                v-if="canEdit(submission)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifier"
                                @click="startEdit(submission)"
                            >
                                <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                            </button>
                            <button
                                v-if="canDelete(submission)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                :disabled="deletingSubmissionId === submission.id"
                                title="Supprimer"
                                @click="handleDelete(submission)"
                            >
                                <Icon
                                    :name="deletingSubmissionId === submission.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                    class="w-4 h-4"
                                    :class="{ 'animate-spin': deletingSubmissionId === submission.id }"
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
