<!--
  Document Edit Modal Component
  
  Edit document properties and relations
-->

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <h2 class="text-xl font-semibold text-slate-900">Modifier le document</h2>
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

          <!-- Relations -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Relations existantes
            </label>
            <div class="space-y-2">
              <div
                v-for="relation in existingRelations"
                :key="relation.id"
                class="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:link" class="w-4 h-4 text-slate-600" />
                  <span class="text-sm text-slate-700">{{ relation.targetType }}:{{ relation.targetId }}</span>
                </div>
                <button
                  @click="removeRelation(relation.id)"
                  class="p-1 text-slate-600 hover:text-red-600 transition-colors"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
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
          :disabled="!form.title.trim() || !form.type || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Icon v-if="saving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:check" class="w-4 h-4" />
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDocument, DocumentType } from '~/types'

interface Props {
  document: ProjectDocument
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// State
const saving = ref(false)
const existingRelations = ref<any[]>([])

const form = ref({
  title: '',
  type: '' as DocumentType,
  description: ''
})

// Initialize form
onMounted(() => {
  form.value.title = props.document.title
  form.value.type = props.document.type
  form.value.description = props.document.description || ''
})

// Methods
const removeRelation = async (relationId: string) => {
  if (!confirm('Supprimer cette relation ?')) return
  
  try {
    // This would need to be implemented based on your relations logic
    console.log('Removing relation:', relationId)
    
    // Remove from local state
    existingRelations.value = existingRelations.value.filter((r: any) => r.id !== relationId)
  } catch (error) {
    console.error('Error removing relation:', error)
    alert('Erreur lors de la suppression de la relation')
  }
}

const handleSubmit = async () => {
  if (!form.value.title.trim() || !form.value.type) {
    return
  }
  
  saving.value = true
  
  try {
    // This would need to be implemented based on your update logic
    console.log('Updating document:', {
      id: props.document.id,
      ...form.value
    })
    
    // Simulate update
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    emit('updated')
  } catch (error) {
    console.error('Update error:', error)
    alert('Erreur lors de la mise à jour')
  } finally {
    saving.value = false
  }
}
</script>
