<!--
  Document Export Modal Component
  
  Export documents as ZIP with options
-->

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <h2 class="text-xl font-semibold text-slate-900">Exporter les documents</h2>
        <button
          @click="$emit('close')"
          class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 p-6 overflow-auto">
        <div class="space-y-6">
          <!-- Summary -->
          <div class="p-4 bg-blue-50 rounded-lg">
            <div class="flex items-center gap-3">
              <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600" />
              <div>
                <p class="text-sm font-medium text-blue-900">
                  {{ documents.length }} document(s) sélectionné(s)
                </p>
                <p class="text-xs text-blue-700">
                  Taille totale estimée: {{ totalSize }}
                </p>
              </div>
            </div>
          </div>

          <!-- Export Options -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-3">
              Options d'export
            </label>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input
                  v-model="options.includeRelations"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-slate-700">
                  Inclure les informations de relations
                </span>
              </label>
              
              <label class="flex items-center gap-3">
                <input
                  v-model="options.includeMetadata"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-slate-700">
                  Inclure les métadonnées (date, auteur, etc.)
                </span>
              </label>
              
              <label class="flex items-center gap-3">
                <input
                  v-model="options.createIndex"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-slate-700">
                  Créer un fichier index (README.md)
                </span>
              </label>
            </div>
          </div>

          <!-- Format Selection -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-3">
              Format d'export
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                     :class="options.format === 'zip' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'">
                <input
                  v-model="options.format"
                  type="radio"
                  value="zip"
                  class="w-4 h-4 text-blue-600"
                />
                <div>
                  <div class="font-medium text-slate-900">ZIP</div>
                  <div class="text-xs text-slate-600">Archive compressée</div>
                </div>
              </label>
              
              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                     :class="options.format === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'">
                <input
                  v-model="options.format"
                  type="radio"
                  value="pdf"
                  class="w-4 h-4 text-blue-600"
                />
                <div>
                  <div class="font-medium text-slate-900">PDF</div>
                  <div class="text-xs text-slate-600">Fusionner en PDF</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          @click="handleExport"
          :disabled="exporting"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Icon v-if="exporting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-down-tray" class="w-4 h-4" />
          {{ exporting ? 'Export...' : 'Exporter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument } from '~/types'

interface Props {
  documents: ProjectDocument[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// State
const exporting = ref(false)

const options = ref({
  format: 'zip' as 'zip' | 'pdf',
  includeRelations: true,
  includeMetadata: true,
  createIndex: true
})

// Computed
const totalSize = computed(() => {
  const totalBytes = props.documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
  return formatFileSize(totalBytes)
})

// Methods
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const handleExport = async () => {
  exporting.value = true
  
  try {
    console.log('Exporting documents:', {
      documents: props.documents.length,
      options: options.value
    })
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Create download link (simulation)
    const blob = new Blob(['Exported documents data'], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `documents-export-${new Date().toISOString().split('T')[0]}.${options.value.format}`
    link.click()
    URL.revokeObjectURL(url)
    
    emit('close')
  } catch (error) {
    console.error('Export error:', error)
    alert('Erreur lors de l\'export')
  } finally {
    exporting.value = false
  }
}
</script>
