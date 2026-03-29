<script setup lang="ts">
import type { ProjectRFI, UserProfile } from '~/types'
import {
    getRFIsByProject,
    createRFI,
    updateRFI,
    deleteRFI,
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
const rfis = ref<ProjectRFI[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)

// Create form
const showCreateForm = ref(false)
const createTitle = ref('')
const createQuestion = ref('')
const creating = ref(false)

// Edit state
const editingRFI = ref<ProjectRFI | null>(null)
const editTitle = ref('')
const editQuestion = ref('')
const saving = ref(false)

// Delete state
const deletingRFIId = ref<string | null>(null)

// Expanded RFI (to show full question)
const expandedId = ref<string | null>(null)

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
        })

        createTitle.value = ''
        createQuestion.value = ''
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
}

// Save edit
async function saveEdit() {
    if (!editingRFI.value || !editTitle.value.trim() || !editQuestion.value.trim()) return
    saving.value = true
    try {
        await updateRFI(editingRFI.value.id, {
            title: editTitle.value.trim(),
            question: editQuestion.value.trim(),
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
