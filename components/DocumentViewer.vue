<template>
  <div class="w-full h-full flex flex-col">
    <!-- Action Bar -->
    <div class="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500">{{ fileName || 'Document' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="documentId"
          @click="$emit('create-rfi', documentId)"
          class="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors flex items-center gap-1.5"
        >
          <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4" />
          Créer RFI
        </button>
        <a
          :href="fileUrl"
          target="_blank"
          download
          class="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
          Télécharger
        </a>
      </div>
    </div>

    <!-- PDF Viewer - Native iframe for modern browsers -->
    <div v-if="isPdf" class="w-full flex-1 bg-slate-100">
      <iframe
        :src="props.fileUrl"
        class="w-full h-full"
        frameborder="0"
        title="PDF Viewer"
        allow="fullscreen"
        type="application/pdf"
      />
    </div>

    <!-- Image Viewer -->
    <div v-else-if="isImage" class="w-full flex-1 bg-slate-900 flex items-center justify-center overflow-auto">
      <img
        :src="fileUrl"
        :alt="fileName || 'Image'"
        class="max-w-full max-h-full object-contain"
      />
    </div>

    <!-- Excel/Word Viewer (Microsoft Office Online) -->
    <div v-else-if="isOfficeDoc" class="w-full flex-1 bg-slate-100">
      <iframe
        :src="officeViewerUrl"
        class="w-full h-full"
        frameborder="0"
        title="Office Document Viewer"
      />
    </div>

    <!-- Technical File Viewer (DWG, Revit, Navisworks) -->
    <div v-else-if="isTechnicalFile" class="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
      <div class="text-center max-w-md">
        <div class="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
          <Icon :name="viewerIcon" class="w-10 h-10 text-blue-600" />
        </div>
        <h3 class="text-lg font-semibold text-slate-800 mb-2">
          {{ viewerTitle }}
        </h3>
        <p class="text-slate-600 mb-4">
          Ce type de fichier nécessite une visionneuse spécialisée pour être affiché dans le navigateur.
        </p>
        <div class="space-y-3">
          <a
            :href="autodeskViewerUrl"
            target="_blank"
            class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Icon name="heroicons:eye" class="w-5 h-5" />
            Ouvrir dans Autodesk Viewer
          </a>
          <a
            :href="fileUrl"
            target="_blank"
            download
            class="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
            Télécharger le fichier
          </a>
          <p class="text-xs text-slate-500">
            Formats supportés: DWG (AutoCAD), RVT (Revit), NWD/NWF (Navisworks)
          </p>
        </div>
      </div>
    </div>

    <!-- Unknown File Type -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center bg-slate-50">
      <Icon name="heroicons:document" class="w-16 h-16 text-slate-300 mb-4" />
      <p class="text-slate-600">Format de fichier non supporté pour la prévisualisation</p>
      <a
        :href="fileUrl"
        target="_blank"
        download
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
        Télécharger
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Universal Document Viewer Component
 * 
 * Handles different document types:
 * - PDF: Rendered in iframe
 * - Images: Rendered in iframe
 * - DWG/Revit/Navisworks: Shows download options with external viewer links
 */

import type { DocumentType } from '~/types'

const props = defineProps<{
  fileUrl: string
  fileType: DocumentType
  fileName?: string
  documentId?: string
}>()

defineEmits<{
  'create-rfi': [documentId: string]
}>()

// Determine file type categories
const isPdf = computed(() => {
  return props.fileUrl.toLowerCase().endsWith('.pdf') || props.fileType === 'plan'
})

const isImage = computed(() => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  return imageExts.some(ext => props.fileUrl.toLowerCase().endsWith(ext))
})

const isOfficeDoc = computed(() => {
  const officeExts = ['.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt']
  const officeTypes: DocumentType[] = ['excel']
  return officeExts.some(ext => props.fileUrl.toLowerCase().endsWith(ext)) ||
         officeTypes.includes(props.fileType)
})

const isTechnicalFile = computed(() => {
  const techTypes: DocumentType[] = ['dwg', 'revit', 'navisworks']
  return techTypes.includes(props.fileType)
})

// Viewer URLs
const pdfViewerUrl = computed(() => {
  // Use Google Docs viewer as fallback for PDFs that might not render in iframe
  const encodedUrl = encodeURIComponent(props.fileUrl)
  return `https://docs.google.com/gview?embedded=1&url=${encodedUrl}`
})

const officeViewerUrl = computed(() => {
  // Microsoft Office Online Viewer
  const encodedUrl = encodeURIComponent(props.fileUrl)
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
})

const autodeskViewerUrl = computed(() => {
  // Autodesk Viewer with file URL
  const encodedUrl = encodeURIComponent(props.fileUrl)
  return `https://viewer.autodesk.com/design/share?url=${encodedUrl}`
})

const viewerTitle = computed(() => {
  const titles: Record<DocumentType, string> = {
    plan: 'Plan PDF',
    report: 'Rapport',
    contract: 'Contrat',
    excel: 'Excel',
    dwg: 'Fichier AutoCAD (DWG)',
    revit: 'Modèle Revit',
    navisworks: 'Fichier Navisworks'
  }
  return titles[props.fileType] || 'Document'
})

const viewerIcon = computed(() => {
  const icons: Record<DocumentType, string> = {
    plan: 'heroicons:document-text',
    report: 'heroicons:document-chart-bar',
    contract: 'heroicons:document-check',
    excel: 'heroicons:table-cells',
    dwg: 'heroicons:bars-3',
    revit: 'heroicons:cube',
    navisworks: 'heroicons:eye'
  }
  return icons[props.fileType] || 'heroicons:document'
})
</script>

<style scoped>
iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
