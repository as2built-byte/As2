/**
 * Notifications Store
 * 
 * Pinia store for admin notifications with real-time updates
 */

import { defineStore } from 'pinia'
import type { Notification } from '~/types/notification'
import {
    subscribeToNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '~/services/notificationsClient'
import type { Unsubscribe } from 'firebase/firestore'

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [] as Notification[],
        loading: true,
        error: null as string | null,
        _unsubscribe: null as Unsubscribe | null
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
         * Subscribe to real-time notifications
         * Should be called when admin layout mounts
         */
        subscribe() {
            // Avoid duplicate subscriptions
            if (this._unsubscribe) {
                return
            }

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
         * Unsubscribe from real-time updates
         * Should be called when admin layout unmounts
         */
        unsubscribe() {
            if (this._unsubscribe) {
                this._unsubscribe()
                this._unsubscribe = null
            }
        },

        /**
         * Mark a single notification as read
         */
        async markAsRead(notificationId: string) {
            try {
                await markNotificationAsRead(notificationId)
                // Optimistic update (real-time listener will confirm)
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
                await markAllNotificationsAsRead()
                // Optimistic update
                this.notifications.forEach(n => {
                    n.read = true
                })
            } catch (err) {
                console.error('Failed to mark all notifications as read:', err)
            }
        }
    }
})
