/**
 * Video Tutorial Store - Pinia
 * 
 * Isolated state management for video tutorials
 */

import { defineStore } from 'pinia'
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    type DocumentData
} from 'firebase/firestore'
import type {
    VideoTutorialsState,
    VideoTutorial,
    CreateVideoTutorialData,
    UpdateVideoTutorialData,
    VideoTutorialFormData
} from '~/types'

// Extract YouTube ID from URL
function extractYoutubeId(url: string): string {
    const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/
    const match = url.match(regExp)
    return match ? match[1] : ''
}

export const useVideoTutorialsStore = defineStore('videoTutorials', {
    state: (): VideoTutorialsState => ({
        tutorials: [],
        loading: false,
        error: null,
        statusFilter: 'all',
        selectedTutorial: null,
    }),

    getters: {
        /** Get filtered tutorials based on status filter */
        filteredTutorials: (state): VideoTutorial[] => {
            if (state.statusFilter === 'all') {
                return state.tutorials
            }
            const isActive = state.statusFilter === 'active'
            return state.tutorials.filter(t => t.isActive === isActive)
        },

        /** Get all active tutorials */
        activeTutorials: (state): VideoTutorial[] => {
            return state.tutorials.filter(t => t.isActive).sort((a, b) => 
                b.createdAt.getTime() - a.createdAt.getTime()
            )
        },

        /** Get tutorial by ID */
        getTutorialById: (state) => (id: string): VideoTutorial | undefined => {
            return state.tutorials.find(t => t.id === id)
        },

        /** Get tutorials count */
        tutorialsCount: (state): number => state.tutorials.length,
    },

    actions: {
        // ========================================
        // Tutorial Actions
        // ========================================

        /**
         * Fetch all tutorials from Firestore
         */
        async fetchTutorials(): Promise<void> {
            const { $db } = useNuxtApp()
            this.loading = true
            this.error = null

            try {
                const tutorialsRef = collection($db, 'tutorials')
                const querySnapshot = await getDocs(tutorialsRef)

                this.tutorials = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data()
                    return {
                        id: docSnap.id,
                        title: data.title || '',
                        description: data.description || '',
                        youtubeUrl: data.youtubeUrl || '',
                        youtubeId: data.youtubeId || '',
                        duration: data.duration || '',
                        tags: data.tags || [],
                        isActive: data.isActive ?? true,
                        thumbnailUrl: data.thumbnailUrl || null,
                        platform: data.platform || 'Desktop & Mobile',
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                    } as VideoTutorial
                }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            } catch (error) {
                console.error('Error fetching tutorials:', error)
                this.error = 'Erreur lors du chargement des tutoriels'
            } finally {
                this.loading = false
            }
        },

        /**
         * Get a single tutorial by ID
         */
        async fetchTutorialById(id: string): Promise<VideoTutorial | null> {
            const { $db } = useNuxtApp()
            
            try {
                const tutorialRef = doc($db, 'tutorials', id)
                const tutorialSnap = await getDoc(tutorialRef)

                if (!tutorialSnap.exists()) {
                    return null
                }

                const data = tutorialSnap.data()
                return {
                    id: tutorialSnap.id,
                    title: data.title || '',
                    description: data.description || '',
                    youtubeUrl: data.youtubeUrl || '',
                    youtubeId: data.youtubeId || '',
                    duration: data.duration || '',
                    tags: data.tags || [],
                    isActive: data.isActive ?? true,
                    thumbnailUrl: data.thumbnailUrl || null,
                    platform: data.platform || 'Desktop & Mobile',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                } as VideoTutorial
            } catch (error) {
                console.error('Error fetching tutorial:', error)
                this.error = 'Erreur lors du chargement du tutoriel'
                return null
            }
        },

        /**
         * Create a new video tutorial
         */
        async createTutorial(data: VideoTutorialFormData): Promise<string | null> {
            const { $db } = useNuxtApp()

            try {
                const youtubeId = extractYoutubeId(data.youtubeUrl)
                if (!youtubeId) {
                    console.error('URL YouTube invalide')
                    return null
                }

                const tutorialData: CreateVideoTutorialData = {
                    title: data.title,
                    description: data.description,
                    youtubeUrl: data.youtubeUrl,
                    duration: data.duration,
                    tags: data.tags,
                    isActive: data.isActive,
                    platform: data.platform,
                    thumbnailUrl: data.thumbnailUrl || null,
                }

                const tutorialsRef = collection($db, 'tutorials')
                const docRef = await addDoc(tutorialsRef, {
                    ...tutorialData,
                    youtubeId,
                    thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                })

                // Add to local state
                const newTutorial: VideoTutorial = {
                    id: docRef.id,
                    ...tutorialData,
                    youtubeId,
                    thumbnailUrl: tutorialData.thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                this.tutorials.unshift(newTutorial)

                return docRef.id
            } catch (error) {
                console.error('Error creating tutorial:', error)
                return null
            }
        },

        /**
         * Update a video tutorial
         */
        async updateTutorial(
            id: string,
            data: Partial<VideoTutorialFormData>
        ): Promise<boolean> {
            const { $db } = useNuxtApp()

            try {
                const tutorialRef = doc($db, 'tutorials', id)
                const updateData: UpdateVideoTutorialData = { ...data }

                // Extract new YouTube ID if URL changed
                if (data.youtubeUrl) {
                    const youtubeId = extractYoutubeId(data.youtubeUrl)
                    if (youtubeId) {
                        updateData.youtubeId = youtubeId
                        updateData.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
                    }
                }

                await updateDoc(tutorialRef, {
                    ...updateData,
                    updatedAt: serverTimestamp(),
                })

                // Update local state
                const index = this.tutorials.findIndex(t => t.id === id)
                if (index !== -1) {
                    const current = this.tutorials[index]!
                    this.tutorials[index] = {
                        ...current,
                        ...updateData,
                        youtubeId: updateData.youtubeId || current.youtubeId,
                        thumbnailUrl: updateData.thumbnailUrl || current.thumbnailUrl,
                        updatedAt: new Date(),
                    } as VideoTutorial
                }

                return true
            } catch (error) {
                console.error('Error updating tutorial:', error)
                return false
            }
        },

        /**
         * Delete a video tutorial
         */
        async deleteTutorial(id: string): Promise<boolean> {
            const { $db } = useNuxtApp()

            try {
                const tutorialRef = doc($db, 'tutorials', id)
                await deleteDoc(tutorialRef)

                // Remove from local state
                this.tutorials = this.tutorials.filter(t => t.id !== id)

                return true
            } catch (error) {
                console.error('Error deleting tutorial:', error)
                return false
            }
        },

        /**
         * Toggle tutorial status (active/inactive)
         */
        async toggleTutorialStatus(id: string): Promise<boolean> {
            const { $db } = useNuxtApp()

            try {
                const tutorial = this.tutorials.find(t => t.id === id)
                if (!tutorial) return false

                const newStatus = !tutorial.isActive
                const tutorialRef = doc($db, 'tutorials', id)
                
                await updateDoc(tutorialRef, {
                    isActive: newStatus,
                    updatedAt: serverTimestamp(),
                })

                // Update local state
                tutorial.isActive = newStatus
                tutorial.updatedAt = new Date()

                return true
            } catch (error) {
                console.error('Error toggling tutorial status:', error)
                return false
            }
        },

        /**
         * Select a tutorial
         */
        selectTutorial(tutorial: VideoTutorial | null): void {
            this.selectedTutorial = tutorial
        },

        /**
         * Set status filter
         */
        setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
            this.statusFilter = filter
        },
    },
})
