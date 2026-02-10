/**
 * Notifications Client Service
 * 
 * Client-side service for admin notifications with real-time updates
 */

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    Timestamp,
    type Firestore,
    type Unsubscribe
} from 'firebase/firestore'
import type { Notification, CreateNotificationData } from '~/types/notification'

// ========================================
// Create Notification
// ========================================

/**
 * Create a new notification for admins
 */
export async function createNotification(data: CreateNotificationData): Promise<string> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')

    const docRef = await addDoc(notificationsRef, {
        ...data,
        read: false,
        createdAt: Timestamp.now()
    })

    return docRef.id
}

// ========================================
// Read Notifications
// ========================================

/**
 * Get recent notifications for admin
 * Returns last 20 notifications
 */
export async function getAdminNotifications(): Promise<Notification[]> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('targetRole', '==', 'admin'),
        limit(50)
    )

    const snapshot = await getDocs(q)

    const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Notification[]

    // Sort by createdAt descending
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return notifications.slice(0, 20)
}

/**
 * Subscribe to real-time notifications updates
 * Returns unsubscribe function
 */
export function subscribeToNotifications(
    callback: (notifications: Notification[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')

    // Simplified query without orderBy to avoid composite index requirement
    // We'll sort in memory instead
    const q = query(
        notificationsRef,
        where('targetRole', '==', 'admin'),
        limit(50)
    )

    return onSnapshot(
        q,
        (snapshot) => {
            console.log('Notifications snapshot received:', snapshot.docs.length, 'docs')
            // Map documents and sort by createdAt in memory
            const notifications = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                })) as Notification[]

            // Sort by createdAt descending
            notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

            // Take only first 20
            const limited = notifications.slice(0, 20)
            console.log('Processed notifications:', limited.length)

            callback(limited)
        },
        (error) => {
            console.error('Firestore onSnapshot error:', error)
            if (onError) {
                onError(error as Error)
            }
        }
    )
}

// ========================================
// Update Notifications
// ========================================

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationRef = doc(db, 'notifications', notificationId)
    await updateDoc(notificationRef, { read: true })
}

/**
 * Mark all admin notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    // Get all unread notifications
    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('targetRole', '==', 'admin'),
        where('read', '==', false)
    )

    const snapshot = await getDocs(q)

    // Update each one
    const updatePromises = snapshot.docs.map(docSnap =>
        updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
    )

    await Promise.all(updatePromises)
}
