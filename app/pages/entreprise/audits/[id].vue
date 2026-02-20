<script setup lang="ts">
/**
 * Audit Detail Page (Enterprise)
 * 
 * Read-only view: displays audit status, report PDF, and progress
 * Phase control is admin-only
 */
import { useAuditsStore } from '~/stores/audits'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const route = useRoute()
const { profile, isGerant } = useAuth()
const auditsStore = useAuditsStore()

// Redirect members - only gérant can access audits
watch(() => profile.value, (p) => {
    if (p && !isGerant.value) {
        navigateTo('/entreprise')
    }
}, { immediate: true })

const auditId = computed(() => route.params.id as string)

// Load audit on mount
onMounted(async () => {
    if (auditId.value) {
        await auditsStore.fetchAudit(auditId.value)
    }
})

// Calculate progress
const progress = computed(() => {
    if (!auditsStore.currentAudit?.actionPlan || auditsStore.currentAudit.actionPlan.length === 0) {
        return 0
    }
    const completed = auditsStore.currentAudit.actionPlan.filter(item => item.status === 'completed').length
    return Math.round((completed / auditsStore.currentAudit.actionPlan.length) * 100)
})

const completedCount = computed(() => {
    return auditsStore.currentAudit?.actionPlan?.filter(item => item.status === 'completed').length ?? 0
})

const totalCount = computed(() => {
    return auditsStore.currentAudit?.actionPlan?.length ?? 0
})

// Format date
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date)
}

// Get form data labels
function getSectorLabel(sector: string): string {
    const labels: Record<string, string> = {
        promotion: 'Promotion immobilière',
        bureau_etudes: 'Bureau d\'études',
        construction: 'Entreprise de construction',
        other: 'Autre'
    }
    return labels[sector] || sector
}

function getProjectsPerYearLabel(value: string): string {
    const labels: Record<string, string> = {
        '1': 'Maximum 1',
        '1_5': 'De 1 à 5',
        '5_10': 'De 5 à 10',
        '10_50': 'De 10 à 50',
        '50_plus': 'Plus de 50'
    }
    return labels[value] || value
}

function getDelaysLabel(value: string): string {
    const labels: Record<string, string> = {
        '0': 'Aucun retard',
        '0_3': 'Maximum 3 mois',
        '3_6': 'De 3 à 6 mois',
        '6_12': 'De 6 à 12 mois',
        '12_18': 'De 12 à 18 mois',
        '18_24': 'De 18 à 24 mois',
        '24_plus': 'Plus de 24 mois'
    }
    return labels[value] || value
}

function getNonQualityCostLabel(value: string): string {
    const labels: Record<string, string> = {
        '0': '0%',
        '0_2': 'De 0 à 2%',
        '2_5': 'De 2 à 5%',
        '5_10': 'De 5 à 10%',
        '10_20': 'De 10 à 20%',
        '20_plus': 'Plus de 20%'
    }
    return labels[value] || value
}

function getBimLevelLabel(value: string): string {
    const labels: Record<string, string> = {
        '0': 'Niveau 0 — Dessin 2D',
        '1': 'Niveau 1 — Modélisation 3D isolée',
        '2': 'Niveau 2 — BIM Collaboratif'
    }
    return labels[value] || value
}

function getPriorityLabel(value: string): string {
    const labels: Record<string, string> = {
        cost: 'Réduction des coûts',
        time: 'Gains de temps',
        standards: 'Standards Internationaux'
    }
    return labels[value] || value
}
</script>

<template>
    <div class="page-container">
        <!-- Back link -->
        <NuxtLink 
            to="/entreprise/audits"
            class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
            <Icon name="heroicons:arrow-left" class="w-3.5 h-3.5" />
            Retour
        </NuxtLink>

        <!-- Loading -->
        <div v-if="auditsStore.loading" class="flex items-center justify-center py-24">
            <div class="spinner-lg text-slate-400"></div>
        </div>

        <!-- Error -->
        <div v-else-if="auditsStore.error" class="rounded-xl p-6 bg-red-50 ring-1 ring-red-200/60 text-center">
            <p class="text-red-700 text-sm font-medium mb-1">Erreur de chargement</p>
            <p class="text-red-600 text-sm">{{ auditsStore.error }}</p>
        </div>

        <!-- Not found -->
        <div v-else-if="!auditsStore.currentAudit" class="text-center py-20">
            <p class="text-slate-500 text-sm mb-3">Audit introuvable</p>
            <NuxtLink to="/entreprise/audits" class="text-sm text-blue-600 hover:underline font-medium">
                Retour à la liste
            </NuxtLink>
        </div>

        <!-- Audit details -->
        <template v-else>
            <!-- Header card -->
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-6 sm:p-8 mb-6">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Audit de Maturité BIM</h1>
                        <p class="text-sm text-slate-500 mt-1">Demandé le {{ formatDate(auditsStore.currentAudit.createdAt) }}</p>
                    </div>
                    <!-- Status badges -->
                    <span v-if="auditsStore.currentAudit.status === 'completed'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Terminé
                    </span>
                    <span v-else-if="auditsStore.currentAudit.status === 'rejected'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200/60 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        Rejeté
                    </span>
                    <span v-else-if="auditsStore.currentAudit.status === 'in_progress'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200/60 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        En cours
                    </span>
                    <span v-else
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        En attente
                    </span>
                </div>
            </div>

            <!-- === PENDING STATUS === -->
            <div v-if="auditsStore.currentAudit.status === 'pending'" class="rounded-xl p-8 bg-amber-50 ring-1 ring-amber-200/60 text-center mb-6">
                <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <div class="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
                </div>
                <h3 class="text-base font-semibold text-amber-900 mb-1">En cours de traitement</h3>
                <p class="text-sm text-amber-700 max-w-md mx-auto">Notre équipe analyse votre demande et prépare votre audit personnalisé.</p>
            </div>

            <!-- === IN_PROGRESS STATUS === -->
            <div v-else-if="auditsStore.currentAudit.status === 'in_progress'" class="space-y-4 mb-6">
                <div class="rounded-xl p-8 bg-blue-50 ring-1 ring-blue-200/60 text-center">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <Icon name="heroicons:wrench-screwdriver" class="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 class="text-base font-semibold text-blue-900 mb-1">Audit en cours</h3>
                    <p class="text-sm text-blue-700 max-w-md mx-auto">Notre équipe applique le plan d'action. Suivez la progression ci-dessous.</p>
                </div>

                <!-- Report PDF (if already uploaded) -->
                <div v-if="auditsStore.currentAudit.reportPdfUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Rapport d'audit</p>
                            <p class="text-xs text-slate-500 mt-0.5">Diagnostic complet de votre maturité BIM</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.reportPdfUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- BIM Protocol Link -->
                <div v-if="auditsStore.currentAudit.bimProtocolUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Protocoles BIM</p>
                            <p class="text-xs text-slate-500 mt-0.5">Protocoles et standards BIM de votre organisation</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.bimProtocolUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- BIM Guide Link -->
                <div v-if="auditsStore.currentAudit.bimGuideUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Guide BIM</p>
                            <p class="text-xs text-slate-500 mt-0.5">Guide d'implémentation BIM personnalisé</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.bimGuideUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- Progression -->
                <div v-if="auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" 
                     class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                        <div>
                            <h2 class="text-lg font-bold">Progression vers Niveau suivant</h2>
                            <p class="text-sm text-slate-300 mt-1">{{ completedCount }} sur {{ totalCount }} phases terminées</p>
                        </div>
                        <!-- Circular progress -->
                        <div class="flex items-center gap-5">
                            <div class="relative w-20 h-20">
                                <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" stroke="currentColor" stroke-width="6" fill="none" class="text-white/10" />
                                    <circle cx="40" cy="40" r="34" stroke="currentColor" stroke-width="6" fill="none" 
                                            :class="progress === 100 ? 'text-emerald-400' : 'text-blue-400'"
                                            stroke-linecap="round"
                                            :stroke-dasharray="`${progress * 2.136} 213.6`"
                                            class="transition-all duration-700 ease-out" />
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-xl font-bold tabular-nums">{{ progress }}%</span>
                                </div>
                            </div>
                            <div v-if="progress < 100" class="hidden sm:block">
                                <p class="text-xs text-slate-400">Phase actuelle</p>
                                <p class="text-sm font-medium text-white">
                                    {{ auditsStore.currentAudit.actionPlan.find(p => p.status === 'in_progress')?.title || auditsStore.currentAudit.actionPlan.find(p => p.status === 'upcoming')?.title || '—' }}
                                </p>
                            </div>
                            <div v-else class="hidden sm:block">
                                <p class="text-sm font-medium text-emerald-400">Toutes les phases sont terminées !</p>
                            </div>
                        </div>
                    </div>
                    <!-- Mini progress bar -->
                    <div class="mt-5 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                            class="h-full rounded-full transition-all duration-700 ease-out"
                            :class="progress === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-400 to-blue-300'"
                            :style="{ width: `${progress}%` }"
                        ></div>
                    </div>
                </div>

                <!-- Read-only roadmap -->
                <div v-if="auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-8">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">Feuille de route</h2>

                    <div class="relative">
                        <div 
                            v-for="(item, index) in auditsStore.currentAudit.actionPlan" 
                            :key="index"
                            class="relative flex gap-4 sm:gap-5"
                            :class="index < totalCount - 1 ? 'pb-6' : ''"
                        >
                            <!-- Timeline left column -->
                            <div class="flex flex-col items-center flex-shrink-0">
                                <div 
                                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 transition-all"
                                    :class="[
                                        item.status === 'completed' 
                                            ? 'bg-emerald-500 text-white ring-emerald-200' 
                                            : item.status === 'in_progress' 
                                                ? 'bg-blue-500 text-white ring-blue-200 shadow-lg shadow-blue-200/50' 
                                                : 'bg-white text-slate-500 ring-slate-200'
                                    ]"
                                >
                                    <Icon v-if="item.status === 'completed'" name="heroicons:check" class="w-5 h-5" />
                                    <span v-else>{{ index + 1 }}</span>
                                </div>
                                <div 
                                    v-if="index < totalCount - 1"
                                    class="w-0.5 flex-1 mt-2 rounded-full transition-all"
                                    :class="item.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'"
                                ></div>
                            </div>

                            <!-- Content card (read-only) -->
                            <div 
                                class="flex-1 rounded-lg transition-all min-w-0"
                                :class="[
                                    item.status === 'in_progress' 
                                        ? 'bg-blue-50 ring-1 ring-blue-200 border-l-[3px] border-l-blue-500 p-4 sm:p-5' 
                                        : item.status === 'completed'
                                            ? 'bg-emerald-50/50 ring-1 ring-emerald-100 p-4 sm:p-5'
                                            : 'bg-slate-50 ring-1 ring-slate-100 p-4 sm:p-5'
                                ]"
                            >
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <span class="text-[11px] font-semibold uppercase tracking-wider"
                                          :class="item.status === 'in_progress' ? 'text-blue-500' : item.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'">
                                        {{ item.phase }}
                                    </span>
                                    <span v-if="item.status === 'in_progress'" 
                                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white">
                                        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                        En cours
                                    </span>
                                    <span v-else-if="item.status === 'completed'" 
                                          class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                                        Terminé
                                    </span>
                                </div>
                                
                                <h3 class="text-sm font-bold mb-1"
                                    :class="item.status === 'in_progress' ? 'text-slate-900' : item.status === 'completed' ? 'text-slate-700' : 'text-slate-600'">
                                    {{ item.title }}
                                </h3>
                                <p class="text-xs leading-relaxed"
                                   :class="item.status === 'in_progress' ? 'text-slate-600' : 'text-slate-500'">
                                    {{ item.description }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- === REJECTED STATUS === -->
            <div v-else-if="auditsStore.currentAudit.status === 'rejected'" class="rounded-xl p-8 bg-red-50 ring-1 ring-red-200/60 text-center mb-6">
                <h3 class="text-base font-semibold text-red-900 mb-1">Demande rejetée</h3>
                <p class="text-sm text-red-700 max-w-md mx-auto">Votre demande n'a pas pu être traitée. Contactez notre équipe pour plus d'informations.</p>
            </div>

            <!-- === COMPLETED STATUS === -->
            <template v-else-if="auditsStore.currentAudit.status === 'completed'">
                <!-- Report PDF -->
                <div v-if="auditsStore.currentAudit.reportPdfUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6 mb-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Rapport d'audit</p>
                            <p class="text-xs text-slate-500 mt-0.5">Diagnostic complet de votre maturité BIM</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.reportPdfUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- BIM Protocol Link -->
                <div v-if="auditsStore.currentAudit.bimProtocolUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6 mb-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Protocoles BIM</p>
                            <p class="text-xs text-slate-500 mt-0.5">Protocoles et standards BIM de votre organisation</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.bimProtocolUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- BIM Guide Link -->
                <div v-if="auditsStore.currentAudit.bimGuideUrl" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6 mb-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-slate-900 text-sm">Guide BIM</p>
                            <p class="text-xs text-slate-500 mt-0.5">Guide d'implémentation BIM personnalisé</p>
                        </div>
                        <a
                            :href="auditsStore.currentAudit.bimGuideUrl"
                            target="_blank"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            <span class="hidden sm:inline">Télécharger</span>
                        </a>
                    </div>
                </div>

                <!-- Progression -->
                <div v-if="auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" 
                     class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 mb-4 text-white">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                        <div>
                            <h2 class="text-lg font-bold">Progression vers Niveau suivant</h2>
                            <p class="text-sm text-slate-300 mt-1">{{ completedCount }} sur {{ totalCount }} phases terminées</p>
                        </div>
                        <div class="flex items-center gap-5">
                            <div class="relative w-20 h-20">
                                <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" stroke="currentColor" stroke-width="6" fill="none" class="text-white/10" />
                                    <circle cx="40" cy="40" r="34" stroke="currentColor" stroke-width="6" fill="none" 
                                            :class="progress === 100 ? 'text-emerald-400' : 'text-blue-400'"
                                            stroke-linecap="round"
                                            :stroke-dasharray="`${progress * 2.136} 213.6`"
                                            class="transition-all duration-700 ease-out" />
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-xl font-bold tabular-nums">{{ progress }}%</span>
                                </div>
                            </div>
                            <div v-if="progress < 100" class="hidden sm:block">
                                <p class="text-xs text-slate-400">Phase actuelle</p>
                                <p class="text-sm font-medium text-white">
                                    {{ auditsStore.currentAudit.actionPlan.find(p => p.status === 'in_progress')?.title || auditsStore.currentAudit.actionPlan.find(p => p.status === 'upcoming')?.title || '—' }}
                                </p>
                            </div>
                            <div v-else class="hidden sm:block">
                                <p class="text-sm font-medium text-emerald-400">Toutes les phases sont terminées !</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-5 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                            class="h-full rounded-full transition-all duration-700 ease-out"
                            :class="progress === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-400 to-blue-300'"
                            :style="{ width: `${progress}%` }"
                        ></div>
                    </div>
                </div>

                <!-- Read-only roadmap -->
                <div v-if="auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-8 mb-4">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">Feuille de route</h2>

                    <div class="relative">
                        <div 
                            v-for="(item, index) in auditsStore.currentAudit.actionPlan" 
                            :key="index"
                            class="relative flex gap-4 sm:gap-5"
                            :class="index < totalCount - 1 ? 'pb-6' : ''"
                        >
                            <div class="flex flex-col items-center flex-shrink-0">
                                <div 
                                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 transition-all"
                                    :class="[
                                        item.status === 'completed' 
                                            ? 'bg-emerald-500 text-white ring-emerald-200' 
                                            : item.status === 'in_progress' 
                                                ? 'bg-blue-500 text-white ring-blue-200 shadow-lg shadow-blue-200/50' 
                                                : 'bg-white text-slate-500 ring-slate-200'
                                    ]"
                                >
                                    <Icon v-if="item.status === 'completed'" name="heroicons:check" class="w-5 h-5" />
                                    <span v-else>{{ index + 1 }}</span>
                                </div>
                                <div 
                                    v-if="index < totalCount - 1"
                                    class="w-0.5 flex-1 mt-2 rounded-full transition-all"
                                    :class="item.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'"
                                ></div>
                            </div>

                            <div 
                                class="flex-1 rounded-lg transition-all min-w-0"
                                :class="[
                                    item.status === 'in_progress' 
                                        ? 'bg-blue-50 ring-1 ring-blue-200 border-l-[3px] border-l-blue-500 p-4 sm:p-5' 
                                        : item.status === 'completed'
                                            ? 'bg-emerald-50/50 ring-1 ring-emerald-100 p-4 sm:p-5'
                                            : 'bg-slate-50 ring-1 ring-slate-100 p-4 sm:p-5'
                                ]"
                            >
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <span class="text-[11px] font-semibold uppercase tracking-wider"
                                          :class="item.status === 'in_progress' ? 'text-blue-500' : item.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'">
                                        {{ item.phase }}
                                    </span>
                                    <span v-if="item.status === 'in_progress'" 
                                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white">
                                        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                        En cours
                                    </span>
                                    <span v-else-if="item.status === 'completed'" 
                                          class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                                        Terminé
                                    </span>
                                </div>
                                
                                <h3 class="text-sm font-bold mb-1"
                                    :class="item.status === 'in_progress' ? 'text-slate-900' : item.status === 'completed' ? 'text-slate-700' : 'text-slate-600'">
                                    {{ item.title }}
                                </h3>
                                <p class="text-xs leading-relaxed"
                                   :class="item.status === 'in_progress' ? 'text-slate-600' : 'text-slate-500'">
                                    {{ item.description }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Form data submitted -->
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-8">
                <h2 class="text-base font-bold text-slate-900 mb-5">Informations soumises</h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Secteur d'activité</p>
                        <p class="text-sm text-slate-900">{{ getSectorLabel(auditsStore.currentAudit.formData.sector) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Effectif total</p>
                        <p class="text-sm text-slate-900">{{ auditsStore.currentAudit.formData.employeeCount }} employés</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Projets par an</p>
                        <p class="text-sm text-slate-900">{{ getProjectsPerYearLabel(auditsStore.currentAudit.formData.projectsPerYear) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Retards moyens</p>
                        <p class="text-sm text-slate-900">{{ getDelaysLabel(auditsStore.currentAudit.formData.delays) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Coûts de non-qualité</p>
                        <p class="text-sm text-slate-900">{{ getNonQualityCostLabel(auditsStore.currentAudit.formData.nonQualityCost) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Effectif technique</p>
                        <p class="text-sm text-slate-900">{{ auditsStore.currentAudit.formData.technicalStaffCount }} architectes/ingénieurs</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-0.5">Niveau BIM</p>
                        <p class="text-sm text-slate-900">{{ getBimLevelLabel(auditsStore.currentAudit.formData.bimLevel) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-slate-400 mb-1.5">Objectifs d'optimisation</p>
                        <div class="flex flex-wrap gap-1.5">
                            <span
                                v-for="p in (Array.isArray(auditsStore.currentAudit.formData.priority) ? auditsStore.currentAudit.formData.priority : [auditsStore.currentAudit.formData.priority])"
                                :key="p"
                                class="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                            >
                                {{ getPriorityLabel(p) }}
                            </span>
                        </div>
                    </div>
                    <div v-if="auditsStore.currentAudit.formData.softwares.length > 0" class="sm:col-span-2">
                        <p class="text-xs font-medium text-slate-400 mb-1.5">Logiciels utilisés</p>
                        <div class="flex flex-wrap gap-1.5">
                            <span
                                v-for="software in auditsStore.currentAudit.formData.softwares"
                                :key="software"
                                class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                            >
                                {{ software }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
