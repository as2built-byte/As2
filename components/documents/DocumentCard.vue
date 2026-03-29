<!--
  Enhanced Document Card Component
  
  Modern card design with preview, relations, and actions
-->

<template>
  <div class="document-card bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200 group">
    <!-- Document Preview -->
    <div class="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      <!-- Document Type Icon -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div :class="typeConfig.bgColor" class="w-16 h-16 rounded-2xl flex items-center justify-center">
          <Icon :name="typeConfig.icon" :class="typeConfig.iconColor" class="w-8 h-8" />
        </div>
      </div>
      
      <!-- Quick Preview Button -->
      <button
        @click="$emit('preview', document)"
        class="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icon name="heroicons:eye" class="w-4 h-4 text-slate-600" />
      </button>
      
      <!-- File Size Badge -->
      <div class="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs text-slate-600">
        {{ formatFileSize(document.fileSize || 0) }}
      </div>
    </div>

    <!-- Document Info -->
    <div class="p-4">
      <!-- Title -->
      <h3 class="font-semibold text-slate-900 truncate mb-1" :title="document.title">
        {{ document.title }}
      </h3>
      
      <!-- Description -->
      <p v-if="document.description" class="text-sm text-slate-600 line-clamp-2 mb-3">
        {{ document.description }}
      </p>

      <!-- Relations -->
      <div v-if="relations.length > 0" class="mb-3">
        <div class="flex items-center gap-1 text-xs text-slate-500 mb-1">
          <Icon name="heroicons:link" class="w-3 h-3" />
          <span>{{ relations.length }} relation(s)</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <div
            v-for="relation in relations.slice(0, 2)"
            :key="relation.id"
            @click="$emit('navigateRelation', relation.id)"
            class="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
          >
            {{ getRelationDisplay(relation) }}
          </div>
          <div
            v-if="relations.length > 2"
            class="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
          >
            +{{ relations.length - 2 }}
          </div>
        </div>
      </div>

      <!-- Metadata -->
      <div class="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>{{ formatDate(document.createdAt) }}</span>
        <span>{{ getSenderName(document.senderId) }}</span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          @click="$emit('preview', document)"
          class="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
        >
          <Icon name="heroicons:eye" class="w-4 h-4" />
          Voir
        </button>
        
        <button
          @click="$emit('edit', document)"
          class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Icon name="heroicons:pencil" class="w-4 h-4" />
        </button>
        
        <button
          @click="$emit('delete', document)"
          class="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <Icon name="heroicons:trash" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument, DocumentType } from '~/types'

interface Props {
  document: ProjectDocument
  relations: any[]
}

const props = defineProps<Props>()

defineEmits<{
  preview: [document: ProjectDocument]
  edit: [document: ProjectDocument]
  delete: [document: ProjectDocument]
  navigateRelation: [relationId: string]
}>()

// Document type configurations
const typeConfig = computed(() => {
  const configs: Record<DocumentType, { icon: string; iconColor: string; bgColor: string }> = {
    plan: {
      icon: 'heroicons:map',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    report: {
      icon: 'heroicons:document-chart-bar',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    contract: {
      icon: 'heroicons:document-check',
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  }
  
  return configs[props.document.type] || configs.plan
})

// Methods
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const getSenderName = (senderId: string): string => {
  // This would need to be implemented based on your user fetching logic
  return 'Utilisateur'
}

const getRelationDisplay = (relation: any): string => {
  const typeLabels: Record<string, string> = {
    document: 'Doc',
    photo: 'Photo',
    problem: 'Problème',
    rfi: 'RFI'
  }
  
  return typeLabels[relation.targetType] || 'Relation'
}
</script>

<style scoped>
.document-card {
  transition: all 0.2s ease;
}

.document-card:hover {
  transform: translateY(-2px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
