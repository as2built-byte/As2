<script setup lang="ts">
/**
 * Video Tutorials Public Page
 * 
 * Displays video tutorials with filtering and search
 */

definePageMeta({
    layout: false,
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
const selectedPlatform = ref<string | null>(null)

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

    // Platform filter
    if (selectedPlatform.value) {
        tutorials = tutorials.filter(t => t.platform.includes(selectedPlatform.value!))
    }

    return tutorials
})

// Clear all filters
function clearFilters() {
    searchQuery.value = ''
    selectedTag.value = null
    selectedPlatform.value = null
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
    <div class="min-h-screen bg-slate-950">
        <!-- Hero Section -->
        <div class="relative py-16 overflow-hidden">
            <div class="absolute inset-0">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
            </div>
            <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <!-- Back Button -->
                <div class="mb-8">
                    <NuxtLink 
                        to="/"
                        class="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Icon name="i-heroicons-arrow-left" class="w-5 h-5" />
                        <span>Retour à l'accueil</span>
                    </NuxtLink>
                </div>
                <div class="text-center">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <Icon name="i-heroicons-play-circle" class="w-5 h-5 text-blue-400" />
                        <span class="text-blue-400 font-medium">Centre de formation</span>
                    </div>
                    <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
                        Tutoriels Vidéo
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mx-auto">
                        Apprenez à utiliser As2Built avec nos tutoriels vidéo guidés par étape
                    </p>
                </div>
            </div>
        </div>

        <!-- Filters Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- Search -->
                    <div class="flex-1">
                        <div class="relative">
                            <Icon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="Rechercher un tutoriel..."
                                class="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <!-- Platform Filter -->
                    <div class="md:w-48">
                        <select
                            v-model="selectedPlatform"
                            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Toutes plateformes</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Mobile">Mobile</option>
                        </select>
                    </div>

                    <!-- Tag Filter -->
                    <div class="md:w-48">
                        <select
                            v-model="selectedTag"
                            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Tous les tags</option>
                            <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
                        </select>
                    </div>

                    <!-- Clear Filters -->
                    <button
                        v-if="searchQuery || selectedTag || selectedPlatform"
                        @click="clearFilters"
                        class="px-4 py-3 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Icon name="i-heroicons-x-mark" class="w-5 h-5" />
                        Réinitialiser
                    </button>
                </div>

                <!-- Active Filters Tags -->
                <div v-if="selectedTag || selectedPlatform" class="flex flex-wrap gap-2 mt-4">
                    <span
                        v-if="selectedPlatform"
                        class="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                    >
                        <Icon name="i-heroicons-computer-desktop" class="w-4 h-4" />
                        {{ selectedPlatform }}
                        <button @click="selectedPlatform = null" class="hover:text-white">
                            <Icon name="i-heroicons-x-mark" class="w-3 h-3" />
                        </button>
                    </span>
                    <span
                        v-if="selectedTag"
                        class="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                    >
                        <Icon name="i-heroicons-tag" class="w-4 h-4" />
                        {{ selectedTag }}
                        <button @click="selectedTag = null" class="hover:text-white">
                            <Icon name="i-heroicons-x-mark" class="w-3 h-3" />
                        </button>
                    </span>
                </div>
            </div>
        </div>

        <!-- Tutorials Grid -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div v-if="tutorialsStore.loading" class="flex items-center justify-center py-16">
                <Icon name="i-heroicons-arrow-path" class="w-8 h-8 text-blue-500 animate-spin" />
                <span class="ml-3 text-slate-400">Chargement des tutoriels...</span>
            </div>

            <div v-else-if="filteredTutorials.length === 0" class="text-center py-16">
                <Icon name="i-heroicons-video-camera-slash" class="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 class="text-xl font-semibold text-slate-400 mb-2">Aucun tutoriel trouvé</h3>
                <p class="text-slate-500 mb-4">Essayez de modifier vos critères de recherche</p>
                <button
                    @click="clearFilters"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    Voir tous les tutoriels
                </button>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    v-for="tutorial in filteredTutorials"
                    :key="tutorial.id"
                    class="group bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer"
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
                            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon name="i-heroicons-play" class="w-8 h-8 text-white ml-1" />
                            </div>
                        </div>
                        <!-- Duration Badge -->
                        <div class="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded-lg font-medium">
                            {{ tutorial.duration }}
                        </div>
                        <!-- Platform Badge -->
                        <div class="absolute top-3 left-3 bg-blue-600/90 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1.5">
                            <Icon name="i-heroicons-computer-desktop" class="w-3.5 h-3.5" />
                            {{ tutorial.platform }}
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-5">
                        <h3 class="font-semibold text-white text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {{ tutorial.title }}
                        </h3>
                        <p class="text-slate-400 text-sm mb-4 line-clamp-2">
                            {{ tutorial.description }}
                        </p>
                        
                        <!-- Tags -->
                        <div class="flex flex-wrap gap-2">
                            <span
                                v-for="tag in tutorial.tags.slice(0, 4)"
                                :key="tag"
                                class="text-xs bg-slate-700/70 text-slate-300 px-2.5 py-1 rounded-full"
                            >
                                {{ tag }}
                            </span>
                            <span v-if="tutorial.tags.length > 4" class="text-xs text-slate-500 px-2 py-1">
                                +{{ tutorial.tags.length - 4 }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Video Modal -->
        <Teleport to="body">
            <div
                v-if="showVideoModal && selectedTutorial"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div class="absolute inset-0 bg-black/90" @click="closeVideoModal" />
                <div class="relative bg-slate-900 rounded-2xl w-full max-w-5xl overflow-hidden">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b border-slate-700">
                        <h3 class="font-semibold text-white pr-4">{{ selectedTutorial.title }}</h3>
                        <button
                            @click="closeVideoModal"
                            class="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <Icon name="i-heroicons-x-mark" class="w-6 h-6" />
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
                            <span class="inline-flex items-center gap-2 text-sm text-slate-400">
                                <Icon name="i-heroicons-clock" class="w-4 h-4" />
                                {{ selectedTutorial.duration }}
                            </span>
                            <span class="inline-flex items-center gap-2 text-sm text-slate-400">
                                <Icon name="i-heroicons-computer-desktop" class="w-4 h-4" />
                                {{ selectedTutorial.platform }}
                            </span>
                        </div>
                        <p class="text-slate-300">{{ selectedTutorial.description }}</p>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <span
                                v-for="tag in selectedTutorial.tags"
                                :key="tag"
                                class="text-sm bg-slate-800 text-slate-400 px-3 py-1 rounded-full"
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
