<script setup lang="ts">
/**
 * Upgrade Message Component
 *
 * Displays a professional upgrade message when a feature is blocked.
 * Includes a link to upgrade the subscription plan.
 */

import type { SubscriptionPlan } from '~/types'

const props = defineProps<{
    feature: string
    currentPlan: SubscriptionPlan
    requiredPlan?: SubscriptionPlan
}>()

const emit = defineEmits<{
    (e: 'upgrade'): void
}>()

const message = computed(() => {
    const targetPlan = props.requiredPlan || getNextPlan(props.currentPlan)
    const planNames: Record<SubscriptionPlan, string> = {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold'
    }
    return `Cette fonctionnalité nécessite le Pack ${planNames[targetPlan]}.`
})

const buttonText = computed(() => {
    const targetPlan = props.requiredPlan || getNextPlan(props.currentPlan)
    const planNames: Record<SubscriptionPlan, string> = {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold'
    }
    return `Passer au ${planNames[targetPlan]}`
})

function getNextPlan(current: SubscriptionPlan): SubscriptionPlan {
    const hierarchy: Record<SubscriptionPlan, SubscriptionPlan | null> = {
        bronze: 'silver',
        silver: 'gold',
        gold: null
    }
    return hierarchy[current] || current
}

function handleUpgrade() {
    emit('upgrade')
}
</script>

<template>
    <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Icon name="heroicons:lock-closed" class="w-6 h-6 text-amber-600" />
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-slate-800 mb-1">
                    Fonctionnalité Premium
                </h3>
                <p class="text-sm text-slate-600 mb-4">
                    {{ message }}
                </p>
                <div class="flex items-center gap-3">
                    <button
                        type="button"
                        @click="handleUpgrade"
                        class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Icon name="heroicons:arrow-up-circle" class="w-4 h-4" />
                        <span>{{ buttonText }}</span>
                    </button>
                    <span class="text-xs text-slate-500">
                        Débloquez toutes les fonctionnalités
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom gradient for premium feel */
.bg-gradient-to-r {
    background: linear-gradient(to right, #fffbeb, #fff7ed);
}
</style>
