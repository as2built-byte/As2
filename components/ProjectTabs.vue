<template>
  <div class="project-tabs">
    <!-- Tab Navigation -->
    <div class="border-b border-slate-200 bg-white">
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        <template v-for="tab in tabs" :key="tab.key">
          <!-- Regular tab (clickable) -->
          <button
            v-if="!tab.locked"
            @click="handleTabClick(tab)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            ]"
            :aria-current="activeTab === tab.key ? 'page' : undefined"
          >
            <div class="flex items-center gap-2">
              <Icon :name="tab.icon" class="w-5 h-5" />
              <span>{{ tab.label }}</span>
              <span v-if="tab.count" class="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                {{ tab.count }}
              </span>
            </div>
          </button>
          
          <!-- Locked tab (non-clickable) -->
          <div
            v-else
            @click.prevent.stop="handleTabClick(tab)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 cursor-not-allowed opacity-50',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-400'
            ]"
          >
            <div class="flex items-center gap-2">
              <Icon :name="tab.icon" class="w-5 h-5" />
              <span>{{ tab.label }}</span>
              <span v-if="tab.count" class="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                {{ tab.count }}
              </span>
            </div>
          </div>
        </template>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="bg-slate-50">
      <slot :activeTab="activeTab" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  key: string
  label: string
  icon: string
  count?: number
  disabled?: boolean
  locked?: boolean
}

interface Props {
  tabs: Tab[]
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'documents'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Handle tab click with lock check
function handleTabClick(tab: Tab) {
  if (tab.locked) {
    // Show message for locked tabs
    alert('Cette fonctionnalité est réservée au gestionnaire du projet')
    return
  }
  activeTab.value = tab.key
}

// Set default tab if none provided
onMounted(() => {
  if (!activeTab.value && props.tabs.length > 0) {
    activeTab.value = props.tabs[0].key
  }
})
</script>
