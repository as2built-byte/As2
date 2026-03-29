<script setup lang="ts">
/**
 * Documents Page - Version finale fonctionnelle
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

console.log('📄 Documents page - Version finale fonctionnelle')

// Variables réactives
const documents = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showPreviewModal = ref(false)
const selectedDocument = ref(null)

// Données de test
const mockDocuments = [
  {
    id: '1',
    title: 'Plan Architectural Principal',
    type: 'plan',
    description: 'Plan du rez-de-chaussée avec dimensions complètes et annotations',
    createdAt: new Date('2024-01-15'),
    fileSize: 2048576
  },
  {
    id: '2',
    title: 'Rapport d\'inspection technique',
    type: 'report',
    description: 'Rapport détaillé de l\'inspection du site avec photos et recommandations',
    createdAt: new Date('2024-01-20'),
    fileSize: 1024000
  },
  {
    id: '3',
    title: 'Contrat de construction',
    type: 'contract',
    description: 'Contrat signé avec les entrepreneurs principaux du projet',
    createdAt: new Date('2024-01-10'),
    fileSize: 5120000
  }
]

// Computed
const filteredDocuments = computed(() => {
  if (!searchQuery.value) return documents.value
  const query = searchQuery.value.toLowerCase()
  return documents.value.filter(doc => 
    doc.title.toLowerCase().includes(query) ||
    doc.type.toLowerCase().includes(query) ||
    doc.description?.toLowerCase().includes(query)
  )
})

// Methods
const loadDocuments = async () => {
  loading.value = true
  try {
    console.log('🔄 Loading documents...')
    await new Promise(resolve => setTimeout(resolve, 800))
    documents.value = mockDocuments
    console.log(`✅ Loaded ${documents.value.length} documents`)
  } catch (error) {
    console.error('❌ Error loading documents:', error)
  } finally {
    loading.value = false
  }
}

const handlePreview = (document) => {
  console.log('🔍 Preview:', document.title)
  selectedDocument.value = document
  showPreviewModal.value = true
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Load on mount
onMounted(() => {
  loadDocuments()
})
</script>
<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b p-4">
      <h1 class="text-2xl font-bold">Documents</h1>
      <p class="text-slate-600">Gestion des documents du projet</p>
    </div>

    <!-- Contenu principal -->
    <main class="p-6">
      <!-- Recherche -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher des documents..."
          class="w-full max-w-md px-4 py-2 border rounded-lg"
        />
      </div>

      <!-- Stats -->
      <div class="bg-white rounded-lg border p-4 mb-6">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold">{{ documents.length }}</div>
            <div class="text-sm text-slate-600">Total</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">{{ filteredDocuments.length }}</div>
            <div class="text-sm text-slate-600">Filtrés</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">2.1 MB</div>
            <div class="text-sm text-slate-600">Taille</div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-slate-600">Chargement...</p>
      </div>

      <!-- Documents grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="document in filteredDocuments"
          :key="document.id"
          class="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
          @click="handlePreview(document)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span class="text-blue-600">📄</span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-slate-900 truncate">{{ document.title }}</h3>
              <p class="text-sm text-blue-600 mb-1">{{ document.type }}</p>
              <p v-if="document.description" class="text-sm text-slate-600 line-clamp-2">
                {{ document.description }}
              </p>
              <div class="flex justify-between items-center mt-2 text-xs text-slate-500">
                <span>{{ formatDate(document.createdAt) }}</span>
                <span>{{ formatFileSize(document.fileSize) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredDocuments.length === 0" class="text-center py-8">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">📄</span>
        </div>
        <h3 class="text-lg font-medium text-slate-900 mb-2">Aucun document trouvé</h3>
        <p class="text-slate-600">
          {{ searchQuery ? 'Essayez une autre recherche' : 'Aucun document disponible' }}
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
