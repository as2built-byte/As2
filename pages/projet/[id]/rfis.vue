<script setup lang="ts">
import type { ProjectRFI, UserProfile, ProjectMember } from '~/types'
import {
    getRFIsByProject,
    createRFI,
    updateRFI,
    deleteRFI,
    getUserProfile,
    getProject,
    isUserAssignedToProject,
    getMembersByProject,
    getProjectMembers,
    addRFIComment,
    getRFIComments,
    updateRFIComment,
    deleteRFIComment,
    type RFIComment,
} from '~/firebase/services/firestore'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile } = useAuth()

const projectId = computed(() => route.params.id as string)

// State
const rfis = ref<ProjectRFI[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)
const projectMembers = ref<Array<{ id: string; name: string; role?: string; email?: string }>>([])

// Create form
const showCreateForm = ref(false)
const createTitle = ref('')
const createQuestion = ref('')
const createAssignedTo = ref('')
const createDueDate = ref('')
const creating = ref(false)

// Edit state
const editingRFI = ref<ProjectRFI | null>(null)
const editTitle = ref('')
const editQuestion = ref('')
const editAssignedTo = ref('')
const editDueDate = ref('')
const saving = ref(false)

// Delete state
const deletingRFIId = ref<string | null>(null)

// Expanded RFI (to show full question and comments)
const expandedId = ref<string | null>(null)

// Comments state
const rfiComments = ref<Record<string, RFIComment[]>>({})
const newCommentText = ref<Record<string, string>>({})
const loadingComments = ref<Record<string, boolean>>({})
const submittingComment = ref<Record<string, boolean>>({})

// Sender profiles cache
const senderProfiles = ref<Record<string, UserProfile>>({})

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
}

// Load RFIs
async function loadRFIs() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        rfis.value = await getRFIsByProject(projectId.value)
        const senderIds = [...new Set(rfis.value.map(r => r.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading RFIs:', e)
        error.value = 'Erreur lors du chargement des RFIs'
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
        // Load project members for assignment
        const members = await getMembersByProject(projectId.value)
        projectMembers.value = await Promise.all(
            members.map(async (m) => {
                const profile = await getUserProfile(m.userId)
                return {
                    id: m.userId,
                    name: profile ? `${profile.firstName} ${profile.lastName}` : m.userId,
                    role: m.role,
                    email: profile?.email
                }
            })
        )
    } catch (e) { /* ignore */ }
    await loadRFIs()
})

// Filtered RFIs
const filteredRFIs = computed(() => {
    if (!searchQuery.value) return rfis.value
    const q = searchQuery.value.toLowerCase()
    return rfis.value.filter(r =>
        r.title.toLowerCase().includes(q) || r.question.toLowerCase().includes(q)
    )
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const currentRole = computed(() => profile.value?.role || '')

function canEdit(rfi: ProjectRFI): boolean {
    return rfi.senderId === currentUserId.value
}

function canDelete(rfi: ProjectRFI): boolean {
    return rfi.senderId === currentUserId.value || currentUserId.value === projectEnterpriseId.value || isAssignedMember.value
}

// Create RFI
async function handleCreate() {
    if (!createTitle.value.trim() || !createQuestion.value.trim() || !currentUserId.value) return

    creating.value = true
    try {
        await createRFI(projectId.value, currentUserId.value, {
            title: createTitle.value.trim(),
            question: createQuestion.value.trim(),
            assignedTo: createAssignedTo.value || undefined,
            dueDate: createDueDate.value ? new Date(createDueDate.value) : undefined,
        })

        createTitle.value = ''
        createQuestion.value = ''
        createAssignedTo.value = ''
        createDueDate.value = ''
        showCreateForm.value = false

        await loadRFIs()
    } catch (e) {
        console.error('Error creating RFI:', e)
        alert('Erreur lors de la création de la RFI')
    } finally {
        creating.value = false
    }
}

// Start editing
function startEdit(rfi: ProjectRFI) {
    editingRFI.value = rfi
    editTitle.value = rfi.title
    editQuestion.value = rfi.question
    editAssignedTo.value = rfi.assignedTo || ''
    editDueDate.value = rfi.dueDate ? new Date(rfi.dueDate).toISOString().split('T')[0] : ''
}

// Save edit
async function saveEdit() {
    if (!editingRFI.value || !editTitle.value.trim() || !editQuestion.value.trim()) return
    saving.value = true
    try {
        await updateRFI(editingRFI.value.id, {
            title: editTitle.value.trim(),
            question: editQuestion.value.trim(),
            assignedTo: editAssignedTo.value || null,
            dueDate: editDueDate.value ? new Date(editDueDate.value) : null,
        })
        editingRFI.value = null
        await loadRFIs()
    } catch (e) {
        console.error('Error updating RFI:', e)
        alert('Erreur lors de la modification')
    } finally {
        saving.value = false
    }
}

// Delete RFI
async function handleDelete(rfi: ProjectRFI) {
    if (!confirm(`Supprimer "${rfi.title}" ?`)) return
    deletingRFIId.value = rfi.id
    try {
        await deleteRFI(rfi.id)
        await loadRFIs()
    } catch (e) {
        console.error('Error deleting RFI:', e)
        alert('Erreur lors de la suppression')
    } finally {
        deletingRFIId.value = null
    }
}

function toggleExpand(id: string) {
    const isExpanding = expandedId.value !== id
    expandedId.value = expandedId.value === id ? null : id
    // Load comments when expanding
    if (isExpanding && !rfiComments.value[id]) {
        loadComments(id)
    }
}

function getSenderName(senderId: string): string {
    const p = senderProfiles.value[senderId]
    return p ? `${p.firstName} ${p.lastName}` : '—'
}

function getSenderRole(senderId: string): string {
    return senderProfiles.value[senderId]?.role || ''
}

function isOverdue(date: Date): boolean {
    return new Date(date) < new Date()
}

function formatDateShort(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(date))
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

// Comments functions
async function loadComments(rfiId: string) {
    if (!rfiId) return
    loadingComments.value[rfiId] = true
    try {
        const comments = await getRFIComments(rfiId)
        rfiComments.value[rfiId] = comments
        // Load sender profiles for comments
        const senderIds = [...new Set(comments.map(c => c.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading comments:', e)
    } finally {
        loadingComments.value[rfiId] = false
    }
}

async function submitComment(rfiId: string) {
    if (!newCommentText.value[rfiId]?.trim() || !currentUserId.value) return
    
    submittingComment.value[rfiId] = true
    try {
        await addRFIComment(rfiId, currentUserId.value, newCommentText.value[rfiId].trim())
        newCommentText.value[rfiId] = ''
        await loadComments(rfiId)
    } catch (e) {
        console.error('Error submitting comment:', e)
        alert('Erreur lors de l\'envoi du commentaire')
    } finally {
        submittingComment.value[rfiId] = false
    }
}

function getAssignedToName(userId: string): string {
    const member = projectMembers.value.find(m => m.id === userId)
    return member?.name || '—'
}

// ========================================
// Comment Edit/Delete Functions
// ========================================

const editingComment = ref<string | null>(null)
const editCommentText = ref<Record<string, string>>({})
const updatingComment = ref<Record<string, boolean>>({})
const deletingCommentId = ref<string | null>(null)

function startEditComment(comment: RFIComment) {
    editingComment.value = comment.id
    editCommentText.value[comment.id] = comment.message
}

async function saveEditComment(rfiId: string, commentId: string) {
    if (!editCommentText.value[commentId]?.trim() || !currentUserId.value) return
    
    updatingComment.value[commentId] = true
    try {
        await updateRFIComment(commentId, currentUserId.value, editCommentText.value[commentId].trim())
        editingComment.value = null
        await loadComments(rfiId)
    } catch (e) {
        console.error('Error updating comment:', e)
        alert('Erreur lors de la modification du commentaire')
    } finally {
        updatingComment.value[commentId] = false
    }
}

async function handleDeleteComment(rfiId: string, comment: RFIComment) {
    if (!confirm('Supprimer ce commentaire ?')) return
    
    deletingCommentId.value = comment.id
    try {
        await deleteRFIComment(comment.id, currentUserId.value)
        await loadComments(rfiId)
    } catch (e) {
        console.error('Error deleting comment:', e)
        alert('Erreur lors de la suppression du commentaire')
    } finally {
        deletingCommentId.value = null
    }
}

function canEditComment(comment: RFIComment): boolean {
    return comment.senderId === currentUserId.value
}
</script>

<template>
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800">RFIs</h2>
                    <p class="text-sm text-slate-500">{{ rfis.length }} demande{{ rfis.length > 1 ? 's' : '' }} d'information</p>
                </div>
            </div>
            <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm transition-colors"
                @click="showCreateForm = !showCreateForm"
            >
                <Icon :name="showCreateForm ? 'heroicons:x-mark' : 'heroicons:plus-circle'" class="w-5 h-5" />
                {{ showCreateForm ? 'Annuler' : 'Nouvelle RFI' }}
            </button>
        </div>

        <!-- Create Form -->
        <Transition name="slide">
            <div v-if="showCreateForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Nouvelle demande d'information</h3>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
                    <input
                        v-model="createTitle"
                        type="text"
                        placeholder="Objet de la demande"
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Question *</label>
                    <textarea
                        v-model="createQuestion"
                        rows="4"
                        placeholder="Décrivez votre demande d'information en détail..."
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Assigner à (optionnel)</label>
                        <select
                            v-model="createAssignedTo"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">— Non assigné —</option>
                            <option v-for="member in projectMembers" :key="member.id" :value="member.id">
                                {{ member.name }} {{ member.role ? `(${member.role})` : '' }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Date d'échéance (optionnel)</label>
                        <input
                            v-model="createDueDate"
                            type="date"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div class="flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        :disabled="!createTitle.trim() || !createQuestion.trim() || creating"
                        @click="handleCreate"
                    >
                        <Icon v-if="creating" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4" />
                        {{ creating ? 'Envoi...' : 'Envoyer' }}
                    </button>
                </div>
            </div>
        </Transition>

        <!-- Search -->
        <div v-if="!loading && rfis.length > 0" class="mb-5">
            <div class="relative">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher par titre ou question..."
                    class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="spinner-lg text-purple-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredRFIs.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:chat-bubble-left-right" class="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <p class="text-slate-500 font-medium mb-1">
                {{ searchQuery ? 'Aucune RFI trouvée' : 'Aucune RFI' }}
            </p>
            <p v-if="!searchQuery" class="text-sm text-slate-400">
                Aucune demande d'information pour le moment
            </p>
        </div>

        <!-- RFIs List -->
        <div v-else class="space-y-3">
            <div
                v-for="(rfi, index) in filteredRFIs"
                :key="rfi.id"
                class="bg-white rounded-xl border border-slate-200 border-l-4 border-l-purple-400 hover:shadow-sm transition-all"
            >
                <!-- Edit mode -->
                <div v-if="editingRFI?.id === rfi.id" class="p-4 space-y-3">
                    <input
                        v-model="editTitle"
                        type="text"
                        placeholder="Titre"
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <textarea
                        v-model="editQuestion"
                        rows="3"
                        placeholder="Question..."
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                            v-model="editAssignedTo"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">— Non assigné —</option>
                            <option v-for="member in projectMembers" :key="member.id" :value="member.id">
                                {{ member.name }}
                            </option>
                        </select>
                        <input
                            v-model="editDueDate"
                            type="date"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div class="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="editingRFI = null"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            :disabled="!editTitle.trim() || !editQuestion.trim() || saving"
                            @click="saveEdit"
                        >
                            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
                            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                        </button>
                    </div>
                </div>

                <!-- View mode -->
                <div v-else class="p-4 cursor-pointer" @click="toggleExpand(rfi.id)">
                    <div class="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                            <!-- Number badge -->
                            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span class="text-sm font-bold text-purple-700">#{{ filteredRFIs.length - index }}</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <h4 class="text-sm font-semibold text-slate-900">{{ rfi.title }}</h4>
                                    <Icon
                                        name="heroicons:chevron-down"
                                        class="w-4 h-4 text-slate-400 transition-transform flex-shrink-0"
                                        :class="{ 'rotate-180': expandedId === rfi.id }"
                                    />
                                </div>
                                <!-- Collapsed: truncated question -->
                                <p v-if="expandedId !== rfi.id" class="text-sm text-slate-500 mt-1 truncate">
                                    {{ rfi.question }}
                                </p>
                                <!-- Expanded: full question -->
                                <p v-else class="text-sm text-slate-600 mt-1 whitespace-pre-line">
                                    {{ rfi.question }}
                                </p>
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                                    <span
                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        :class="[roleConfig[getSenderRole(rfi.senderId)]?.bg, roleConfig[getSenderRole(rfi.senderId)]?.text]"
                                    >
                                        {{ roleConfig[getSenderRole(rfi.senderId)]?.label || getSenderRole(rfi.senderId) }}
                                    </span>
                                    <span class="text-xs text-slate-500">{{ getSenderName(rfi.senderId) }}</span>
                                    <span v-if="rfi.assignedTo" class="text-xs text-purple-600 font-medium">
                                        → Assigné à: {{ getAssignedToName(rfi.assignedTo) }}
                                    </span>
                                    <span v-if="rfi.dueDate" class="text-xs" :class="isOverdue(rfi.dueDate) ? 'text-red-500 font-medium' : 'text-slate-400'">
                                        📅 {{ formatDateShort(rfi.dueDate) }}
                                    </span>
                                    <span class="text-xs text-slate-300">&middot;</span>
                                    <span class="text-xs text-slate-400">{{ formatDate(rfi.createdAt) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
                            <button
                                v-if="canEdit(rfi)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifier"
                                @click="startEdit(rfi)"
                            >
                                <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                            </button>
                            <button
                                v-if="canDelete(rfi)"
                                type="button"
                                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                :disabled="deletingRFIId === rfi.id"
                                title="Supprimer"
                                @click="handleDelete(rfi)"
                            >
                                <Icon
                                    :name="deletingRFIId === rfi.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                    class="w-4 h-4"
                                    :class="{ 'animate-spin': deletingRFIId === rfi.id }"
                                />
                            </button>
                        </div>

                        <!-- Thread Comments (when expanded) -->
                        <div v-if="expandedId === rfi.id" class="mt-4 pt-4 border-t border-slate-100">
                            <div class="flex items-center gap-2 mb-3">
                                <Icon name="heroicons:chat-bubble-left-ellipsis" class="w-4 h-4 text-slate-400" />
                                <span class="text-xs font-medium text-slate-600">Réponses</span>
                                <span v-if="rfiComments[rfi.id]?.length" class="text-xs text-slate-400">({{ rfiComments[rfi.id].length }})</span>
                            </div>

                            <!-- Loading comments -->
                            <div v-if="loadingComments[rfi.id]" class="flex items-center gap-2 py-2">
                                <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-slate-400" />
                                <span class="text-xs text-slate-400">Chargement des réponses...</span>
                            </div>

                            <!-- Comments list -->
                            <div v-else-if="rfiComments[rfi.id]?.length" class="space-y-3 mb-4">
                                <div
                                    v-for="comment in rfiComments[rfi.id]"
                                    :key="comment.id"
                                    class="bg-slate-50 rounded-lg p-3"
                                >
                                    <!-- Edit mode -->
                                    <div v-if="editingComment === comment.id" class="space-y-2">
                                        <textarea
                                            v-model="editCommentText[comment.id]"
                                            rows="2"
                                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                        />
                                        <div class="flex items-center gap-2 justify-end">
                                            <button
                                                type="button"
                                                class="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                @click="editingComment = null"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                class="px-2 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                                :disabled="!editCommentText[comment.id]?.trim() || updatingComment[comment.id]"
                                                @click="saveEditComment(rfi.id, comment.id)"
                                            >
                                                <Icon v-if="updatingComment[comment.id]" name="heroicons:arrow-path" class="w-3 h-3 animate-spin inline mr-1" />
                                                {{ updatingComment[comment.id] ? 'Enregistrement...' : 'Enregistrer' }}
                                            </button>
                                        </div>
                                    </div>

                                    <!-- View mode -->
                                    <div v-else class="flex items-start gap-2">
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="text-xs font-medium text-slate-700">{{ getSenderName(comment.senderId) }}</span>
                                                <span class="text-[10px] text-slate-400">{{ formatDate(comment.createdAt) }}</span>
                                            </div>
                                            <p class="text-sm text-slate-600 whitespace-pre-line">{{ comment.message }}</p>
                                            <div v-if="comment.linkedDocumentUrl" class="mt-2">
                                                <a
                                                    :href="comment.linkedDocumentUrl"
                                                    target="_blank"
                                                    class="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                                                >
                                                    <Icon name="heroicons:paper-clip" class="w-3 h-3" />
                                                    {{ comment.linkedDocumentName || 'Document joint' }}
                                                </a>
                                            </div>
                                        </div>
                                        <!-- Edit/Delete buttons -->
                                        <div v-if="canEditComment(comment)" class="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                                                title="Modifier"
                                                @click="startEditComment(comment)"
                                            >
                                                <Icon name="heroicons:pencil-square" class="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                                                :disabled="deletingCommentId === comment.id"
                                                title="Supprimer"
                                                @click="handleDeleteComment(rfi.id, comment)"
                                            >
                                                <Icon
                                                    :name="deletingCommentId === comment.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                                    class="w-3.5 h-3.5"
                                                    :class="{ 'animate-spin': deletingCommentId === comment.id }"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- No comments -->
                            <div v-else class="text-center py-4 text-xs text-slate-400 mb-4">
                                Aucune réponse pour le moment
                            </div>

                            <!-- Add comment form -->
                            <div class="flex gap-2">
                                <input
                                    v-model="newCommentText[rfi.id]"
                                    type="text"
                                    placeholder="Votre réponse..."
                                    class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    @keyup.enter="submitComment(rfi.id)"
                                />
                                <button
                                    type="button"
                                    class="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                    :disabled="!newCommentText[rfi.id]?.trim() || submittingComment[rfi.id]"
                                    @click="submitComment(rfi.id)"
                                >
                                    <Icon v-if="submittingComment[rfi.id]" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                    <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4" />
                                </button>
                            </div>
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
