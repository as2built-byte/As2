<!--
  Relation Type Icon Component
  
  Displays the appropriate icon for each entity type
-->

<template>
  <div class="relation-type-icon">
    <Icon 
      :name="iconConfig.icon" 
      :class="iconConfig.class"
      class="w-4 h-4"
    />
  </div>
</template>

<script setup lang="ts">
import type { RelationEntityType } from '~/types'

interface Props {
  type: RelationEntityType
}

const props = defineProps<Props>()

const iconConfig = computed(() => {
  const configs = {
    document: {
      icon: 'heroicons:document-text',
      class: 'text-blue-600'
    },
    photo: {
      icon: 'heroicons:photo',
      class: 'text-green-600'
    },
    problem: {
      icon: 'heroicons:exclamation-triangle',
      class: 'text-red-600'
    },
    rfi: {
      icon: 'heroicons:question-mark-circle',
      class: 'text-purple-600'
    }
  }
  
  return configs[props.type] || configs.document
})
</script>
