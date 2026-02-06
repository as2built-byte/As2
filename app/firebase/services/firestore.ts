/**
 * Firebase Firestore Service
 * 
 * Provides Firestore database functionality for As2Built.
 * Collections: users, experts, enterprises, formations, packs
 */

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    type Firestore,
    type DocumentData
} from 'firebase/firestore'
import { getFirebaseApp } from '../index'
import type {
    UserProfile,
    CreateUserData,
    ExpertProfile,
    CreateExpertData,
    EnterpriseProfile,
    CreateEnterpriseData,
    UserStatus,
    UserWithDetails,
    Formation,
    CreateFormationData,
    UpdateFormationData,
    Pack,
    CreatePackData,
    UpdatePackData
} from '~/types'

let firestoreInstance: Firestore | null = null

/**
 * Get the Firebase Firestore instance
 */
export function getFirebaseFirestore(): Firestore {
    if (firestoreInstance) {
        return firestoreInstance
    }

    const app = getFirebaseApp()
    firestoreInstance = getFirestore(app)
    return firestoreInstance
}

// ========================================
// Collection Names
// ========================================

export const COLLECTIONS = {
    USERS: 'users',
    EXPERTS: 'experts',
    ENTERPRISES: 'enterprises',
    FORMATIONS: 'formations',
    PACKS: 'packs',
} as const

// ========================================
// Phone Uniqueness Check
// ========================================

/**
 * Check if a phone number is already registered
 * @param phone Phone number to check
 * @returns true if phone exists, false otherwise
 */
export async function isPhoneRegistered(phone: string): Promise<boolean> {
    try {
        const db = getFirebaseFirestore()
        const usersRef = collection(db, COLLECTIONS.USERS)
        const q = query(usersRef, where('phone', '==', phone))
        const querySnapshot = await getDocs(q)

        return !querySnapshot.empty
    } catch (error) {
        // If query fails (e.g., missing index), log and return false
        // Registration proceeds, phone uniqueness can be handled by Firestore rules
        console.warn('Phone check failed:', error)
        return false
    }
}

// ========================================
// User Profile Functions
// ========================================

/**
 * Create a new user profile
 * @param uid User ID from Firebase Auth
 * @param data User data (firstName, lastName, no displayName)
 */
export async function createUserProfile(
    uid: string,
    data: CreateUserData
): Promise<void> {
    const db = getFirebaseFirestore()
    const userRef = doc(db, COLLECTIONS.USERS, uid)

    await setDoc(userRef, {
        uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        createdAt: serverTimestamp(),
    })
}

/**
 * Get a user profile by UID
 * @param uid User ID
 * @returns User profile or null
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const db = getFirebaseFirestore()
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
        return null
    }

    const data = userSnap.data()
    return {
        uid: userSnap.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
    } as UserProfile
}

/**
 * Update a user profile
 * @param uid User ID
 * @param data Partial user data to update
 */
export async function updateUserProfile(
    uid: string,
    data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
    const db = getFirebaseFirestore()
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    await updateDoc(userRef, data as DocumentData)
}

// ========================================
// Expert Profile Functions
// ========================================

/**
 * Create a new expert profile
 * @param uid User ID from Firebase Auth
 * @param data Expert data
 */
export async function createExpertProfile(
    uid: string,
    data?: CreateExpertData
): Promise<void> {
    const db = getFirebaseFirestore()
    const expertRef = doc(db, COLLECTIONS.EXPERTS, uid)

    await setDoc(expertRef, {
        uid,
        certifications: [],
        cvUrl: data?.cvUrl || null,
        availability: true,
        createdAt: serverTimestamp(),
    })
}

/**
 * Get an expert profile by UID
 * @param uid User ID
 * @returns Expert profile or null
 */
export async function getExpertProfile(uid: string): Promise<ExpertProfile | null> {
    const db = getFirebaseFirestore()
    const expertRef = doc(db, COLLECTIONS.EXPERTS, uid)
    const expertSnap = await getDoc(expertRef)

    if (!expertSnap.exists()) {
        return null
    }

    const data = expertSnap.data()
    return {
        uid: expertSnap.id,
        certifications: data.certifications || [],
        cvUrl: data.cvUrl || null,
        availability: data.availability ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
    } as ExpertProfile
}

/**
 * Update an expert profile
 * @param uid User ID
 * @param data Partial expert data to update (availability, cvUrl)
 */
export async function updateExpertProfile(
    uid: string,
    data: Partial<Omit<ExpertProfile, 'uid' | 'certifications' | 'createdAt'>>
): Promise<void> {
    const db = getFirebaseFirestore()
    const expertRef = doc(db, COLLECTIONS.EXPERTS, uid)
    await updateDoc(expertRef, data as DocumentData)
}

// ========================================
// Enterprise Profile Functions
// ========================================

/**
 * Create a new enterprise profile
 * @param uid User ID from Firebase Auth
 * @param data Enterprise data (only companyName)
 */
export async function createEnterpriseProfile(
    uid: string,
    data: CreateEnterpriseData
): Promise<void> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, uid)

    await setDoc(enterpriseRef, {
        uid,
        companyName: data.companyName,
        createdAt: serverTimestamp(),
    })
}

/**
 * Get an enterprise profile by UID
 * @param uid User ID
 * @returns Enterprise profile or null
 */
export async function getEnterpriseProfile(uid: string): Promise<EnterpriseProfile | null> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, uid)
    const enterpriseSnap = await getDoc(enterpriseRef)

    if (!enterpriseSnap.exists()) {
        return null
    }

    const data = enterpriseSnap.data()
    return {
        uid: enterpriseSnap.id,
        companyName: data.companyName,
        createdAt: data.createdAt?.toDate() || new Date(),
    } as EnterpriseProfile
}

// ========================================
// Admin Functions
// ========================================

/**
 * Get all users (experts and enterprises only, excludes admins)
 * Admin only function
 */
export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(usersRef, where('role', 'in', ['expert', 'enterprise']))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            uid: docSnap.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: data.role,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as UserProfile
    })
}

/**
 * Get users by status (excludes admins)
 * @param status Status to filter by
 */
export async function getUsersByStatus(status: UserStatus): Promise<UserProfile[]> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(
        usersRef,
        where('role', 'in', ['expert', 'enterprise']),
        where('status', '==', status)
    )
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            uid: docSnap.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: data.role,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as UserProfile
    })
}

/**
 * Update user status (admin only)
 * @param uid User ID
 * @param status New status
 */
export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
    const db = getFirebaseFirestore()
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    await updateDoc(userRef, { status })
}

/**
 * Get user with details (conditionally loads expert or enterprise profile)
 * @param uid User ID
 */
export async function getUserWithDetails(uid: string): Promise<UserWithDetails | null> {
    const userProfile = await getUserProfile(uid)
    if (!userProfile) return null

    const userWithDetails: UserWithDetails = { ...userProfile }

    // Conditional loading based on role
    if (userProfile.role === 'expert') {
        userWithDetails.expertProfile = await getExpertProfile(uid) || undefined
    } else if (userProfile.role === 'enterprise') {
        userWithDetails.enterpriseProfile = await getEnterpriseProfile(uid) || undefined
    }

    return userWithDetails
}

// ========================================
// Formation Functions
// ========================================

/**
 * Get all formations
 */
export async function getAllFormations(): Promise<Formation[]> {
    const db = getFirebaseFirestore()
    const formationsRef = collection(db, COLLECTIONS.FORMATIONS)
    const querySnapshot = await getDocs(formationsRef)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            title: data.title,
            description: data.description,
            durationHours: data.durationHours,
            price: data.price,
            isActive: data.isActive ?? true,
            coverUrl: data.coverUrl || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Formation
    })
}

/**
 * Get a single formation by ID
 */
export async function getFormation(id: string): Promise<Formation | null> {
    const db = getFirebaseFirestore()
    const formationRef = doc(db, COLLECTIONS.FORMATIONS, id)
    const formationSnap = await getDoc(formationRef)

    if (!formationSnap.exists()) {
        return null
    }

    const data = formationSnap.data()
    return {
        id: formationSnap.id,
        title: data.title,
        description: data.description,
        durationHours: data.durationHours,
        price: data.price,
        isActive: data.isActive ?? true,
        coverUrl: data.coverUrl || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Formation
}

/**
 * Create a new formation
 */
export async function createFormation(data: CreateFormationData): Promise<string> {
    const db = getFirebaseFirestore()
    const formationsRef = collection(db, COLLECTIONS.FORMATIONS)

    const docRef = await addDoc(formationsRef, {
        title: data.title,
        description: data.description,
        durationHours: data.durationHours,
        price: data.price,
        isActive: data.isActive,
        coverUrl: data.coverUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a formation
 */
export async function updateFormation(id: string, data: UpdateFormationData): Promise<void> {
    const db = getFirebaseFirestore()
    const formationRef = doc(db, COLLECTIONS.FORMATIONS, id)

    await updateDoc(formationRef, {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData)
}

/**
 * Delete a formation
 */
export async function deleteFormation(id: string): Promise<void> {
    const db = getFirebaseFirestore()
    const formationRef = doc(db, COLLECTIONS.FORMATIONS, id)
    await deleteDoc(formationRef)
}

// ========================================
// Pack Functions
// ========================================

/**
 * Get all packs
 */
export async function getAllPacks(): Promise<Pack[]> {
    const db = getFirebaseFirestore()
    const packsRef = collection(db, COLLECTIONS.PACKS)
    const querySnapshot = await getDocs(packsRef)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            title: data.title,
            formationIds: data.formationIds || [],
            price: data.price,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Pack
    })
}

/**
 * Get a single pack by ID
 */
export async function getPack(id: string): Promise<Pack | null> {
    const db = getFirebaseFirestore()
    const packRef = doc(db, COLLECTIONS.PACKS, id)
    const packSnap = await getDoc(packRef)

    if (!packSnap.exists()) {
        return null
    }

    const data = packSnap.data()
    return {
        id: packSnap.id,
        title: data.title,
        formationIds: data.formationIds || [],
        price: data.price,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Pack
}

/**
 * Create a new pack
 */
export async function createPack(data: CreatePackData): Promise<string> {
    const db = getFirebaseFirestore()
    const packsRef = collection(db, COLLECTIONS.PACKS)

    const docRef = await addDoc(packsRef, {
        title: data.title,
        formationIds: data.formationIds,
        price: data.price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a pack
 */
export async function updatePack(id: string, data: UpdatePackData): Promise<void> {
    const db = getFirebaseFirestore()
    const packRef = doc(db, COLLECTIONS.PACKS, id)

    await updateDoc(packRef, {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData)
}

/**
 * Delete a pack
 */
export async function deletePack(id: string): Promise<void> {
    const db = getFirebaseFirestore()
    const packRef = doc(db, COLLECTIONS.PACKS, id)
    await deleteDoc(packRef)
}

// ========================================
// Formation Buyers (Payments)
// ========================================

export interface FormationBuyer extends UserProfile {
    source: 'direct' | 'pack'
    packTitle?: string
}

/**
 * Get all users who have access to a specific formation
 * Includes both direct purchases and pack purchases
 * @param formationId Formation ID
 * @returns Array of user profiles with source info
 */
export async function getFormationBuyers(formationId: string): Promise<FormationBuyer[]> {
    const db = getFirebaseFirestore()
    const paymentsRef = collection(db, 'payments')

    // Map to track users and their source (userId -> FormationBuyer)
    const buyersMap = new Map<string, FormationBuyer>()

    // 1. Get direct formation payments
    const directPaymentsQuery = query(
        paymentsRef,
        where('itemType', '==', 'formation'),
        where('itemId', '==', formationId)
    )
    const directPaymentsSnapshot = await getDocs(directPaymentsQuery)

    for (const paymentDoc of directPaymentsSnapshot.docs) {
        const userId = paymentDoc.data().userId as string
        if (!buyersMap.has(userId)) {
            const userProfile = await getUserProfile(userId)
            if (userProfile) {
                buyersMap.set(userId, { ...userProfile, source: 'direct' })
            }
        }
    }

    // 2. Get packs that include this formation
    const packsRef = collection(db, COLLECTIONS.PACKS)
    const packsSnapshot = await getDocs(packsRef)
    const packsWithFormation: { id: string; title: string }[] = []

    for (const packDoc of packsSnapshot.docs) {
        const packData = packDoc.data()
        const formationIds = packData.formationIds as string[] || []
        if (formationIds.includes(formationId)) {
            packsWithFormation.push({ id: packDoc.id, title: packData.title as string })
        }
    }

    // 3. For each pack, get pack payments
    for (const pack of packsWithFormation) {
        const packPaymentsQuery = query(
            paymentsRef,
            where('itemType', '==', 'pack'),
            where('itemId', '==', pack.id)
        )
        const packPaymentsSnapshot = await getDocs(packPaymentsQuery)

        for (const paymentDoc of packPaymentsSnapshot.docs) {
            const userId = paymentDoc.data().userId as string
            // Only add if not already from direct purchase
            if (!buyersMap.has(userId)) {
                const userProfile = await getUserProfile(userId)
                if (userProfile) {
                    buyersMap.set(userId, {
                        ...userProfile,
                        source: 'pack',
                        packTitle: pack.title
                    })
                }
            }
        }
    }

    return Array.from(buyersMap.values())
}
