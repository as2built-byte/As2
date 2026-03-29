<script setup lang="ts">
/**
 * Pack Card Component
 * 
 * Displays a pack with discount badge, formations count, and pricing
 * Used in formations catalog
 */

import type { PackWithDetails } from '~/services/formationsClient'

interface Props {
    pack: PackWithDetails
    linkPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
    linkPrefix: '/expert/packs'
})

// Format price in DZD
function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DA'
}

// Status badge config
const statusConfig = {
    'available': { label: 'Disponible', class: 'bg-emerald-100 text-emerald-700' },
    'in-progress': { label: 'En cours', class: 'bg-amber-100 text-amber-700' },
    'completed': { label: 'Complété', class: 'bg-blue-100 text-blue-700' }
}
</script>

<template>
    <NuxtLink 
        :to="`${linkPrefix}/${pack.id}`"
        class="block bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group relative"
    >
        <!-- Discount Badge -->
        <div 
            v-if="pack.discountPercent > 0"
            class="absolute top-3 left-3 px-3 py-1.5 bg-amber-400 text-amber-900 rounded-full text-sm font-bold shadow-lg z-10"
        >
            -{{ pack.discountPercent }}%
        </div>

        <!-- Status Badge (if not available) -->
        <div 
            v-if="pack.status !== 'available'"
            class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium z-10"
            :class="statusConfig[pack.status].class"
        >
            {{ statusConfig[pack.status].label }}
        </div>

        <!-- Content -->
        <div class="p-6 text-white">
            <!-- Pack Icon -->
            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon name="heroicons:cube" class="w-6 h-6 text-white" />
            </div>

            <!-- Title -->
            <h3 class="text-xl font-bold mb-2">
                {{ pack.title }}
            </h3>

            <!-- Formations count -->
            <p class="text-white/80 text-sm mb-4">
                {{ pack.formations.length }} formation{{ pack.formations.length > 1 ? 's' : '' }} incluse{{ pack.formations.length > 1 ? 's' : '' }}
            </p>

            <!-- Pricing -->
            <div class="flex items-end gap-3">
                <!-- Original Price (crossed out) -->
                <span 
                    v-if="pack.discountPercent > 0"
                    class="text-white/50 line-through text-sm"
                >
                    {{ formatPrice(pack.totalOriginalPrice) }}
                </span>
                
                <!-- Pack Price -->
                <span class="text-2xl font-bold text-amber-300">
                    {{ formatPrice(pack.price) }}
                </span>
            </div>

            <!-- Formations Preview -->
            <div class="mt-4 pt-4 border-t border-white/20">
                <p class="text-xs text-white/60 mb-2">Contient :</p>
                <div class="flex flex-wrap gap-1">
                    <span 
                        v-for="formation in pack.formations.slice(0, 3)" 
                        :key="formation.id"
                        class="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80 truncate max-w-[150px]"
                    >
                        {{ formation.title }}
                    </span>
                    <span 
                        v-if="pack.formations.length > 3"
                        class="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80"
                    >
                        +{{ pack.formations.length - 3 }} autre{{ pack.formations.length - 3 > 1 ? 's' : '' }}
                    </span>
                </div>
            </div>

            <!-- CTA Arrow -->
            <div class="mt-4 flex items-center gap-2 text-sm text-white/80 group-hover:text-white transition-colors">
                <span>Voir le pack</span>
                <Icon name="heroicons:arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    </NuxtLink>
</template>
