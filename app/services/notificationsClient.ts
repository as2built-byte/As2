/**
 * Notifications Client Service
 * 
 * Client-side service for notifications with real-time updates
 * Supports admin, expert, and enterprise notifications
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
 * Create a new notification
 */
export async function createNotification(data: CreateNotificationData): Promise<string> {
    const { $firebaseFirestore, $firebaseAuth } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')

    const docRef = await addDoc(notificationsRef, {
        ...data,
        read: false,
        createdBy: data.createdBy || ($firebaseAuth as any)?.currentUser?.uid || '',
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
 * Subscribe to real-time admin notifications
 * Returns unsubscribe function
 */
export function subscribeToNotifications(
    callback: (notifications: Notification[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')

    const q = query(
        notificationsRef,
        where('targetRole', '==', 'admin'),
        limit(50)
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const notifications = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                })) as Notification[]

            notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            callback(notifications.slice(0, 20))
        },
        (error) => {
            console.error('Firestore onSnapshot error:', error)
            if (onError) {
                onError(error as Error)
            }
        }
    )
}

/**
 * Subscribe to real-time user-specific notifications (expert/enterprise)
 * Queries by targetUserId
 */
export function subscribeToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')

    const q = query(
        notificationsRef,
        where('targetUserId', '==', userId),
        limit(50)
    )

    return onSnapshot(
        q,
        (snapshot) => {
            const notifications = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                })) as Notification[]

            notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            callback(notifications.slice(0, 20))
        },
        (error) => {
            console.error('Firestore user notifications error:', error)
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

    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('targetRole', '==', 'admin'),
        where('read', '==', false)
    )

    const snapshot = await getDocs(q)

    const updatePromises = snapshot.docs.map(docSnap =>
        updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
    )

    await Promise.all(updatePromises)
}

/**
 * Mark all user-specific notifications as read
 */
export async function markAllUserNotificationsAsRead(userId: string): Promise<void> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('targetUserId', '==', userId),
        where('read', '==', false)
    )

    const snapshot = await getDocs(q)

    const updatePromises = snapshot.docs.map(docSnap =>
        updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
    )

    await Promise.all(updatePromises)
}
