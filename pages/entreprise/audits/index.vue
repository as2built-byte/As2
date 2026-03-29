<script setup lang="ts">
/**
 * Enterprise Audits List Page
 * 
 * Displays BIM maturity audits for the enterprise (gérant only)
 */
import { useAuditsStore } from '~/stores/audits'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user, isGerant, profile } = useAuth()
const auditsStore = useAuditsStore()

// Redirect members - only gérant can access audits
watch(() => profile.value, (p) => {
    if (p && !isGerant.value) {
        navigateTo('/entreprise')
    }
}, { immediate: true })

// Load audits on mount
onMounted(async () => {
    if (user.value?.uid) {
        await auditsStore.fetchAudits(user.value.uid)
    }
})

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// Status config — clean, no icons
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
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Audits BIM</h1>
                <p class="text-slate-500 mt-1 text-sm">Suivez vos demandes d'audit de conformité BIM</p>
            </div>
            <NuxtLink 
                v-if="!auditsStore.hasPendingAudit"
                to="/entreprise/audits/request"
                class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors self-start sm:self-auto"
            >
                Demander un audit
            </NuxtLink>
        </div>

        <!-- Pending audit notice -->
        <div v-if="auditsStore.hasPendingAudit" class="mb-6 bg-amber-50 rounded-xl p-5 ring-1 ring-amber-200/60">
            <div class="flex gap-3">
                <div class="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                <div>
                    <p class="font-medium text-amber-900 text-sm">Demande en cours de traitement</p>
                    <p class="text-amber-700 text-xs mt-0.5">Notre équipe analyse votre demande. Vous serez notifié dès qu'elle sera traitée.</p>
                </div>
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

        <!-- Empty state -->
        <div v-else-if="auditsStore.audits.length === 0" class="text-center py-20">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="heroicons:document-magnifying-glass" class="w-7 h-7 text-slate-400" />
            </div>
            <h3 class="text-base font-semibold text-slate-800 mb-1">Aucun audit</h3>
            <p class="text-slate-500 text-sm mb-6">Vous n'avez pas encore demandé d'audit de maturité BIM.</p>
            <NuxtLink 
                to="/entreprise/audits/request"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
                Demander un audit
            </NuxtLink>
        </div>

        <!-- Audits list -->
        <div v-else class="space-y-3">
            <NuxtLink 
                v-for="audit in auditsStore.audits" 
                :key="audit.id"
                :to="`/entreprise/audits/${audit.id}`"
                class="block bg-white rounded-xl ring-1 ring-slate-200/80 p-5 hover:ring-slate-300 hover:shadow-sm transition-all group"
            >
                <!-- Top row: status + date -->
                <div class="flex items-center justify-between gap-3 mb-3">
                    <span 
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset"
                        :class="getStatusConfig(audit.status).badge"
                    >
                        <span class="w-1.5 h-1.5 rounded-full" :class="getStatusConfig(audit.status).dot"></span>
                        {{ getStatusConfig(audit.status).label }}
                    </span>
                    <span class="text-xs text-slate-400">{{ formatDate(audit.createdAt) }}</span>
                </div>
                
                <!-- Title -->
                <h3 class="text-base font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                    Audit de Maturité BIM
                </h3>

                <!-- Bottom row: progress or info -->
                <div class="flex items-center justify-between gap-4 mt-3">
                    <!-- Progress bar for completed audits -->
                    <div v-if="(audit.status === 'completed' || audit.status === 'in_progress') && audit.actionPlan && audit.actionPlan.length > 0" class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-[200px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
                    <div v-else class="flex-1"></div>
                    
                    <!-- Arrow indicator -->
                    <span class="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all">
                        <Icon name="heroicons:chevron-right" class="w-4 h-4" />
                    </span>
                </div>
            </NuxtLink>
        </div>
    </div>
</template>
