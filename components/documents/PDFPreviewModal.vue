<!--
  PDF Preview Modal Component
  
  Displays PDF preview with navigation and download options
-->

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <Icon name="heroicons:document-text" class="w-5 h-5 text-blue-600" />
          <h2 class="text-lg font-semibold text-slate-900">{{ document.title }}</h2>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="handleDownload"
            class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
            Télécharger
          </button>
          
          <button
            @click="$emit('close')"
            class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- PDF Viewer -->
      <div class="flex-1 p-4 overflow-auto">
        <div class="bg-slate-50 rounded-lg p-4 min-h-[600px] flex items-center justify-center">
          <iframe
            :src="pdfUrl"
            class="w-full h-full min-h-[600px] rounded border border-slate-200"
            frameborder="0"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t border-slate-200 text-sm text-slate-600">
        <div class="flex items-center gap-4">
          <span>Type: {{ document.type }}</span>
          <span>Taille: {{ formatFileSize(document.fileSize || 0) }}</span>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="handlePrevious"
            :disabled="currentPage <= 1"
            class="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          </button>
          
          <span class="px-3 py-1 bg-slate-100 rounded">
            Page {{ currentPage }} / {{ totalPages }}
          </span>
          
          <button
            @click="handleNext"
            :disabled="currentPage >= totalPages"
            class="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50"
          >
            <Icon name="heroicons:chevron-right" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument } from '~/types'

interface Props {
  document: ProjectDocument
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// State
const currentPage = ref(1)
const totalPages = ref(1)

// Computed
const pdfUrl = computed(() => {
  // Add page parameter to URL if needed
  return props.document.fileUrl
})

// Methods
const handleDownload = () => {
  const link = document.createElement('a')
  link.href = props.document.fileUrl
  link.download = props.document.title
  link.click()
}

const handlePrevious = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const handleNext = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Handle escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      emit('close')
    }
  }
  
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>
