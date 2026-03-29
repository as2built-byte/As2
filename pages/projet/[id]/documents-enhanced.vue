<!--
  Enhanced Documents Page
  
  Modern UI with PDF preview, advanced filters, relations, and export features
-->

<template>
  <div class="documents-page">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Icon name="heroicons:document-text" class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Documents</h1>
          <p class="text-sm text-slate-600">{{ documents.length }} documents</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher des documents..."
            class="w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
        </div>
        
        <!-- Upload Button -->
        <button
          v-if="canUpload"
          @click="showUploadModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Icon name="heroicons:cloud-arrow-up" class="w-5 h-5" />
          Upload
        </button>
        
        <!-- Export Button -->
        <button
          @click="handleExport"
          class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-5 h-5" />
          Exporter
        </button>
      </div>
    </div>

    <!-- Filters and Stats -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Type Filter -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Type:</span>
          <div class="flex gap-1">
            <button
              v-for="type in documentTypes"
              :key="type.value"
              @click="typeFilter = type.value"
              :class="[
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                typeFilter === type.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              ]"
            >
              <Icon :name="type.icon" class="w-4 h-4 mr-1" />
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Date Filter -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Date:</span>
          <select
            v-model="dateFilter"
            class="px-3 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>

        <!-- Sort -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Tri:</span>
          <select
            v-model="sortBy"
            class="px-3 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Date</option>
            <option value="name">Nom</option>
            <option value="size">Taille</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-slate-900">{{ totalSize }}</div>
          <div class="text-xs text-slate-600">Taille totale</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ filteredDocuments.length }}</div>
          <div class="text-xs text-slate-600">Filtrés</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ recentDocuments }}</div>
          <div class="text-xs text-slate-600">Cette semaine</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{{ totalRelations }}</div>
          <div class="text-xs text-slate-600">Relations</div>
        </div>
      </div>
    </div>

    <!-- Documents Grid -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <div v-else-if="filteredDocuments.length === 0" class="text-center py-12">
      <div class="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
        <Icon name="heroicons:document-text" class="w-12 h-12 text-slate-400" />
      </div>
      <h3 class="text-lg font-medium text-slate-900 mb-2">Aucun document trouvé</h3>
      <p class="text-slate-600 mb-4">
        {{ searchQuery ? 'Essayez une autre recherche' : 'Commencez par uploader votre premier document' }}
      </p>
      <button
        v-if="canUpload && !searchQuery"
        @click="showUploadModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Upload un document
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <DocumentCard
        v-for="document in filteredDocuments"
        :key="document.id"
        :document="document"
        :relations="getDocumentRelations(document.id)"
        @preview="handlePreview"
        @edit="handleEdit"
        @delete="handleDelete"
        @navigate-relation="handleNavigateRelation"
      />
    </div>

    <!-- PDF Preview Modal -->
    <PDFPreviewModal
      v-if="showPreviewModal"
      :document="selectedDocument"
      @close="showPreviewModal = false"
    />

    <!-- Upload Modal -->
    <DocumentUploadModal
      v-if="showUploadModal"
      :project-id="projectId"
      @close="showUploadModal = false"
      @uploaded="handleDocumentUploaded"
    />

    <!-- Edit Modal -->
    <DocumentEditModal
      v-if="showEditModal"
      :document="selectedDocument"
      @close="showEditModal = false"
      @updated="handleDocumentUpdated"
    />

    <!-- Export Modal -->
    <DocumentExportModal
      v-if="showExportModal"
      :documents="filteredDocuments"
      @close="showExportModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument, DocumentType } from '~/types'
import { getDocumentsByProject, deleteDocument } from '~/firebase/services/firestore'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const { user, profile, enterprise } = useAuth()

// Project ID
const projectId = computed(() => route.params.id as string)

// Relations composable
const relationsComposable = useRelations(projectId.value)

// State
const documents = ref<ProjectDocument[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const typeFilter = ref<DocumentType | 'all'>('all')
const dateFilter = ref('all')
const sortBy = ref('date')

// Modals
const showPreviewModal = ref(false)
const showUploadModal = ref(false)
const showEditModal = ref(false)
const showExportModal = ref(false)
const selectedDocument = ref<ProjectDocument | null>(null)

// Document types
const documentTypes = [
  { value: 'plan', label: 'Plans', icon: 'heroicons:map' },
  { value: 'report', label: 'Rapports', icon: 'heroicons:document-chart-bar' },
  { value: 'contract', label: 'Contrats', icon: 'heroicons:document-check' },
] as const

// Computed
const filteredDocuments = computed(() => {
  let filtered = documents.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(doc => doc.type === typeFilter.value)
  }

  // Date filter
  if (dateFilter.value !== 'all') {
    const now = new Date()
    const filterDate = new Date()
    
    switch (dateFilter.value) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        filterDate.setDate(now.getDate() - 7)
        break
      case 'month':
        filterDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    filtered = filtered.filter(doc => doc.createdAt >= filterDate)
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'size':
        return (b.fileSize || 0) - (a.fileSize || 0)
      case 'type':
        return a.type.localeCompare(b.type)
      case 'date':
      default:
        return b.createdAt.getTime() - a.createdAt.getTime()
    }
  })

  return filtered
})

const totalSize = computed(() => {
  const totalBytes = documents.value.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
  return formatFileSize(totalBytes)
})

const recentDocuments = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return documents.value.filter(doc => doc.createdAt >= weekAgo).length
})

const totalRelations = computed(() => {
  return relationsComposable.relations.value.length
})

// Plan restrictions
const canUpload = computed(() => {
  if (!enterprise.value) return false
  const plan = enterprise.value.plan || 'free'
  return ['bronze', 'silver', 'gold'].includes(plan)
})

// Methods
const loadDocuments = async () => {
  loading.value = true
  error.value = null
  try {
    // Load documents from Firestore
    documents.value = await getDocumentsByProject(projectId.value)
    
    // Load relations
    await relationsComposable.loadRelations()
    
    console.log(`✅ Loaded ${documents.value.length} documents`)
  } catch (err) {
    console.error('❌ Error loading documents:', err)
    error.value = 'Erreur lors du chargement des documents'
  } finally {
    loading.value = false
  }
}

const getDocumentRelations = (documentId: string) => {
  return relationsComposable.relations.value.filter(
    rel => rel.sourceId === documentId || rel.targetId === documentId
  )
}

const handlePreview = (document: ProjectDocument) => {
  selectedDocument.value = document
  showPreviewModal.value = true
}

const handleEdit = (document: ProjectDocument) => {
  selectedDocument.value = document
  showEditModal.value = true
}

const handleDelete = async (document: ProjectDocument) => {
  if (!confirm(`Supprimer "${document.title}" ?`)) return
  
  try {
    await deleteDocument(document.id)
    await loadDocuments()
    console.log('✅ Document deleted')
  } catch (err) {
    console.error('❌ Error deleting document:', err)
    alert('Erreur lors de la suppression')
  }
}

const handleNavigateRelation = (relationId: string) => {
  // Navigate to related entity
  const relation = relationsComposable.relations.value.find(r => r.id === relationId)
  if (relation) {
    const router = useRouter()
    const routes = {
      document: `/projet/${projectId.value}/documents`,
      photo: `/projet/${projectId.value}/photos`,
      problem: `/projet/${projectId.value}/problemes`,
      rfi: `/projet/${projectId.value}/rfis`
    }
    
    if (routes[relation.targetType]) {
      router.push(`${routes[relation.targetType]}#${relation.targetId}`)
    }
  }
}

const handleDocumentUploaded = async () => {
  showUploadModal.value = false
  await loadDocuments()
}

const handleDocumentUpdated = async () => {
  showEditModal.value = false
  await loadDocuments()
}

const handleExport = () => {
  showExportModal.value = true
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Load documents on mount
onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.documents-page {
  @apply min-h-screen bg-slate-50 p-6;
}
</style>
