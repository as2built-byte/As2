/**
 * Admin Store - Pinia
 * 
 * Manages admin-specific state for As2Built
 * Users = source of truth, conditional loading of expert/enterprise profiles
 */

import { defineStore } from 'pinia'
import type {
    AdminState,
    AdminDashboardStats,
    UserWithDetails,
    UserStatus
} from '~/types'
import {
    getAllUsers,
    getUsersByStatus,
    updateUserStatus,
    getExpertProfile,
    getEnterpriseProfile
} from '~/firebase/services/firestore'

const initialStats: AdminDashboardStats = {
    totalUsers: 0,
    pendingUsers: 0,
    totalExperts: 0,
    totalEnterprises: 0
}

export const useAdminStore = defineStore('admin', {
    state: (): AdminState => ({
        users: [],
        usersLoading: false,
        usersError: null,
        userRoleFilter: 'all',
        userStatusFilter: 'all',
        stats: { ...initialStats }
    }),

    getters: {
        /** Get filtered users based on current filters */
        filteredUsers: (state): UserWithDetails[] => {
            return state.users.filter(user => {
                // Role filter
                if (state.userRoleFilter !== 'all' && user.role !== state.userRoleFilter) {
                    return false
                }
                // Status filter
                if (state.userStatusFilter !== 'all' && user.status !== state.userStatusFilter) {
                    return false
                }
                return true
            })
        },

        /** Get pending users count */
        pendingCount: (state): number => {
            return state.users.filter(u => u.status === 'pending').length
        },

        /** Get experts count */
        expertsCount: (state): number => {
            return state.users.filter(u => u.role === 'expert').length
        },

        /** Get enterprises count */
        enterprisesCount: (state): number => {
            return state.users.filter(u => u.role === 'enterprise').length
        }
    },

    actions: {
        /**
         * Fetch all users (experts + enterprises, no admins)
         * Conditionally loads expert/enterprise profiles
         */
        async fetchAllUsers(): Promise<void> {
            this.usersLoading = true
            this.usersError = null

            try {
                const users = await getAllUsers()

                // Conditionally load profiles based on role
                const usersWithDetails: UserWithDetails[] = await Promise.all(
                    users.map(async (user) => {
                        const userWithDetails: UserWithDetails = { ...user }

                        if (user.role === 'expert') {
                            userWithDetails.expertProfile = await getExpertProfile(user.uid) || undefined
                        } else if (user.role === 'enterprise') {
                            userWithDetails.enterpriseProfile = await getEnterpriseProfile(user.uid) || undefined
                        }

                        return userWithDetails
                    })
                )

                this.users = usersWithDetails
                this.updateStats()
            } catch (error) {
                console.error('Error fetching users:', error)
                this.usersError = 'Erreur lors du chargement des utilisateurs'
            } finally {
                this.usersLoading = false
            }
        },

        /**
         * Fetch pending users only
         */
        async fetchPendingUsers(): Promise<void> {
            this.usersLoading = true
            this.usersError = null

            try {
                const users = await getUsersByStatus('pending')

                const usersWithDetails: UserWithDetails[] = await Promise.all(
                    users.map(async (user) => {
                        const userWithDetails: UserWithDetails = { ...user }

                        if (user.role === 'expert') {
                            userWithDetails.expertProfile = await getExpertProfile(user.uid) || undefined
                        } else if (user.role === 'enterprise') {
                            userWithDetails.enterpriseProfile = await getEnterpriseProfile(user.uid) || undefined
                        }

                        return userWithDetails
                    })
                )

                this.users = usersWithDetails
            } catch (error) {
                console.error('Error fetching pending users:', error)
                this.usersError = 'Erreur lors du chargement des utilisateurs en attente'
            } finally {
                this.usersLoading = false
            }
        },

        /**
         * Activate a user (change status to 'active')
         */
        async activateUser(uid: string): Promise<boolean> {
            try {
                await updateUserStatus(uid, 'active')

                // Update local state
                const user = this.users.find(u => u.uid === uid)
                if (user) {
                    user.status = 'active'
                }

                this.updateStats()
                return true
            } catch (error) {
                console.error('Error activating user:', error)
                this.usersError = 'Erreur lors de l\'activation du compte'
                return false
            }
        },

        /**
         * Deactivate a user (change status to 'inactive')
         */
        async deactivateUser(uid: string): Promise<boolean> {
            try {
                await updateUserStatus(uid, 'inactive')

                // Update local state
                const user = this.users.find(u => u.uid === uid)
                if (user) {
                    user.status = 'inactive'
                }

                this.updateStats()
                return true
            } catch (error) {
                console.error('Error deactivating user:', error)
                this.usersError = 'Erreur lors de la désactivation du compte'
                return false
            }
        },

        /**
         * Reject a user registration (change status to 'rejected')
         */
        async rejectUser(uid: string): Promise<boolean> {
            try {
                await updateUserStatus(uid, 'rejected')

                // Update local state
                const user = this.users.find(u => u.uid === uid)
                if (user) {
                    user.status = 'rejected'
                }

                this.updateStats()
                return true
            } catch (error) {
                console.error('Error rejecting user:', error)
                this.usersError = 'Erreur lors du refus de l\'inscription'
                return false
            }
        },

        /**
         * Set user back to pending
         */
        async setPendingUser(uid: string): Promise<boolean> {
            try {
                await updateUserStatus(uid, 'pending')

                const user = this.users.find(u => u.uid === uid)
                if (user) {
                    user.status = 'pending'
                }

                this.updateStats()
                return true
            } catch (error) {
                console.error('Error setting user to pending:', error)
                this.usersError = 'Erreur lors de la mise en attente du compte'
                return false
            }
        },

        /**
         * Set role filter
         */
        setRoleFilter(role: 'all' | 'expert' | 'enterprise'): void {
            this.userRoleFilter = role
        },

        /**
         * Set status filter
         */
        setStatusFilter(status: 'all' | UserStatus): void {
            this.userStatusFilter = status
        },

        /**
         * Update dashboard stats from current users
         */
        updateStats(): void {
            this.stats = {
                totalUsers: this.users.length,
                pendingUsers: this.users.filter(u => u.status === 'pending').length,
                totalExperts: this.users.filter(u => u.role === 'expert').length,
                totalEnterprises: this.users.filter(u => u.role === 'enterprise').length
            }
        },

        /**
         * Clear any errors
         */
        clearError(): void {
            this.usersError = null
        }
    }
})
