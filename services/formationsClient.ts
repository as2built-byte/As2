/**
 * Formations Client Service
 * 
 * Client-side service for managing formations, packs, payments, and certifications
 * Used by expert and enterprise dashboards
 */

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    addDoc,
    updateDoc,
    arrayUnion,
    Timestamp,
    type Firestore
} from 'firebase/firestore'
import { getFirebaseFirestore } from '~/firebase/services/firestore'
import type { Formation, Pack } from '~/types/formation'
import { createNotification } from '~/services/notificationsClient'

// ========================================
// Types
// ========================================

export interface Payment {
    id: string
    userId: string
    itemType: 'formation' | 'pack' | 'audit'
    itemId: string
    createdAt: Date
}

export interface FormationWithStatus extends Formation {
    status: 'available' | 'in-progress' | 'completed'
    paymentDate?: Date
    /** If paid via a pack, reference to the pack */
    paidViaPack?: string
}

export interface PackWithDetails extends Pack {
    /** Resolved formation objects */
    formations: Formation[]
    /** Sum of individual formation prices */
    totalOriginalPrice: number
    /** Calculated discount percentage */
    discountPercent: number
    /** Pack status for user */
    status: 'available' | 'in-progress' | 'completed'
    /** Payment date if purchased */
    paymentDate?: Date
}

// ========================================
// Fetch Functions
// ========================================

/**
 * Get all active formations for catalog
 */
export async function getActiveFormations(): Promise<Formation[]> {
    let db: Firestore
    try {
        db = getFirebaseFirestore()
    } catch (error) {
        console.error('[Formations] Firebase not initialized:', error)
        throw new Error('Firebase DB not initialized')
    }

    const formationsRef = collection(db, 'formations')
    const q = query(
        formationsRef,
        where('isActive', '==', true)
    )

    const snapshot = await getDocs(q)

    const formations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Formation[]

    // Sort by createdAt desc in JavaScript to avoid composite index
    return formations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Get all packs from Firestore
 */
export async function getAllPacks(): Promise<Pack[]> {
    if (process.server) return []
    
    let db: Firestore
    try {
        db = getFirebaseFirestore()
    } catch (error) {
        console.error('[Formations] Firebase not initialized:', error)
        return []
    }

    const packsRef = collection(db, 'packs')
    const snapshot = await getDocs(packsRef)

    const packs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Pack[]

    return packs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Get user's payments for formations
 */
export async function getUserFormationPayments(userId: string): Promise<Payment[]> {
    if (process.server) return []
    
    let db: Firestore
    try {
        db = getFirebaseFirestore()
    } catch (error) {
        console.error('[Formations] Firebase not initialized:', error)
        return []
    }

    const paymentsRef = collection(db, 'payments')
    const q = query(
        paymentsRef,
        where('userId', '==', userId),
        where('itemType', '==', 'formation')
    )

    const snapshot = await getDocs(q)

    const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Payment[]

    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Get user's payments for packs
 */
export async function getUserPackPayments(userId: string): Promise<Payment[]> {
    if (process.server) return []
    
    let db: Firestore
    try {
        db = getFirebaseFirestore()
    } catch (error) {
        console.error('[Formations] Firebase not initialized:', error)
        return []
    }

    const paymentsRef = collection(db, 'payments')
    const q = query(
        paymentsRef,
        where('userId', '==', userId),
        where('itemType', '==', 'pack')
    )

    const snapshot = await getDocs(q)

    const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Payment[]

    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Get user's certifications array based on role
 */
export async function getUserCertifications(userId: string, role: 'expert' | 'enterprise'): Promise<string[]> {
    if (process.server) return []
    
    let db: Firestore
    try {
        db = getFirebaseFirestore()
    } catch (error) {
        console.error('[Formations] Firebase not initialized:', error)
        return []
    }

    const collectionName = role === 'expert' ? 'experts' : 'enterprises'
    const docRef = doc(db, collectionName, userId)

    const { getDoc } = await import('firebase/firestore')
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
        return docSnap.data().certifications || []
    }

    return []
}

/**
 * Get formations with status for user
 * Combines formations, payments (direct + pack), and certifications data
 */
export async function getFormationsWithStatus(
    userId: string,
    role: 'expert' | 'enterprise'
): Promise<FormationWithStatus[]> {
    // Fetch all data in parallel
    const [formations, directPayments, packPayments, packs, certifications] = await Promise.all([
        getActiveFormations(),
        getUserFormationPayments(userId),
        getUserPackPayments(userId),
        getAllPacks(),
        getUserCertifications(userId, role)
    ])

    // Create a map of directly paid formation IDs with payment dates
    const paidFormations = new Map<string, { date: Date; packId?: string }>()
    directPayments.forEach(payment => {
        paidFormations.set(payment.itemId, { date: payment.createdAt })
    })

    // For pack payments, mark all formations in each pack as paid
    packPayments.forEach(packPayment => {
        const pack = packs.find(p => p.id === packPayment.itemId)
        if (pack) {
            pack.formationIds.forEach(formationId => {
                // Only set if not already paid directly (direct payment takes priority)
                if (!paidFormations.has(formationId)) {
                    paidFormations.set(formationId, {
                        date: packPayment.createdAt,
                        packId: pack.id
                    })
                }
            })
        }
    })

    // Create a set of certified formation IDs
    const certifiedFormations = new Set(certifications)

    // Map formations with their status
    return formations.map(formation => {
        let status: 'available' | 'in-progress' | 'completed' = 'available'
        let paymentDate: Date | undefined
        let paidViaPack: string | undefined

        const paymentInfo = paidFormations.get(formation.id)

        if (certifiedFormations.has(formation.id)) {
            status = 'completed'
            paymentDate = paymentInfo?.date
            paidViaPack = paymentInfo?.packId
        } else if (paymentInfo) {
            status = 'in-progress'
            paymentDate = paymentInfo.date
            paidViaPack = paymentInfo.packId
        }

        return {
            ...formation,
            status,
            paymentDate,
            paidViaPack
        }
    })
}

/**
 * Get packs with status for user
 * Includes calculated discount and resolved formations
 */
export async function getPacksWithStatus(
    userId: string,
    role: 'expert' | 'enterprise'
): Promise<PackWithDetails[]> {
    // Fetch all data in parallel
    const [packs, formations, packPayments, certifications] = await Promise.all([
        getAllPacks(),
        getActiveFormations(),
        getUserPackPayments(userId),
        getUserCertifications(userId, role)
    ])

    // Create map of formations by ID
    const formationsMap = new Map(formations.map(f => [f.id, f]))

    // Create payment map for packs
    const paidPacks = new Map<string, Date>()
    packPayments.forEach(payment => {
        paidPacks.set(payment.itemId, payment.createdAt)
    })

    // Create set of certified formations
    const certifiedFormations = new Set(certifications)

    return packs
        .map(pack => {
            // Resolve formations for this pack
            const packFormations = pack.formationIds
                .map(id => formationsMap.get(id))
                .filter((f): f is Formation => f !== undefined)

            // Pack is only active if ALL its formations are active
            const allFormationsActive = pack.formationIds.every(id => formationsMap.has(id))
            if (!allFormationsActive) {
                return null
            }

            // Calculate totals
            const totalOriginalPrice = packFormations.reduce((sum, f) => sum + f.price, 0)
            const discountPercent = totalOriginalPrice > 0
                ? Math.round(((totalOriginalPrice - pack.price) / totalOriginalPrice) * 100)
                : 0

            // Determine status
            let status: 'available' | 'in-progress' | 'completed' = 'available'
            let paymentDate: Date | undefined = undefined

            // Check if pack is paid
            if (paidPacks.has(pack.id)) {
                paymentDate = paidPacks.get(pack.id)
                // Check if all formations are certified
                const allCertified = pack.formationIds.every(id => certifiedFormations.has(id))
                status = allCertified ? 'completed' : 'in-progress'
            }

            const result: PackWithDetails = {
                ...pack,
                formations: packFormations,
                totalOriginalPrice,
                discountPercent,
                status,
                paymentDate
            }

            return result
        })
        .filter((p): p is PackWithDetails => p !== null)
}

// ========================================
// Payment Functions
// ========================================

/**
 * Create a payment record for a formation
 * Also creates an admin notification
 */
export async function createFormationPayment(
    userId: string,
    formationId: string,
    userInfo?: { name: string; role: 'expert' | 'enterprise' },
    formationInfo?: { title: string; price: number }
): Promise<string> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const paymentsRef = collection(db, 'payments')

    const docRef = await addDoc(paymentsRef, {
        userId,
        itemType: 'formation',
        itemId: formationId,
        createdAt: Timestamp.now()
    })

    // Create admin notification
    try {
        await createNotification({
            type: 'new_payment',
            title: 'Nouvelle inscription',
            message: `${userInfo?.name || 'Un utilisateur'} s'est inscrit à la formation "${formationInfo?.title || 'Formation'}"`,
            data: {
                userId,
                userName: userInfo?.name,
                userRole: userInfo?.role,
                itemType: 'formation',
                itemId: formationId,
                itemTitle: formationInfo?.title,
                amount: formationInfo?.price
            },
            targetRole: 'admin'
        })
    } catch (err) {
        // Don't fail payment if notification fails
        console.error('Failed to create notification:', err)
    }

    return docRef.id
}

/**
 * Create a payment record for a pack
 * Also creates an admin notification
 */
export async function createPackPayment(
    userId: string,
    packId: string,
    userInfo?: { name: string; role: 'expert' | 'enterprise' },
    packInfo?: { title: string; price: number }
): Promise<string> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const paymentsRef = collection(db, 'payments')

    const docRef = await addDoc(paymentsRef, {
        userId,
        itemType: 'pack',
        itemId: packId,
        createdAt: Timestamp.now()
    })

    // Create admin notification
    try {
        await createNotification({
            type: 'new_payment',
            title: 'Nouvelle inscription (Pack)',
            message: `${userInfo?.name || 'Un utilisateur'} s'est inscrit au pack "${packInfo?.title || 'Pack'}"`,
            data: {
                userId,
                userName: userInfo?.name,
                userRole: userInfo?.role,
                itemType: 'pack',
                itemId: packId,
                itemTitle: packInfo?.title,
                amount: packInfo?.price
            },
            targetRole: 'admin'
        })
    } catch (err) {
        // Don't fail payment if notification fails
        console.error('Failed to create notification:', err)
    }

    return docRef.id
}

/**
 * Add formation to user's certifications (called by admin after completion)
 */
export async function addCertification(
    userId: string,
    role: 'expert' | 'enterprise',
    formationId: string
): Promise<void> {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore

    const collectionName = role === 'expert' ? 'experts' : 'enterprises'
    const docRef = doc(db, collectionName, userId)

    await updateDoc(docRef, {
        certifications: arrayUnion(formationId)
    })
}
