<script setup lang="ts">
/**
 * Admin Audits List Page
 * 
 * Displays all audit requests from enterprises
 */
import { useAuditsStore } from '~/stores/audits'

definePageMeta({
    layout: 'admin',
    middleware: ['auth']
})

const auditsStore = useAuditsStore()

// Load all audits on mount
onMounted(async () => {
    await auditsStore.fetchAllAudits()
})

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// Status config — clean dot + text
const defaultStatus = { dot: 'bg-amber-400', label: 'En attente', badge: 'bg-amber-50 text-amber-700 ring-amber-200' }

function getStatusConfig(status: string): { dot: string; label: string; badge: string } {
    const configs: Record<string, { dot: string; label: string; badge: string }> = {
        pending: defaultStatus,
        in_progress: {
            dot: 'bg-blue-400',
            label: 'En cours',
            badge: 'bg-blue-50 text-blue-700 ring-blue-200'
        },
        completed: {
            dot: 'bg-emerald-400',
            label: 'Terminé',
            badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        },
        rejected: {
            dot: 'bg-red-400',
            label: 'Rejeté',
            badge: 'bg-red-50 text-red-700 ring-red-200'
        }
    }
    return configs[status] ?? defaultStatus
}

// Calculate progress for an audit
function getProgress(audit: any): number {
    if (!audit.actionPlan || audit.actionPlan.length === 0) return 0
    const completed = audit.actionPlan.filter((item: any) => item.status === 'completed').length
    return Math.round((completed / audit.actionPlan.length) * 100)
}
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-2xl font-bold text-slate-900">Demandes d'audit</h1>
            <p class="text-sm text-slate-500 mt-1">Gérez les demandes d'audit de maturité BIM</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-4">
                <p class="text-2xl font-bold text-slate-900">{{ auditsStore.pendingAudits.length }}</p>
                <p class="text-xs text-amber-600 font-medium mt-0.5">En attente</p>
            </div>
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-4">
                <p class="text-2xl font-bold text-slate-900">{{ auditsStore.inProgressAudits.length }}</p>
                <p class="text-xs text-blue-600 font-medium mt-0.5">En cours</p>
            </div>
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-4">
                <p class="text-2xl font-bold text-slate-900">{{ auditsStore.completedAudits.length }}</p>
                <p class="text-xs text-emerald-600 font-medium mt-0.5">Terminés</p>
            </div>
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-4">
                <p class="text-2xl font-bold text-slate-900">{{ auditsStore.rejectedAudits.length }}</p>
                <p class="text-xs text-red-600 font-medium mt-0.5">Rejetés</p>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="auditsStore.loading" class="state-loading">
            <div class="spinner-lg text-slate-400"></div>
        </div>

        <!-- Error -->
        <div v-else-if="auditsStore.error" class="rounded-xl p-5 bg-red-50 ring-1 ring-red-200/60">
            <p class="text-red-700 text-sm">{{ auditsStore.error }}</p>
        </div>

        <!-- Empty -->
        <div v-else-if="auditsStore.audits.length === 0" class="text-center py-16">
            <p class="text-slate-500 text-sm">Aucune demande d'audit pour le moment.</p>
        </div>

        <!-- Table (desktop) / Cards (mobile) -->
        <div v-else>
            <!-- Desktop table -->
            <div class="hidden md:block bg-white rounded-xl ring-1 ring-slate-200/80 overflow-hidden">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-slate-100">
                            <th class="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Entreprise</th>
                            <th class="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                            <th class="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Statut</th>
                            <th class="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Progression</th>
                            <th class="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <tr 
                            v-for="audit in auditsStore.audits" 
                            :key="audit.id"
                            class="hover:bg-slate-50/50 transition-colors"
                        >
                            <td class="px-5 py-4">
                                <p class="text-sm font-medium text-slate-900">{{ (audit as any).enterpriseName || 'Entreprise' }}</p>
                                <p class="text-xs text-slate-400">{{ audit.formData.sector }}</p>
                            </td>
                            <td class="px-5 py-4 text-sm text-slate-500">
                                {{ formatDate(audit.createdAt) }}
                            </td>
                            <td class="px-5 py-4">
                                <span 
                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset"
                                    :class="getStatusConfig(audit.status).badge"
                                >
                                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusConfig(audit.status).dot"></span>
                                    {{ getStatusConfig(audit.status).label }}
                                </span>
                            </td>
                            <td class="px-5 py-4">
                                <template v-if="(audit.status === 'completed' || audit.status === 'in_progress') && audit.actionPlan && audit.actionPlan.length > 0">
                                    <div class="flex items-center gap-2">
                                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                class="h-full rounded-full transition-all duration-500"
                                                :class="getProgress(audit) === 100 ? 'bg-emerald-500' : 'bg-blue-500'"
                                                :style="{ width: `${getProgress(audit)}%` }"
                                            ></div>
                                        </div>
                                        <span class="text-xs font-medium tabular-nums" :class="getProgress(audit) === 100 ? 'text-emerald-600' : 'text-blue-600'">
                                            {{ getProgress(audit) }}%
                                        </span>
                                    </div>
                                </template>
                                <span v-else class="text-slate-300">—</span>
                            </td>
                            <td class="px-5 py-4 text-right">
                                <NuxtLink 
                                    :to="`/admin/audits/${audit.id}`"
                                    class="inline-flex items-center px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
                                >
                                    {{ audit.status === 'pending' || audit.status === 'in_progress' ? 'Traiter' : 'Voir' }}
                                </NuxtLink>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Mobile cards -->
            <div class="md:hidden space-y-3">
                <NuxtLink 
                    v-for="audit in auditsStore.audits" 
                    :key="audit.id"
                    :to="`/admin/audits/${audit.id}`"
                    class="block bg-white rounded-xl ring-1 ring-slate-200/80 p-4 hover:ring-slate-300 transition-all"
                >
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <p class="text-sm font-medium text-slate-900 truncate">{{ (audit as any).enterpriseName || 'Entreprise' }}</p>
                        <span 
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ring-1 ring-inset flex-shrink-0"
                            :class="getStatusConfig(audit.status).badge"
                        >
                            <span class="w-1.5 h-1.5 rounded-full" :class="getStatusConfig(audit.status).dot"></span>
                            {{ getStatusConfig(audit.status).label }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-xs text-slate-400">{{ formatDate(audit.createdAt) }}</span>
                        <template v-if="(audit.status === 'completed' || audit.status === 'in_progress') && audit.actionPlan && audit.actionPlan.length > 0">
                            <div class="flex items-center gap-2">
                                <div class="w-12 bg-slate-100 rounded-full h-1 overflow-hidden">
                                    <div 
                                        class="h-full rounded-full"
                                        :class="getProgress(audit) === 100 ? 'bg-emerald-500' : 'bg-blue-500'"
                                        :style="{ width: `${getProgress(audit)}%` }"
                                    ></div>
                                </div>
                                <span class="text-[11px] font-medium tabular-nums" :class="getProgress(audit) === 100 ? 'text-emerald-600' : 'text-blue-600'">
                                    {{ getProgress(audit) }}%
                                </span>
                            </div>
                        </template>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
