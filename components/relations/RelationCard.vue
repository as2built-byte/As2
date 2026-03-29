<!--
  Relation Card Component
  
  Displays a single relation with navigation and management options
-->

<template>
  <div class="relation-card bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-blue-300 transition-colors">
    <div class="flex items-start justify-between">
      <!-- Relation Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <RelationTypeIcon :type="relation.type" />
          <span class="text-sm font-medium text-slate-800 truncate">
            {{ relation.title }}
          </span>
        </div>
        
        <div class="flex items-center gap-2 text-xs text-slate-600">
          <RelationTypeLabel :relation-type="relation.relationType" />
          <span class="text-slate-400">•</span>
          <span>{{ formatDate(relation.createdAt) }}</span>
        </div>
        
        <div v-if="relation.createdBy" class="text-xs text-slate-500 mt-1">
          Par {{ relation.createdBy }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 ml-2">
        <button
          @click="handleNavigate"
          class="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Voir l'élément"
        >
          <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
        </button>
        
        <button
          v-if="canRemove"
          @click="handleRemove"
          class="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Supprimer la relation"
        >
          <Icon name="heroicons:trash" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Direction Indicator -->
    <div class="flex items-center gap-1 mt-2 text-xs text-slate-500">
      <Icon 
        :name="direction === 'outgoing' ? 'heroicons:arrow-right' : 'heroicons:arrow-left'" 
        class="w-3 h-3" 
      />
      <span>
        {{ direction === 'outgoing' ? 'Référence vers' : 'Référencé par' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RelationSummary } from '~/types'

interface Props {
  relation: RelationSummary
  direction: 'incoming' | 'outgoing'
  canRemove?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canRemove: true
})

const emit = defineEmits<{
  remove: [relationId: string]
  navigate: [relation: RelationSummary]
}>()

// Methods
const handleNavigate = () => {
  emit('navigate', props.relation)
}

const handleRemove = () => {
  if (confirm('Supprimer cette relation ?')) {
    emit('remove', props.relation.id)
  }
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}
</script>

<style scoped>
.relation-card {
  transition: all 0.2s ease;
}

.relation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
