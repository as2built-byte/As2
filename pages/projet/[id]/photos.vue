<script setup lang="ts">
import type { ProblemType, ProblemSeverity, ProjectDocument } from '~/types'
import {
    getPhotosByProject,
    createPhoto,
    updatePhoto,
    deletePhoto,
    getUserProfile,
    getProject,
    isUserAssignedToProject,
    promotePhotoToProblem,
    getDocumentsByProject,
    linkPhotoToDocument,
} from '~/firebase/services/firestore'
import {
    uploadProjectPhoto,
    deleteProjectPhotoByUrl,
} from '~/firebase/services/storage'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile, enterprise } = useAuth()

// Plan restrictions
const planRestrictions = computed(() => {
    if (!enterprise.value) return null
    return usePlanRestrictions(
        ref(enterprise.value.plan),
        ref(enterprise.value.projectCount),
        ref(enterprise.value.storageUsed),
        ref(enterprise.value.usersCount)
    )
})

const canUpload = computed(() => {
    if (!planRestrictions.value) return false
    return planRestrictions.value.canUploadFile
})

const projectId = computed(() => route.params.id as string)

// State
const photos = ref<ProjectPhoto[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const uploading = ref(false)
const searchQuery = ref('')
const projectEnterpriseId = ref<string>('')
const isAssignedMember = ref(false)

// Upload form
const showUploadForm = ref(false)
const uploadNote = ref('')
const uploadTags = ref<string[]>([])
const uploadFile = ref<File | null>(null)
const uploadPreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const newTagInput = ref('')

// Edit state
const editingPhoto = ref<ProjectPhoto | null>(null)
const editNote = ref('')
const editTags = ref<string[]>([])
const editFile = ref<File | null>(null)
const editPreview = ref<string | null>(null)
const editFileInputRef = ref<HTMLInputElement | null>(null)
const editNewTagInput = ref('')
const saving = ref(false)

// Promote to Problem state
const promotingPhoto = ref<ProjectPhoto | null>(null)
const problemTitle = ref('')
const problemDescription = ref('')
const problemType = ref<ProblemType>('quality')
const problemSeverity = ref<ProblemSeverity>('minor')
const problemDueDate = ref('')
const promoting = ref(false)

// Link to Plan state
const linkingPhoto = ref<ProjectPhoto | null>(null)
const planDocuments = ref<ProjectDocument[]>([])
const selectedPlanId = ref('')
const linking = ref(false)
const deletingPhotoId = ref<string | null>(null)

// Lightbox
const lightboxPhoto = ref<ProjectPhoto | null>(null)

// Sender profiles cache
const senderProfiles = ref<Record<string, UserProfile>>({})

// Role display config
const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Entreprise', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert: { label: 'Expert', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin: { label: 'AS2BUILT', bg: 'bg-slate-800', text: 'text-white' },
}

// Load photos
async function loadPhotos() {
    if (!projectId.value) return
    loading.value = true
    error.value = null
    try {
        photos.value = await getPhotosByProject(projectId.value)
        // Load sender profiles
        const senderIds = [...new Set(photos.value.map(p => p.senderId))]
        for (const sid of senderIds) {
            if (!senderProfiles.value[sid]) {
                const p = await getUserProfile(sid)
                if (p) senderProfiles.value[sid] = p
            }
        }
    } catch (e) {
        console.error('Error loading photos:', e)
        error.value = 'Erreur lors du chargement des photos'
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
    await loadPhotos()
})

// Filtered photos
const filteredPhotos = computed(() => {
    if (!searchQuery.value) return photos.value
    return photos.value.filter(p =>
        p.note.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

// Permission helpers
const currentUserId = computed(() => user.value?.uid || '')
const currentRole = computed(() => profile.value?.role || '')

function canEdit(photo: ProjectPhoto): boolean {
    return photo.senderId === currentUserId.value
}

function canDelete(photo: ProjectPhoto): boolean {
    return photo.senderId === currentUserId.value || currentUserId.value === projectEnterpriseId.value || isAssignedMember.value
}

// File selection for upload
function onFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
        alert('Seuls les fichiers image sont acceptés')
        target.value = ''
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 10 Mo')
        target.value = ''
        return
    }
    uploadFile.value = file
    uploadPreview.value = URL.createObjectURL(file)
}

// Upload photo
async function handleUpload() {
    if (!uploadFile.value || !currentUserId.value) return

    // Check storage limit
    if (planRestrictions.value && typeof planRestrictions.value.canUploadFile === 'function' && !planRestrictions.value.canUploadFile(uploadFile.value.size)) {
        alert('Limite de stockage atteinte. Veuillez passer au pack supérieur pour plus d\'espace.')
        return
    }

    uploading.value = true
    try {
        const imageUrl = await uploadProjectPhoto(projectId.value, currentUserId.value, uploadFile.value)
        await createPhoto(projectId.value, currentUserId.value, {
            note: uploadNote.value.trim(),
        }, imageUrl)

        // Reset form
        uploadNote.value = ''
        uploadFile.value = null
        if (uploadPreview.value) URL.revokeObjectURL(uploadPreview.value)
        uploadPreview.value = null
        showUploadForm.value = false
        if (fileInputRef.value) fileInputRef.value.value = ''

        await loadPhotos()
    } catch (e) {
        console.error('Error uploading photo:', e)
        alert('Erreur lors du téléversement de la photo')
    } finally {
        uploading.value = false
    }
}

// Start editing
function startEdit(photo: ProjectPhoto) {
    editingPhoto.value = photo
    editNote.value = photo.note
    editTags.value = [...(photo.tags || [])]
    editFile.value = null
    editPreview.value = null
    if (editFileInputRef.value) editFileInputRef.value.value = ''
}

// File selection for edit
function onEditFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
        alert('Seuls les fichiers image sont acceptés')
        target.value = ''
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 10 Mo')
        target.value = ''
        return
    }
    editFile.value = file
    editPreview.value = URL.createObjectURL(file)
}

// Save edit
async function saveEdit() {
    if (!editingPhoto.value) return
    saving.value = true
    try {
        let newImageUrl: string | undefined
        if (editFile.value && currentUserId.value) {
            newImageUrl = await uploadProjectPhoto(projectId.value, currentUserId.value, editFile.value)
            await deleteProjectPhotoByUrl(editingPhoto.value.imageUrl)
        }
        await updatePhoto(editingPhoto.value.id, {
            note: editNote.value.trim(),
            tags: editTags.value,
            ...(newImageUrl ? { imageUrl: newImageUrl } : {}),
        })
        editingPhoto.value = null
        editFile.value = null
        if (editPreview.value) URL.revokeObjectURL(editPreview.value)
        editPreview.value = null
        await loadPhotos()
    } catch (e) {
        console.error('Error updating photo:', e)
        alert('Erreur lors de la modification')
    } finally {
        saving.value = false
    }
}

// Delete photo
async function handleDelete(photo: ProjectPhoto) {
    if (!confirm('Supprimer cette photo ?')) return
    deletingPhotoId.value = photo.id
    try {
        await deleteProjectPhotoByUrl(photo.imageUrl)
        await deletePhoto(photo.id)
        await loadPhotos()
    } catch (e) {
        console.error('Error deleting photo:', e)
        alert('Erreur lors de la suppression')
    } finally {
        deletingPhotoId.value = null
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

// ========================================
// Tag Management Functions
// ========================================

const commonTags = ['Fondations', 'Étage1', 'Étage2', 'Coffrage', 'Ferraillage', 'Béton', 'Structure', 'Façade', 'Toiture', 'Intérieur', 'Extérieur']

function addTag(tag: string, target: 'upload' | 'edit') {
    const trimmed = tag.trim()
    if (!trimmed) return
    
    if (target === 'upload') {
        if (!uploadTags.value.includes(trimmed)) {
            uploadTags.value.push(trimmed)
        }
        newTagInput.value = ''
    } else {
        if (!editTags.value.includes(trimmed)) {
            editTags.value.push(trimmed)
        }
        editNewTagInput.value = ''
    }
}

function removeTag(tag: string, target: 'upload' | 'edit') {
    if (target === 'upload') {
        uploadTags.value = uploadTags.value.filter(t => t !== tag)
    } else {
        editTags.value = editTags.value.filter(t => t !== tag)
    }
}

// ========================================
// Promote to Problem Functions
// ========================================

function openPromoteModal(photo: ProjectPhoto) {
    promotingPhoto.value = photo
    problemTitle.value = `Problème sur photo: ${photo.note?.substring(0, 30) || 'Sans titre'}`
    problemDescription.value = `Problème identifié sur la photo du ${formatDate(photo.createdAt)}.\n\nNote: ${photo.note || 'Aucune note'}`
    problemType.value = 'quality'
    problemSeverity.value = 'minor'
    problemDueDate.value = ''
}

async function submitPromoteToProblem() {
    if (!promotingPhoto.value || !problemTitle.value.trim() || !currentUserId.value) return
    
    promoting.value = true
    try {
        const dueDate = problemDueDate.value ? new Date(problemDueDate.value) : undefined
        
        await promotePhotoToProblem(
            promotingPhoto.value.id,
            {
                title: problemTitle.value.trim(),
                description: problemDescription.value.trim(),
                type: problemType.value,
                severity: problemSeverity.value,
                dueDate,
            },
            currentUserId.value
        )
        
        // Mark photo as promoted in local state
        promotingPhoto.value.promotedToProblem = true
        
        promotingPhoto.value = null
        problemTitle.value = ''
        problemDescription.value = ''
        problemType.value = 'quality'
        problemSeverity.value = 'minor'
        problemDueDate.value = ''
        
        alert('Problème créé avec succès! La photo a été liée au problème.')
        await loadPhotos()
    } catch (e) {
        console.error('Error promoting photo to problem:', e)
        alert('Erreur lors de la création du problème')
    } finally {
        promoting.value = false
    }
}

// ========================================
// Link Photo to Plan Functions
// ========================================

async function openLinkToPlanModal(photo: ProjectPhoto) {
    linkingPhoto.value = photo
    selectedPlanId.value = ''
    // Load plan documents (type 'plan' or category 'plan')
    try {
        const docs = await getDocumentsByProject(projectId.value)
        planDocuments.value = docs.filter(d => 
            d.category?.toLowerCase() === 'plan' || 
            d.type?.toLowerCase() === 'plan' ||
            d.name?.toLowerCase().includes('plan')
        )
    } catch (e) {
        console.error('Error loading plan documents:', e)
        planDocuments.value = []
    }
}

async function submitLinkToPlan() {
    if (!linkingPhoto.value || !selectedPlanId.value || !currentUserId.value) return
    
    linking.value = true
    try {
        await linkPhotoToDocument(linkingPhoto.value.id, selectedPlanId.value, currentUserId.value)
        
        // Update local state
        if (!linkingPhoto.value.linkedDocuments) {
            linkingPhoto.value.linkedDocuments = []
        }
        if (!linkingPhoto.value.linkedDocuments.includes(selectedPlanId.value)) {
            linkingPhoto.value.linkedDocuments.push(selectedPlanId.value)
        }
        
        linkingPhoto.value = null
        selectedPlanId.value = ''
        
        alert('Photo liée au plan avec succès!')
        await loadPhotos()
    } catch (e) {
        console.error('Error linking photo to plan:', e)
        alert('Erreur lors de la liaison de la photo au plan')
    } finally {
        linking.value = false
    }
}
</script>

<template>
    <div class="page-container">
        <!-- Header avec StorageLimitBar -->
        <div class="page-header">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                        <Icon name="heroicons:camera" class="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h1 class="page-title">Photos</h1>
                        <p class="page-subtitle">{{ photos.length }} photo{{ photos.length > 1 ? 's' : '' }}</p>
                    </div>
                </div>
                
                <!-- Storage Limit Bar -->
                <div class="flex-1 max-w-md">
                    <StorageLimitBar
                        v-if="enterprise"
                        :plan="enterprise.plan || 'free'"
                        :storage-used="enterprise.storageUsed || 0"
                        :compact="true"
                    />
                </div>
                
                <button
                    type="button"
                    class="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 shadow-sm transition-colors"
                    @click="showUploadForm = !showUploadForm"
                >
                    <Icon :name="showUploadForm ? 'heroicons:x-mark' : 'heroicons:plus-circle'" class="w-5 h-5" />
                    {{ showUploadForm ? 'Annuler' : 'Ajouter une photo' }}
                </button>
            </div>
        </div>

        <!-- Upgrade message for free plan -->
        <div v-if="profile?.role === 'enterprise' && enterprise?.plan === 'free'" 
             class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div class="flex items-center gap-3">
                <Icon name="heroicons:information-circle" class="w-5 h-5 text-amber-600" />
                <div class="flex-1">
                    <p class="text-sm text-amber-800">
                        Le plan Gratuit ne permet pas d'uploader de photos. 
                        <NuxtLink to="/entreprise/abonnement" class="font-medium underline">Passez au pack Bronze</NuxtLink> 
                        pour debloquer cette fonctionnalite.
                    </p>
                </div>
            </div>
        </div>

        <!-- Upload Form -->
        <Transition name="slide">
            <div v-if="showUploadForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 class="text-sm font-semibold text-slate-700 mb-4">Nouvelle photo</h3>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Image * (max 10 Mo)</label>
                    <input
                        ref="fileInputRef"
                        type="file"
                        accept="image/*"
                        class="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                        @change="onFileSelect"
                    />
                </div>
                <!-- Preview -->
                <div v-if="uploadPreview" class="mb-4">
                    <img :src="uploadPreview" alt="Aperçu" class="w-40 h-40 object-cover rounded-lg border border-slate-200" />
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Note (optionnel)</label>
                    <textarea
                        v-model="uploadNote"
                        rows="2"
                        placeholder="Description ou note..."
                        class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                    />
                </div>
                
                <!-- Tags -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Tags de chantier</label>
                    <div class="flex flex-wrap gap-2 mb-2">
                        <span
                            v-for="tag in uploadTags"
                            :key="tag"
                            class="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs"
                        >
                            {{ tag }}
                            <button @click="removeTag(tag, 'upload')" class="hover:text-rose-900">×</button>
                        </span>
                    </div>
                    <div class="flex gap-2">
                        <input
                            v-model="newTagInput"
                            type="text"
                            placeholder="Ajouter un tag..."
                            class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                            @keyup.enter="addTag(newTagInput, 'upload')"
                        />
                        <button
                            @click="addTag(newTagInput, 'upload')"
                            class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
                        >
                            Ajouter
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-2">
                        <span
                            v-for="tag in commonTags"
                            :key="tag"
                            @click="addTag(tag, 'upload')"
                            class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs cursor-pointer hover:bg-slate-200"
                        >
                            + {{ tag }}
                        </span>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        :disabled="!uploadFile || uploading"
                        @click="handleUpload"
                    >
                        <Icon v-if="uploading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <Icon v-else name="heroicons:arrow-up-tray" class="w-4 h-4" />
                        {{ uploading ? 'Envoi en cours...' : 'Téléverser' }}
                    </button>
                </div>
            </div>
        </Transition>

        <!-- Search -->
        <div v-if="!loading && photos.length > 0" class="mb-5">
            <div class="relative max-w-md">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Rechercher par note..."
                    class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="spinner-lg text-rose-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
            <span>{{ error }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredPhotos.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon name="heroicons:camera" class="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <p class="text-slate-500 font-medium mb-1">
                {{ searchQuery ? 'Aucune photo trouvée' : 'Aucune photo' }}
            </p>
            <p v-if="!searchQuery" class="text-sm text-slate-400">
                Ajoutez votre première photo
            </p>
        </div>

        <!-- Photos Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="photo in filteredPhotos"
                :key="photo.id"
                class="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all group"
            >
                <!-- Edit mode -->
                <div v-if="editingPhoto?.id === photo.id" class="p-4 space-y-3">
                    <!-- Current or new image preview -->
                    <img
                        :src="editPreview || photo.imageUrl"
                        alt="Photo"
                        class="w-full h-40 object-cover rounded-lg"
                    />
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-1">Remplacer l'image (optionnel)</label>
                        <input
                            ref="editFileInputRef"
                            type="file"
                            accept="image/*"
                            class="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                            @change="onEditFileSelect"
                        />
                        <p v-if="editFile" class="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                            Nouvelle image sélectionnée
                        </p>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-1">Note</label>
                        <textarea
                            v-model="editNote"
                            rows="2"
                            placeholder="Description ou note..."
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                        />
                    </div>
                    
                    <!-- Edit Tags -->
                    <div>
                        <label class="block text-xs font-medium text-slate-500 mb-1">Tags</label>
                        <div class="flex flex-wrap gap-2 mb-2">
                            <span
                                v-for="tag in editTags"
                                :key="tag"
                                class="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs"
                            >
                                {{ tag }}
                                <button @click="removeTag(tag, 'edit')" class="hover:text-rose-900">×</button>
                            </span>
                        </div>
                        <div class="flex gap-2">
                            <input
                                v-model="editNewTagInput"
                                type="text"
                                placeholder="Ajouter un tag..."
                                class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                @keyup.enter="addTag(editNewTagInput, 'edit')"
                            />
                            <button
                                @click="addTag(editNewTagInput, 'edit')"
                                class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="editingPhoto = null"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            :disabled="saving"
                            @click="saveEdit"
                        >
                            <Icon v-if="saving" name="heroicons:arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
                            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
                        </button>
                    </div>
                </div>

                <!-- View mode -->
                <template v-else>
                    <!-- Image -->
                    <div class="relative cursor-pointer" @click="lightboxPhoto = photo">
                        <img
                            :src="photo.imageUrl"
                            alt="Photo du projet"
                            class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                        />
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Icon name="heroicons:magnifying-glass-plus" class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="p-3">
                        <!-- Tags -->
                        <div v-if="photo.tags && photo.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
                            <span
                                v-for="tag in photo.tags"
                                :key="tag"
                                class="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
                            >
                                #{{ tag }}
                            </span>
                        </div>
                        
                        <p v-if="photo.note" class="text-sm text-slate-700 mb-2 line-clamp-2">{{ photo.note }}</p>

                        <!-- Sender info -->
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span
                                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                :class="[roleConfig[getSenderRole(photo.senderId)]?.bg, roleConfig[getSenderRole(photo.senderId)]?.text]"
                            >
                                {{ roleConfig[getSenderRole(photo.senderId)]?.label || getSenderRole(photo.senderId) }}
                            </span>
                            <span class="text-xs text-slate-500">{{ getSenderName(photo.senderId) }}</span>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-xs text-slate-400">{{ formatDate(photo.createdAt) }}</span>
                            <div class="flex items-center gap-1">
                                <!-- Link to Plan button -->
                                <button
                                    v-if="canEdit(photo)"
                                    type="button"
                                    class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Lier à un plan"
                                    @click="openLinkToPlanModal(photo)"
                                >
                                    <Icon name="heroicons:document-link" class="w-4 h-4" />
                                </button>
                                <!-- Promote to Problem button -->
                                <button
                                    v-if="!photo.promotedToProblem && canEdit(photo)"
                                    type="button"
                                    class="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Promouvoir en Problème"
                                    @click="openPromoteModal(photo)"
                                >
                                    <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
                                </button>
                                <span v-if="photo.promotedToProblem" class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                                    Problème
                                </span>
                                <!-- Linked Plans indicator -->
                                <span v-if="photo.linkedDocuments?.length" class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                    {{ photo.linkedDocuments.length }} plan{{ photo.linkedDocuments.length > 1 ? 's' : '' }}
                                </span>
                                <button
                                    v-if="canEdit(photo)"
                                    type="button"
                                    class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Modifier"
                                    @click="startEdit(photo)"
                                >
                                    <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                                </button>
                                <button
                                    v-if="canDelete(photo)"
                                    type="button"
                                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    :disabled="deletingPhotoId === photo.id"
                                    title="Supprimer"
                                    @click="handleDelete(photo)"
                                >
                                    <Icon
                                        :name="deletingPhotoId === photo.id ? 'heroicons:arrow-path' : 'heroicons:trash'"
                                        class="w-4 h-4"
                                        :class="{ 'animate-spin': deletingPhotoId === photo.id }"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Lightbox -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="lightboxPhoto"
                    class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    @click.self="lightboxPhoto = null"
                >
                    <div class="relative max-w-4xl max-h-[90vh] w-full">
                        <button
                            type="button"
                            class="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors"
                            @click="lightboxPhoto = null"
                        >
                            <Icon name="heroicons:x-mark" class="w-8 h-8" />
                        </button>
                        <img
                            :src="lightboxPhoto.imageUrl"
                            alt="Photo du projet"
                            class="w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div v-if="lightboxPhoto.note" class="mt-3 text-center">
                            <p class="text-white text-sm">{{ lightboxPhoto.note }}</p>
                        </div>
                        <div class="mt-2 text-center">
                            <span class="text-xs text-slate-400">
                                {{ getSenderName(lightboxPhoto.senderId) }} · {{ formatDate(lightboxPhoto.createdAt) }}
                            </span>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Promote to Problem Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="promotingPhoto"
                    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    @click.self="promotingPhoto = null"
                >
                    <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 class="text-lg font-bold text-slate-800 mb-2">Promouvoir en Problème</h3>
                        <p class="text-sm text-slate-600 mb-4">Créer un problème lié à cette photo.</p>

                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Titre</label>
                                <input
                                    v-model="problemTitle"
                                    type="text"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Description</label>
                                <textarea
                                    v-model="problemDescription"
                                    rows="3"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-slate-600 mb-1">Type</label>
                                    <select v-model="problemType" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        <option value="safety">Sécurité</option>
                                        <option value="quality">Qualité</option>
                                        <option value="design">Conception</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-slate-600 mb-1">Sévérité</label>
                                    <select v-model="problemSeverity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        <option value="minor">Mineur</option>
                                        <option value="major">Majeur</option>
                                        <option value="critical">Critique</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Date d'échéance (optionnel)</label>
                                <input
                                    v-model="problemDueDate"
                                    type="date"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>

                        <div class="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors text-sm"
                                @click="promotingPhoto = null"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                class="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                :disabled="!problemTitle.trim() || promoting"
                                @click="submitPromoteToProblem"
                            >
                                <Icon v-if="promoting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                <Icon v-else name="heroicons:exclamation-triangle" class="w-4 h-4" />
                                {{ promoting ? 'Création...' : 'Créer le problème' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Link to Plan Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="linkingPhoto"
                    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    @click.self="linkingPhoto = null"
                >
                    <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 class="text-lg font-bold text-slate-800 mb-2">Lier à un plan</h3>
                        <p class="text-sm text-slate-600 mb-4">Sélectionnez un plan à lier à cette photo.</p>

                        <div v-if="planDocuments.length === 0" class="text-center py-4 text-sm text-slate-500">
                            Aucun plan disponible dans ce projet.
                        </div>

                        <div v-else class="space-y-2 max-h-60 overflow-y-auto">
                            <label
                                v-for="doc in planDocuments"
                                :key="doc.id"
                                class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                                :class="{ 'bg-blue-50 border-blue-300': selectedPlanId === doc.id }"
                            >
                                <input
                                    v-model="selectedPlanId"
                                    type="radio"
                                    :value="doc.id"
                                    class="w-4 h-4 text-blue-600"
                                />
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-slate-700">{{ doc.name }}</p>
                                    <p v-if="doc.category" class="text-xs text-slate-500">{{ doc.category }}</p>
                                </div>
                            </label>
                        </div>

                        <div class="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors text-sm"
                                @click="linkingPhoto = null"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                :disabled="!selectedPlanId || linking"
                                @click="submitLinkToPlan"
                            >
                                <Icon v-if="linking" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                <Icon v-else name="heroicons:document-link" class="w-4 h-4" />
                                {{ linking ? 'Liaison...' : 'Lier au plan' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
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
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
