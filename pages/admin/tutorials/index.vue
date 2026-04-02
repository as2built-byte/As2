<script setup lang="ts">
/**
 * Admin Video Tutorials Management
 * 
 * CRUD interface for video tutorials with modals and responsive design
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { storeToRefs } from 'pinia'
import { useVideoTutorialsStore } from '~/stores/videoTutorials'
import type { VideoTutorial, VideoTutorialFormData } from '~/types'

const tutorialsStore = useVideoTutorialsStore()
const {
    tutorials,
    filteredTutorials,
    activeTutorials,
    loading,
    statusFilter,
    error
} = storeToRefs(tutorialsStore)

// Fetch data on mount
onMounted(async () => {
    await tutorialsStore.fetchTutorials()
})

// ========================================
// Modal State
// ========================================

const showTutorialModal = ref(false)
const showDeleteModal = ref(false)
const editingTutorial = ref<VideoTutorial | null>(null)
const deleteTarget = ref<{ id: string; title: string } | null>(null)

// Form states
const isSubmitting = ref(false)
const tutorialForm = ref<VideoTutorialFormData>({
    title: '',
    description: '',
    youtubeUrl: '',
    duration: '',
    tags: [],
    isActive: true,
    platform: 'Desktop & Mobile',
})

const newTag = ref('')

// ========================================
// Tutorial Actions
// ========================================

function openAddTutorial() {
    editingTutorial.value = null
    tutorialForm.value = {
        title: '',
        description: '',
        youtubeUrl: '',
        duration: '',
        tags: [],
        isActive: true,
        platform: 'Desktop & Mobile',
    }
    newTag.value = ''
    showTutorialModal.value = true
}

function openEditTutorial(tutorial: VideoTutorial) {
    editingTutorial.value = tutorial
    tutorialForm.value = {
        title: tutorial.title,
        description: tutorial.description,
        youtubeUrl: tutorial.youtubeUrl,
        duration: tutorial.duration,
        tags: [...tutorial.tags],
        isActive: tutorial.isActive,
        platform: tutorial.platform,
    }
    newTag.value = ''
    showTutorialModal.value = true
}

async function saveTutorial() {
    isSubmitting.value = true
    try {
        let success: boolean
        if (editingTutorial.value) {
            success = await tutorialsStore.updateTutorial(
                editingTutorial.value.id,
                tutorialForm.value
            )
        } else {
            const id = await tutorialsStore.createTutorial(tutorialForm.value)
            success = !!id
        }

        if (success) {
            showTutorialModal.value = false
        }
    } finally {
        isSubmitting.value = false
    }
}

function confirmDelete(tutorial: VideoTutorial) {
    deleteTarget.value = { id: tutorial.id, title: tutorial.title }
    showDeleteModal.value = true
}

async function executeDelete() {
    if (!deleteTarget.value) return
    
    isSubmitting.value = true
    try {
        const success = await tutorialsStore.deleteTutorial(deleteTarget.value.id)
        if (success) {
            showDeleteModal.value = false
            deleteTarget.value = null
        }
    } finally {
        isSubmitting.value = false
    }
}

async function toggleStatus(tutorial: VideoTutorial) {
    await tutorialsStore.toggleTutorialStatus(tutorial.id)
}

function addTag() {
    if (newTag.value.trim() && !tutorialForm.value.tags.includes(newTag.value.trim())) {
        tutorialForm.value.tags.push(newTag.value.trim())
        newTag.value = ''
    }
}

function removeTag(tag: string) {
    tutorialForm.value.tags = tutorialForm.value.tags.filter(t => t !== tag)
}

function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        e.preventDefault()
        addTag()
    }
}

// Extract YouTube thumbnail URL
function getYoutubeThumbnail(url: string): string {
    const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
    const match = url.match(regExp)
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : ''
}

// Filter tabs
const filterTabs = [
    { key: 'all', label: 'Tous', icon: 'i-heroicons-squares-2x2' },
    { key: 'active', label: 'Actifs', icon: 'i-heroicons-check-circle' },
    { key: 'inactive', label: 'Inactifs', icon: 'i-heroicons-x-circle' },
]
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-white mb-2">Tutoriels Vidéo</h1>
                    <p class="text-slate-400">Gérez les tutoriels vidéo YouTube pour vos utilisateurs</p>
                </div>
                <button
                    @click="openAddTutorial"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Icon name="i-heroicons-plus" class="w-5 h-5" />
                    Ajouter un tutoriel
                </button>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="mb-6">
            <div class="flex gap-2">
                <button
                    v-for="tab in filterTabs"
                    :key="tab.key"
                    @click="tutorialsStore.setStatusFilter(tab.key as any)"
                    :class="{
                        'bg-blue-600 text-white': statusFilter === tab.key,
                        'bg-slate-800 text-slate-400 hover:bg-slate-700': statusFilter !== tab.key
                    }"
                    class="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Icon :name="tab.icon" class="w-5 h-5" />
                    {{ tab.label }}
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 text-blue-500 animate-spin" />
            <span class="ml-3 text-slate-400">Chargement...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div class="flex items-center gap-3">
                <Icon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-400" />
                <p class="text-red-400">{{ error }}</p>
                <button
                    @click="tutorialsStore.fetchTutorials()"
                    class="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                >
                    Réessayer
                </button>
            </div>
        </div>

        <!-- Tutorials Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
                v-for="tutorial in filteredTutorials"
                :key="tutorial.id"
                class="group bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
            >
                <!-- Thumbnail -->
                <div class="relative aspect-video bg-slate-900">
                    <img
                        :src="tutorial.thumbnailUrl || getYoutubeThumbnail(tutorial.youtubeUrl)"
                        :alt="tutorial.title"
                        class="w-full h-full object-cover"
                    />
                    <!-- Duration Badge -->
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {{ tutorial.duration }}
                    </div>
                    <!-- Platform Badge -->
                    <div class="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Icon name="i-heroicons-computer-desktop" class="w-3 h-3" />
                        {{ tutorial.platform }}
                    </div>
                    <!-- Status Badge -->
                    <div
                        class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
                        :class="tutorial.isActive ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'"
                    >
                        {{ tutorial.isActive ? 'Actif' : 'Inactif' }}
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4">
                    <h3 class="font-semibold text-white mb-2 line-clamp-2">{{ tutorial.title }}</h3>
                    <p class="text-slate-400 text-sm mb-3 line-clamp-2">{{ tutorial.description }}</p>
                    
                    <!-- Tags -->
                    <div class="flex flex-wrap gap-1 mb-4">
                        <span
                            v-for="tag in tutorial.tags.slice(0, 3)"
                            :key="tag"
                            class="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                        >
                            {{ tag }}
                        </span>
                        <span v-if="tutorial.tags.length > 3" class="text-xs text-slate-500">
                            +{{ tutorial.tags.length - 3 }}
                        </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                        <button
                            @click="openEditTutorial(tutorial)"
                            class="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Icon name="i-heroicons-pencil-square" class="w-4 h-4" />
                            Modifier
                        </button>
                        <button
                            @click="toggleStatus(tutorial)"
                            :class="tutorial.isActive ? 'text-green-400 hover:bg-green-500/20' : 'text-red-400 hover:bg-red-500/20'"
                            class="p-2 rounded-lg transition-colors"
                            :title="tutorial.isActive ? 'Désactiver' : 'Activer'"
                        >
                            <Icon
                                :name="tutorial.isActive ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                                class="w-5 h-5"
                            />
                        </button>
                        <button
                            @click="confirmDelete(tutorial)"
                            class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <Icon name="i-heroicons-trash" class="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredTutorials.length === 0" class="col-span-full text-center py-12">
                <Icon name="i-heroicons-video-camera" class="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 class="text-xl font-semibold text-slate-400 mb-2">Aucun tutoriel</h3>
                <p class="text-slate-500 mb-4">
                    {{ statusFilter === 'all' ? 'Commencez par ajouter votre premier tutoriel vidéo.' : 'Aucun tutoriel trouvé avec ce filtre.' }}
                </p>
                <button
                    v-if="statusFilter === 'all'"
                    @click="openAddTutorial"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    Ajouter un tutoriel
                </button>
            </div>
        </div>

        <!-- Tutorial Modal -->
        <Teleport to="body">
            <div
                v-if="showTutorialModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div class="absolute inset-0 bg-black/70" @click="showTutorialModal = false" />
                <div class="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-white">
                                {{ editingTutorial ? 'Modifier le tutoriel' : 'Nouveau tutoriel' }}
                            </h2>
                            <button
                                @click="showTutorialModal = false"
                                class="p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <Icon name="i-heroicons-x-mark" class="w-6 h-6" />
                            </button>
                        </div>

                        <form @submit.prevent="saveTutorial" class="space-y-4">
                            <!-- Title -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Titre</label>
                                <input
                                    v-model="tutorialForm.title"
                                    type="text"
                                    required
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    placeholder="Titre du tutoriel"
                                />
                            </div>

                            <!-- Description -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                    v-model="tutorialForm.description"
                                    rows="3"
                                    required
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                                    placeholder="Description du tutoriel"
                                />
                            </div>

                            <!-- YouTube URL -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">URL YouTube</label>
                                <input
                                    v-model="tutorialForm.youtubeUrl"
                                    type="url"
                                    required
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                <p class="text-xs text-slate-500 mt-1">
                                    Lien de la vidéo YouTube (ex: https://www.youtube.com/watch?v=8PbUgGTWsLg)
                                </p>
                            </div>

                            <!-- Duration -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Durée</label>
                                <input
                                    v-model="tutorialForm.duration"
                                    type="text"
                                    required
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                    placeholder="5m 30s"
                                />
                            </div>

                            <!-- Platform -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Plateforme</label>
                                <select
                                    v-model="tutorialForm.platform"
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="Desktop">Desktop</option>
                                    <option value="Mobile">Mobile</option>
                                    <option value="Desktop & Mobile">Desktop & Mobile</option>
                                </select>
                            </div>

                            <!-- Tags -->
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Tags</label>
                                <div class="flex gap-2 mb-2">
                                    <input
                                        v-model="newTag"
                                        type="text"
                                        class="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                        placeholder="Ajouter un tag"
                                        @keydown="handleTagKeydown"
                                    />
                                    <button
                                        type="button"
                                        @click="addTag"
                                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        <Icon name="i-heroicons-plus" class="w-5 h-5" />
                                    </button>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <span
                                        v-for="tag in tutorialForm.tags"
                                        :key="tag"
                                        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
                                    >
                                        {{ tag }}
                                        <button
                                            type="button"
                                            @click="removeTag(tag)"
                                            class="hover:text-white"
                                        >
                                            <Icon name="i-heroicons-x-mark" class="w-3 h-3" />
                                        </button>
                                    </span>
                                </div>
                            </div>

                            <!-- Active Toggle -->
                            <div class="flex items-center gap-3">
                                <input
                                    :id="'active-' + editingTutorial?.id"
                                    v-model="tutorialForm.isActive"
                                    type="checkbox"
                                    class="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                                />
                                <label :for="'active-' + editingTutorial?.id" class="text-slate-300">
                                    Actif (visible sur le site)
                                </label>
                            </div>

                            <!-- Actions -->
                            <div class="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    @click="showTutorialModal = false"
                                    class="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    :disabled="isSubmitting"
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Icon
                                        v-if="isSubmitting"
                                        name="i-heroicons-arrow-path"
                                        class="w-5 h-5 animate-spin"
                                    />
                                    {{ editingTutorial ? 'Mettre à jour' : 'Créer' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Delete Modal -->
        <Teleport to="body">
            <div
                v-if="showDeleteModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div class="absolute inset-0 bg-black/70" @click="showDeleteModal = false" />
                <div class="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-400" />
                        </div>
                        <h3 class="text-lg font-semibold text-white mb-2">Confirmer la suppression</h3>
                        <p class="text-slate-400 mb-6">
                            Êtes-vous sûr de vouloir supprimer le tutoriel "{{ deleteTarget?.title }}" ? Cette action est irréversible.
                        </p>
                        <div class="flex justify-center gap-3">
                            <button
                                @click="showDeleteModal = false"
                                class="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                @click="executeDelete"
                                :disabled="isSubmitting"
                                class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Icon
                                    v-if="isSubmitting"
                                    name="i-heroicons-arrow-path"
                                    class="w-5 h-5 animate-spin"
                                />
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
