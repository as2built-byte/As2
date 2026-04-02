<script setup lang="ts">
/**
 * Enhanced Documents Page with Storage Limits
 * 
 * Features:
 * - Storage usage bar with plan limits
 * - Document upload with size validation
 * - PDF preview, edit, delete
 * - Storage limit enforcement
 */

import type { ProjectDocument, DocumentType, DocumentStatus, DocumentMetadata, ProjectRFI, ProjectProblem, ProjectPhoto } from '~/types'
import { 
  getDocumentsByProject, 
  deleteDocument,
  getEnterpriseProfile,
  updateEnterpriseStorage,
  recalculateEnterpriseStorage,
  checkoutDocument,
  checkinDocument
} from '~/firebase/services/firestore'
import { uploadProjectDocument, deleteProjectDocumentByUrl } from '~/firebase/services/storage'

definePageMeta({
  layout: 'projet',
  middleware: ['auth'],
})

const route = useRoute()
const { user, profile } = useAuth()

const projectId = computed(() => route.params.id as string)

// Enterprise data for storage limits
const enterprise = ref<any>(null)
const planRestrictions = computed(() => {
  if (!enterprise.value) return null
  return usePlanRestrictions(
    ref(enterprise.value.plan),
    ref(enterprise.value.projectCount),
    ref(enterprise.value.storageUsed),
    ref(enterprise.value.usersCount)
  )
})

// State
const documents = ref<ProjectDocument[]>([])
const loading = ref(true)
const searchQuery = ref('')
const typeFilter = ref<DocumentType | 'all'>('all')

// Upload modal
const showUploadModal = ref(false)
const uploadFile = ref<File | null>(null)
const uploadTitle = ref('')
const uploadType = ref<DocumentType>('plan')
const uploadStatus = ref<DocumentStatus>('wip')
const uploadDescription = ref('')
const uploading = ref(false)
const uploadError = ref('')

// Preview modal
const showPreviewModal = ref(false)
const previewDocument = ref<ProjectDocument | null>(null)

// Delete confirmation
const deletingId = ref<string | null>(null)

// Document types
const documentTypes: { value: DocumentType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'Tous', icon: 'heroicons:document-text' },
  { value: 'plan', label: 'Plans', icon: 'heroicons:map' },
  { value: 'report', label: 'Rapports', icon: 'heroicons:document-chart-bar' },
  { value: 'contract', label: 'Contrats', icon: 'heroicons:document-check' },
  { value: 'excel', label: 'Excel', icon: 'heroicons:table-cells' },
  { value: 'dwg', label: 'AutoCAD', icon: 'heroicons:bars-3' },
  { value: 'revit', label: 'Revit', icon: 'heroicons:cube' },
  { value: 'navisworks', label: 'Navisworks', icon: 'heroicons:eye' },
]

// ISO 19650 Document Statuses
const documentStatuses: { value: DocumentStatus; label: string; description: string; color: string; bgColor: string }[] = [
  { value: 'wip', label: 'WIP', description: 'Travail en cours', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  { value: 's0', label: 'S0', description: 'Partagé pour information', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 's4', label: 'S4', description: 'Approuvé pour exécution', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'cr', label: 'CR', description: 'Pour révision/commentaire', color: 'text-purple-700', bgColor: 'bg-purple-100' },
]

// Approval Workflow State
const showApprovalModal = ref(false)
const approvalDocument = ref<ProjectDocument | null>(null)
const selectedApproverId = ref('')
const projectMembers = ref<{ uid: string; firstName: string; lastName: string }[]>([])
const submittingApproval = ref(false)

// Rejection Modal State
const showRejectModal = ref(false)
const rejectionComment = ref('')
const rejectingApprovalId = ref<string | null>(null)

// Version Modal State
const showVersionModal = ref(false)
const versionDocument = ref<ProjectDocument | null>(null)
const versionFile = ref<File | null>(null)
const versionComment = ref('')
const uploadingVersion = ref(false)

// Linked Items State
const previewActiveTab = ref<'preview' | 'linked'>('preview')
const linkedRFIs = ref<any[]>([])
const linkedProblems = ref<any[]>([])
const linkedPhotos = ref<any[]>([])
const loadingLinkedItems = ref(false)

// Lock/Checkout State
const checkoutLoading = ref(false)
const checkinLoading = ref(false)

// Filename Validation State
const filenameValidationError = ref('')

// Create RFI from Document State
const showCreateRFIModal = ref(false)
const rfiLinkedDocumentId = ref('')
const rfiTitle = ref('')
const rfiQuestion = ref('')
const submittingRFI = ref(false)

/**
 * Validate filename against strict naming convention
 * Format: PROJET-ZONE-DISCIPLINE-TYPE-PHASE (e.g., RM3-25-GE-ARC-GN.pdf)
 */
function validateFilename(filename: string): { isValid: boolean; error?: string } {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Strict regex pattern: PROJET-ZONE-DISCIPLINE-TYPE-PHASE
  // Each part should be alphanumeric, separated by hyphens
  const regex = /^[A-Z0-9]+-[0-9]+-[A-Z]+-[A-Z]+-[A-Z0-9]+$/
  
  if (!regex.test(nameWithoutExt)) {
    return {
      isValid: false,
      error: 'Format de nom invalide. Utilisez: PROJET-ZONE-DISCIPLINE-TYPE-PHASE (ex: RM3-25-GE-ARC-GN.pdf)'
    }
  }
  
  // Additional validation: check minimum lengths for each segment
  const parts = nameWithoutExt.split('-')
  if (parts.length < 4) {
    return {
      isValid: false,
      error: 'Le nom doit contenir au moins 4 segments séparés par des tirets'
    }
  }
  
  return { isValid: true }
}

// Load enterprise data
async function loadEnterprise() {
  try {
    let enterpriseId = null
    
    if (profile.value?.enterpriseOwnerId) {
      enterpriseId = profile.value.enterpriseOwnerId
    } else if (profile.value?.role === 'enterprise' && user.value?.uid) {
      enterpriseId = user.value.uid
    }
    
    if (enterpriseId) {
      // First, recalculate and sync storage from all documents
      console.log('🔄 Syncing storage for enterprise:', enterpriseId)
      const syncedStorage = await recalculateEnterpriseStorage(enterpriseId)
      console.log('✅ Storage synced:', syncedStorage)
      
      // Then load the enterprise profile (which will now have the correct storage)
      enterprise.value = await getEnterpriseProfile(enterpriseId)
      console.log('📊 Enterprise loaded with storage:', enterprise.value?.storageUsed)
    }
  } catch (e) {
    console.error('Error loading enterprise:', e)
  }
}

// Load documents
async function loadDocuments() {
  loading.value = true
  try {
    documents.value = await getDocumentsByProject(projectId.value)
    await loadEnterprise()
  } catch (e) {
    console.error('Error loading documents:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEnterprise()
  loadDocuments()
})

// Filtered documents
const filteredDocuments = computed(() => {
  let filtered = documents.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.extractedText?.toLowerCase().includes(query)
    )
  }
  
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(doc => doc.type === typeFilter.value)
  }
  
  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
})

// Calculer la taille totale des documents visibles
const totalDocumentsSize = computed(() => {
  return filteredDocuments.value.reduce((total, doc) => total + (doc.fileSize || 0), 0)
})

// Fonction pour verifier si l'utilisateur peut uploader
const canUpload = computed(() => {
  if (!planRestrictions.value) return false
  return planRestrictions.value.canUploadFile
})

// File selection
function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Types de fichiers acceptés avec leurs MIME types
  const acceptedTypes: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.ms-excel': ['xls'],
    'application/acad': ['dwg'],
    'application/x-autocad': ['dwg'],
    'image/vnd.dwg': ['dwg'],
    'application/octet-stream': ['dwg', 'rvt', 'nwd', 'nwf'], // Revit et Navisworks
  }

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  const isAccepted = Object.entries(acceptedTypes).some(([mime, exts]) => 
    (file.type === mime || exts.includes(fileExtension))
  )

  if (!isAccepted && !['pdf', 'xlsx', 'xls', 'dwg', 'rvt', 'nwd', 'nwf'].includes(fileExtension)) {
    uploadError.value = 'Format non supporte. Formats acceptes : PDF, Excel, DWG, Revit, Navisworks'
    target.value = ''
    return
  }

  // Pas de limite de taille de fichier - seule la limite de stockage globale s'applique
  if (planRestrictions.value && typeof planRestrictions.value.canUploadFile === 'function' && !planRestrictions.value.canUploadFile(file.size)) {
    const remaining = planRestrictions.value.remainingStorage
    uploadError.value = `Stockage insuffisant. Espace restant: ${formatFileSize(remaining)}, fichier: ${formatFileSize(file.size)}`
    target.value = ''
    return
  }

  uploadFile.value = file
  uploadError.value = ''
  
  // Validate filename format
  const validation = validateFilename(file.name)
  if (!validation.isValid) {
    filenameValidationError.value = validation.error || 'Format de nom invalide'
  } else {
    filenameValidationError.value = ''
  }
  
  // Auto-detect type from extension
  const extToType: Record<string, DocumentType> = {
    'pdf': 'plan',
    'xlsx': 'excel',
    'xls': 'excel',
    'dwg': 'dwg',
    'rvt': 'revit',
    'nwd': 'navisworks',
    'nwf': 'navisworks',
  }
  
  const detectedType = extToType[fileExtension]
  if (detectedType) {
    uploadType.value = detectedType
  }
  
  if (!uploadTitle.value) {
    uploadTitle.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
  }
}

// Upload document
async function handleUpload() {
  if (!uploadFile.value || !user.value?.uid) return
  
  uploading.value = true
  uploadError.value = ''
  
  try {
    console.log('📤 Uploading document:', uploadFile.value.name, 'Size:', uploadFile.value.size)
    
    const fileUrl = await uploadProjectDocument(projectId.value, user.value.uid, uploadFile.value)
    console.log('✅ File uploaded to storage:', fileUrl)
    
    if (!fileUrl) {
      throw new Error('L\'URL du fichier est vide après l\'upload')
    }
    
    const { createDocument } = await import('~/firebase/services/firestore')
    
    // Parse metadata from filename (e.g., RM3-25-GE-ARC-GN.pdf)
    const metadata = uploadFile.value ? parseFilenameMetadata(uploadFile.value.name) : undefined
    
    await createDocument(
      projectId.value, 
      user.value.uid, 
      {
        title: uploadTitle.value,
        type: uploadType.value,
        status: uploadStatus.value,
        description: uploadDescription.value,
        fileSize: uploadFile.value.size,
        metadata,
      },
      fileUrl
    )
    console.log('✅ Document record created in Firestore with metadata:', metadata)
    
    // Mettre à jour le stockage - chercher l'ID de l'entreprise
    const enterpriseId = profile.value?.enterpriseOwnerId || (profile.value?.role === 'enterprise' ? user.value?.uid : null)
    console.log('🔍 Debug - enterpriseId:', enterpriseId)
    console.log('🔍 Debug - profile:', profile.value)
    console.log('🔍 Debug - user:', user.value?.uid)
    
    if (enterpriseId && uploadFile.value) {
      try {
        console.log('📤 Updating storage with size:', uploadFile.value.size)
        await updateEnterpriseStorage(enterpriseId, uploadFile.value.size)
        console.log('✅ Storage updated for enterprise:', enterpriseId)
        
        // Mise à jour locale immédiate pour l'UI
        if (enterprise.value) {
          enterprise.value.storageUsed = (enterprise.value.storageUsed || 0) + uploadFile.value.size
          console.log('📊 Local storage updated to:', enterprise.value.storageUsed)
        }
        
        // Recharger les données entreprise depuis Firestore
        await loadEnterprise()
      } catch (storageError: any) {
        console.error('❌ Error updating storage:', storageError)
        console.error('Error code:', storageError.code)
        console.error('Error message:', storageError.message)
      }
    } else {
      console.warn('⚠️ No enterprise ID found for storage update')
    }
    
    uploadFile.value = null
    uploadTitle.value = ''
    uploadDescription.value = ''
    uploadType.value = 'plan'
    showUploadModal.value = false
    
    await loadDocuments()
  } catch (e: any) {
    console.error('❌ Error uploading document:', e)
    console.error('Error details:', e.message, e.code, e.stack)
    uploadError.value = e.message || 'Erreur lors du televersement. Verifiez votre connexion et reessayez.'
  } finally {
    uploading.value = false
  }
}

// Delete function
async function handleDelete(doc: ProjectDocument) {
  if (!confirm(`Supprimer "${doc.title}" ?`)) return
  
  deletingId.value = doc.id
  try {
    await deleteProjectDocumentByUrl(doc.fileUrl)
    await deleteDocument(doc.id)
    
    // Mettre à jour le stockage - chercher l'ID de l'entreprise
    const enterpriseId = profile.value?.enterpriseOwnerId || (profile.value?.role === 'enterprise' ? user.value?.uid : null)
    if (enterpriseId && doc.fileSize) {
      await updateEnterpriseStorage(enterpriseId, -doc.fileSize)
      console.log('✅ Storage updated after delete')
      
      // Recharger les données entreprise pour mettre à jour l'affichage
      await loadEnterprise()
    }
    
    await loadDocuments()
  } catch (e) {
    console.error('Error deleting document:', e)
    alert('Erreur lors de la suppression')
  } finally {
    deletingId.value = null
  }
}

// Preview function
async function openPreview(doc: ProjectDocument) {
  previewDocument.value = doc
  showPreviewModal.value = true
  previewActiveTab.value = 'preview'
  
  // Load linked items
  await loadLinkedItems(doc.id)
}

// Load linked items for a document
async function loadLinkedItems(documentId: string) {
  loadingLinkedItems.value = true
  try {
    const { getRFIsByLinkedDocument, getProblemsByLinkedDocument, getPhotosByLinkedDocument } = await import('~/firebase/services/firestore')
    
    const [rfis, problems, photos] = await Promise.all([
      getRFIsByLinkedDocument(documentId),
      getProblemsByLinkedDocument(documentId),
      getPhotosByLinkedDocument(documentId)
    ])
    
    linkedRFIs.value = rfis
    linkedProblems.value = problems
    linkedPhotos.value = photos
  } catch (e) {
    console.error('Error loading linked items:', e)
  } finally {
    loadingLinkedItems.value = false
  }
}

// Format helpers
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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

function getTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    plan: 'Plan',
    report: 'Rapport',
    contract: 'Contrat',
    excel: 'Excel',
    dwg: 'AutoCAD',
    revit: 'Revit',
    navisworks: 'Navisworks',
  }
  return labels[type]
}

function getTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    plan: 'heroicons:map',
    report: 'heroicons:document-chart-bar',
    contract: 'heroicons:document-check',
    excel: 'heroicons:table-cells',
    dwg: 'heroicons:bars-3',
    revit: 'heroicons:cube',
    navisworks: 'heroicons:eye',
  }
  return icons[type]
}

function getTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    plan: 'bg-blue-100 text-blue-700',
    report: 'bg-green-100 text-green-700',
    contract: 'bg-purple-100 text-purple-700',
    excel: 'bg-emerald-100 text-emerald-700',
    dwg: 'bg-orange-100 text-orange-700',
    revit: 'bg-cyan-100 text-cyan-700',
    navisworks: 'bg-indigo-100 text-indigo-700',
  }
  return colors[type]
}

// ISO 19650 Status helpers
function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    wip: 'WIP',
    s0: 'S0',
    s4: 'S4',
    cr: 'CR',
  }
  return labels[status]
}

function getStatusDescription(status: DocumentStatus): string {
  const descriptions: Record<DocumentStatus, string> = {
    wip: 'Travail en cours',
    s0: 'Partagé pour information',
    s4: 'Approuvé pour exécution',
    cr: 'Pour révision/commentaire',
  }
  return descriptions[status]
}

function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    wip: 'bg-amber-100 text-amber-700 border-amber-200',
    s0: 'bg-blue-100 text-blue-700 border-blue-200',
    s4: 'bg-green-100 text-green-700 border-green-200',
    cr: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return colors[status]
}

// ========================================
// Filename Metadata Parsing (RM3-25-GE-ARC-GN.pdf)
// ========================================

function parseFilenameMetadata(filename: string): DocumentMetadata {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Split by common delimiters: - _ . space
  const parts = nameWithoutExt.split(/[-_.\s]+/)
  
  const metadata: DocumentMetadata = {
    originalName: filename,
    project: parts[0] || undefined,
    zone: parts[1] || undefined,
    discipline: parts[2] || undefined,
    phase: parts[3] || undefined,
    level: parts[4] || undefined,
  }
  
  return metadata
}

function getDisciplineLabel(code: string): string {
  const disciplines: Record<string, string> = {
    'GE': 'Génie Civil',
    'ARC': 'Architecture',
    'STR': 'Structure',
    'MEP': 'MEP / Fluides',
    'ELEC': 'Électricité',
    'PLUM': 'Plomberie',
    'HVAC': 'Climatisation',
    'FIRE': 'Incendie',
    'LAND': 'Paysagisme',
    'INT': 'Intérieur',
  }
  return disciplines[code?.toUpperCase()] || code
}

// ========================================
// Approval Workflow Functions
// ========================================

async function openApprovalModal(doc: ProjectDocument) {
  approvalDocument.value = doc
  selectedApproverId.value = ''
  
  // Load project members
  try {
    const { getMembersByProject } = await import('~/firebase/services/firestore')
    const members = await getMembersByProject(projectId.value)
    
    // Get user profiles for members
    const { getUserProfile } = await import('~/firebase/services/firestore')
    const memberProfiles = await Promise.all(
      members.map(m => getUserProfile(m.memberId))
    )
    
    projectMembers.value = memberProfiles
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map(p => ({ uid: p.uid, firstName: p.firstName, lastName: p.lastName }))
  } catch (e) {
    console.error('Error loading members:', e)
  }
  
  showApprovalModal.value = true
}

async function submitForApproval() {
  if (!approvalDocument.value || !selectedApproverId.value || !user.value?.uid) return
  
  submittingApproval.value = true
  try {
    const { createApprovalRequest } = await import('~/firebase/services/firestore')
    
    await createApprovalRequest(
      projectId.value,
      approvalDocument.value.id,
      user.value.uid,
      selectedApproverId.value
    )
    
    // Update document status to CR (for review)
    const { updateDocument } = await import('~/firebase/services/firestore')
    await updateDocument(approvalDocument.value.id, { status: 'cr' })
    
    showApprovalModal.value = false
    await loadDocuments()
    alert('Document soumis pour approbation!')
  } catch (e) {
    console.error('Error submitting for approval:', e)
    alert('Erreur lors de la soumission pour approbation')
  } finally {
    submittingApproval.value = false
  }
}

// ========================================
// Version Management Functions
// ========================================

async function openVersionModal(doc: ProjectDocument) {
  versionDocument.value = doc
  versionFile.value = null
  versionComment.value = ''
  showVersionModal.value = true
}

async function handleVersionUpload() {
  if (!versionFile.value || !versionDocument.value || !user.value?.uid) return
  
  uploadingVersion.value = true
  try {
    // Upload new version to storage
    const { uploadProjectDocument } = await import('~/firebase/services/storage')
    const fileUrl = await uploadProjectDocument(projectId.value, user.value.uid, versionFile.value)
    
    // Create version record
    const { createDocumentVersion } = await import('~/firebase/services/firestore')
    await createDocumentVersion(
      projectId.value,
      versionDocument.value.id,
      user.value.uid,
      {
        documentId: versionDocument.value.id,
        fileUrl,
        fileSize: versionFile.value.size,
        comment: versionComment.value,
      }
    )
    
    showVersionModal.value = false
    await loadDocuments()
    alert('Nouvelle version uploadée avec succès!')
  } catch (e) {
    console.error('Error uploading version:', e)
    alert('Erreur lors de l\'upload de la version')
  } finally {
    uploadingVersion.value = false
  }
}

// ========================================
// Check-in / Check-out Functions
// ========================================

function isDocumentLockedByMe(doc: ProjectDocument): boolean {
  return doc.lockedBy === user.value?.uid
}

function isDocumentLockedByOther(doc: ProjectDocument): boolean {
  return !!doc.lockedBy && doc.lockedBy !== user.value?.uid
}

function getLockedByLabel(doc: ProjectDocument): string {
  if (!doc.lockedBy) return ''
  return isDocumentLockedByMe(doc) ? 'Verrouillé par vous' : 'Verrouillé par un autre utilisateur'
}

async function handleCheckout(doc: ProjectDocument) {
  if (!user.value?.uid) return
  
  checkoutLoading.value = true
  try {
    const success = await checkoutDocument(doc.id, user.value.uid)
    if (success) {
      // Update local state
      doc.lockedBy = user.value.uid
      doc.lockedAt = new Date()
      alert('Document extrait avec succès. Vous pouvez maintenant le modifier.')
    } else {
      alert('Ce document est déjà verrouillé par un autre utilisateur.')
      // Reload to get current lock status
      await loadDocuments()
    }
  } catch (e) {
    console.error('Error checking out document:', e)
    alert('Erreur lors de l\'extraction du document')
  } finally {
    checkoutLoading.value = false
  }
}

async function handleCheckin(doc: ProjectDocument) {
  if (!user.value?.uid) return
  
  checkinLoading.value = true
  try {
    await checkinDocument(doc.id, user.value.uid)
    // Update local state
    doc.lockedBy = null
    doc.lockedAt = null
    alert('Document réintégré avec succès.')
  } catch (e: any) {
    console.error('Error checking in document:', e)
    alert(e.message || 'Erreur lors de la réintégration du document')
  } finally {
    checkinLoading.value = false
  }
}

// ========================================
// RFI Creation from Document Functions
// ========================================

function openCreateRFIModal(documentId: string) {
  rfiLinkedDocumentId.value = documentId
  rfiTitle.value = ''
  rfiQuestion.value = ''
  showCreateRFIModal.value = true
}

async function submitRFI() {
  if (!rfiTitle.value.trim() || !rfiQuestion.value.trim() || !user.value?.uid) return
  
  submittingRFI.value = true
  try {
    const { createRFI } = await import('~/firebase/services/firestore')
    
    await createRFI(
      projectId.value,
      user.value.uid,
      {
        title: rfiTitle.value,
        question: rfiQuestion.value,
        linkedDocuments: [rfiLinkedDocumentId.value],
      }
    )
    
    showCreateRFIModal.value = false
    
    // Reload linked items if preview modal is open
    if (showPreviewModal.value && previewDocument.value?.id === rfiLinkedDocumentId.value) {
      await loadLinkedItems(rfiLinkedDocumentId.value)
    }
    
    alert('RFI créé avec succès!')
  } catch (e) {
    console.error('Error creating RFI:', e)
    alert('Erreur lors de la création du RFI')
  } finally {
    submittingRFI.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Documents</h1>
          <p class="page-subtitle">Gerez les documents PDF du projet</p>
        </div>
        <button
          v-if="canUpload"
          @click="showUploadModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <Icon name="heroicons:cloud-arrow-up" class="w-5 h-5" />
          Upload PDF
        </button>
      </div>
    </div>

    <!-- Storage Limit Bar -->
    <StorageLimitBar
      v-if="enterprise"
      :plan="enterprise.plan || 'free'"
      :storage-used="enterprise.storageUsed || 0"
      class="mb-6"
    />

    <!-- Upgrade message for free plan -->
    <div v-else-if="profile?.role === 'enterprise' && enterprise?.plan === 'free'" 
         class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div class="flex items-center gap-3">
        <Icon name="heroicons:information-circle" class="w-5 h-5 text-amber-600" />
        <div class="flex-1">
          <p class="text-sm text-amber-800">
            Le plan Gratuit ne permet pas d'uploader de documents. 
            <NuxtLink to="/entreprise/abonnement" class="font-medium underline">Passez au pack Bronze</NuxtLink> 
            pour debloquer cette fonctionnalite.
          </p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher dans les titres, descriptions et contenu PDF..."
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Type Filter -->
        <div class="flex items-center gap-2 overflow-x-auto">
          <button
            v-for="type in documentTypes"
            :key="type.value"
            @click="typeFilter = type.value"
            class="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5"
            :class="typeFilter === type.value 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            <Icon :name="type.icon" class="w-4 h-4" />
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
        <span>{{ filteredDocuments.length }} document(s)</span>
        <span v-if="totalDocumentsSize > 0">• {{ formatFileSize(totalDocumentsSize) }} total</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-loading">
      <div class="spinner-lg text-blue-600"></div>
    </div>

    <!-- Documents Grid -->
    <div v-else-if="filteredDocuments.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all"
      >
        <!-- Header -->
        <div class="flex items-start gap-3 mb-3">
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getTypeColor(doc.type)]">
            <Icon :name="getTypeIcon(doc.type)" class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {{ doc.title }}
            </h3>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <p class="text-xs text-slate-500">{{ getTypeLabel(doc.type) }}</p>
              <span 
                :class="['text-xs px-2 py-0.5 rounded-full font-medium border', getStatusColor(doc.status)]"
                :title="getStatusDescription(doc.status)"
              >
                {{ getStatusLabel(doc.status) }}
              </span>
              <!-- Lock Indicator -->
              <span 
                v-if="doc.lockedBy"
                :class="['text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1',
                  isDocumentLockedByMe(doc) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-red-100 text-red-700 border-red-200']"
                :title="getLockedByLabel(doc)"
              >
                <Icon :name="isDocumentLockedByMe(doc) ? 'heroicons:lock-closed' : 'heroicons:lock-closed'" class="w-3 h-3" />
                {{ isDocumentLockedByMe(doc) ? 'Verrouillé par vous' : 'Verrouillé' }}
              </span>
              <!-- Metadata Tags -->
              <span v-if="doc.metadata?.project" class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {{ doc.metadata.project }}
              </span>
              <span v-if="doc.metadata?.zone" class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {{ doc.metadata.zone }}
              </span>
              <span v-if="doc.metadata?.discipline" class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600" :title="getDisciplineLabel(doc.metadata.discipline)">
                {{ doc.metadata.discipline }}
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <p v-if="doc.description" class="text-sm text-slate-600 mb-3 line-clamp-2">
          {{ doc.description }}
        </p>

        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>{{ formatDate(doc.createdAt) }}</span>
          <span v-if="doc.fileSize" class="font-medium">{{ formatFileSize(doc.fileSize) }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="openPreview(doc)"
            :disabled="isDocumentLockedByOther(doc)"
            class="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
            :class="{ 'opacity-50 cursor-not-allowed': isDocumentLockedByOther(doc) }"
          >
            <Icon name="heroicons:eye" class="w-4 h-4" />
            Voir
          </button>
          <button
            @click="handleCheckout(doc)"
            v-if="!doc.lockedBy && canUpload"
            :disabled="checkoutLoading"
            class="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Extraire (Check-out)"
          >
            <Icon name="heroicons:arrow-down-on-square" class="w-4 h-4" />
          </button>
          <button
            @click="handleCheckin(doc)"
            v-else-if="isDocumentLockedByMe(doc)"
            :disabled="checkinLoading"
            class="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
            title="Réintégrer (Check-in)"
          >
            <Icon name="heroicons:arrow-up-on-square" class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(doc)"
            :disabled="deletingId === doc.id || isDocumentLockedByOther(doc)"
            class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Icon v-if="deletingId === doc.id" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
            <Icon v-else name="heroicons:trash" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Icon name="heroicons:document-text" class="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-slate-800 mb-2">
        {{ searchQuery ? 'Aucun document trouve' : 'Aucun document' }}
      </h3>
      <p class="text-slate-500 mb-4">
        {{ searchQuery 
          ? 'Essayez une autre recherche' 
          : 'Uploadez votre premier document PDF' }}
      </p>
      <button
        v-if="canUpload && !searchQuery"
        @click="showUploadModal = true"
        class="btn-primary"
      >
        Upload un document
      </button>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showUploadModal = false" />
        <div class="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
          <h2 class="text-xl font-bold text-slate-800 mb-4">Upload un document</h2>
          
          <!-- Storage Info in Modal -->
          <StorageLimitBar
            v-if="enterprise"
            :plan="enterprise.plan || 'free'"
            :storage-used="enterprise.storageUsed || 0"
            :compact="true"
            class="mb-4"
          />

          <div class="space-y-4">
            <!-- File Input -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Fichier</label>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.dwg,.rvt,.nwd,.nwf"
                @change="onFileSelect"
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
              <p class="text-xs text-slate-500 mt-1">Formats: PDF, Excel, DWG, Revit, Navisworks (limite selon votre plan de stockage)</p>
            </div>

            <!-- Type -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select
                v-model="uploadType"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="plan">Plan</option>
                <option value="report">Rapport</option>
                <option value="contract">Contrat</option>
                <option value="excel">Excel</option>
                <option value="dwg">AutoCAD (DWG)</option>
                <option value="revit">Revit</option>
                <option value="navisworks">Navisworks</option>
              </select>
            </div>

            <!-- Status ISO 19650 -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Statut ISO 19650</label>
              <select
                v-model="uploadStatus"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option v-for="status in documentStatuses" :key="status.value" :value="status.value">
                  {{ status.label }} - {{ status.description }}
                </option>
              </select>
              <p class="text-xs text-slate-500 mt-1">
                WIP: Travail en cours | S0: Partagé pour info | S4: Approuvé | CR: Pour révision
              </p>
            </div>

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Titre</label>
              <input
                v-model="uploadTitle"
                type="text"
                placeholder="Nom du document"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Description (optionnel)</label>
              <textarea
                v-model="uploadDescription"
                rows="2"
                placeholder="Description du document..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <!-- Error -->
            <div v-if="uploadError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600 flex items-center gap-2">
                <Icon name="heroicons:exclamation-circle" class="w-4 h-4" />
                {{ uploadError }}
              </p>
            </div>
            
            <!-- Filename Validation Warning -->
            <div v-if="filenameValidationError && uploadFile" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p class="text-sm text-amber-700 flex items-start gap-2">
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Attention :</strong> {{ filenameValidationError }}
                </span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showUploadModal = false"
              class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="handleUpload"
              :disabled="!uploadFile || uploading || !!filenameValidationError"
              class="btn-primary flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': !uploadFile || uploading || filenameValidationError }"
            >
              <Icon v-if="uploading" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              <Icon v-else name="heroicons:cloud-arrow-up" class="w-5 h-5" />
              {{ uploading ? 'Upload...' : 'Upload' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreviewModal && previewDocument" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80" @click="showPreviewModal = false" />
        <div class="relative bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-slate-200">
            <div class="flex items-center gap-3">
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', getTypeColor(previewDocument.type)]">
                <Icon :name="getTypeIcon(previewDocument.type)" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-semibold text-slate-800">{{ previewDocument.title }}</h3>
                <div class="flex items-center gap-2">
                  <p class="text-sm text-slate-500">{{ getTypeLabel(previewDocument.type) }} • {{ formatFileSize(previewDocument.fileSize || 0) }}</p>
                  <span 
                    :class="['text-xs px-2 py-0.5 rounded-full font-medium border', getStatusColor(previewDocument.status)]"
                    :title="getStatusDescription(previewDocument.status)"
                  >
                    {{ getStatusLabel(previewDocument.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="openVersionModal(previewDocument)"
                class="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
              >
                <Icon name="heroicons:document-plus" class="w-4 h-4" />
                Nouvelle version
              </button>
              <button
                @click="openApprovalModal(previewDocument)"
                v-if="previewDocument.status === 'wip' || previewDocument.status === 's0'"
                class="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors flex items-center gap-2"
              >
                <Icon name="heroicons:paper-airplane" class="w-4 h-4" />
                Soumettre
              </button>
              <a
                :href="previewDocument.fileUrl"
                target="_blank"
                download
                class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                Telecharger
              </a>
              <button
                @click="showPreviewModal = false"
                class="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <!-- Tabs -->
          <div class="flex border-b border-slate-200 bg-white">
            <button
              @click="previewActiveTab = 'preview'"
              class="px-6 py-3 text-sm font-medium transition-colors border-b-2"
              :class="previewActiveTab === 'preview' 
                ? 'text-blue-600 border-blue-600 bg-blue-50' 
                : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-slate-50'"
            >
              <Icon name="heroicons:eye" class="w-4 h-4 inline mr-2" />
              Aperçu
            </button>
            <button
              @click="previewActiveTab = 'linked'"
              class="px-6 py-3 text-sm font-medium transition-colors border-b-2"
              :class="previewActiveTab === 'linked' 
                ? 'text-blue-600 border-blue-600 bg-blue-50' 
                : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-slate-50'"
            >
              <Icon name="heroicons:link" class="w-4 h-4 inline mr-2" />
              Éléments liés
              <span 
                v-if="linkedRFIs.length + linkedProblems.length + linkedPhotos.length > 0"
                class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
              >
                {{ linkedRFIs.length + linkedProblems.length + linkedPhotos.length }}
              </span>
            </button>
          </div>
          
          <!-- Content -->
          <div class="flex-1 bg-slate-100 overflow-hidden">
            <!-- PDF/Document Viewer Tab -->
            <div v-if="previewActiveTab === 'preview'" class="w-full h-full">
              <DocumentViewer
                :file-url="previewDocument.fileUrl"
                :file-type="previewDocument.type"
                :file-name="previewDocument.title"
                :document-id="previewDocument.id"
                @create-rfi="openCreateRFIModal"
              />
            </div>
            
            <!-- Linked Items Tab -->
            <div v-else class="w-full h-full overflow-y-auto p-6">
              <!-- Loading State -->
              <div v-if="loadingLinkedItems" class="flex items-center justify-center h-full">
                <div class="spinner-lg text-blue-600"></div>
              </div>
              
              <!-- Empty State -->
              <div v-else-if="linkedRFIs.length === 0 && linkedProblems.length === 0 && linkedPhotos.length === 0" 
                   class="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon name="heroicons:link-slash" class="w-16 h-16 mb-4 text-slate-300" />
                <p class="text-lg font-medium">Aucun élément lié</p>
                <p class="text-sm mt-2">Ce document n'est lié à aucun RFI, problème ou photo</p>
              </div>
              
              <!-- Linked Items List -->
              <div v-else class="space-y-6">
                <!-- Linked RFIs -->
                <div v-if="linkedRFIs.length > 0" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div class="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 text-blue-600" />
                    <h3 class="font-semibold text-slate-800">RFIs liés ({{ linkedRFIs.length }})</h3>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="rfi in linkedRFIs" :key="rfi.id" class="p-4 hover:bg-slate-50 transition-colors">
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Icon name="heroicons:question-mark-circle" class="w-4 h-4" />
                        </div>
                        <div class="flex-1">
                          <h4 class="font-medium text-slate-800">{{ rfi.title }}</h4>
                          <p class="text-sm text-slate-600 mt-1 line-clamp-2">{{ rfi.question }}</p>
                          <p class="text-xs text-slate-400 mt-2">{{ formatDate(rfi.createdAt) }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Linked Problems -->
                <div v-if="linkedProblems.length > 0" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div class="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                    <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-600" />
                    <h3 class="font-semibold text-slate-800">Problèmes liés ({{ linkedProblems.length }})</h3>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="problem in linkedProblems" :key="problem.id" class="p-4 hover:bg-slate-50 transition-colors">
                      <div class="flex items-start gap-3">
                        <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', 
                          problem.severity === 'high' ? 'bg-red-100 text-red-600' : 
                          problem.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 
                          'bg-yellow-100 text-yellow-600']">
                          <Icon name="heroicons:exclamation-circle" class="w-4 h-4" />
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <h4 class="font-medium text-slate-800">{{ problem.title }}</h4>
                            <span :class="['text-xs px-2 py-0.5 rounded-full font-medium',
                              problem.severity === 'high' ? 'bg-red-100 text-red-700' : 
                              problem.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 
                              'bg-yellow-100 text-yellow-700']">
                              {{ problem.severity === 'high' ? 'Critique' : problem.severity === 'medium' ? 'Majeur' : 'Mineur' }}
                            </span>
                          </div>
                          <p class="text-sm text-slate-600 mt-1 line-clamp-2">{{ problem.description }}</p>
                          <p class="text-xs text-slate-400 mt-2">{{ formatDate(problem.createdAt) }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Linked Photos -->
                <div v-if="linkedPhotos.length > 0" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div class="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                    <Icon name="heroicons:camera" class="w-5 h-5 text-green-600" />
                    <h3 class="font-semibold text-slate-800">Photos liées ({{ linkedPhotos.length }})</h3>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                    <div v-for="photo in linkedPhotos" :key="photo.id" class="group relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img :src="photo.imageUrl" :alt="photo.note" class="w-full h-full object-cover" />
                      <div v-if="photo.note" class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-2 line-clamp-2">
                        {{ photo.note }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Approval Modal -->
    <Teleport to="body">
      <div v-if="showApprovalModal && approvalDocument" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showApprovalModal = false" />
        <div class="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
          <h2 class="text-xl font-bold text-slate-800 mb-4">Soumettre pour approbation</h2>
          
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>Document:</strong> {{ approvalDocument.title }}
              </p>
              <p class="text-xs text-blue-600 mt-1">
                Le statut passera à "CR" (Pour révision)
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Sélectionner un approbateur</label>
              <select
                v-model="selectedApproverId"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choisir un membre...</option>
                <option v-for="member in projectMembers" :key="member.uid" :value="member.uid">
                  {{ member.firstName }} {{ member.lastName }}
                </option>
              </select>
              <p v-if="projectMembers.length === 0" class="text-xs text-slate-500 mt-1">
                Aucun membre disponible. Ajoutez des membres au projet d'abord.
              </p>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showApprovalModal = false"
              class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="submitForApproval"
              :disabled="!selectedApproverId || submittingApproval"
              class="btn-primary flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': !selectedApproverId || submittingApproval }"
            >
              <Icon v-if="submittingApproval" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              <Icon v-else name="heroicons:paper-airplane" class="w-5 h-5" />
              {{ submittingApproval ? 'Envoi...' : 'Soumettre' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Version Modal -->
    <Teleport to="body">
      <div v-if="showVersionModal && versionDocument" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showVersionModal = false" />
        <div class="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
          <h2 class="text-xl font-bold text-slate-800 mb-4">Nouvelle version</h2>
          
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>Document:</strong> {{ versionDocument.title }}
              </p>
              <p class="text-xs text-blue-600 mt-1">
                Version actuelle: {{ versionDocument.version || 1 }}
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Nouveau fichier</label>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.dwg,.rvt,.nwd,.nwf"
                @change="(e) => { const target = e.target as HTMLInputElement; versionFile = target.files?.[0] || null }"
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Commentaire (optionnel)</label>
              <textarea
                v-model="versionComment"
                rows="2"
                placeholder="Qu'est-ce qui a changé dans cette version ?"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showVersionModal = false"
              class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="handleVersionUpload"
              :disabled="!versionFile || uploadingVersion"
              class="btn-primary flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': !versionFile || uploadingVersion }"
            >
              <Icon v-if="uploadingVersion" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              <Icon v-else name="heroicons:cloud-arrow-up" class="w-5 h-5" />
              {{ uploadingVersion ? 'Upload...' : 'Upload Version' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create RFI Modal -->
    <Teleport to="body">
      <div v-if="showCreateRFIModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showCreateRFIModal = false" />
        <div class="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
          <h2 class="text-xl font-bold text-slate-800 mb-4">Créer un RFI</h2>
          <p class="text-sm text-slate-600 mb-4">Créer une demande d'information liée à ce document.</p>
          
          <div class="space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Titre</label>
              <input
                v-model="rfiTitle"
                type="text"
                placeholder="Titre du RFI"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <!-- Question -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Question</label>
              <textarea
                v-model="rfiQuestion"
                rows="4"
                placeholder="Votre question sur ce document..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showCreateRFIModal = false"
              class="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="submitRFI"
              :disabled="!rfiTitle.trim() || !rfiQuestion.trim() || submittingRFI"
              class="btn-primary flex items-center gap-2"
              :class="{ 'opacity-50 cursor-not-allowed': !rfiTitle.trim() || !rfiQuestion.trim() || submittingRFI }"
            >
              <Icon v-if="submittingRFI" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
              <Icon v-else name="heroicons:paper-airplane" class="w-5 h-5" />
              {{ submittingRFI ? 'Création...' : 'Créer le RFI' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}
</style>
