<!--
  Relation Type Label Component
  
  Displays a styled label for each relation type
-->

<template>
  <span :class="labelConfig.class" class="relation-type-label">
    {{ labelConfig.label }}
  </span>
</template>

<script setup lang="ts">
import type { RelationType } from '~/types'

interface Props {
  relationType: RelationType
}

const props = defineProps<Props>()

const labelConfig = computed(() => {
  const configs = {
    references: {
      label: 'Référence',
      class: 'bg-blue-100 text-blue-700'
    },
    attached: {
      label: 'Pièce jointe',
      class: 'bg-green-100 text-green-700'
    },
    solved_by: {
      label: 'Résolu par',
      class: 'bg-emerald-100 text-emerald-700'
    },
    question_about: {
      label: 'Question sur',
      class: 'bg-purple-100 text-purple-700'
    },
    follows_up: {
      label: 'Suite à',
      class: 'bg-orange-100 text-orange-700'
    },
    duplicates: {
      label: 'Doublon',
      class: 'bg-red-100 text-red-700'
    },
    relates_to: {
      label: 'Lié à',
      class: 'bg-slate-100 text-slate-700'
    }
  }
  
  return configs[props.relationType] || configs.relates_to
})
</script>

<style scoped>
.relation-type-label {
  @apply px-2 py-0.5 rounded-full text-xs font-medium;
}
</style>
