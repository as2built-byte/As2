/**
 * Audits Store
 * 
 * Pinia store for BIM maturity audits management
 */

import { defineStore } from 'pinia'
import type { Audit, AuditWithDetails, CreateAuditData, UpdateAuditData, ActionPlanStatus } from '~/types'
import {
    createAudit as createAuditService,
    getAuditsByEnterprise,
    getAudit as getAuditService,
    getAllAudits as getAllAuditsService,
    updateAudit as updateAuditService
} from '~/firebase/services/firestore'

export const useAuditsStore = defineStore('audits', {
    state: () => ({
        audits: [] as Audit[] | AuditWithDetails[],
        currentAudit: null as Audit | null,
        loading: false,
        error: null as string | null
    }),

    getters: {
        /** Get audits by status */
        pendingAudits: (state): (Audit | AuditWithDetails)[] => {
            return state.audits.filter(a => a.status === 'pending')
        },
        completedAudits: (state): (Audit | AuditWithDetails)[] => {
            return state.audits.filter(a => a.status === 'completed')
        },
        inProgressAudits: (state): (Audit | AuditWithDetails)[] => {
            return state.audits.filter(a => a.status === 'in_progress')
        },
        rejectedAudits: (state): (Audit | AuditWithDetails)[] => {
            return state.audits.filter(a => a.status === 'rejected')
        },

        /** Check if enterprise has a pending audit */
        hasPendingAudit: (state): boolean => {
            return state.audits.some(a => a.status === 'pending' || a.status === 'in_progress')
        }
    },

    actions: {
        /**
         * Fetch audits for an enterprise (gérant)
         */
        async fetchAudits(enterpriseId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.audits = await getAuditsByEnterprise(enterpriseId)
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des audits'
                console.error('Error fetching audits:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch all audits (admin)
         */
        async fetchAllAudits(): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.audits = await getAllAuditsService()
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement des audits'
                console.error('Error fetching all audits:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Fetch a single audit by ID
         */
        async fetchAudit(auditId: string): Promise<void> {
            this.loading = true
            this.error = null

            try {
                this.currentAudit = await getAuditService(auditId)
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'audit'
                console.error('Error fetching audit:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * Create a new audit request (gérant)
         */
        async requestAudit(
            enterpriseId: string,
            data: CreateAuditData
        ): Promise<string | null> {
            this.loading = true
            this.error = null

            try {
                const auditId = await createAuditService(enterpriseId, data)

                // Refresh audits list
                await this.fetchAudits(enterpriseId)

                return auditId
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la création de l\'audit'
                console.error('Error creating audit:', err)
                return null
            } finally {
                this.loading = false
            }
        },

        /**
         * Update an audit (admin)
         */
        async updateAudit(
            auditId: string,
            data: UpdateAuditData
        ): Promise<boolean> {
            this.loading = true
            this.error = null

            try {
                await updateAuditService(auditId, data)

                // Refresh current audit if it's the one being updated
                if (this.currentAudit?.id === auditId) {
                    await this.fetchAudit(auditId)
                }

                // Refresh all audits list
                await this.fetchAllAudits()

                return true
            } catch (err) {
                this.error = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'audit'
                console.error('Error updating audit:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        /**
         * Update a single phase status in the action plan (enterprise)
         */
        async updatePhaseStatus(
            auditId: string,
            phaseIndex: number,
            newStatus: ActionPlanStatus
        ): Promise<boolean> {
            if (!this.currentAudit || this.currentAudit.id !== auditId) return false
            if (phaseIndex < 0 || phaseIndex >= this.currentAudit.actionPlan.length) return false

            // Prevent backward transitions
            const statusOrder: Record<string, number> = { upcoming: 0, in_progress: 1, completed: 2 }
            const currentStatus = this.currentAudit.actionPlan[phaseIndex]?.status
            if (currentStatus && (statusOrder[newStatus] ?? 0) < (statusOrder[currentStatus] ?? 0)) return false
            // Prevent skipping: upcoming → completed (must go through in_progress)
            if (currentStatus === 'upcoming' && newStatus === 'completed') return false

            const oldActionPlan = this.currentAudit.actionPlan
            const newActionPlan = oldActionPlan.map((item, i) =>
                i === phaseIndex
                    ? { phase: item.phase, title: item.title, description: item.description, status: newStatus }
                    : item
            )

            // Optimistic update
            this.currentAudit = { ...this.currentAudit, actionPlan: newActionPlan }

            try {
                await updateAuditService(auditId, { actionPlan: newActionPlan })

                // Auto-complete: if all phases are now completed, mark audit as completed
                const allCompleted = newActionPlan.every(item => item.status === 'completed')
                if (allCompleted && this.currentAudit?.status === 'in_progress') {
                    await updateAuditService(auditId, { status: 'completed' })
                    this.currentAudit = { ...this.currentAudit, status: 'completed' }
                }

                return true
            } catch (err) {
                // Revert on error
                this.currentAudit = { ...this.currentAudit, actionPlan: oldActionPlan }
                this.error = 'Erreur lors de la mise à jour du statut'
                console.error('Error updating phase status:', err)
                return false
            }
        }
    }
})
