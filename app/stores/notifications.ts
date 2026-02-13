/**
 * Notifications Store
 * 
 * Pinia store for notifications with real-time updates
 * Supports admin, expert, and enterprise notifications
 */

import { defineStore } from 'pinia'
import type { Notification } from '~/types/notification'
import {
    subscribeToNotifications,
    subscribeToUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    markAllUserNotificationsAsRead
} from '~/services/notificationsClient'
import type { Unsubscribe } from 'firebase/firestore'

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [] as Notification[],
        loading: true,
        error: null as string | null,
        _unsubscribe: null as Unsubscribe | null,
        _subscribedUserId: null as string | null
    }),

    getters: {
        /** Count of unread notifications */
        unreadCount: (state): number => {
            return state.notifications.filter(n => !n.read).length
        },

        /** Get only unread notifications */
        unreadNotifications: (state): Notification[] => {
            return state.notifications.filter(n => !n.read)
        },

        /** Get recent notifications (last 10) */
        recentNotifications: (state): Notification[] => {
            return state.notifications.slice(0, 10)
        }
    },

    actions: {
        /**
         * Subscribe to real-time admin notifications
         * Should be called when admin layout mounts
         */
        subscribe() {
            if (this._unsubscribe) return

            this.loading = true
            this.error = null

            try {
                this._unsubscribe = subscribeToNotifications(
                    (notifications) => {
                        this.notifications = notifications
                        this.loading = false
                    },
                    (error) => {
                        console.error('Failed to subscribe to notifications:', error)
                        this.error = 'Erreur de connexion aux notifications'
                        this.loading = false
                    }
                )
            } catch (err) {
                console.error('Failed to subscribe to notifications:', err)
                this.error = 'Erreur de connexion aux notifications'
                this.loading = false
            }
        },

        /**
         * Subscribe to real-time user-specific notifications (expert/enterprise)
         * Should be called when expert or enterprise layout mounts
         */
        subscribeAsUser(userId: string) {
            // Avoid duplicate subscriptions for same user
            if (this._unsubscribe && this._subscribedUserId === userId) return

            // Cleanup previous subscription if any
            this.unsubscribe()

            this.loading = true
            this.error = null
            this._subscribedUserId = userId

            try {
                this._unsubscribe = subscribeToUserNotifications(
                    userId,
                    (notifications) => {
                        this.notifications = notifications
                        this.loading = false
                    },
                    (error) => {
                        console.error('Failed to subscribe to user notifications:', error)
                        this.error = 'Erreur de connexion aux notifications'
                        this.loading = false
                    }
                )
            } catch (err) {
                console.error('Failed to subscribe to user notifications:', err)
                this.error = 'Erreur de connexion aux notifications'
                this.loading = false
            }
        },

        /**
         * Unsubscribe from real-time updates
         */
        unsubscribe() {
            if (this._unsubscribe) {
                this._unsubscribe()
                this._unsubscribe = null
                this._subscribedUserId = null
            }
        },

        /**
         * Mark a single notification as read
         */
        async markAsRead(notificationId: string) {
            try {
                await markNotificationAsRead(notificationId)
                const notification = this.notifications.find(n => n.id === notificationId)
                if (notification) {
                    notification.read = true
                }
            } catch (err) {
                console.error('Failed to mark notification as read:', err)
            }
        },

        /**
         * Mark all notifications as read
         */
        async markAllAsRead() {
            try {
                if (this._subscribedUserId) {
                    await markAllUserNotificationsAsRead(this._subscribedUserId)
                } else {
                    await markAllNotificationsAsRead()
                }
                this.notifications.forEach(n => {
                    n.read = true
                })
            } catch (err) {
                console.error('Failed to mark all notifications as read:', err)
            }
        }
    }
})
