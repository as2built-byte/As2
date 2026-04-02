<script setup lang="ts">
/**
 * Storage Limit Bar Component
 * Displays storage usage with progress bar and plan limits
 */

import { PLAN_LIMITS, type SubscriptionPlan } from '~/types'

interface Props {
  plan: SubscriptionPlan
  storageUsed: number
  showDetails?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  compact: false
})

const maxStorage = computed(() => PLAN_LIMITS[props.plan].maxStorage)
const usedStorage = computed(() => props.storageUsed)
const percentage = computed(() => {
  if (maxStorage.value === Infinity) return 0
  return Math.min(100, Math.round((usedStorage.value / maxStorage.value) * 100))
})

const remainingStorage = computed(() => {
  if (maxStorage.value === Infinity) return Infinity
  return Math.max(0, maxStorage.value - usedStorage.value)
})

const statusColor = computed(() => {
  if (percentage.value >= 90) return 'red'
  if (percentage.value >= 75) return 'orange'
  if (percentage.value >= 50) return 'yellow'
  return 'blue'
})

const statusClass = computed(() => {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500'
  }
  return colors[statusColor.value]
})

const barBgClass = computed(() => {
  const colors = {
    red: 'bg-red-100',
    orange: 'bg-orange-100',
    yellow: 'bg-yellow-100',
    blue: 'bg-blue-100'
  }
  return colors[statusColor.value]
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes === Infinity) return '∞'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatPlanName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    free: 'Gratuit',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold'
  }
  return names[plan]
}
</script>

<template>
  <div :class="['storage-limit-bar', { 'compact': compact }]">
    <!-- Header -->
    <div v-if="showDetails && !compact" class="flex justify-between items-center mb-2">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:server" class="w-4 h-4 text-slate-500" />
        <span class="text-sm font-medium text-slate-700">Stockage</span>
        <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
          {{ formatPlanName(plan) }}
        </span>
      </div>
      <span class="text-sm text-slate-600">
        {{ formatBytes(usedStorage) }} / {{ formatBytes(maxStorage) }}
      </span>
    </div>

    <!-- Compact Header -->
    <div v-else-if="compact" class="flex items-center gap-2 mb-1">
      <Icon name="heroicons:server" class="w-3 h-3 text-slate-500" />
      <span class="text-xs text-slate-600">{{ formatBytes(usedStorage) }} / {{ formatBytes(maxStorage) }}</span>
    </div>

    <!-- Progress Bar -->
    <div :class="['h-2 rounded-full overflow-hidden', barBgClass]">
      <div
        :class="['h-full rounded-full transition-all duration-500', statusClass]"
        :style="{ width: `${percentage}%` }"
      />
    </div>

    <!-- Footer Details -->
    <div v-if="showDetails && !compact" class="flex justify-between items-center mt-2 text-xs">
      <span :class="['font-medium', {
        'text-red-600': percentage >= 90,
        'text-orange-600': percentage >= 75 && percentage < 90,
        'text-yellow-600': percentage >= 50 && percentage < 75,
        'text-slate-600': percentage < 50
      }]">
        {{ percentage }}% utilisé
      </span>
      <span v-if="remainingStorage !== Infinity" class="text-slate-500">
        {{ formatBytes(remainingStorage) }} restant
      </span>
      <span v-else class="text-slate-500">
        Stockage illimité
      </span>
    </div>

    <!-- Warning Messages -->
    <div v-if="percentage >= 90 && showDetails && !compact" class="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-red-500" />
        <span class="text-xs text-red-700">
          Stockage presque plein. Passez au pack supérieur pour plus d'espace.
        </span>
      </div>
    </div>

    <div v-else-if="percentage >= 75 && showDetails && !compact" class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:information-circle" class="w-4 h-4 text-orange-500" />
        <span class="text-xs text-orange-700">
          Stockage à {{ percentage }}%. Pensez à libérer de l'espace ou upgrader.
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-limit-bar {
  @apply bg-white rounded-xl border border-slate-200 p-4;
}

.storage-limit-bar.compact {
  @apply p-2 rounded-lg;
}
</style>
