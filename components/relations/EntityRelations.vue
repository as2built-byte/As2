<!--
  Entity Relations Component
  
  Displays all relations for a specific entity (document, photo, problem, RFI)
  with options to view, create, and manage relationships
-->

<template>
  <div class="entity-relations">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-800">
        Relations ({{ totalRelations }})
      </h3>
      <button
        @click="showCreateModal = true"
        class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-1" />
        Ajouter une relation
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Relations List -->
    <div v-else-if="entityRelations" class="space-y-4">
      <!-- Outgoing Relations -->
      <div v-if="entityRelations.outgoing.length > 0">
        <h4 class="text-sm font-medium text-slate-600 mb-2">Référence vers:</h4>
        <div class="space-y-2">
          <RelationCard
            v-for="relation in entityRelations.outgoing"
            :key="relation.id"
            :relation="relation"
            :direction="'outgoing'"
            @remove="handleRemoveRelation"
          />
        </div>
      </div>

      <!-- Incoming Relations -->
      <div v-if="entityRelations.incoming.length > 0">
        <h4 class="text-sm font-medium text-slate-600 mb-2">Référencé par:</h4>
        <div class="space-y-2">
          <RelationCard
            v-for="relation in entityRelations.incoming"
            :key="relation.id"
            :relation="relation"
            :direction="'incoming'"
            @remove="handleRemoveRelation"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="totalRelations === 0" class="text-center py-8 text-slate-500">
        <Icon name="heroicons:link" class="w-12 h-12 mx-auto mb-2 text-slate-300" />
        <p>Aucune relation pour cet élément</p>
        <p class="text-sm mt-1">Ajoutez des relations pour connecter cet élément à d'autres</p>
      </div>
    </div>

    <!-- Create Relation Modal -->
    <RelationCreateModal
      v-if="showCreateModal"
      :project-id="projectId"
      :source-type="entityType"
      :source-id="entityId"
      @close="showCreateModal = false"
      @created="handleRelationCreated"
    />
  </div>
</template>

<script setup lang="ts">
import type { RelationEntityType, EntityRelations } from '~/types'

interface Props {
  projectId: string
  entityType: RelationEntityType
  entityId: string
}

const props = defineProps<Props>()

// Composables
const relationsComposable = useRelations(props.projectId)

// State
const loading = ref(true)
const entityRelations = ref<EntityRelations | null>(null)
const showCreateModal = ref(false)

// Computed
const totalRelations = computed(() => {
  if (!entityRelations.value) return 0
  return entityRelations.value.outgoing.length + entityRelations.value.incoming.length
})

// Methods
const loadRelations = async () => {
  loading.value = true
  try {
    entityRelations.value = await relationsComposable.getEntityRelations(
      props.entityType,
      props.entityId
    )
  } catch (error) {
    console.error('Error loading entity relations:', error)
  } finally {
    loading.value = false
  }
}

const handleRemoveRelation = async (relationId: string) => {
  try {
    await relationsComposable.removeRelation(relationId)
    await loadRelations() // Reload to update the list
  } catch (error) {
    console.error('Error removing relation:', error)
  }
}

const handleRelationCreated = async () => {
  showCreateModal.value = false
  await loadRelations() // Reload to update the list
}

// Load relations on mount
onMounted(() => {
  loadRelations()
})
</script>

<style scoped>
.entity-relations {
  @apply bg-white rounded-lg border border-slate-200 p-4;
}
</style>
