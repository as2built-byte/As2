<script setup lang="ts">
/**
 * Enterprise Video Tutorials Page
 * Uses entreprise layout with sidebar - styled exactly like expert/tutorials
 */

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth'],
})

import { useVideoTutorialsStore } from '~/stores/videoTutorials'
import type { VideoTutorial } from '~/types'

const tutorialsStore = useVideoTutorialsStore()

// Fetch tutorials on mount
onMounted(async () => {
    await tutorialsStore.fetchTutorials()
})

// Search and filter
const searchQuery = ref('')
const selectedTag = ref<string | null>(null)

// Get all unique tags
const allTags = computed(() => {
    const tags = new Set<string>()
    tutorialsStore.activeTutorials.forEach(tutorial => {
        tutorial.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
})

// Filtered tutorials
const filteredTutorials = computed(() => {
    let tutorials = tutorialsStore.activeTutorials

    // Search filter
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        tutorials = tutorials.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.tags.some(tag => tag.toLowerCase().includes(query))
        )
    }

    // Tag filter
    if (selectedTag.value) {
        tutorials = tutorials.filter(t => t.tags.includes(selectedTag.value!))
    }

    return tutorials
})

// Tabs
const activeTab = ref<'all' | 'desktop' | 'mobile'>('all')

const tabs = [
    { id: 'all', label: 'Tous', icon: 'heroicons:squares-2x2' },
    { id: 'desktop', label: 'Desktop', icon: 'heroicons:computer-desktop' },
    { id: 'mobile', label: 'Mobile', icon: 'heroicons:device-phone-mobile' }
] as const

// Tab counts
const tabCounts = computed(() => ({
    all: tutorialsStore.activeTutorials.length,
    desktop: tutorialsStore.activeTutorials.filter(t => t.platform.includes('Desktop')).length,
    mobile: tutorialsStore.activeTutorials.filter(t => t.platform.includes('Mobile')).length
}))

// Current tab tutorials
const currentTutorials = computed(() => {
    switch (activeTab.value) {
        case 'all':
            return filteredTutorials.value
        case 'desktop':
            return filteredTutorials.value.filter(t => t.platform.includes('Desktop'))
        case 'mobile':
            return filteredTutorials.value.filter(t => t.platform.includes('Mobile'))
        default:
            return filteredTutorials.value
    }
})

// Clear all filters
function clearFilters() {
    searchQuery.value = ''
    selectedTag.value = null
}

// Get YouTube embed URL
function getEmbedUrl(youtubeId: string): string {
    return `https://www.youtube.com/embed/${youtubeId}`
}

// Selected tutorial for modal
const selectedTutorial = ref<VideoTutorial | null>(null)
const showVideoModal = ref(false)

function openVideoModal(tutorial: VideoTutorial) {
    selectedTutorial.value = tutorial
    showVideoModal.value = true
}

function closeVideoModal() {
    selectedTutorial.value = null
    showVideoModal.value = false
}
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Tutoriels Vidéo</h1>
            <p class="page-subtitle">Apprenez à utiliser As2Built avec nos tutoriels guidés par étape</p>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-xl border border-slate-200 mb-6">
            <div class="flex border-b border-slate-200">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
                    :class="activeTab === tab.id 
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = tab.id"
                >
                    <Icon :name="tab.icon" class="w-4 h-4" />
                    {{ tab.label }}
                    <span 
                        v-if="tabCounts[tab.id] > 0"
                        class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
                    >
                        {{ tabCounts[tab.id] }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Search & Filters -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div class="flex flex-col md:flex-row gap-4">
                <!-- Search -->
                <div class="flex-1">
                    <div class="relative">
                        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Rechercher un tutoriel..."
                            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                <!-- Tag Filter -->
                <div class="md:w-48">
                    <select
                        v-model="selectedTag"
                        class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Tous les tags</option>
                        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
                    </select>
                </div>

                <!-- Clear Filters -->
                <button
                    v-if="searchQuery || selectedTag"
                    @click="clearFilters"
                    class="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2"
                >
                    <Icon name="heroicons:x-mark" class="w-5 h-5" />
                    Réinitialiser
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="tutorialsStore.loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="tutorialsStore.error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
                <span>{{ tutorialsStore.error }}</span>
                <button 
                    type="button"
                    class="ml-4 text-red-700 underline font-medium text-sm"
                    @click="tutorialsStore.fetchTutorials()"
                >
                    Réessayer
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else>
            <!-- Tutorials Grid -->
            <div v-if="currentTutorials.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    v-for="tutorial in currentTutorials"
                    :key="tutorial.id"
                    class="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                    @click="openVideoModal(tutorial)"
                >
                    <!-- Thumbnail -->
                    <div class="relative aspect-video bg-slate-900 overflow-hidden">
                        <img
                            :src="tutorial.thumbnailUrl || `https://img.youtube.com/vi/${tutorial.youtubeId}/mqdefault.jpg`"
                            :alt="tutorial.title"
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <!-- Play Button Overlay -->
                        <div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                            <div class="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon name="heroicons:play" class="w-7 h-7 text-white ml-1" />
                            </div>
                        </div>
                        <!-- Duration Badge -->
                        <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                            {{ tutorial.duration }}
                        </div>
                        <!-- Platform Badge -->
                        <div class="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Icon name="heroicons:computer-desktop" class="w-3 h-3" />
                            {{ tutorial.platform }}
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-4">
                        <h3 class="font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {{ tutorial.title }}
                        </h3>
                        <p class="text-slate-600 text-sm mb-3 line-clamp-2">
                            {{ tutorial.description }}
                        </p>
                        
                        <!-- Tags -->
                        <div class="flex flex-wrap gap-1.5">
                            <span
                                v-for="tag in tutorial.tags.slice(0, 3)"
                                :key="tag"
                                class="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                            >
                                {{ tag }}
                            </span>
                            <span v-if="tutorial.tags.length > 3" class="text-xs text-slate-400 px-1">
                                +{{ tutorial.tags.length - 3 }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Icon name="heroicons:video-camera-slash" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <template v-if="searchQuery || selectedTag">
                    <h3 class="text-lg font-medium text-slate-800">Aucun tutoriel trouvé</h3>
                    <p class="mt-2 text-slate-500">Essayez de modifier vos critères de recherche</p>
                    <button 
                        type="button"
                        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        @click="clearFilters"
                    >
                        Réinitialiser les filtres
                    </button>
                </template>
                <template v-else>
                    <h3 class="text-lg font-medium text-slate-800">Aucun tutoriel disponible</h3>
                    <p class="mt-2 text-slate-500">De nouveaux tutoriels seront bientôt disponibles.</p>
                </template>
            </div>
        </div>

        <!-- Video Modal -->
        <Teleport to="body">
            <div
                v-if="showVideoModal && selectedTutorial"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div class="absolute inset-0 bg-black/90" @click="closeVideoModal" />
                <div class="relative bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b border-slate-200">
                        <h3 class="font-semibold text-slate-800 pr-4">{{ selectedTutorial.title }}</h3>
                        <button
                            @click="closeVideoModal"
                            class="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <Icon name="heroicons:x-mark" class="w-6 h-6" />
                        </button>
                    </div>
                    
                    <!-- Video Player -->
                    <div class="aspect-video bg-black">
                        <iframe
                            :src="getEmbedUrl(selectedTutorial.youtubeId)"
                            class="w-full h-full"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        />
                    </div>
                    
                    <!-- Info -->
                    <div class="p-6">
                        <div class="flex flex-wrap gap-4 mb-4">
                            <span class="inline-flex items-center gap-2 text-sm text-slate-500">
                                <Icon name="heroicons:clock" class="w-4 h-4" />
                                {{ selectedTutorial.duration }}
                            </span>
                            <span class="inline-flex items-center gap-2 text-sm text-slate-500">
                                <Icon name="heroicons:computer-desktop" class="w-4 h-4" />
                                {{ selectedTutorial.platform }}
                            </span>
                        </div>
                        <p class="text-slate-700">{{ selectedTutorial.description }}</p>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <span
                                v-for="tag in selectedTutorial.tags"
                                :key="tag"
                                class="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full"
                            >
                                {{ tag }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 2;
    -webkit-line-clamp: 2;
}
</style>
