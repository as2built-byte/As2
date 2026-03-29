<script setup lang="ts">
/**
 * Plan Badge Component
 *
 * Displays the current subscription plan in the sidebar.
 * Shows plan name with appropriate styling.
 */

import type { SubscriptionPlan } from '~/types'

const props = defineProps<{
    plan: SubscriptionPlan
}>()

const planConfig = computed(() => {
    const configs: Record<SubscriptionPlan, { label: string; color: string; bgColor: string }> = {
        free: {
            label: 'Gratuit',
            color: 'text-slate-600',
            bgColor: 'bg-slate-100'
        },
        bronze: {
            label: 'Bronze',
            color: 'text-amber-700',
            bgColor: 'bg-amber-100'
        },
        silver: {
            label: 'Silver',
            color: 'text-slate-700',
            bgColor: 'bg-slate-200'
        },
        gold: {
            label: 'Gold',
            color: 'text-yellow-800',
            bgColor: 'bg-yellow-100'
        }
    }
    return configs[props.plan]
})
</script>

<template>
    <div
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        :class="[planConfig.bgColor, planConfig.color]"
    >
        <Icon
            v-if="plan === 'free'"
            name="heroicons:sparkles"
            class="w-3.5 h-3.5"
        />
        <Icon
            v-else-if="plan === 'bronze'"
            name="heroicons:shield-check"
            class="w-3.5 h-3.5"
        />
        <Icon
            v-else-if="plan === 'silver'"
            name="heroicons:star"
            class="w-3.5 h-3.5"
        />
        <Icon
            v-else-if="plan === 'gold'"
            name="heroicons:crown"
            class="w-3.5 h-3.5"
        />
        <span>{{ planConfig.label }}</span>
    </div>
</template>
