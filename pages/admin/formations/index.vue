<script setup lang="ts">
/**
 * Admin Formations Management
 * 
 * CRUD interface for formations and packs with tabs, modals, and responsive design
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { storeToRefs } from 'pinia'
import { useFormationsStore } from '~/stores/formations'
import type { Formation, Pack, CreateFormationData, CreatePackData } from '~/types'

const formationsStore = useFormationsStore()
const {
    formations,
    packs,
    filteredFormations,
    activeFormations,
    packsWithStatus,
    formationsLoading,
    packsLoading,
    activeTab,
    statusFilter,
    error
} = storeToRefs(formationsStore)

// Fetch data on mount
onMounted(async () => {
    formationsStore.clearError()
    await formationsStore.fetchAll()
})

// ========================================
// Modal State
// ========================================

const showFormationModal = ref(false)
const showPackModal = ref(false)
const showDeleteModal = ref(false)
const editingFormation = ref<Formation | null>(null)
const editingPack = ref<Pack | null>(null)
const deleteTarget = ref<{ type: 'formation' | 'pack'; id: string; title: string } | null>(null)

// Form states (local, not from store)
const isSubmitting = ref(false)
const formationForm = ref<{
    title: string
    description: string
    durationHours: number
    price: number
    isActive: boolean
    coverFile: File | null
}>({
    title: '',
    description: '',
    durationHours: 14,
    price: 0,
    isActive: true,
    coverFile: null,
})

const packForm = ref<{
    title: string
    formationIds: string[]
    price: number
}>({
    title: '',
    formationIds: [],
    price: 0,
})

// ========================================
// Formation Actions
// ========================================

function openAddFormation() {
    editingFormation.value = null
    formationForm.value = {
        title: '',
        description: '',
        durationHours: 14,
        price: 0,
        isActive: true,
        coverFile: null,
    }
    showFormationModal.value = true
}

function openEditFormation(formation: Formation) {
    editingFormation.value = formation
    formationForm.value = {
        title: formation.title,
        description: formation.description,
        durationHours: formation.durationHours,
        price: formation.price,
        isActive: formation.isActive,
        coverFile: null,
    }
    showFormationModal.value = true
}

async function saveFormation() {
    isSubmitting.value = true
    try {
        const data: CreateFormationData = {
            title: formationForm.value.title,
            description: formationForm.value.description,
            durationHours: formationForm.value.durationHours,
            price: formationForm.value.price,
            isActive: formationForm.value.isActive,
        }

        let success: boolean
        if (editingFormation.value) {
            success = await formationsStore.editFormation(
                editingFormation.value.id,
                data,
                formationForm.value.coverFile
            )
        } else {
            success = await formationsStore.addFormation(data, formationForm.value.coverFile)
        }

        if (success) {
            showFormationModal.value = false
        }
    } finally {
        isSubmitting.value = false
    }
}

function handleCoverUpload(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
        formationForm.value.coverFile = target.files[0]
    }
}

// ========================================
// Pack Actions
// ========================================

function openAddPack() {
    editingPack.value = null
    packForm.value = {
        title: '',
        formationIds: [],
        price: 0,
    }
    showPackModal.value = true
}

function openEditPack(pack: Pack) {
    editingPack.value = pack
    packForm.value = {
        title: pack.title,
        formationIds: [...pack.formationIds],
        price: pack.price,
    }
    showPackModal.value = true
}

async function savePack() {
    isSubmitting.value = true
    try {
        const data: CreatePackData = {
            title: packForm.value.title,
            formationIds: packForm.value.formationIds,
            price: packForm.value.price,
        }

        let success: boolean
        if (editingPack.value) {
            success = await formationsStore.editPack(editingPack.value.id, data)
        } else {
            success = await formationsStore.addPack(data)
        }

        if (success) {
            showPackModal.value = false
        }
    } finally {
        isSubmitting.value = false
    }
}

function toggleFormationInPack(formationId: string) {
    const index = packForm.value.formationIds.indexOf(formationId)
    if (index > -1) {
        packForm.value.formationIds.splice(index, 1)
    } else {
        packForm.value.formationIds.push(formationId)
    }
}

// ========================================
// Delete Actions
// ========================================

function confirmDelete(type: 'formation' | 'pack', id: string, title: string) {
    deleteTarget.value = { type, id, title }
    showDeleteModal.value = true
}

async function executeDelete() {
    if (!deleteTarget.value) return

    isSubmitting.value = true
    try {
        let success: boolean
        if (deleteTarget.value.type === 'formation') {
            success = await formationsStore.removeFormation(deleteTarget.value.id)
        } else {
            success = await formationsStore.removePack(deleteTarget.value.id)
        }

        if (success) {
            showDeleteModal.value = false
            deleteTarget.value = null
        }
    } finally {
        isSubmitting.value = false
    }
}

// ========================================
// Helpers
// ========================================

function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DZD'
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

function getFormationTitles(formationIds: string[]): string {
    return formationIds
        .map(id => formations.value.find(f => f.id === id)?.title || 'Formation supprimée')
        .join(', ')
}

// Get packs that will be affected when deleting a formation
const affectedPacks = computed(() => {
    if (!deleteTarget.value || deleteTarget.value.type !== 'formation') {
        return []
    }
    return formationsStore.getPacksContainingFormation(deleteTarget.value.id)
})

// Preview URL for cover image (shows selected file or existing cover)
const coverPreviewUrl = computed(() => {
    // If a new file is selected, create a preview URL
    if (formationForm.value.coverFile) {
        return URL.createObjectURL(formationForm.value.coverFile)
    }
    // Otherwise show existing cover if editing
    if (editingFormation.value?.coverUrl) {
        return editingFormation.value.coverUrl
    }
    return null
})

// Calculate total price of selected formations in pack
const formationsTotalPrice = computed(() => {
    return packForm.value.formationIds.reduce((total, formationId) => {
        const formation = formations.value.find(f => f.id === formationId)
        return total + (formation?.price || 0)
    }, 0)
})

// Calculate discount percentage
const packDiscount = computed(() => {
    if (formationsTotalPrice.value === 0 || packForm.value.price >= formationsTotalPrice.value) {
        return 0
    }
    return Math.round((1 - packForm.value.price / formationsTotalPrice.value) * 100)
})
</script>

<template>
    <div>
        <!-- Page Header -->
        <div class="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="page-title">Formations & Packs</h1>
                <p class="page-subtitle">Gérer les formations et les packs de certification</p>
            </div>
            <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                @click="activeTab === 'formations' ? openAddFormation() : openAddPack()"
            >
                <Icon name="heroicons:plus" class="w-5 h-5" />
                {{ activeTab === 'formations' ? 'Ajouter Formation' : 'Ajouter Pack' }}
            </button>
        </div>

        <!-- Tabs & Filters -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                <!-- Tabs -->
                <div>
                    <label class="block text-xs font-medium text-slate-500 mb-2">Type</label>
                    <div class="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                        <button 
                            type="button"
                            class="px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2"
                            :class="activeTab === 'formations' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="formationsStore.setActiveTab('formations')"
                        >
                            <Icon name="heroicons:academic-cap" class="w-4 h-4" />
                            Formations
                            <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                                {{ formations.length }}
                            </span>
                        </button>
                        <button 
                            type="button"
                            class="px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2"
                            :class="activeTab === 'packs' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="formationsStore.setActiveTab('packs')"
                        >
                            <Icon name="heroicons:rectangle-stack" class="w-4 h-4" />
                            Packs
                            <span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                                {{ packs.length }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Status Filter (formations only) -->
                <div v-if="activeTab === 'formations'">
                    <label class="block text-xs font-medium text-slate-500 mb-2">Statut</label>
                    <div class="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
                            :class="statusFilter === 'all' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="formationsStore.setStatusFilter('all')"
                        >
                            Tous
                        </button>
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                            :class="statusFilter === 'active' 
                                ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="formationsStore.setStatusFilter('active')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Actives
                        </button>
                        <button 
                            type="button"
                            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                            :class="statusFilter === 'inactive' 
                                ? 'bg-slate-200 text-slate-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'"
                            @click="formationsStore.setStatusFilter('inactive')"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactives
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert-error fade-in mb-6">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ error }}</span>
        </div>

        <!-- Loading -->
        <div v-if="formationsLoading || packsLoading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Formations Tab -->
        <div v-else-if="activeTab === 'formations'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div v-if="filteredFormations.length === 0" class="py-16 text-center">
                <Icon name="heroicons:academic-cap" class="w-12 h-12 text-slate-300 mx-auto" />
                <p class="text-slate-500 mt-3">Aucune formation trouvée</p>
                <button
                    type="button"
                    class="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    @click="openAddFormation"
                >
                    Créer votre première formation
                </button>
            </div>

            <!-- Desktop Table -->
            <table v-else class="w-full hidden md:table">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Formation</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Durée</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prix</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="formation in filteredFormations" :key="formation.id" class="hover:bg-slate-50">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <!-- Cover Image -->
                                <div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img 
                                        v-if="formation.coverUrl" 
                                        :src="formation.coverUrl" 
                                        :alt="formation.title"
                                        class="w-full h-full object-cover"
                                    />
                                    <Icon v-else name="heroicons:photo" class="w-6 h-6 text-slate-400" />
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="font-medium text-slate-800 truncate">{{ formation.title }}</p>
                                    <p class="text-xs text-slate-500 line-clamp-2 max-w-md">{{ formation.description }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span class="text-sm text-slate-600">{{ formation.durationHours }}h</span>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">
                            <span class="text-sm font-medium text-slate-800">{{ formatPrice(formation.price) }}</span>
                        </td>
                        <td class="px-4 py-3">
                            <span 
                                class="text-xs px-2 py-1 rounded font-medium"
                                :class="formation.isActive 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-slate-100 text-slate-500'"
                            >
                                {{ formation.isActive ? 'Active' : 'Inactive' }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-1">
                                <NuxtLink 
                                    :to="`/admin/formations/${formation.id}`"
                                    class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Voir détails"
                                >
                                    <Icon name="heroicons:eye" class="w-4 h-4" />
                                </NuxtLink>
                                <button 
                                    type="button"
                                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Modifier"
                                    @click="openEditFormation(formation)"
                                >
                                    <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Supprimer"
                                    @click="confirmDelete('formation', formation.id, formation.title)"
                                >
                                    <Icon name="heroicons:trash" class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Mobile Cards -->
            <div class="md:hidden divide-y divide-slate-100">
                <div v-for="formation in filteredFormations" :key="formation.id" class="p-4">
                    <div class="flex items-start gap-3">
                        <div class="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img 
                                v-if="formation.coverUrl" 
                                :src="formation.coverUrl" 
                                :alt="formation.title"
                                class="w-full h-full object-cover"
                            />
                            <Icon v-else name="heroicons:photo" class="w-6 h-6 text-slate-400" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-medium text-slate-800">{{ formation.title }}</p>
                                <span 
                                    class="text-xs px-1.5 py-0.5 rounded font-medium"
                                    :class="formation.isActive 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-slate-100 text-slate-500'"
                                >
                                    {{ formation.isActive ? 'Active' : 'Inactive' }}
                                </span>
                            </div>
                            <p class="text-sm text-slate-500 mt-1 line-clamp-2">{{ formation.description }}</p>
                            <div class="flex items-center gap-4 mt-2 text-sm">
                                <span class="text-slate-600">{{ formation.durationHours }}h</span>
                                <span class="font-medium text-slate-800">{{ formatPrice(formation.price) }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <NuxtLink 
                                :to="`/admin/formations/${formation.id}`"
                                class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                <Icon name="heroicons:eye" class="w-5 h-5" />
                            </NuxtLink>
                            <button 
                                type="button"
                                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                @click="openEditFormation(formation)"
                            >
                                <Icon name="heroicons:pencil-square" class="w-5 h-5" />
                            </button>
                            <button 
                                type="button"
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                @click="confirmDelete('formation', formation.id, formation.title)"
                            >
                                <Icon name="heroicons:trash" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Packs Tab -->
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div v-if="packs.length === 0" class="py-16 text-center">
                <Icon name="heroicons:rectangle-stack" class="w-12 h-12 text-slate-300 mx-auto" />
                <p class="text-slate-500 mt-3">Aucun pack trouvé</p>
                <button
                    type="button"
                    class="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    @click="openAddPack"
                >
                    Créer votre premier pack
                </button>
            </div>

            <!-- Desktop Table -->
            <table v-else class="w-full hidden md:table">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pack</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Formations</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prix</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="pack in packsWithStatus" :key="pack.id" class="hover:bg-slate-50">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <Icon name="heroicons:rectangle-stack" class="w-5 h-5 text-violet-600" />
                                </div>
                                <span class="font-medium text-slate-800">{{ pack.title }}</span>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-1">
                                <span class="text-sm text-slate-600">{{ pack.formationIds.length }} formation(s)</span>
                                <span 
                                    v-if="pack.formationIds.length > 0" 
                                    class="text-xs text-slate-400 truncate max-w-[200px]"
                                    :title="getFormationTitles(pack.formationIds)"
                                >
                                    ({{ getFormationTitles(pack.formationIds) }})
                                </span>
                            </div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">
                            <span class="text-sm font-medium text-slate-800">{{ formatPrice(pack.price) }}</span>
                        </td>
                        <td class="px-4 py-3">
                            <span 
                                class="text-xs px-2 py-1 rounded font-medium"
                                :class="pack.isActive 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-amber-100 text-amber-700'"
                                :title="!pack.isActive ? 'Une ou plusieurs formations sont inactives' : ''"
                            >
                                {{ pack.isActive ? 'Actif' : 'Inactif' }}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <span class="text-sm text-slate-400">{{ formatDate(pack.createdAt) }}</span>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-1">
                                <button 
                                    type="button"
                                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Modifier"
                                    @click="openEditPack(pack)"
                                >
                                    <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Supprimer"
                                    @click="confirmDelete('pack', pack.id, pack.title)"
                                >
                                    <Icon name="heroicons:trash" class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Mobile Cards -->
            <div class="md:hidden divide-y divide-slate-100">
                <div v-for="pack in packsWithStatus" :key="pack.id" class="p-4">
                    <div class="flex items-start gap-3">
                        <div class="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <Icon name="heroicons:rectangle-stack" class="w-6 h-6 text-violet-600" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-medium text-slate-800">{{ pack.title }}</p>
                                <span 
                                    class="text-xs px-1.5 py-0.5 rounded font-medium"
                                    :class="pack.isActive 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-amber-100 text-amber-700'"
                                >
                                    {{ pack.isActive ? 'Actif' : 'Inactif' }}
                                </span>
                            </div>
                            <p class="text-sm text-slate-500 mt-1">{{ pack.formationIds.length }} formation(s)</p>
                            <div class="flex items-center gap-4 mt-2 text-sm">
                                <span class="font-medium text-slate-800">{{ formatPrice(pack.price) }}</span>
                                <span class="text-slate-400">{{ formatDate(pack.createdAt) }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button 
                                type="button"
                                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                @click="openEditPack(pack)"
                            >
                                <Icon name="heroicons:pencil-square" class="w-5 h-5" />
                            </button>
                            <button 
                                type="button"
                                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                @click="confirmDelete('pack', pack.id, pack.title)"
                            >
                                <Icon name="heroicons:trash" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========================================
             Formation Modal
        ======================================== -->
        <Teleport to="body">
            <div 
                v-if="showFormationModal" 
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                @click.self="showFormationModal = false"
            >
                <div class="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-slate-200">
                        <h2 class="text-xl font-bold text-slate-800">
                            {{ editingFormation ? 'Modifier la formation' : 'Nouvelle formation' }}
                        </h2>
                    </div>

                    <form class="p-6 space-y-4" @submit.prevent="saveFormation">
                        <!-- Title -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                            <input 
                                v-model="formationForm.title"
                                type="text"
                                required
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="BIM Architecture – Fondamentaux"
                            />
                        </div>

                        <!-- Description -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                            <textarea 
                                v-model="formationForm.description"
                                required
                                rows="3"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Apprendre les bases du BIM et Revit"
                            ></textarea>
                        </div>

                        <!-- Duration & Price -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Durée (heures) *</label>
                                <input 
                                    v-model.number="formationForm.durationHours"
                                    type="number"
                                    required
                                    min="1"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Prix (DZD) *</label>
                                <input 
                                    v-model.number="formationForm.price"
                                    type="number"
                                    required
                                    min="0"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <!-- Cover Image -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Image de couverture</label>
                            
                            <!-- Image Preview Box -->
                            <div class="relative w-full h-40 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 transition-colors" :class="coverPreviewUrl ? 'border-blue-300' : 'border-dashed border-slate-300'">
                                <img 
                                    v-if="coverPreviewUrl" 
                                    :src="coverPreviewUrl" 
                                    class="w-full h-full object-cover"
                                />
                                <div v-else class="text-center">
                                    <Icon name="heroicons:photo" class="w-12 h-12 text-slate-300 mx-auto" />
                                    <p class="text-sm text-slate-400 mt-2">Aucune image sélectionnée</p>
                                </div>
                                
                                <!-- Upload Button Overlay -->
                                <label class="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 hover:bg-white text-sm font-medium text-blue-600 rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5">
                                    <Icon name="heroicons:arrow-up-tray" class="w-4 h-4" />
                                    {{ coverPreviewUrl ? 'Changer' : 'Choisir' }}
                                    <input 
                                        type="file"
                                        accept="image/*"
                                        class="sr-only"
                                        @change="handleCoverUpload"
                                    />
                                </label>
                            </div>
                            
                            <!-- File Info -->
                            <div class="mt-2 flex items-center justify-between">
                                <p class="text-xs text-slate-400">JPG, PNG ou WebP. Max 5MB</p>
                                <p v-if="formationForm.coverFile" class="text-xs text-emerald-600 flex items-center gap-1">
                                    <Icon name="heroicons:check-circle-solid" class="w-3.5 h-3.5" />
                                    {{ formationForm.coverFile.name }}
                                </p>
                            </div>
                        </div>

                        <!-- Active Status -->
                        <div class="flex items-center gap-3">
                            <input 
                                id="isActive"
                                v-model="formationForm.isActive"
                                type="checkbox"
                                class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label for="isActive" class="text-sm text-slate-700">Formation active (visible pour les utilisateurs)</label>
                        </div>

                        <!-- Actions -->
                        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button 
                                type="button"
                                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="showFormationModal = false"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit"
                                :disabled="isSubmitting"
                                class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <span v-if="isSubmitting">Enregistrement...</span>
                                <span v-else>{{ editingFormation ? 'Mettre à jour' : 'Créer' }}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- ========================================
             Pack Modal
        ======================================== -->
        <Teleport to="body">
            <div 
                v-if="showPackModal" 
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                @click.self="showPackModal = false"
            >
                <div class="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-slate-200">
                        <h2 class="text-xl font-bold text-slate-800">
                            {{ editingPack ? 'Modifier le pack' : 'Nouveau pack' }}
                        </h2>
                    </div>

                    <form class="p-6 space-y-4" @submit.prevent="savePack">
                        <!-- Title -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                            <input 
                                v-model="packForm.title"
                                type="text"
                                required
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Pack BIM Complet"
                            />
                        </div>

                        <!-- Price with Summary -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Prix du pack (DZD) *</label>
                            
                            <!-- Formations Total Summary -->
                            <div v-if="packForm.formationIds.length > 0" class="mb-3 p-3 bg-slate-50 rounded-lg">
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-600">Somme des formations:</span>
                                    <span class="font-semibold text-slate-800">{{ formatPrice(formationsTotalPrice) }}</span>
                                </div>
                                <div v-if="packDiscount > 0" class="flex justify-between text-sm mt-1">
                                    <span class="text-emerald-600">Réduction appliquée:</span>
                                    <span class="font-semibold text-emerald-600">-{{ packDiscount }}%</span>
                                </div>
                            </div>
                            
                            <input 
                                v-model.number="packForm.price"
                                type="number"
                                required
                                min="0"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                :placeholder="formationsTotalPrice > 0 ? `Prix conseillé: ${formationsTotalPrice} DZD` : ''"
                            />
                            <p v-if="packForm.formationIds.length > 0 && packForm.price > 0" class="text-xs text-slate-400 mt-1">
                                <span v-if="packForm.price < formationsTotalPrice">
                                    Économie de {{ formatPrice(formationsTotalPrice - packForm.price) }} pour le client
                                </span>
                                <span v-else-if="packForm.price === formationsTotalPrice">
                                    Aucune réduction appliquée
                                </span>
                                <span v-else class="text-amber-600">
                                    Le prix du pack est supérieur à la somme des formations
                                </span>
                            </p>
                        </div>

                        <!-- Formation Selection -->
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">
                                Formations incluses ({{ packForm.formationIds.length }} sélectionnée(s))
                            </label>
                            <div class="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                                <div v-if="activeFormations.length === 0" class="p-4 text-center text-slate-500">
                                    Aucune formation active disponible
                                </div>
                                <div 
                                    v-for="formation in activeFormations" 
                                    :key="formation.id"
                                    class="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                                    @click="toggleFormationInPack(formation.id)"
                                >
                                    <input 
                                        type="checkbox"
                                        :checked="packForm.formationIds.includes(formation.id)"
                                        class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        @click.stop
                                        @change="toggleFormationInPack(formation.id)"
                                    />
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium text-slate-800 truncate">{{ formation.title }}</p>
                                        <p class="text-xs text-slate-400">{{ formation.durationHours }}h • {{ formatPrice(formation.price) }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button 
                                type="button"
                                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="showPackModal = false"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit"
                                :disabled="isSubmitting"
                                class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <span v-if="isSubmitting">Enregistrement...</span>
                                <span v-else>{{ editingPack ? 'Mettre à jour' : 'Créer' }}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- ========================================
             Delete Confirmation Modal
        ======================================== -->
        <Teleport to="body">
            <div 
                v-if="showDeleteModal" 
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                @click.self="showDeleteModal = false"
            >
                <div class="bg-white rounded-2xl w-full max-w-md">
                    <div class="p-6 text-center">
                        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Icon name="heroicons:trash" class="w-8 h-8 text-red-600" />
                        </div>
                        <h2 class="text-xl font-bold text-slate-800">Confirmer la suppression</h2>
                        <p class="text-slate-500 mt-2">
                            Êtes-vous sûr de vouloir supprimer 
                            <strong class="text-slate-800">{{ deleteTarget?.title }}</strong> ?
                            Cette action est irréversible.
                        </p>
                        <!-- Warning for formations that are in packs -->
                        <div 
                            v-if="deleteTarget?.type === 'formation' && affectedPacks.length > 0" 
                            class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left"
                        >
                            <div class="flex items-start gap-2">
                                <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p class="text-sm font-medium text-amber-800">Attention</p>
                                    <p class="text-sm text-amber-700 mt-1">
                                        Cette formation sera retirée des packs suivants :
                                    </p>
                                    <ul class="mt-1 text-sm text-amber-700">
                                        <li v-for="pack in affectedPacks" :key="pack.id" class="flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            {{ pack.title }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 p-6 pt-0">
                        <button 
                            type="button"
                            class="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            @click="showDeleteModal = false"
                        >
                            Annuler
                        </button>
                        <button 
                            type="button"
                            :disabled="isSubmitting"
                            class="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            @click="executeDelete"
                        >
                            <span v-if="isSubmitting">Suppression...</span>
                            <span v-else>Supprimer</span>
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
