/**
 * Missions Store
 * 
 * Manages mission state for enterprise, expert, and admin users
 */
import { defineStore } from 'pinia'
import type { Mission, CreateMissionData, MissionWithDetails, UserWithDetails } from '~/types'
import { useAuthStore } from './auth'
import {
    getMissionsByProject,
    getMissionsByEnterprise,
    getMissionsByExpert,
    getPendingMissionsForAdmin,
    getAllMissionsForAdmin,
    getMission,
    createMission as createMissionService,
    assignExpertToMission,
    acceptMission as acceptMissionService,
    refuseMission as refuseMissionService,
    deleteMission as deleteMissionService,
    cancelExpertFromMission as cancelExpertFromMissionService,
    getProject,
    getEnterpriseProfile,
    getUserProfile,
    getAvailableExperts
} from '~/firebase/services/firestore'

interface MissionsState {
    missions: MissionWithDetails[]
    currentMission: Mission | null
    missionDetails: MissionWithDetails | null
    loading: boolean
    error: string | null
    availableExperts: UserWithDetails[]
}

export const useMissionsStore = defineStore('missions', {
    state: (): MissionsState => ({
        missions: [],
        currentMission: null,
        missionDetails: null,
        loading: false,
        error: null,
        availableExperts: []
    }),

    getters: {
        /** Missions by status */
        missionsByStatus: (state) => (status: Mission['status']) => {
            return state.missions.filter(m => m.status === status)
        },

        /** Pending missions (for admin) */
        pendingMissions: (state) => {
            return state.missions.filter(m => m.status === 'pending_admin')
        },

        /** Proposed missions (for expert - invitations) */
        proposedMissions: (state) => {
            return state.missions.filter(m => m.status === 'proposed')
        },

        /** Active missions (accepted) */
        activeMissions: (state) => {
            return state.missions.filter(m => m.status === 'accepted')
        },

        /** Completed missions */
        completedMissions: (state) => {
            return state.missions.filter(m => m.status === 'completed')
        }
    },

    actions: {
        /**
         * Fetch missions for a specific project
         */
        async fetchMissionsByProject(projectId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                // Get auth store to check role
                const authStore = useAuthStore()
                const filters: { enterpriseId?: string, expertId?: string } = {}

                // Configure filters based on role to satisfy Firestore rules
                if (authStore.user?.uid) {
                    if (authStore.userRole === 'enterprise') {
                        filters.enterpriseId = authStore.user.uid
                    } else if (authStore.userRole === 'expert') {
                        filters.expertId = authStore.user.uid
                    }
                }

                const missions = await getMissionsByProject(projectId, filters)

                // Enhance missions with expert details
                const enhancedMissions: MissionWithDetails[] = await Promise.all(
                    missions.map(async (mission) => {
                        const details: MissionWithDetails = { ...mission }

                        if (mission.expertId) {
                            try {
                                const expert = await getUserProfile(mission.expertId)
                                if (expert) {
                                    details.expertName = `${expert.firstName} ${expert.lastName}`
                                }
                            } catch (e) {
                                console.error(`Failed to fetch expert profile for ${mission.expertId}`, e)
                            }
                        }
                        return details
                    })
                )

                this.missions = enhancedMissions
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des missions'
                console.error('Error fetching missions by project:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch all missions for an enterprise
         */
        async fetchMissionsByEnterprise(enterpriseId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                const missions = await getMissionsByEnterprise(enterpriseId)

                // Enhance missions with expert details
                const enhancedMissions: MissionWithDetails[] = await Promise.all(
                    missions.map(async (mission) => {
                        const details: MissionWithDetails = { ...mission }

                        if (mission.expertId) {
                            try {
                                const expert = await getUserProfile(mission.expertId)
                                if (expert) {
                                    details.expertName = `${expert.firstName} ${expert.lastName}`
                                }
                            } catch (e) {
                                console.error(`Failed to fetch expert profile for ${mission.expertId}`, e)
                            }
                        }
                        return details
                    })
                )

                this.missions = enhancedMissions
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des missions'
                console.error('Error fetching missions by enterprise:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch all missions for an expert
         */
        async fetchMissionsByExpert(expertId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                const missions = await getMissionsByExpert(expertId)

                // Enhance missions with enterprise details
                const enhancedMissions: MissionWithDetails[] = await Promise.all(
                    missions.map(async (mission) => {
                        const details: MissionWithDetails = { ...mission }

                        if (mission.enterpriseId) {
                            try {
                                const enterprise = await getEnterpriseProfile(mission.enterpriseId)
                                if (enterprise) {
                                    details.enterpriseName = enterprise.companyName
                                }
                            } catch (e) {
                                console.error(`Failed to fetch enterprise profile for ${mission.enterpriseId}`, e)
                            }
                        }
                        return details
                    })
                )

                this.missions = enhancedMissions
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des missions'
                console.error('Error fetching missions by expert:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch pending missions for admin
         */
        async fetchPendingMissions(): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.missions = await getPendingMissionsForAdmin()
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des missions'
                console.error('Error fetching pending missions:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch ALL missions for admin dashboard (all statuses)
         * Includes expert, enterprise, and project name resolution
         */
        async fetchAllMissions(): Promise<void> {
            this.loading = true
            this.error = null

            try {
                const missions = await getAllMissionsForAdmin()

                // Enhance missions with expert, enterprise, and project details
                const enhancedMissions: MissionWithDetails[] = await Promise.all(
                    missions.map(async (mission) => {
                        const details: MissionWithDetails = { ...mission }

                        // Fetch expert name
                        if (mission.expertId) {
                            try {
                                const expert = await getUserProfile(mission.expertId)
                                if (expert) {
                                    details.expertName = `${expert.firstName} ${expert.lastName}`
                                }
                            } catch (e) {
                                console.error(`Failed to fetch expert profile for ${mission.expertId}`, e)
                            }
                        }

                        // Fetch enterprise name
                        if (mission.enterpriseId) {
                            try {
                                const enterprise = await getEnterpriseProfile(mission.enterpriseId)
                                if (enterprise) {
                                    details.enterpriseName = enterprise.companyName
                                }
                            } catch (e) {
                                console.error(`Failed to fetch enterprise for ${mission.enterpriseId}`, e)
                            }
                        }

                        // Fetch project title
                        if (mission.projectId) {
                            try {
                                const project = await getProject(mission.projectId)
                                if (project) {
                                    details.projectTitle = project.title
                                }
                            } catch (e) {
                                console.error(`Failed to fetch project for ${mission.projectId}`, e)
                            }
                        }

                        return details
                    })
                )

                this.missions = enhancedMissions
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des missions'
                console.error('Error fetching all missions:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch a single mission with details
         */
        async fetchMission(missionId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                const mission = await getMission(missionId)

                if (!mission) {
                    this.error = 'Mission introuvable'
                    return
                }

                this.currentMission = mission

                // Build mission details
                const details: MissionWithDetails = { ...mission }

                // Fetch project title
                const project = await getProject(mission.projectId)
                if (project) {
                    details.projectTitle = project.title
                }

                // Fetch enterprise name
                const enterprise = await getEnterpriseProfile(mission.enterpriseId)
                if (enterprise) {
                    details.enterpriseName = enterprise.companyName
                }

                // Fetch expert name if assigned
                if (mission.expertId) {
                    const expert = await getUserProfile(mission.expertId)
                    if (expert) {
                        details.expertName = `${expert.firstName} ${expert.lastName}`
                    }
                }

                this.missionDetails = details
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement de la mission'
                console.error('Error fetching mission:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Create a new mission
         */
        async createMission(
            projectId: string,
            enterpriseId: string,
            data: CreateMissionData
        ): Promise<string | null> {
            this.loading = true
            this.error = null

            try {
                const missionId = await createMissionService(projectId, enterpriseId, data)

                // Refresh missions list
                await this.fetchMissionsByProject(projectId)

                return missionId
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la création de la mission'
                console.error('Error creating mission:', err)
                return null
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch available experts for admin assignment
         */
        async fetchAvailableExperts(): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.availableExperts = await getAvailableExperts()
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des experts'
                console.error('Error fetching available experts:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Assign an expert to a mission (admin action)
         */
        async assignExpert(missionId: string, expertId: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await assignExpertToMission(missionId, expertId)

                // Update local state
                const index = this.missions.findIndex(m => m.id === missionId)
                if (index !== -1) {
                    this.missions[index] = Object.assign({}, this.missions[index], {
                        expertId,
                        status: 'proposed' as const
                    })
                }

                if (this.currentMission?.id === missionId) {
                    this.currentMission = {
                        ...this.currentMission,
                        expertId,
                        status: 'proposed'
                    }
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de l\'affectation de l\'expert'
                console.error('Error assigning expert:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Accept a mission (expert action)
         */
        async acceptMission(missionId: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await acceptMissionService(missionId)

                // Update local state
                const index = this.missions.findIndex(m => m.id === missionId)
                if (index !== -1) {
                    this.missions[index] = Object.assign({}, this.missions[index], {
                        status: 'accepted' as const
                    })
                }

                if (this.currentMission?.id === missionId) {
                    this.currentMission = {
                        ...this.currentMission,
                        status: 'accepted'
                    }
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation de la mission'
                console.error('Error accepting mission:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Refuse a mission (expert action)
         * Returns mission to admin queue
         */
        async refuseMission(missionId: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await refuseMissionService(missionId)

                // Update local state - mission goes back to pending_admin
                const index = this.missions.findIndex(m => m.id === missionId)
                if (index !== -1) {
                    this.missions[index] = Object.assign({}, this.missions[index], {
                        status: 'pending_admin' as const,
                        expertId: null
                    })
                }

                if (this.currentMission?.id === missionId) {
                    this.currentMission = {
                        ...this.currentMission,
                        status: 'pending_admin',
                        expertId: null
                    }
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du refus de la mission'
                console.error('Error refusing mission:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Complete a mission (enterprise action)
         */
        async completeMission(missionId: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                const { completeMission: completeMissionService } = await import('~/firebase/services/firestore')
                await completeMissionService(missionId)

                // Update local state
                const index = this.missions.findIndex(m => m.id === missionId)
                if (index !== -1) {
                    this.missions[index] = Object.assign({}, this.missions[index], {
                        status: 'completed' as const
                    })
                }

                if (this.currentMission?.id === missionId) {
                    this.currentMission = {
                        ...this.currentMission,
                        status: 'completed'
                    }
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la finalisation de la mission'
                console.error('Error completing mission:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Delete a mission
         */
        async deleteMission(missionId: string): Promise<boolean> {
            try {
                await deleteMissionService(missionId)
                // Remove from local state
                this.missions = this.missions.filter(m => m.id !== missionId)
                return true
            } catch (err) {
                console.error('Error deleting mission:', err)
                this.error = err instanceof Error ? err.message : 'Erreur lors de la suppression de la mission'
                return false
            }
        },

        /**
         * Cancel expert from a mission (enterprise action)
         * Removes expert assignment and sets expert availability to false
         */
        async cancelExpert(missionId: string, expertId: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await cancelExpertFromMissionService(missionId, expertId)

                // Update local state
                const index = this.missions.findIndex(m => m.id === missionId)
                if (index !== -1) {
                    this.missions[index] = Object.assign({}, this.missions[index], {
                        expertId: null,
                        status: 'pending_admin' as const,
                        expertName: undefined
                    })
                }

                if (this.currentMission?.id === missionId) {
                    this.currentMission = {
                        ...this.currentMission,
                        expertId: null,
                        status: 'pending_admin'
                    }
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de l\'annulation de l\'expert'
                console.error('Error cancelling expert:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Clear current mission
         */
        clearCurrentMission(): void {
            this.currentMission = null
            this.missionDetails = null
        },

        /**
         * Clear error
         */
        clearError(): void {
            this.error = null
        }
    }
})
