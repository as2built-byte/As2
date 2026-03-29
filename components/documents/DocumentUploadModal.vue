<!--
  Document Upload Modal Component
  
  Modern upload interface with drag & drop and relations
-->

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <h2 class="text-xl font-semibold text-slate-900">Upload un document</h2>
        <button
          @click="$emit('close')"
          class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Form -->
      <div class="flex-1 p-6 overflow-auto">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- File Upload -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Fichier PDF <span class="text-red-500">*</span>
            </label>
            <div
              class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
              :class="{ 'border-blue-500 bg-blue-50': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="fileInputRef?.click()"
            >
              <Icon name="heroicons:cloud-arrow-up" class="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p class="text-slate-600 mb-1">
                Glissez-déposez un fichier PDF ici ou cliquez pour sélectionner
              </p>
              <p class="text-xs text-slate-500">
                Maximum 10MB, format PDF uniquement
              </p>
              <input
                ref="fileInputRef"
                type="file"
                accept=".pdf"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
            
            <!-- Selected File -->
            <div v-if="selectedFile" class="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:document-text" class="w-5 h-5 text-blue-600" />
                <span class="text-sm text-slate-700">{{ selectedFile.name }}</span>
                <span class="text-xs text-slate-500">({{ formatFileSize(selectedFile.size) }})</span>
              </div>
              <button
                @click="clearFile"
                class="p-1 text-slate-600 hover:text-red-600 transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Titre <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Titre du document"
            />
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Type <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.type"
              required
              class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un type</option>
              <option value="plan">Plan</option>
              <option value="report">Rapport</option>
              <option value="contract">Contrat</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description du document (optionnel)"
            />
            <p class="text-xs text-slate-500 mt-1">
              Utilisez @document:id, @photo:id, @problem:id, @rfi:id pour créer des relations
            </p>
          </div>

          <!-- Relations Preview -->
          <div v-if="parsedTags.length > 0" class="p-3 bg-amber-50 rounded-lg">
            <p class="text-sm font-medium text-amber-800 mb-2">Relations détectées:</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in parsedTags"
                :key="tag.displayText"
                class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs"
              >
                {{ tag.displayText }}
              </span>
            </div>
          </div>
        </form>
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
          @click="handleSubmit"
          :disabled="!selectedFile || !form.title.trim() || !form.type || uploading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Icon v-if="uploading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:cloud-arrow-up" class="w-4 h-4" />
          {{ uploading ? 'Upload...' : 'Upload' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument, DocumentType } from '~/types'
import { parseRelationTags } from '~/firebase/services/relations'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  uploaded: []
}>()

// State
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const uploading = ref(false)

const form = ref({
  title: '',
  type: '' as DocumentType,
  description: ''
})

const parsedTags = computed(() => {
  if (!form.value.description) return []
  return parseRelationTags(form.value.description)
})

// Methods
const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file) handleFile(file)
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file) handleFile(file)
  }
}

const handleFile = (file: File) => {
  // Validate file type
  if (file.type !== 'application/pdf') {
    alert('Seuls les fichiers PDF sont acceptés')
    return
  }
  
  // Validate file size
  if (file.size > 10 * 1024 * 1024) {
    alert('Le fichier ne doit pas dépasser 10MB')
    return
  }
  
  selectedFile.value = file
  
  // Auto-fill title if empty
  if (!form.value.title.trim()) {
    form.value.title = file.name.replace('.pdf', '')
  }
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const handleSubmit = async () => {
  if (!selectedFile.value || !form.value.title.trim() || !form.value.type) {
    return
  }
  
  uploading.value = true
  
  try {
    // This would need to be implemented based on your upload logic
    console.log('Uploading document:', {
      file: selectedFile.value,
      ...form.value
    })
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emit('uploaded')
  } catch (error) {
    console.error('Upload error:', error)
    alert('Erreur lors de l\'upload')
  } finally {
    uploading.value = false
  }
}
</script>
