/**
 * Projects Store
 * 
 * Manages project state for enterprise users
 */
import { defineStore } from 'pinia'
import type { Project, CreateProjectData, UpdateProjectData, EnterpriseProfile } from '~/types'
import {
    getProjectsByEnterprise,
    getProjectsByMember,
    getProject,
    createProject,
    updateProject,
    canCreateProject,
    requestSubscription,
    getEnterpriseProfile
} from '~/firebase/services/firestore'

interface ProjectsState {
    projects: Project[]
    currentProject: Project | null
    loading: boolean
    error: string | null
    canCreateMore: boolean
    enterpriseProfile: EnterpriseProfile | null
}

export const useProjectsStore = defineStore('projects', {
    state: (): ProjectsState => ({
        projects: [],
        currentProject: null,
        loading: false,
        error: null,
        canCreateMore: true,
        enterpriseProfile: null
    }),

    getters: {
        /** Projects by status */
        projectsByStatus: (state) => (status: Project['status']) => {
            return state.projects.filter(p => p.status === status)
        },

        /** Active projects (not completed) */
        activeProjects: (state) => {
            return state.projects.filter(p => p.status === 'active')
        },

        /** Has subscription */
        hasSubscription: (state) => {
            return state.enterpriseProfile?.hasSubscription ?? false
        },

        /** Project count */
        projectCount: (state) => {
            return state.enterpriseProfile?.projectCount ?? 0
        },

        /** Subscription request pending */
        subscriptionRequestPending: (state) => {
            return state.enterpriseProfile?.subscriptionRequestPending ?? false
        }
    },

    actions: {
        /**
         * Fetch all projects for an enterprise
         */
        async fetchProjects(enterpriseId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                // Fetch projects
                this.projects = await getProjectsByEnterprise(enterpriseId)

                // Check if can create more
                this.canCreateMore = await canCreateProject(enterpriseId)

                // Fetch enterprise profile for subscription info
                this.enterpriseProfile = await getEnterpriseProfile(enterpriseId)
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des projets'
                console.error('Error fetching projects:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch a single project by ID
         */
        async fetchProject(projectId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.currentProject = await getProject(projectId)

                if (!this.currentProject) {
                    this.error = 'Projet introuvable'
                }
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement du projet'
                console.error('Error fetching project:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Create a new project
         */
        async createProject(enterpriseId: string, data: CreateProjectData): Promise<string | null> {
            this.loading = true
            this.error = null

            try {
                const projectId = await createProject(enterpriseId, data)

                // Refresh projects list and subscription status
                await this.fetchProjects(enterpriseId)

                return projectId
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la création du projet'
                console.error('Error creating project:', err)
                return null
            } finally {
                this.loading = false
            }
        },

        /**
         * Update a project
         */
        async updateProject(projectId: string, data: UpdateProjectData): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await updateProject(projectId, data)

                // Update local state
                if (this.currentProject?.id === projectId) {
                    this.currentProject = { ...this.currentProject, ...data }
                }

                // Update in projects list
                const index = this.projects.findIndex(p => p.id === projectId)
                if (index !== -1) {
                    this.projects[index] = Object.assign({}, this.projects[index], data)
                }

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du projet'
                console.error('Error updating project:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Request subscription for more projects
         */
        async requestSubscription(enterpriseId: string, enterpriseName: string): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await requestSubscription(enterpriseId, enterpriseName)
                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la demande d\'abonnement'
                console.error('Error requesting subscription:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch projects assigned to a member
         */
        async fetchMemberProjects(memberId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.projects = await getProjectsByMember(memberId)
                // Members cannot create projects
                this.canCreateMore = false
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des projets'
                console.error('Error fetching member projects:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Clear current project
         */
        clearCurrentProject(): void {
            this.currentProject = null
        },

        /**
         * Clear error
         */
        clearError(): void {
            this.error = null
        }
    }
})
