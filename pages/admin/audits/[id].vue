<script setup lang="ts">
/**
 * Admin Audit Detail Page
 * 
 * Pending: view form data, upload report, build action plan, then Accept or Reject
 * In Progress: control phase statuses (roadmap)
 * Completed/Rejected: read-only view
 */
import { useAuditsStore } from '~/stores/audits'
import type { ActionPlanItem, ActionPlanStatus } from '~/types'
import { uploadAuditReport } from '~/firebase/services/storage'

definePageMeta({
    layout: 'admin',
    middleware: ['auth']
})

const route = useRoute()
const auditsStore = useAuditsStore()

const auditId = computed(() => route.params.id as string)

// Form state
const reportPdfUrl = ref('')
const reportFile = ref<File | null>(null)
const isUploadingReport = ref(false)
const bimProtocolUrl = ref('')
const bimGuideUrl = ref('')
const actionPlan = ref<ActionPlanItem[]>([])
const isUpdating = ref(false)
const { error, errorRef, setError, clearError } = useFormError()

// New action plan item form
const newItem = ref<ActionPlanItem>({
    phase: '',
    title: '',
    description: '',
    status: 'upcoming'
})

// Track which phase is being updated
const updatingIndex = ref<number | null>(null)

// Status order for forward-only transitions
const statusOrder: Record<string, number> = { upcoming: 0, in_progress: 1, completed: 2 }

// Status options for the segmented control
const statusOptions = [
    { value: 'upcoming', label: 'À venir', color: 'slate' },
    { value: 'in_progress', label: 'En cours', color: 'blue' },
    { value: 'completed', label: 'Terminé', color: 'emerald' }
] as const

// Load audit on mount
onMounted(async () => {
    if (auditId.value) {
        await auditsStore.fetchAudit(auditId.value)
        
        // Initialize form with existing data
        if (auditsStore.currentAudit) {
            reportPdfUrl.value = auditsStore.currentAudit.reportPdfUrl || ''
            bimProtocolUrl.value = auditsStore.currentAudit.bimProtocolUrl || ''
            bimGuideUrl.value = auditsStore.currentAudit.bimGuideUrl || ''
            actionPlan.value = auditsStore.currentAudit.actionPlan ? [...auditsStore.currentAudit.actionPlan] : []
        }
    }
})

// Add action plan item
function addActionItem() {
    if (newItem.value.phase && newItem.value.title && newItem.value.description) {
        actionPlan.value.push({ ...newItem.value })
        newItem.value = {
            phase: '',
            title: '',
            description: '',
            status: 'upcoming'
        }
    }
}

// Remove action plan item
function removeActionItem(index: number) {
    actionPlan.value.splice(index, 1)
}

// Move item up
function moveItemUp(index: number) {
    if (index > 0) {
        const temp = actionPlan.value[index]!
        actionPlan.value[index] = actionPlan.value[index - 1]!
        actionPlan.value[index - 1] = temp
    }
}

// Move item down
function moveItemDown(index: number) {
    if (index < actionPlan.value.length - 1) {
        const temp = actionPlan.value[index]!
        actionPlan.value[index] = actionPlan.value[index + 1]!
        actionPlan.value[index + 1] = temp
    }
}

// Calculate progress
const progress = computed(() => {
    const plan = auditsStore.currentAudit?.actionPlan
    if (!plan || plan.length === 0) return 0
    const completed = plan.filter(item => item.status === 'completed').length
    return Math.round((completed / plan.length) * 100)
})

// Check if a phase is locked (all previous phases must be completed)
function isPhaseLocked(index: number): boolean {
    if (index === 0) return false
    const plan = auditsStore.currentAudit?.actionPlan
    if (!plan) return true
    for (let i = 0; i < index; i++) {
        if (plan[i]?.status !== 'completed') return true
    }
    return false
}

// Check if a status option should be disabled
function isOptionDisabled(index: number, currentStatus: string, targetStatus: string): boolean {
    if (isPhaseLocked(index)) return true
    if (currentStatus === targetStatus) return false
    if ((statusOrder[targetStatus] ?? 0) < (statusOrder[currentStatus] ?? 0)) return true
    if (currentStatus === 'upcoming' && targetStatus === 'completed') return true
    return false
}

// Update phase status
async function handleStatusChange(index: number, newStatus: ActionPlanStatus) {
    if (updatingIndex.value !== null) return
    const currentStatus = auditsStore.currentAudit?.actionPlan[index]?.status
    if (!currentStatus || isOptionDisabled(index, currentStatus, newStatus)) return
    updatingIndex.value = index
    await auditsStore.updatePhaseStatus(auditId.value, index, newStatus)
    updatingIndex.value = null
}

// Handle file selection
function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (!file) return
    
    if (file.type !== 'application/pdf') {
        error.value = 'Le fichier doit être au format PDF'
        return
    }
    
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
        error.value = 'Le fichier ne doit pas dépasser 20 Mo'
        return
    }
    
    reportFile.value = file
    clearError()
    handleUploadReport()
}

// Upload report PDF
async function handleUploadReport() {
    if (!reportFile.value || !auditId.value) return
    
    isUploadingReport.value = true
    error.value = null
    
    try {
        const downloadUrl = await uploadAuditReport(auditId.value, reportFile.value)
        reportPdfUrl.value = downloadUrl
        reportFile.value = null
        
        const fileInput = document.getElementById('report-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
    } catch (err) {
        console.error('Error uploading report:', err)
        error.value = 'Erreur lors de l\'upload du rapport PDF'
    } finally {
        isUploadingReport.value = false
    }
}

// Accept audit (pending -> in_progress): saves report + plan then changes status
async function handleAccept() {
    if (!reportPdfUrl.value.trim()) {
        setError('Veuillez uploader le rapport PDF avant d\'accepter l\'audit')
        return
    }
    if (actionPlan.value.length === 0) {
        setError('Veuillez ajouter au moins une phase au plan d\'action')
        return
    }

    isUpdating.value = true
    error.value = null

    try {
        const success = await auditsStore.updateAudit(auditId.value, {
            status: 'in_progress',
            reportPdfUrl: reportPdfUrl.value.trim(),
            bimProtocolUrl: bimProtocolUrl.value.trim() || null,
            bimGuideUrl: bimGuideUrl.value.trim() || null,
            actionPlan: actionPlan.value
        })

        if (!success && auditsStore.error) {
            error.value = auditsStore.error
        }
    } finally {
        isUpdating.value = false
    }
}

// Complete audit (in_progress -> completed)
async function handleComplete() {
    isUpdating.value = true
    error.value = null

    try {
        const success = await auditsStore.updateAudit(auditId.value, {
            status: 'completed'
        })

        if (success) {
            navigateTo('/admin/audits')
        } else if (auditsStore.error) {
            error.value = auditsStore.error
        }
    } finally {
        isUpdating.value = false
    }
}

// Reject audit
async function handleReject() {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande d\'audit ?')) return

    isUpdating.value = true
    error.value = null

    try {
        const success = await auditsStore.updateAudit(auditId.value, {
            status: 'rejected'
        })

        if (success) {
            navigateTo('/admin/audits')
        } else if (auditsStore.error) {
            error.value = auditsStore.error
        }
    } finally {
        isUpdating.value = false
    }
}

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
        <!-- Back -->
        <NuxtLink 
            to="/admin/audits"
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
        <div v-else-if="auditsStore.error && !auditsStore.currentAudit" class="rounded-xl p-6 bg-red-50 ring-1 ring-red-200/60 text-center">
            <p class="text-red-700 text-sm font-medium mb-1">Erreur de chargement</p>
            <p class="text-red-600 text-sm">{{ auditsStore.error }}</p>
        </div>

        <!-- Not found -->
        <div v-else-if="!auditsStore.currentAudit" class="text-center py-20">
            <p class="text-slate-500 text-sm mb-3">Audit introuvable</p>
            <NuxtLink to="/admin/audits" class="text-sm text-blue-600 hover:underline font-medium">
                Retour à la liste
            </NuxtLink>
        </div>

        <!-- Audit details -->
        <template v-else>
            <!-- Header -->
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-6 sm:p-8 mb-6">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Audit de Maturité BIM</h1>
                        <p class="text-sm text-slate-500 mt-1">
                            {{ (auditsStore.currentAudit as any).enterpriseName || 'Entreprise' }} · 
                            {{ formatDate(auditsStore.currentAudit.createdAt) }}
                        </p>
                    </div>
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

            <!-- Form data submitted -->
            <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-8 mb-6">
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

            <!-- ============= PENDING: Report + Action Plan + Accept/Reject ============= -->
            <div v-if="auditsStore.currentAudit.status === 'pending'" class="space-y-4">
                <!-- Error -->
                <div ref="errorRef" v-if="error" class="rounded-lg p-4 bg-red-50 ring-1 ring-red-200/60">
                    <p class="text-red-700 text-sm">{{ error }}</p>
                </div>

                <!-- Report PDF Upload -->
                <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <h2 class="text-base font-bold text-slate-900 mb-4">Rapport PDF</h2>
                    
                    <!-- Uploaded -->
                    <div v-if="reportPdfUrl" class="p-4 bg-emerald-50 ring-1 ring-emerald-200/60 rounded-lg">
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-emerald-900">Rapport uploadé</p>
                                <a :href="reportPdfUrl" target="_blank" class="text-xs text-emerald-700 hover:underline">
                                    Voir le rapport
                                </a>
                            </div>
                            <button
                                type="button"
                                @click="reportPdfUrl = ''"
                                class="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-xs font-medium"
                            >
                                Remplacer
                            </button>
                        </div>
                    </div>

                    <!-- Upload form -->
                    <div v-else>
                        <input
                            id="report-file-input"
                            type="file"
                            accept=".pdf,application/pdf"
                            @change="handleFileSelect"
                            class="hidden"
                        />
                        <label
                            for="report-file-input"
                            class="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                            :class="{ 'opacity-50 cursor-not-allowed': isUploadingReport }"
                        >
                            <span v-if="isUploadingReport" class="text-sm text-slate-500">Upload en cours...</span>
                            <span v-else class="text-sm text-slate-500">
                                Cliquez pour uploader un fichier PDF
                            </span>
                        </label>
                        <p class="text-xs text-slate-400 mt-2">PDF uniquement, max 20 Mo</p>
                    </div>
                </div>

                <!-- BIM Google Drive Links -->
                <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <h2 class="text-base font-bold text-slate-900 mb-4">Liens BIM (Google Drive)</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1.5">Lien vers Protocoles BIM</label>
                            <input
                                v-model="bimProtocolUrl"
                                type="url"
                                placeholder="https://drive.google.com/..."
                                class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1.5">Lien vers Guide BIM</label>
                            <input
                                v-model="bimGuideUrl"
                                type="url"
                                placeholder="https://drive.google.com/..."
                                class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                    </div>
                </div>

                <!-- Action Plan Builder -->
                <div class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <h2 class="text-base font-bold text-slate-900 mb-4">Plan d'action</h2>

                    <!-- Existing items -->
                    <div v-if="actionPlan.length > 0" class="space-y-2 mb-5">
                        <div 
                            v-for="(item, index) in actionPlan" 
                            :key="index"
                            class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg ring-1 ring-slate-100"
                        >
                            <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {{ index + 1 }}
                            </span>
                            
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-0.5">
                                    <span class="text-xs font-medium text-slate-500">{{ item.phase }}</span>
                                </div>
                                <h3 class="text-sm font-semibold text-slate-900">{{ item.title }}</h3>
                                <p class="text-xs text-slate-600 mt-0.5">{{ item.description }}</p>
                            </div>
                            
                            <div class="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                    type="button"
                                    @click="moveItemUp(index)"
                                    :disabled="index === 0"
                                    class="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                                >
                                    <Icon name="heroicons:chevron-up" class="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    @click="moveItemDown(index)"
                                    :disabled="index === actionPlan.length - 1"
                                    class="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                                >
                                    <Icon name="heroicons:chevron-down" class="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    @click="removeActionItem(index)"
                                    class="p-1 text-slate-400 hover:text-red-500 transition-colors ml-1"
                                >
                                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Add new item form -->
                    <div class="space-y-3 p-4 bg-slate-50 rounded-lg ring-1 ring-slate-100">
                        <p class="text-sm font-medium text-slate-700">Ajouter une phase</p>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                v-model="newItem.phase"
                                type="text"
                                placeholder="Phase (ex: Mois 1-3)"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                                v-model="newItem.title"
                                type="text"
                                placeholder="Titre (ex: Analyse AS IS)"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>

                        <textarea
                            v-model="newItem.description"
                            rows="2"
                            placeholder="Description des objectifs et livrables..."
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                        ></textarea>

                        <button
                            type="button"
                            @click="addActionItem"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Ajouter
                        </button>
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        @click="handleReject"
                        class="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ring-1 ring-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        :disabled="isUpdating"
                    >
                        Rejeter
                    </button>
                    <button
                        type="button"
                        @click="handleAccept"
                        class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        :disabled="isUpdating"
                    >
                        {{ isUpdating ? 'Traitement...' : 'Accepter l\'audit' }}
                    </button>
                </div>
            </div>

            <!-- ============= IN PROGRESS: Phase Status Controls ============= -->
            <div v-else-if="auditsStore.currentAudit.status === 'in_progress'" class="space-y-4">
                <!-- Error -->
                <div ref="errorRef" v-if="error" class="rounded-lg p-4 bg-red-50 ring-1 ring-red-200/60">
                    <p class="text-red-700 text-sm">{{ error }}</p>
                </div>


                <!-- Phase Status Controls (roadmap) -->
                <div v-if="auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" 
                     class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-6">
                        <h2 class="text-lg font-bold text-slate-900">Progression des phases</h2>
                        <span class="text-sm font-semibold tabular-nums" :class="progress === 100 ? 'text-emerald-600' : 'text-blue-600'">{{ progress }}%</span>
                    </div>

                    <div class="relative">
                        <div 
                            v-for="(item, index) in auditsStore.currentAudit.actionPlan" 
                            :key="index"
                            class="relative flex gap-4 sm:gap-5"
                            :class="index < auditsStore.currentAudit.actionPlan.length - 1 ? 'pb-6' : ''"
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
                                                : isPhaseLocked(index)
                                                    ? 'bg-slate-100 text-slate-300 ring-slate-100'
                                                    : 'bg-white text-slate-500 ring-slate-200'
                                    ]"
                                >
                                    <Icon v-if="item.status === 'completed'" name="heroicons:check" class="w-5 h-5" />
                                    <span v-else>{{ index + 1 }}</span>
                                </div>
                                <div 
                                    v-if="index < auditsStore.currentAudit.actionPlan.length - 1"
                                    class="w-0.5 flex-1 mt-2 rounded-full transition-all"
                                    :class="item.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'"
                                ></div>
                            </div>

                            <!-- Content card with status controls -->
                            <div 
                                class="flex-1 rounded-lg transition-all min-w-0"
                                :class="[
                                    item.status === 'in_progress' 
                                        ? 'bg-blue-50 ring-1 ring-blue-200 border-l-[3px] border-l-blue-500 p-4 sm:p-5' 
                                        : item.status === 'completed'
                                            ? 'bg-emerald-50/50 ring-1 ring-emerald-100 p-4 sm:p-5'
                                            : isPhaseLocked(index)
                                                ? 'bg-slate-50/50 p-4 sm:p-5 opacity-50'
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

                                <!-- Status control (only for unlocked phases) -->
                                <div v-if="!isPhaseLocked(index)" class="mt-3 pt-3 border-t"
                                     :class="item.status === 'in_progress' ? 'border-blue-200/60' : item.status === 'completed' ? 'border-emerald-200/60' : 'border-slate-200/60'">
                                    <div class="inline-flex rounded-lg bg-white/80 ring-1 ring-slate-200/60 p-0.5 gap-0.5">
                                        <button
                                            v-for="opt in statusOptions"
                                            :key="opt.value"
                                            type="button"
                                            :disabled="updatingIndex !== null || isOptionDisabled(index, item.status, opt.value)"
                                            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                                            :class="[
                                                item.status === opt.value
                                                    ? opt.color === 'slate'
                                                        ? 'bg-slate-100 text-slate-700 shadow-sm'
                                                        : opt.color === 'blue'
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-emerald-600 text-white shadow-sm'
                                                    : isOptionDisabled(index, item.status, opt.value)
                                                        ? 'text-slate-300 cursor-not-allowed'
                                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            ]"
                                            @click="handleStatusChange(index, opt.value)"
                                        >
                                            {{ opt.label }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============= COMPLETED / REJECTED: Read-only view ============= -->
            <div v-else class="space-y-4">
                <!-- Status banner -->
                <div class="rounded-xl p-5 ring-1" 
                     :class="auditsStore.currentAudit.status === 'completed' ? 'bg-emerald-50 ring-emerald-200/60' : 'bg-red-50 ring-red-200/60'">
                    <p class="text-sm font-medium" :class="auditsStore.currentAudit.status === 'completed' ? 'text-emerald-900' : 'text-red-900'">
                        {{ auditsStore.currentAudit.status === 'completed' ? 'Audit complété' : 'Audit rejeté' }}
                    </p>
                    <p class="text-xs mt-0.5" :class="auditsStore.currentAudit.status === 'completed' ? 'text-emerald-700' : 'text-red-700'">
                        Traité le {{ formatDate(auditsStore.currentAudit.updatedAt) }}
                    </p>
                </div>


                <!-- Progression -->
                <div v-if="auditsStore.currentAudit.status === 'completed' && auditsStore.currentAudit.actionPlan && auditsStore.currentAudit.actionPlan.length > 0" 
                     class="bg-white rounded-xl ring-1 ring-slate-200/80 p-5 sm:p-6">
                    <div class="flex items-end justify-between gap-3 mb-5">
                        <h2 class="text-base font-bold text-slate-900">Progression</h2>
                        <div class="flex items-center gap-2">
                            <div class="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    class="h-full rounded-full transition-all duration-500"
                                    :class="progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'"
                                    :style="{ width: `${progress}%` }"
                                ></div>
                            </div>
                            <span class="text-xs font-semibold tabular-nums" :class="progress === 100 ? 'text-emerald-600' : 'text-blue-600'">{{ progress }}%</span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div 
                            v-for="(item, index) in auditsStore.currentAudit.actionPlan" 
                            :key="index"
                            class="flex items-center gap-3 p-3 rounded-lg ring-1"
                            :class="item.status === 'completed' ? 'ring-emerald-200/60 bg-emerald-50/40' : item.status === 'in_progress' ? 'ring-blue-200/60 bg-blue-50/30' : 'ring-slate-100 bg-slate-50/50'"
                        >
                            <span class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                                  :class="item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">
                                {{ index + 1 }}
                            </span>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-500">{{ item.phase }}</span>
                                    <span class="text-xs font-medium"
                                          :class="item.status === 'completed' ? 'text-emerald-600' : item.status === 'in_progress' ? 'text-blue-600' : 'text-slate-400'">
                                        {{ item.status === 'completed' ? 'Terminé' : item.status === 'in_progress' ? 'En cours' : 'À venir' }}
                                    </span>
                                </div>
                                <p class="text-sm font-medium text-slate-900 truncate">{{ item.title }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
