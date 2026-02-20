<script setup lang="ts">
import type { ProjectDocument, DocumentType, UserProfile } from '~/types'
import {
    getDocumentsByProject,
    createDocument,
    updateDocument,
    deleteDocument,
    getUserProfile,
    getProject,
    isUserAssignedToProject,
} from '~/firebase/services/firestore'
import {
    uploadProjectDocument,
    deleteProjectDocumentByUrl,
} from '~/firebase/services/storage'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile } = useAuth()

const projectId = computed(() => route.params.id as string)

// State
const documents = ref<ProjectDocument[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const uploading = ref(false)
const searchQuery = ref('')
const typeFilter = ref<'all' | DocumentType>('all')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)

// Upload form
const showUploadForm = ref(false)
const uploadTitle = ref('')
const uploadType = ref<DocumentType>('plan')
const uploadFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Edit state
const editingDoc = ref<ProjectDocument | null>(null)
const editTitle = ref('')
const editType = ref<DocumentType>('plan')
const editFile = ref<File | null>(null)
const editFileInputRef = ref<HTMLInputElement | null>(null)
const saving = ref(false)

// Delete state
const deletingDocId = ref<string | null>(null)

// Sender profiles cache
const senderProfiles = ref<Record<string, UserProfile>>({})

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
}

// Load documents
async function loadDocuments() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        documents.value = await getDocumentsByProject(projectId.value)
        // Load sender profiles for all unique senderIds
        const senderIds = [...new Set(documents.value.map(d => d.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading documents:', e)
        error.value = 'Erreur lors du chargement des documents'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    // Wait for auth to be ready (middleware ensures auth)
    await new Promise(resolve => setTimeout(resolve, 150))
    // Load project to get enterpriseId for permission checks
    try {
        const proj = await getProject(projectId.value)
        if (proj) projectEnterpriseId.value = proj.enterpriseId
        if (user.value?.uid && profile.value?.enterpriseOwnerId) {
            isAssignedMember.value = await isUserAssignedToProject(user.value.uid, projectId.value)
        }
    } catch (e) { /* ignore */ }
    await loadDocuments()
})

// Filtered documents
const filteredDocuments = computed(() => {
    return documents.value.filter(d => {
        if (typeFilter.value !== 'all' && d.type !== typeFilter.value) return false
        if (searchQuery.value) {
            return d.title.toLowerCase().includes(searchQuery.value.toLowerCase())
        }
        return true
    })
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const currentRole = computed(() => profile.value?.role || '')

function canEdit(doc: ProjectDocument): boolean {
    return doc.senderId === currentUserId.value
}

function canDelete(doc: ProjectDocument): boolean {
    return doc.senderId === currentUserId.value || currentUserId.value === projectEnterpriseId.value || isAssignedMember.value
}

// File selection
function onFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
        alert('Seuls les fichiers PDF sont acceptés')
        target.value = ''
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 10 Mo')
        target.value = ''
        return
    }
    uploadFile.value = file
}

// Upload document
async function handleUpload() {
    if (!uploadFile.value || !uploadTitle.value.trim() || !currentUserId.value) return

    uploading.value = true
    try {
        const fileUrl = await uploadProjectDocument(projectId.value, currentUserId.value, uploadFile.value)
        await createDocument(projectId.value, currentUserId.value, {
            title: uploadTitle.value.trim(),
            type: uploadType.value,
        }, fileUrl)

        // Reset form
        uploadTitle.value = ''
        uploadType.value = 'plan'
        uploadFile.value = null
        showUploadForm.value = false
        if (fileInputRef.value) fileInputRef.value.value = ''

        await loadDocuments()
    } catch (e) {
        console.error('Error uploading document:', e)
        alert('Erreur lors du téléversement du document')
    } finally {
        uploading.value = false
    }
}

// Start editing
function startEdit(doc: ProjectDocument) {
    editingDoc.value = doc
    editTitle.value = doc.title
    editType.value = doc.type
    editFile.value = null
    if (editFileInputRef.value) editFileInputRef.value.value = ''
}

// File selection for edit
function onEditFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
        alert('Seuls les fichiers PDF sont acceptés')
        target.value = ''
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 10 Mo')
        target.value = ''
        return
    }
    editFile.value = file
}

function getSenderName(senderId: string): string {
    const p = senderProfiles.value[senderId]
    return p ? `${p.firstName} ${p.lastName}` : '—'
}

function getSenderRole(senderId: string): string {
    return senderProfiles.value[senderId]?.role || ''
}

// Save edit
async function saveEdit() {
    if (!editingDoc.value || !editTitle.value.trim()) return
    saving.value = true
    try {
        let newFileUrl: string | undefined
        // If a new file was selected, upload it and delete the old one
        if (editFile.value && currentUserId.value) {
            newFileUrl = await uploadProjectDocument(projectId.value, currentUserId.value, editFile.value)
            await deleteProjectDocumentByUrl(editingDoc.value.fileUrl)
        }
        await updateDocument(editingDoc.value.id, {
            title: editTitle.value.trim(),
            type: editType.value,
            ...(newFileUrl ? { fileUrl: newFileUrl } : {}),
        })
        editingDoc.value = null
        editFile.value = null
        await loadDocuments()
    } catch (e) {
        console.error('Error updating document:', e)
        alert('Erreur lors de la modification')
    } finally {
        saving.value = false
    }
}

// Delete document
async function handleDelete(doc: ProjectDocument) {
    if (!confirm(`Supprimer "${doc.title}" ?`)) return
    deletingDocId.value = doc.id
    try {
        await deleteProjectDocumentByUrl(doc.fileUrl)
        await deleteDocument(doc.id)
        await loadDocuments()
    } catch (e) {
        console.error('Error deleting document:', e)
        alert('Erreur lors de la suppression')
    } finally {
        deletingDocId.value = null
    }
}

// Type config
const typeConfig: Record<DocumentType, { label: string; bg: string; text: string; icon: string }> = {
    plan: { label: 'Plan', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'heroicons:map' },
    report: { label: 'Rapport', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'heroicons:document-chart-bar' },
    contract: { label: 'Contrat', bg: 'bg-purple-100', text: 'text-purple-700', icon: 'heroicons:document-check' },
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
    <div class="page-container">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon name="heroicons:document-text" class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Documents</h2>
                    <p class="text-sm text-slate-500">{{ documents.length }} document{{ documents.length > 1 ? 's' : '' }}</p>
                </div>
            </div>
            <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
                @click="showUploadForm = !showUploadForm"
            >
                <Icon :name="showUploadForm ? 'heroicons:x-mark' : 'heroicons:plus-circle'" class="w-5 h-5" />
                {{ showUploadForm ? 'Annuler' : 'Ajouter un document' }}
            </button>
        </div>

        <!-- Upload Form -->
        <Transition name="slide">
            <div v-if="showUploadForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Nouveau document</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Titre *</label>
                        <input
                            v-model="uploadTitle"
                            type="text"
                            placeholder="Nom du document"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Type *</label>
                        <select
                            v-model="uploadType"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="plan">Plan</option>
                            <option value="report">Rapport</option>
                            <option value="contract">Contrat</option>
                        </select>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Fichier PDF * (max 10 Mo)</label>
                    <input
                        ref="fileInputRef"
                        type="file"
                        accept="application/pdf"
                        class="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        @change="onFileSelect"
                    />
                </div>
                <div class="flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        :disabled="!uploadTitle.trim() || !uploadFile || uploading"
                        @click="handleUpload"
                    >
                        <Icon v-if="uploading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <Icon v-else name="heroicons:arrow-up-tray" class="w-4 h-4" />
                        {{ uploading ? 'Envoi en cours...' : 'Téléverser' }}
                    </button>
                </div>
            </div>
        </Transition>

        <!-- Filters -->
        <div v-if="!loading && documents.length > 0" class="flex flex-col sm:flex-row gap-3 mb-5">
            <div class="relative flex-1">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher..."
                    class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <div class="flex items-center gap-2">
                <button
                    v-for="(cfg, key) in { all: { label: 'Tous' }, ...typeConfig }"
                    :key="key"
                    type="button"
                    class="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                    :class="typeFilter === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
                    @click="typeFilter = key as any"
                >
                    {{ cfg.label }}
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredDocuments.length === 0" class="state-empty">
            <div class="state-empty-icon">
                <Icon name="heroicons:document-text" class="w-8 h-8 text-slate-400" />
            </div>
            <h3 class="state-empty-title">
                {{ searchQuery || typeFilter !== 'all' ? 'Aucun document trouvé' : 'Aucun document' }}
            </h3>
            <p v-if="!searchQuery && typeFilter === 'all'" class="state-empty-text">
                Ajoutez votre premier document PDF
            </p>
        </div>

        <!-- Documents List -->
        <div v-else class="space-y-3">
            <div
                v-for="doc in filteredDocuments"
                :key="doc.id"
                class="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all"
            >
                <!-- Edit mode -->
                <div v-if="editingDoc?.id === doc.id" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            v-model="editTitle"
                            type="text"
                            placeholder="Titre du document"
                            class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            v-model="editType"
                            class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="plan">Plan</option>
                            <option value="report">Rapport</option>
                            <option value="contract">Contrat</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-1">Remplacer le fichier PDF (optionnel)</label>
                        <input
                            ref="editFileInputRef"
                            type="file"
                            accept="application/pdf"
                            class="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                            @change="onEditFileSelect"
                        />
                        <p v-if="editFile" class="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                            Nouveau fichier sélectionné : {{ editFile.name }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="editingDoc = null"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            :disabled="!editTitle.trim() || saving"
                            @click="saveEdit"
                        >
                            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
                            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                        </button>
                    </div>
                </div>

                <!-- View mode -->
                <div v-else class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <!-- Icon + Info -->
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            :class="typeConfig[doc.type]?.bg || 'bg-slate-100'"
                        >
                            <Icon
                                :name="typeConfig[doc.type]?.icon || 'heroicons:document-text'"
                                class="w-5 h-5"
                                :class="typeConfig[doc.type]?.text || 'text-slate-500'"
                            />
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-semibold text-slate-900 truncate">{{ doc.title }}</h4>
                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                <span
                                    class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    :class="[typeConfig[doc.type]?.bg, typeConfig[doc.type]?.text]"
                                >
                                    {{ typeConfig[doc.type]?.label || doc.type }}
                                </span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="[roleConfig[getSenderRole(doc.senderId)]?.bg, roleConfig[getSenderRole(doc.senderId)]?.text]">
                                    {{ roleConfig[getSenderRole(doc.senderId)]?.label || getSenderRole(doc.senderId) }}
                                </span>
                                <span class="text-xs text-slate-500">{{ getSenderName(doc.senderId) }}</span>
                                <span class="text-xs text-slate-300">&middot;</span>
                                <span class="text-xs text-slate-400">{{ formatDate(doc.createdAt) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <a
                            :href="doc.fileUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-3.5 h-3.5" />
                            Ouvrir
                        </a>
                        <button
                            v-if="canEdit(doc)"
                            type="button"
                            class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Modifier"
                            @click="startEdit(doc)"
                        >
                            <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                        </button>
                        <button
                            v-if="canDelete(doc)"
                            type="button"
                            class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            :disabled="deletingDocId === doc.id"
                            title="Supprimer"
                            @click="handleDelete(doc)"
                        >
                            <Icon
                                :name="deletingDocId === doc.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                class="w-4 h-4"
                                :class="{ 'animate-spin': deletingDocId === doc.id }"
                            />
                        </button>
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
