/**
 * Formations Store - Pinia
 * 
 * Isolated state management for formations and packs
 * No conflicts with other stores (admin, auth)
 */

import { defineStore } from 'pinia'
import type {
    FormationsState,
    Formation,
    Pack,
    CreateFormationData,
    UpdateFormationData,
    CreatePackData,
    UpdatePackData
} from '~/types'
import {
    getAllFormations,
    createFormation as createFormationService,
    updateFormation as updateFormationService,
    deleteFormation as deleteFormationService,
    getAllPacks,
    createPack as createPackService,
    updatePack as updatePackService,
    deletePack as deletePackService
} from '~/firebase/services/firestore'
import { uploadFormationCover, deleteFormationCoverByUrl } from '~/firebase/services/storage'

export const useFormationsStore = defineStore('formations', {
    state: (): FormationsState => ({
        formations: [],
        packs: [],
        formationsLoading: false,
        packsLoading: false,
        error: null,
        activeTab: 'formations',
        statusFilter: 'all',
    }),

    getters: {
        /** Get filtered formations based on status filter */
        filteredFormations: (state): Formation[] => {
            if (state.statusFilter === 'all') {
                return state.formations
            }
            const isActive = state.statusFilter === 'active'
            return state.formations.filter(f => f.isActive === isActive)
        },

        /** Get all active formations (for pack creation) */
        activeFormations: (state): Formation[] => {
            return state.formations.filter(f => f.isActive)
        },

        /** Get packs with computed isActive status (inactive if any formation is inactive) */
        packsWithStatus(state): (Pack & { isActive: boolean })[] {
            return state.packs.map(pack => {
                // A pack is active only if ALL its formations are active
                const isActive = pack.formationIds.length > 0 && pack.formationIds.every(formationId => {
                    const formation = state.formations.find(f => f.id === formationId)
                    return formation?.isActive === true
                })
                return { ...pack, isActive }
            })
        },

        /** Get formation by ID */
        getFormationById: (state) => (id: string): Formation | undefined => {
            return state.formations.find(f => f.id === id)
        },

        /** Get formations count */
        formationsCount: (state): number => state.formations.length,

        /** Get packs count */
        packsCount: (state): number => state.packs.length,

        /** Get packs that contain a specific formation (for delete warnings) */
        getPacksContainingFormation: (state) => (formationId: string): Pack[] => {
            return state.packs.filter(pack => pack.formationIds.includes(formationId))
        },
    },

    actions: {
        // ========================================
        // Formation Actions
        // ========================================

        /**
         * Fetch all formations from Firestore
         */
        async fetchFormations(): Promise<void> {
            this.formationsLoading = true
            this.error = null

            try {
                this.formations = await getAllFormations()
            } catch (error) {
                console.error('Error fetching formations:', error)
                this.error = 'Erreur lors du chargement des formations'
            } finally {
                this.formationsLoading = false
            }
        },

        /**
         * Create a new formation
         */
        async addFormation(data: CreateFormationData, coverFile?: File | null): Promise<boolean> {
            try {
                // Create formation first to get ID
                const formationId = await createFormationService(data)

                // Upload cover if provided
                let coverUrl: string | null = null
                if (coverFile) {
                    coverUrl = await uploadFormationCover(formationId, coverFile)
                    // Update formation with cover URL
                    await updateFormationService(formationId, { coverUrl })
                }

                // Add to local state
                const newFormation: Formation = {
                    id: formationId,
                    title: data.title,
                    description: data.description,
                    durationHours: data.durationHours,
                    price: data.price,
                    isActive: data.isActive,
                    coverUrl,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                this.formations.unshift(newFormation)

                return true
            } catch (error) {
                console.error('Error creating formation:', error)
                this.error = 'Erreur lors de la création de la formation'
                return false
            }
        },

        /**
         * Update an existing formation
         */
        async editFormation(
            id: string,
            data: UpdateFormationData,
            coverFile?: File | null
        ): Promise<boolean> {
            try {
                // Upload new cover if provided
                if (coverFile) {
                    const coverUrl = await uploadFormationCover(id, coverFile)
                    data.coverUrl = coverUrl
                }

                await updateFormationService(id, data)

                // Update local state
                const index = this.formations.findIndex(f => f.id === id)
                if (index !== -1) {
                    const current = this.formations[index]!
                    this.formations[index] = {
                        id: current.id,
                        title: data.title ?? current.title,
                        description: data.description ?? current.description,
                        durationHours: data.durationHours ?? current.durationHours,
                        price: data.price ?? current.price,
                        isActive: data.isActive ?? current.isActive,
                        coverUrl: data.coverUrl !== undefined ? data.coverUrl : current.coverUrl,
                        createdAt: current.createdAt,
                        updatedAt: new Date(),
                    }
                }

                return true
            } catch (error) {
                console.error('Error updating formation:', error)
                this.error = 'Erreur lors de la mise à jour de la formation'
                return false
            }
        },

        /**
         * Delete a formation
         */
        async removeFormation(id: string): Promise<boolean> {
            try {
                // Get the formation to access coverUrl before deletion
                const formation = this.formations.find(f => f.id === id)

                // Delete from Firestore
                await deleteFormationService(id)

                // Delete cover image from Storage if exists
                if (formation?.coverUrl) {
                    await deleteFormationCoverByUrl(formation.coverUrl)
                }

                // Remove from local state
                this.formations = this.formations.filter(f => f.id !== id)

                // Also remove from any packs that reference this formation
                this.packs = this.packs.map(pack => ({
                    ...pack,
                    formationIds: pack.formationIds.filter(fId => fId !== id)
                }))

                return true
            } catch (error) {
                console.error('Error deleting formation:', error)
                this.error = 'Erreur lors de la suppression de la formation'
                return false
            }
        },

        /**
         * Toggle formation active status
         */
        async toggleFormationStatus(id: string): Promise<boolean> {
            const formation = this.formations.find(f => f.id === id)
            if (!formation) return false

            return this.editFormation(id, { isActive: !formation.isActive })
        },

        // ========================================
        // Pack Actions
        // ========================================

        /**
         * Fetch all packs from Firestore
         */
        async fetchPacks(): Promise<void> {
            this.packsLoading = true
            this.error = null

            try {
                this.packs = await getAllPacks()
            } catch (error) {
                console.error('Error fetching packs:', error)
                this.error = 'Erreur lors du chargement des packs'
            } finally {
                this.packsLoading = false
            }
        },

        /**
         * Create a new pack
         */
        async addPack(data: CreatePackData): Promise<boolean> {
            try {
                const packId = await createPackService(data)

                // Add to local state
                const newPack: Pack = {
                    id: packId,
                    title: data.title,
                    formationIds: data.formationIds,
                    price: data.price,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                this.packs.unshift(newPack)

                return true
            } catch (error) {
                console.error('Error creating pack:', error)
                this.error = 'Erreur lors de la création du pack'
                return false
            }
        },

        /**
         * Update an existing pack
         */
        async editPack(id: string, data: UpdatePackData): Promise<boolean> {
            try {
                await updatePackService(id, data)

                // Update local state
                const index = this.packs.findIndex(p => p.id === id)
                if (index !== -1) {
                    const current = this.packs[index]!
                    this.packs[index] = {
                        id: current.id,
                        title: data.title ?? current.title,
                        formationIds: data.formationIds ?? current.formationIds,
                        price: data.price ?? current.price,
                        createdAt: current.createdAt,
                        updatedAt: new Date(),
                    }
                }

                return true
            } catch (error) {
                console.error('Error updating pack:', error)
                this.error = 'Erreur lors de la mise à jour du pack'
                return false
            }
        },

        /**
         * Delete a pack
         */
        async removePack(id: string): Promise<boolean> {
            try {
                await deletePackService(id)

                // Remove from local state
                this.packs = this.packs.filter(p => p.id !== id)

                return true
            } catch (error) {
                console.error('Error deleting pack:', error)
                this.error = 'Erreur lors de la suppression du pack'
                return false
            }
        },

        // ========================================
        // UI State Actions
        // ========================================

        /**
         * Set active tab
         */
        setActiveTab(tab: 'formations' | 'packs'): void {
            this.activeTab = tab
        },

        /**
         * Set status filter
         */
        setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
            this.statusFilter = filter
        },

        /**
         * Clear all errors
         */
        clearError(): void {
            this.error = null
        },

        /**
         * Fetch all data (formations + packs)
         */
        async fetchAll(): Promise<void> {
            await Promise.all([
                this.fetchFormations(),
                this.fetchPacks()
            ])
        }
    }
})
