<script setup lang="ts">
/**
 * Request Audit Page — Modern Multi-Step Wizard
 *
 * A clean stepper form for BIM maturity audit requests
 * with consistent styling matching the rest of the app.
 */
import { useAuditsStore } from '~/stores/audits'
import type { AuditFormData, BimLevel, AuditPriority } from '~/types'
import { createNotification } from '~/services/notificationsClient'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const router = useRouter()
const { user, profile, enterprise, isGerant } = useAuth()

// Redirect members — only gérant can access audits
watch(() => profile.value, (p) => {
    if (p && !isGerant.value) {
        navigateTo('/entreprise')
    }
}, { immediate: true })

const auditsStore = useAuditsStore()

// ── Wizard state ──────────────────────────────────────────────
const currentStep = ref(0)
const steps = [
    { icon: 'heroicons:building-office', label: 'Entreprise', description: 'Informations générales' },
    { icon: 'heroicons:chart-bar', label: 'Performance', description: 'Enjeux et indicateurs' },
    { icon: 'heroicons:cpu-chip', label: 'Ressources', description: 'Compétences & logiciels' },
    { icon: 'heroicons:flag', label: 'Objectifs', description: 'Priorité d\'optimisation' },
]

// ── Form data ─────────────────────────────────────────────────
const formData = ref<AuditFormData>({
    sector: 'promotion',
    employeeCount: 0,
    projectsPerYear: '1',
    delays: '0',
    nonQualityCost: '0',
    technicalStaffCount: 0,
    bimLevel: '0',
    softwares: [],
    priority: [] as ('cost' | 'time' | 'standards')[]
})

const isSubmitting = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

// ── Software options ──────────────────────────────────────────
const availableSoftwares = [
    { id: 'revit', name: 'Autodesk Revit', category: 'Modélisation' },
    { id: 'autocad', name: 'AutoCAD', category: 'CAO 2D/3D' },
    { id: 'navisworks', name: 'Navisworks', category: 'Coordination' },
    { id: 'bim360', name: 'BIM 360', category: 'Collaboration' },
    { id: 'archicad', name: 'ArchiCAD', category: 'Modélisation' },
    { id: 'tekla', name: 'Tekla Structures', category: 'Structure' },
    { id: 'allplan', name: 'Allplan', category: 'Modélisation' },
    { id: 'sketchup', name: 'SketchUp', category: 'Modélisation' },
    { id: 'rhino', name: 'Rhino', category: 'Modélisation' },
    { id: 'solibri', name: 'Solibri', category: 'Contrôle qualité' },
    { id: 'synchro', name: 'Synchro', category: 'Planning 4D' },
    { id: 'trimble', name: 'Trimble Connect', category: 'Collaboration' },
]

// ── Software toggle ───────────────────────────────────────────
function toggleSoftware(name: string) {
    const i = formData.value.softwares.indexOf(name)
    if (i > -1) formData.value.softwares.splice(i, 1)
    else formData.value.softwares.push(name)
}
function isSoftwareSelected(name: string): boolean {
    return formData.value.softwares.includes(name)
}

// ── Priority toggle ───────────────────────────────────────────
function togglePriority(value: 'cost' | 'time' | 'standards') {
    const i = formData.value.priority.indexOf(value)
    if (i > -1) formData.value.priority.splice(i, 1)
    else formData.value.priority.push(value)
}

// ── Validation per step ───────────────────────────────────────
function validateStep(step: number): boolean {
    error.value = null
    if (step === 0) {
        if (formData.value.employeeCount <= 0) {
            error.value = 'Veuillez indiquer le nombre d\'employés'
            return false
        }
    }
    if (step === 2) {
        if (formData.value.technicalStaffCount <= 0) {
            error.value = 'Veuillez indiquer le nombre d\'architectes et ingénieurs'
            return false
        }
    }
    if (step === 3) {
        if (formData.value.priority.length === 0) {
            error.value = 'Veuillez sélectionner au moins un objectif d\'optimisation'
            return false
        }
    }
    return true
}

function nextStep() {
    if (!validateStep(currentStep.value)) return
    if (currentStep.value < steps.length - 1) {
        currentStep.value++
        error.value = null
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}

function prevStep() {
    if (currentStep.value > 0) {
        currentStep.value--
        error.value = null
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}

function goToStep(index: number) {
    if (index <= currentStep.value) {
        currentStep.value = index
        error.value = null
    }
}

// ── Submit ────────────────────────────────────────────────────
async function handleSubmit() {
    if (!user.value?.uid) return
    if (!validateStep(currentStep.value)) return

    isSubmitting.value = true
    error.value = null

    try {
        const auditId = await auditsStore.requestAudit(user.value.uid, {
            formData: formData.value
        })

        if (auditId) {
            await createNotification({
                type: 'audit_request',
                title: 'Nouvelle demande d\'audit',
                message: `${enterprise.value?.companyName || 'Une entreprise'} a demandé un audit de maturité BIM`,
                data: {
                    userId: user.value.uid,
                    userName: `${profile.value?.firstName} ${profile.value?.lastName}`,
                    userRole: 'enterprise',
                    itemType: 'audit',
                    itemId: auditId,
                    itemTitle: 'Audit de Maturité BIM'
                },
                targetRole: 'admin'
            })

            submitted.value = true
            setTimeout(() => router.push('/entreprise/audits'), 2200)
        } else if (auditsStore.error) {
            error.value = auditsStore.error
        }
    } catch (err) {
        error.value = 'Erreur lors de la soumission de la demande'
        console.error('Error submitting audit request:', err)
    } finally {
        isSubmitting.value = false
    }
}

// ── Priority cards config ─────────────────────────────────────
const priorityOptions: { value: AuditPriority; icon: string; title: string; description: string; color: string }[] = [
    {
        value: 'cost',
        icon: 'heroicons:banknotes',
        title: 'Réduction des coûts',
        description: 'Éliminer les erreurs de conception et optimiser les dépenses',
        color: 'text-emerald-600 bg-emerald-50'
    },
    {
        value: 'time',
        icon: 'heroicons:clock',
        title: 'Gains de temps',
        description: 'Accélérer les délais de livraison par une gestion 4D/5D',
        color: 'text-blue-600 bg-blue-50'
    },
    {
        value: 'standards',
        icon: 'heroicons:globe-alt',
        title: 'Standards Internationaux',
        description: 'Se positionner comme acteur moderne et compétitif',
        color: 'text-violet-600 bg-violet-50'
    },
]

// ── BIM level cards config ────────────────────────────────────
const bimLevels: { value: BimLevel; level: string; title: string; description: string; color: string }[] = [
    {
        value: '0',
        level: 'Niveau 0',
        title: 'CAO traditionnelle',
        description: 'Dessin 2D uniquement',
        color: 'text-red-600 bg-red-50 ring-red-200'
    },
    {
        value: '1',
        level: 'Niveau 1',
        title: 'Modélisation 3D isolée',
        description: 'Maquette visuelle sans partage',
        color: 'text-amber-600 bg-amber-50 ring-amber-200'
    },
    {
        value: '2',
        level: 'Niveau 2',
        title: 'BIM Collaboratif',
        description: 'Échange de fichiers, coordination multi-lots',
        color: 'text-emerald-600 bg-emerald-50 ring-emerald-200'
    },
]
</script>

<template>
    <div class="audit-request-page">
        <!-- ═══ Success screen ═══ -->
        <Transition name="fade-up" mode="out-in">
            <div v-if="submitted" class="min-h-[60vh] flex items-center justify-center px-4">
                <div class="text-center space-y-5 animate-in">
                    <div class="mx-auto w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Icon name="heroicons:check" class="w-10 h-10 text-white" />
                    </div>
                    <h2 class="text-2xl font-bold text-slate-900">Demande envoyée !</h2>
                    <p class="text-slate-500 max-w-sm mx-auto text-sm">
                        Notre équipe va analyser votre profil et vous recontactera sous 48h.
                    </p>
                    <div class="flex items-center gap-2 justify-center text-sm text-slate-400">
                        <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        Redirection en cours…
                    </div>
                </div>
            </div>

            <!-- ═══ Wizard ═══ -->
            <div v-else class="max-w-3xl mx-auto pb-12 px-4 sm:px-0">
                <!-- Header -->
                <div class="mb-6 sm:mb-8">
                    <NuxtLink
                        to="/entreprise/audits"
                        class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 sm:mb-5 group"
                    >
                        <Icon name="heroicons:arrow-left" class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span class="text-sm">Retour aux audits</span>
                    </NuxtLink>

                    <div class="flex items-start gap-3 sm:gap-4">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <Icon name="heroicons:clipboard-document-check" class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Audit de Maturité BIM</h1>
                            <p class="text-slate-500 mt-0.5 text-xs sm:text-sm">Remplissez ce formulaire pour obtenir un diagnostic complet et un plan d'action personnalisé.</p>
                        </div>
                    </div>
                </div>

                <!-- Stepper -->
                <div class="mb-6 sm:mb-8">
                    <div class="flex items-center justify-between relative">
                        <!-- Progress bar backdrop -->
                        <div class="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-slate-200 mx-6 sm:mx-10 rounded-full"></div>
                        <div
                            class="absolute top-4 sm:top-5 left-0 h-0.5 bg-blue-600 mx-6 sm:mx-10 rounded-full transition-all duration-500 ease-out"
                            :style="{ width: `${(currentStep / (steps.length - 1)) * 100}%`, maxWidth: 'calc(100% - 3rem)' }"
                        ></div>

                        <button
                            v-for="(step, index) in steps"
                            :key="index"
                            type="button"
                            @click="goToStep(index)"
                            class="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2 group"
                            :class="index <= currentStep ? 'cursor-pointer' : 'cursor-default'"
                        >
                            <div
                                class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300"
                                :class="[
                                    index < currentStep
                                        ? 'bg-blue-600 text-white'
                                        : index === currentStep
                                            ? 'bg-blue-600 text-white shadow-lg scale-110'
                                            : 'bg-white text-slate-400 ring-1 ring-slate-200'
                                ]"
                            >
                                <Icon
                                    v-if="index < currentStep"
                                    name="heroicons:check"
                                    class="w-4 h-4 sm:w-5 sm:h-5"
                                />
                                <Icon
                                    v-else
                                    :name="step.icon"
                                    class="w-4 h-4 sm:w-5 sm:h-5"
                                />
                            </div>
                            <div class="text-center hidden sm:block">
                                <p
                                    class="text-xs font-semibold transition-colors"
                                    :class="index <= currentStep ? 'text-slate-900' : 'text-slate-400'"
                                >
                                    {{ step.label }}
                                </p>
                                <p class="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{{ step.description }}</p>
                            </div>
                            <!-- Mobile label (visible on small screens only) -->
                            <p
                                class="sm:hidden text-[10px] font-medium transition-colors whitespace-nowrap"
                                :class="index <= currentStep ? 'text-slate-700' : 'text-slate-400'"
                            >
                                {{ step.label }}
                            </p>
                        </button>
                    </div>
                </div>

                <!-- Error -->
                <Transition name="fade-up">
                    <div
                        v-if="error"
                        class="flex items-center gap-3 p-3 sm:p-4 mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700"
                    >
                        <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-red-500" />
                        </div>
                        <p class="text-sm font-medium">{{ error }}</p>
                    </div>
                </Transition>

                <!-- Form card -->
                <form @submit.prevent="handleSubmit">
                    <div class="bg-white rounded-xl sm:rounded-2xl ring-1 ring-slate-200/80 shadow-sm overflow-hidden">
                        <!-- ═══ Step 0: Informations générales ═══ -->
                        <div v-show="currentStep === 0" class="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Icon name="heroicons:building-office" class="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 class="text-base sm:text-lg font-bold text-slate-900">Informations générales</h2>
                                    <p class="text-xs text-slate-500">Présentez votre structure</p>
                                </div>
                            </div>

                            <!-- Sector -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Secteur d'activité
                                </label>
                                <div class="relative">
                                    <select
                                        v-model="formData.sector"
                                        class="w-full appearance-none px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer text-sm sm:text-base"
                                    >
                                        <option value="promotion">Promotion immobilière</option>
                                        <option value="bureau_etudes">Bureau d'études</option>
                                        <option value="construction">Entreprise de construction</option>
                                        <option value="other">Autre</option>
                                    </select>
                                    <Icon name="heroicons:chevron-down" class="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <!-- Employee count -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Taille de l'effectif
                                    <span class="text-red-400 ml-0.5">*</span>
                                </label>
                                <input
                                    v-model.number="formData.employeeCount"
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 25"
                                    class="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm sm:text-base"
                                />
                                <p class="text-xs text-slate-400 mt-1.5">Nombre total d'employés dans votre entreprise</p>
                            </div>
                        </div>

                        <!-- ═══ Step 1: Performance ═══ -->
                        <div v-show="currentStep === 1" class="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Icon name="heroicons:chart-bar" class="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h2 class="text-base sm:text-lg font-bold text-slate-900">Enjeux et Performance</h2>
                                    <p class="text-xs text-slate-500">Évaluez votre performance actuelle</p>
                                </div>
                            </div>

                            <!-- Projects per year -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Projets par an
                                </label>
                                <div class="relative">
                                    <select
                                        v-model="formData.projectsPerYear"
                                        class="w-full appearance-none px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer text-sm sm:text-base"
                                    >
                                        <option value="1">Maximum 1</option>
                                        <option value="1_5">De 1 à 5</option>
                                        <option value="5_10">De 5 à 10</option>
                                        <option value="10_50">De 10 à 50</option>
                                        <option value="50_plus">Plus de 50</option>
                                    </select>
                                    <Icon name="heroicons:chevron-down" class="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <!-- Delays -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Retards constatés (moyenne)
                                </label>
                                <div class="relative">
                                    <select
                                        v-model="formData.delays"
                                        class="w-full appearance-none px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer text-sm sm:text-base"
                                    >
                                        <option value="0">Aucun retard</option>
                                        <option value="0_3">Maximum 3 mois</option>
                                        <option value="3_6">De 3 à 6 mois</option>
                                        <option value="6_12">De 6 à 12 mois</option>
                                        <option value="12_18">De 12 à 18 mois</option>
                                        <option value="18_24">De 18 à 24 mois</option>
                                        <option value="24_plus">Plus de 24 mois</option>
                                    </select>
                                    <Icon name="heroicons:chevron-down" class="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <!-- Non-quality cost -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Coûts de non-qualité
                                    <span class="text-slate-400 font-normal ml-1">(% du budget perdu)</span>
                                </label>
                                <div class="relative">
                                    <select
                                        v-model="formData.nonQualityCost"
                                        class="w-full appearance-none px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer text-sm sm:text-base"
                                    >
                                        <option value="0">0%</option>
                                        <option value="0_2">De 0 à 2%</option>
                                        <option value="2_5">De 2 à 5%</option>
                                        <option value="5_10">De 5 à 10%</option>
                                        <option value="10_20">De 10 à 20%</option>
                                        <option value="20_plus">Plus de 20%</option>
                                    </select>
                                    <Icon name="heroicons:chevron-down" class="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <!-- ═══ Step 2: Ressources ═══ -->
                        <div v-show="currentStep === 2" class="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                                    <Icon name="heroicons:cpu-chip" class="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <h2 class="text-base sm:text-lg font-bold text-slate-900">Ressources & Compétences</h2>
                                    <p class="text-xs text-slate-500">Inventaire technique</p>
                                </div>
                            </div>

                            <!-- Technical staff count -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-2">
                                    Effectif technique
                                    <span class="text-red-400 ml-0.5">*</span>
                                </label>
                                <input
                                    v-model.number="formData.technicalStaffCount"
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 8"
                                    class="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm sm:text-base"
                                />
                                <p class="text-xs text-slate-400 mt-1.5">Nombre d'architectes et ingénieurs</p>
                            </div>

                            <!-- BIM Level — Card selection -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-3">
                                    Niveau de maîtrise BIM
                                </label>
                                <div class="space-y-2">
                                    <button
                                        v-for="level in bimLevels"
                                        :key="level.value"
                                        type="button"
                                        @click="formData.bimLevel = level.value"
                                        class="w-full text-left p-3 sm:p-4 rounded-xl ring-1 transition-all duration-200"
                                        :class="formData.bimLevel === level.value
                                            ? `${level.color} ring-2 shadow-sm`
                                            : 'bg-white ring-slate-200 hover:ring-slate-300 hover:shadow-sm'"
                                    >
                                        <div class="flex items-center gap-3">
                                            <div
                                                class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                :class="formData.bimLevel === level.value ? level.color : 'bg-slate-100 text-slate-500'"
                                            >
                                                {{ level.value }}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-semibold" :class="formData.bimLevel === level.value ? '' : 'text-slate-800'">
                                                    {{ level.title }}
                                                </p>
                                                <p class="text-xs mt-0.5" :class="formData.bimLevel === level.value ? 'opacity-70' : 'text-slate-400'">
                                                    {{ level.description }}
                                                </p>
                                            </div>
                                            <div
                                                class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                                :class="formData.bimLevel === level.value
                                                    ? 'border-current'
                                                    : 'border-slate-300'"
                                            >
                                                <div
                                                    v-if="formData.bimLevel === level.value"
                                                    class="w-2.5 h-2.5 rounded-full bg-current"
                                                ></div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <!-- Software grid -->
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">
                                    Logiciels utilisés
                                </label>
                                <p class="text-xs text-slate-400 mb-3">Sélectionnez les logiciels que votre équipe utilise</p>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        v-for="sw in availableSoftwares"
                                        :key="sw.id"
                                        type="button"
                                        @click="toggleSoftware(sw.name)"
                                        class="group relative flex items-center gap-3 p-3 sm:p-3.5 rounded-xl ring-1 transition-all duration-200 text-left"
                                        :class="isSoftwareSelected(sw.name)
                                            ? 'ring-2 ring-blue-400 bg-blue-50'
                                            : 'ring-slate-200 bg-white hover:ring-slate-300 hover:bg-slate-50'"
                                    >
                                        <!-- Checkbox -->
                                        <div
                                            class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                            :class="isSoftwareSelected(sw.name)
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-slate-300 bg-white group-hover:border-blue-400'"
                                        >
                                            <Icon
                                                v-if="isSoftwareSelected(sw.name)"
                                                name="heroicons:check"
                                                class="w-3.5 h-3.5 text-white"
                                            />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p
                                                class="text-sm font-medium leading-tight transition-colors"
                                                :class="isSoftwareSelected(sw.name) ? 'text-blue-800' : 'text-slate-800'"
                                            >
                                                {{ sw.name }}
                                            </p>
                                            <p class="text-[11px] mt-0.5" :class="isSoftwareSelected(sw.name) ? 'text-blue-500' : 'text-slate-400'">
                                                {{ sw.category }}
                                            </p>
                                        </div>
                                    </button>
                                </div>

                                <p v-if="formData.softwares.length > 0" class="mt-3 text-xs text-blue-600 font-medium">
                                    {{ formData.softwares.length }} logiciel{{ formData.softwares.length > 1 ? 's' : '' }} sélectionné{{ formData.softwares.length > 1 ? 's' : '' }}
                                </p>
                            </div>
                        </div>

                        <!-- ═══ Step 3: Objectifs ═══ -->
                        <div v-show="currentStep === 3" class="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Icon name="heroicons:flag" class="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 class="text-base sm:text-lg font-bold text-slate-900">Objectifs d'Optimisation</h2>
                                    <p class="text-xs text-slate-500">Sélectionnez un ou plusieurs objectifs</p>
                                </div>
                            </div>

                            <div class="space-y-2.5">
                                <button
                                    v-for="opt in priorityOptions"
                                    :key="opt.value"
                                    type="button"
                                    @click="togglePriority(opt.value)"
                                    class="w-full text-left rounded-xl p-4 sm:p-5 transition-all duration-200 ring-1"
                                    :class="formData.priority.includes(opt.value)
                                        ? 'ring-2 ring-blue-400 bg-blue-50 shadow-sm'
                                        : 'ring-slate-200 bg-white hover:ring-slate-300 hover:shadow-sm'"
                                >
                                    <div class="flex items-start gap-3 sm:gap-4">
                                        <div
                                            class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                            :class="opt.color"
                                        >
                                            <Icon :name="opt.icon" class="w-5 h-5" />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm sm:text-base font-semibold" :class="formData.priority.includes(opt.value) ? 'text-blue-900' : 'text-slate-800'">
                                                {{ opt.title }}
                                            </p>
                                            <p class="text-xs sm:text-sm mt-0.5" :class="formData.priority.includes(opt.value) ? 'text-blue-600' : 'text-slate-500'">
                                                {{ opt.description }}
                                            </p>
                                        </div>
                                        <div
                                            class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all"
                                            :class="formData.priority.includes(opt.value)
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-slate-300'"
                                        >
                                            <Icon
                                                v-if="formData.priority.includes(opt.value)"
                                                name="heroicons:check"
                                                class="w-3.5 h-3.5 text-white"
                                            />
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <!-- Summary info box -->
                            <div class="flex items-start gap-3 p-3 sm:p-4 bg-blue-50 rounded-xl ring-1 ring-blue-100">
                                <Icon name="heroicons:light-bulb" class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div class="text-sm text-blue-700">
                                    <p class="font-medium mb-0.5">Que se passe-t-il ensuite ?</p>
                                    <p class="text-blue-600/80 text-xs leading-relaxed">
                                        Notre équipe analysera votre profil et vous fournira un diagnostic complet avec un plan d'action personnalisé pour atteindre vos objectifs BIM.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Navigation footer -->
                        <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                                v-if="currentStep > 0"
                                type="button"
                                @click="prevStep"
                                class="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                                <span class="hidden sm:inline">Précédent</span>
                                <span class="sm:hidden">Retour</span>
                            </button>
                            <div v-else></div>

                            <div class="flex items-center gap-2 sm:gap-3">
                                <NuxtLink
                                    to="/entreprise/audits"
                                    class="hidden sm:inline-block px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Annuler
                                </NuxtLink>

                                <button
                                    v-if="currentStep < steps.length - 1"
                                    type="button"
                                    @click="nextStep"
                                    class="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all"
                                >
                                    Suivant
                                    <Icon name="heroicons:arrow-right" class="w-4 h-4" />
                                </button>

                                <button
                                    v-else
                                    type="submit"
                                    :disabled="isSubmitting"
                                    class="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                    <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4" />
                                    Soumettre
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.audit-request-page {
    min-height: 60vh;
}

/* ── Transitions ─── */
.fade-up-enter-active,
.fade-up-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-enter-from {
    opacity: 0;
    transform: translateY(12px);
}
.fade-up-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}

/* ── Success animation ─── */
.animate-in {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* ── Custom select arrow hide ─── */
select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
}
</style>
