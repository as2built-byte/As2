<script setup lang="ts">
/**
 * Formation Card Component
 * 
 * Displays a formation with its info and status
 * Used in catalog and user formations lists
 */

import type { Formation } from '~/types/formation'

interface Props {
    formation: Formation & { 
        status?: 'available' | 'in-progress' | 'completed'
        paymentDate?: Date
    }
    showStatus?: boolean
    linkPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
    showStatus: false,
    linkPrefix: '/expert/formations'
})

// Format price in DZD
function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DA'
}

// Format duration
function formatDuration(hours: number): string {
    return `${hours}h`
}

// Status badge config
const statusConfig = {
    'available': { label: 'Disponible', class: 'bg-emerald-100 text-emerald-700' },
    'in-progress': { label: 'En cours', class: 'bg-amber-100 text-amber-700' },
    'completed': { label: 'Complétée', class: 'bg-blue-100 text-blue-700' }
}
</script>

<template>
    <NuxtLink 
        :to="`${linkPrefix}/${formation.id}`"
        class="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 group"
    >
        <!-- Cover Image -->
        <div class="aspect-video bg-slate-100 relative overflow-hidden">
            <img 
                v-if="formation.coverUrl"
                :src="formation.coverUrl"
                :alt="formation.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div 
                v-else 
                class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
            >
                <Icon name="heroicons:academic-cap" class="w-12 h-12 text-slate-400" />
            </div>
            
            <!-- Status Badge -->
            <div 
                v-if="showStatus && formation.status"
                class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="statusConfig[formation.status].class"
            >
                {{ statusConfig[formation.status].label }}
            </div>
        </div>
        
        <!-- Content -->
        <div class="p-4">
            <h3 class="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                {{ formation.title }}
            </h3>
            
            <p class="mt-2 text-sm text-slate-500 line-clamp-2">
                {{ formation.description }}
            </p>
            
            <!-- Meta -->
            <div class="mt-4 flex items-center justify-between">
                <div class="flex items-center gap-3 text-sm text-slate-500">
                    <span class="flex items-center gap-1">
                        <Icon name="heroicons:clock" class="w-4 h-4" />
                        {{ formatDuration(formation.durationHours) }}
                    </span>
                </div>
                
                <span class="font-bold text-blue-600">
                    {{ formatPrice(formation.price) }}
                </span>
            </div>
        </div>
    </NuxtLink>
</template>
