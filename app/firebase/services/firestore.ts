/**
 * Firebase Firestore Service
 * 
 * Provides Firestore database functionality for As2Built.
 * Collections: users, experts, enterprises, formations, packs, projects, missions
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
    type DocumentData,
    type QueryConstraint
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
    UpdatePackData,
    Project,
    ProjectStatus,
    CreateProjectData,
    UpdateProjectData,
    Mission,
    CreateMissionData,
    UpdateMissionData,
    MissionStatus,
    ProjectDocument,
    CreateDocumentData,
    DocumentType,
    ProjectPhoto,
    CreatePhotoData,
    ProjectProblem,
    CreateProblemData,
    ProblemSeverity,
    ProjectRFI,
    CreateRFIData,
    ProjectSubmission,
    CreateSubmissionData,
    SubmissionStatus,
    CreateMemberData,
    ProjectMember
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
    PROJECTS: 'projects',
    MISSIONS: 'missions',
    DOCUMENTS: 'documents',
    PHOTOS: 'photos',
    PROBLEMS: 'problems',
    RFIS: 'rfis',
    SUBMISSIONS: 'submissions',
    PROJECT_MEMBERS: 'project_members',
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

    const profileData: Record<string, unknown> = {
        uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        createdAt: serverTimestamp(),
    }

    // Include enterpriseOwnerId for member accounts
    if (data.enterpriseOwnerId) {
        profileData.enterpriseOwnerId = data.enterpriseOwnerId
    }

    await setDoc(userRef, profileData)
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
    const profile: UserProfile = {
        uid: userSnap.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
    }

    if (data.enterpriseOwnerId) {
        profile.enterpriseOwnerId = data.enterpriseOwnerId
    }

    return profile
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
        projectCount: 0,
        hasSubscription: false,
        subscriptionRequestPending: false,
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
        projectCount: data.projectCount ?? 0,
        hasSubscription: data.hasSubscription ?? false,
        subscriptionRequestPending: data.subscriptionRequestPending ?? false,
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

// ========================================
// Project Functions
// ========================================

/**
 * Check if enterprise can create a new project
 * Enterprise gets 1 free project, then needs subscription
 */
export async function canCreateProject(enterpriseId: string): Promise<boolean> {
    const enterprise = await getEnterpriseProfile(enterpriseId)
    if (!enterprise) return false

    // Can create if: no projects yet OR has subscription
    return enterprise.projectCount === 0 || enterprise.hasSubscription
}

/**
 * Create a new project for an enterprise
 * @param enterpriseId Enterprise UID
 * @param data Project data
 * @returns Project ID
 */
export async function createProject(
    enterpriseId: string,
    data: CreateProjectData
): Promise<string> {
    const db = getFirebaseFirestore()

    // Check if enterprise can create project
    const canCreate = await canCreateProject(enterpriseId)
    if (!canCreate) {
        throw new Error('Vous avez atteint la limite de projets gratuits. Demandez un abonnement pour créer plus de projets.')
    }

    const projectsRef = collection(db, COLLECTIONS.PROJECTS)

    const docRef = await addDoc(projectsRef, {
        enterpriseId,
        title: data.title,
        description: data.description,
        address: data.address,
        startDate: data.startDate,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    // Increment project count for enterprise
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, enterpriseId)
    const enterprise = await getEnterpriseProfile(enterpriseId)
    if (enterprise) {
        await updateDoc(enterpriseRef, {
            projectCount: enterprise.projectCount + 1
        })
    }

    return docRef.id
}

/**
 * Normalize legacy project status values to valid 'active' | 'completed'
 */
function normalizeProjectStatus(status: string): ProjectStatus {
    if (status === 'completed') return 'completed'
    return 'active'
}

/**
 * Get all projects for an enterprise
 */
export async function getProjectsByEnterprise(enterpriseId: string): Promise<Project[]> {
    const db = getFirebaseFirestore()
    const projectsRef = collection(db, COLLECTIONS.PROJECTS)
    const q = query(
        projectsRef,
        where('enterpriseId', '==', enterpriseId)
    )

    console.log('Querying projects for enterprise:', enterpriseId)

    try {
        const querySnapshot = await getDocs(q)
        console.log('Found', querySnapshot.docs.length, 'projects')

        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            return {
                id: docSnap.id,
                enterpriseId: data.enterpriseId,
                title: data.title,
                description: data.description,
                address: data.address,
                startDate: data.startDate?.toDate() || new Date(),
                status: normalizeProjectStatus(data.status),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Project
        })
    } catch (error) {
        console.error('Error fetching projects:', error)
        throw error
    }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
    const db = getFirebaseFirestore()
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId)
    const projectSnap = await getDoc(projectRef)

    if (!projectSnap.exists()) {
        return null
    }

    const data = projectSnap.data()
    return {
        id: projectSnap.id,
        enterpriseId: data.enterpriseId,
        title: data.title,
        description: data.description,
        address: data.address,
        startDate: data.startDate?.toDate() || new Date(),
        status: normalizeProjectStatus(data.status),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Project
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, data: UpdateProjectData): Promise<void> {
    const db = getFirebaseFirestore()
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId)

    await updateDoc(projectRef, {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData)
}

/**
 * Request subscription for an enterprise
 * Creates a notification for admin
 */
export async function requestSubscription(
    enterpriseId: string,
    enterpriseName: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const notificationsRef = collection(db, 'notifications')

    // Create notification for admin
    await addDoc(notificationsRef, {
        type: 'subscription_request',
        title: 'Demande d\'abonnement',
        message: `${enterpriseName} demande un abonnement pour créer plus de projets.`,
        data: {
            userId: enterpriseId,
            userName: enterpriseName,
            userRole: 'enterprise'
        },
        targetRole: 'admin',
        read: false,
        createdAt: serverTimestamp(),
    })

    // Mark subscription request as pending
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, enterpriseId)
    await updateDoc(enterpriseRef, {
        subscriptionRequestPending: true
    })
}

/**
 * Approve subscription for an enterprise (admin only)
 */
export async function approveSubscription(enterpriseId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, enterpriseId)

    await updateDoc(enterpriseRef, {
        hasSubscription: true,
        subscriptionRequestPending: false
    })
}

/**
 * Get enterprises that have requested subscription (projectCount >= 1 && hasSubscription === false)
 * These are enterprises that have used their free project and need subscription to create more
 */
export async function getEnterprisesNeedingSubscription(): Promise<Array<EnterpriseProfile & { user?: UserProfile }>> {
    const db = getFirebaseFirestore()
    const enterprisesRef = collection(db, COLLECTIONS.ENTERPRISES)

    // Get all enterprises without subscription
    const q = query(enterprisesRef, where('hasSubscription', '==', false))
    const snapshot = await getDocs(q)

    const results: Array<EnterpriseProfile & { user?: UserProfile }> = []

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        const projectCount = data.projectCount ?? 0

        // Only include those who have used their free project (projectCount >= 1)
        if (projectCount >= 1) {
            // Get user info
            const userProfile = await getUserProfile(docSnap.id)

            results.push({
                uid: docSnap.id,
                companyName: data.companyName,
                projectCount: projectCount,
                hasSubscription: false,
                subscriptionRequestPending: data.subscriptionRequestPending ?? false,
                createdAt: data.createdAt?.toDate() || new Date(),
                user: userProfile || undefined
            })
        }
    }

    return results
}

// ========================================
// Mission Functions
// ========================================

/**
 * Create a new mission for a project
 */
export async function createMission(
    projectId: string,
    enterpriseId: string,
    data: CreateMissionData
): Promise<string> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)

    const docRef = await addDoc(missionsRef, {
        projectId,
        enterpriseId,
        title: data.title,
        description: data.description,
        status: 'pending_admin',
        expertId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Get all missions for a project
 */
export async function getMissionsByProject(projectId: string, filters?: { enterpriseId?: string, expertId?: string }): Promise<Mission[]> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)

    const constraints: QueryConstraint[] = [where('projectId', '==', projectId)]

    if (filters?.enterpriseId) {
        constraints.push(where('enterpriseId', '==', filters.enterpriseId))
    }

    if (filters?.expertId) {
        constraints.push(where('expertId', '==', filters.expertId))
    }

    const q = query(missionsRef, ...constraints)
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            status: data.status,
            expertId: data.expertId || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Mission
    })
}

/**
 * Delete a mission
 */
export async function deleteMission(missionId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)
    await deleteDoc(missionRef)
}

/**
 * Get all missions for an enterprise
 */
export async function getMissionsByEnterprise(enterpriseId: string): Promise<Mission[]> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)
    const q = query(missionsRef, where('enterpriseId', '==', enterpriseId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            status: data.status,
            expertId: data.expertId || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Mission
    })
}

/**
 * Get all missions assigned to an expert
 */
export async function getMissionsByExpert(expertId: string): Promise<Mission[]> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)
    const q = query(missionsRef, where('expertId', '==', expertId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            status: data.status,
            expertId: data.expertId || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Mission
    })
}

/**
 * Get all missions pending admin review
 */
export async function getPendingMissionsForAdmin(): Promise<Mission[]> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)
    const q = query(missionsRef, where('status', '==', 'pending_admin'))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            status: data.status,
            expertId: data.expertId || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Mission
    })
}

/**
 * Get ALL missions for admin dashboard (all statuses)
 */
export async function getAllMissionsForAdmin(): Promise<Mission[]> {
    const db = getFirebaseFirestore()
    const missionsRef = collection(db, COLLECTIONS.MISSIONS)
    const querySnapshot = await getDocs(missionsRef)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            status: data.status,
            expertId: data.expertId || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Mission
    })
}

/**
 * Get a single mission by ID
 */
export async function getMission(missionId: string): Promise<Mission | null> {
    const db = getFirebaseFirestore()
    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)
    const missionSnap = await getDoc(missionRef)

    if (!missionSnap.exists()) {
        return null
    }

    const data = missionSnap.data()
    return {
        id: missionSnap.id,
        projectId: data.projectId,
        enterpriseId: data.enterpriseId,
        title: data.title,
        description: data.description,
        status: data.status,
        expertId: data.expertId || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Mission
}

/**
 * Assign an expert to a mission (admin action)
 * Changes status from pending_admin to proposed
 */
export async function assignExpertToMission(
    missionId: string,
    expertId: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)

    await updateDoc(missionRef, {
        expertId,
        status: 'proposed',
        updatedAt: serverTimestamp(),
    })
}

/**
 * Update mission status
 */
export async function updateMissionStatus(
    missionId: string,
    status: MissionStatus
): Promise<void> {
    const db = getFirebaseFirestore()
    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)

    const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
    }

    // If refused, clear the expert assignment so admin can reassign
    if (status === 'refused') {
        updateData.expertId = null
        updateData.status = 'pending_admin' // Return to admin queue
    }

    await updateDoc(missionRef, updateData)
}

/**
 * Accept mission (expert action)
 */
export async function acceptMission(missionId: string): Promise<void> {
    await updateMissionStatus(missionId, 'accepted')
}

/**
 * Refuse mission (expert action)
 * Returns mission to admin queue
 */
export async function refuseMission(missionId: string): Promise<void> {
    await updateMissionStatus(missionId, 'refused')
}

/**
 * Get all active experts for admin to assign to missions
 * Experts can be assigned to multiple missions simultaneously
 */
export async function getAvailableExperts(): Promise<UserWithDetails[]> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(
        usersRef,
        where('role', '==', 'expert'),
        where('status', '==', 'active')
    )
    const querySnapshot = await getDocs(q)

    const experts: UserWithDetails[] = []

    for (const docSnap of querySnapshot.docs) {
        const userData = docSnap.data()
        const expertProfile = await getExpertProfile(docSnap.id)

        experts.push({
            uid: docSnap.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            role: userData.role,
            status: userData.status,
            createdAt: userData.createdAt?.toDate() || new Date(),
            expertProfile
        } as UserWithDetails)
    }

    return experts
}

/**
 * Complete a mission (enterprise action)
 * Changes status from accepted to completed
 */
export async function completeMission(
    missionId: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)

    await updateDoc(missionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

/**
 * Cancel expert from a mission
 * Clears expertId and returns mission to pending_admin
 */
export async function cancelExpertFromMission(
    missionId: string,
    expertId: string
): Promise<void> {
    const db = getFirebaseFirestore()

    const missionRef = doc(db, COLLECTIONS.MISSIONS, missionId)
    await updateDoc(missionRef, {
        expertId: null,
        status: 'pending_admin',
        updatedAt: serverTimestamp(),
    })
}

// ========================================
// Admin Dashboard Queries
// ========================================

/**
 * Get ALL projects across all enterprises (admin only)
 */
export async function getAllProjects(): Promise<Project[]> {
    const db = getFirebaseFirestore()
    const projectsRef = collection(db, COLLECTIONS.PROJECTS)
    const querySnapshot = await getDocs(projectsRef)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            enterpriseId: data.enterpriseId,
            title: data.title,
            description: data.description,
            address: data.address,
            startDate: data.startDate?.toDate() || new Date(),
            status: normalizeProjectStatus(data.status),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Project
    })
}

/**
 * Get projects where an expert has accepted missions
 * Fetches expert's missions, extracts unique projectIds, then loads each project
 */
export async function getProjectsByExpert(expertId: string): Promise<Project[]> {
    const missions = await getMissionsByExpert(expertId)
    const acceptedMissions = missions.filter(m => m.status === 'accepted' || m.status === 'completed')
    const uniqueProjectIds = [...new Set(acceptedMissions.map(m => m.projectId))]

    if (uniqueProjectIds.length === 0) return []

    const projects: Project[] = []
    for (const projectId of uniqueProjectIds) {
        const project = await getProject(projectId)
        if (project) projects.push(project)
    }

    return projects
}

/** Payment record from 'payments' collection */
export interface PaymentRecord {
    id: string
    userId: string
    itemType: 'formation' | 'pack' | 'audit'
    itemId: string
    createdAt: Date
}

/**
 * Get payments for a specific user
 */
export async function getPaymentsByUser(userId: string): Promise<PaymentRecord[]> {
    const db = getFirebaseFirestore()
    const paymentsRef = collection(db, 'payments')
    const q = query(paymentsRef, where('userId', '==', userId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            userId: data.userId,
            itemType: data.itemType,
            itemId: data.itemId,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as PaymentRecord
    })
}

/**
 * Get ALL payments (admin only)
 */
export async function getAllPayments(): Promise<PaymentRecord[]> {
    const db = getFirebaseFirestore()
    const paymentsRef = collection(db, 'payments')
    const querySnapshot = await getDocs(paymentsRef)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            userId: data.userId,
            itemType: data.itemType,
            itemId: data.itemId,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as PaymentRecord
    })
}

// ========================================
// Project Documents CRUD
// ========================================

/**
 * Get all documents for a project
 */
export async function getDocumentsByProject(projectId: string): Promise<ProjectDocument[]> {
    const db = getFirebaseFirestore()
    const docsRef = collection(db, COLLECTIONS.DOCUMENTS)
    const q = query(docsRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    const docs = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            senderId: data.senderId,
            title: data.title,
            fileUrl: data.fileUrl,
            type: data.type,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ProjectDocument
    })

    // Sort client-side (newest first) to avoid composite index requirement
    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new project document record in Firestore
 */
export async function createDocument(
    projectId: string,
    senderId: string,
    data: CreateDocumentData,
    fileUrl: string
): Promise<string> {
    const db = getFirebaseFirestore()
    const docsRef = collection(db, COLLECTIONS.DOCUMENTS)

    const docRef = await addDoc(docsRef, {
        projectId,
        senderId,
        title: data.title,
        fileUrl,
        type: data.type,
        createdAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a project document (title, type, fileUrl)
 */
export async function updateDocument(
    documentId: string,
    data: { title?: string; type?: DocumentType; fileUrl?: string }
): Promise<void> {
    const db = getFirebaseFirestore()
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId)
    await updateDoc(docRef, { ...data })
}

/**
 * Delete a project document record from Firestore
 */
export async function deleteDocument(documentId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId)
    await deleteDoc(docRef)
}

// ========================================
// Project Photos CRUD
// ========================================

/**
 * Get all photos for a project
 */
export async function getPhotosByProject(projectId: string): Promise<ProjectPhoto[]> {
    const db = getFirebaseFirestore()
    const photosRef = collection(db, COLLECTIONS.PHOTOS)
    const q = query(photosRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    const photos = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            senderId: data.senderId,
            imageUrl: data.imageUrl,
            note: data.note || '',
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ProjectPhoto
    })

    // Sort client-side (newest first) to avoid composite index requirement
    return photos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new project photo record in Firestore
 */
export async function createPhoto(
    projectId: string,
    senderId: string,
    data: CreatePhotoData,
    imageUrl: string
): Promise<string> {
    const db = getFirebaseFirestore()
    const photosRef = collection(db, COLLECTIONS.PHOTOS)

    const docRef = await addDoc(photosRef, {
        projectId,
        senderId,
        imageUrl,
        note: data.note,
        createdAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a project photo (note, imageUrl)
 */
export async function updatePhoto(
    photoId: string,
    data: { note?: string; imageUrl?: string }
): Promise<void> {
    const db = getFirebaseFirestore()
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photoId)
    await updateDoc(photoRef, { ...data })
}

/**
 * Delete a project photo record from Firestore
 */
export async function deletePhoto(photoId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const photoRef = doc(db, COLLECTIONS.PHOTOS, photoId)
    await deleteDoc(photoRef)
}

// ========================================
// Project Problems CRUD
// ========================================

/**
 * Get all problems for a project
 */
export async function getProblemsByProject(projectId: string): Promise<ProjectProblem[]> {
    const db = getFirebaseFirestore()
    const problemsRef = collection(db, COLLECTIONS.PROBLEMS)
    const q = query(problemsRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    const problems = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            senderId: data.senderId,
            title: data.title,
            description: data.description || '',
            severity: data.severity,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ProjectProblem
    })

    // Sort client-side (newest first)
    return problems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new project problem record in Firestore
 */
export async function createProblem(
    projectId: string,
    senderId: string,
    data: CreateProblemData
): Promise<string> {
    const db = getFirebaseFirestore()
    const problemsRef = collection(db, COLLECTIONS.PROBLEMS)

    const docRef = await addDoc(problemsRef, {
        projectId,
        senderId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        createdAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a project problem (title, description, severity)
 */
export async function updateProblem(
    problemId: string,
    data: { title?: string; description?: string; severity?: ProblemSeverity }
): Promise<void> {
    const db = getFirebaseFirestore()
    const problemRef = doc(db, COLLECTIONS.PROBLEMS, problemId)
    await updateDoc(problemRef, { ...data })
}

/**
 * Delete a project problem record from Firestore
 */
export async function deleteProblem(problemId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const problemRef = doc(db, COLLECTIONS.PROBLEMS, problemId)
    await deleteDoc(problemRef)
}

// ========================================
// Project RFIs CRUD
// ========================================

/**
 * Get all RFIs for a project
 */
export async function getRFIsByProject(projectId: string): Promise<ProjectRFI[]> {
    const db = getFirebaseFirestore()
    const rfisRef = collection(db, COLLECTIONS.RFIS)
    const q = query(rfisRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    const rfis = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            senderId: data.senderId,
            title: data.title,
            question: data.question || '',
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ProjectRFI
    })

    // Sort client-side (newest first)
    return rfis.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new RFI record in Firestore
 */
export async function createRFI(
    projectId: string,
    senderId: string,
    data: CreateRFIData
): Promise<string> {
    const db = getFirebaseFirestore()
    const rfisRef = collection(db, COLLECTIONS.RFIS)

    const docRef = await addDoc(rfisRef, {
        projectId,
        senderId,
        title: data.title,
        question: data.question,
        createdAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update an RFI (title, question)
 */
export async function updateRFI(
    rfiId: string,
    data: { title?: string; question?: string }
): Promise<void> {
    const db = getFirebaseFirestore()
    const rfiRef = doc(db, COLLECTIONS.RFIS, rfiId)
    await updateDoc(rfiRef, { ...data })
}

/**
 * Delete an RFI record from Firestore
 */
export async function deleteRFI(rfiId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const rfiRef = doc(db, COLLECTIONS.RFIS, rfiId)
    await deleteDoc(rfiRef)
}

// ========================================
// Project Submissions CRUD
// ========================================

/**
 * Get all submissions for a project
 */
export async function getSubmissionsByProject(projectId: string): Promise<ProjectSubmission[]> {
    const db = getFirebaseFirestore()
    const submissionsRef = collection(db, COLLECTIONS.SUBMISSIONS)
    const q = query(submissionsRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    const submissions = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            senderId: data.senderId,
            title: data.title,
            description: data.description || '',
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ProjectSubmission
    })

    // Sort client-side (newest first)
    return submissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Create a new submission record in Firestore
 */
export async function createSubmission(
    projectId: string,
    senderId: string,
    data: CreateSubmissionData
): Promise<string> {
    const db = getFirebaseFirestore()
    const submissionsRef = collection(db, COLLECTIONS.SUBMISSIONS)

    const docRef = await addDoc(submissionsRef, {
        projectId,
        senderId,
        title: data.title,
        description: data.description,
        status: 'pending' as SubmissionStatus,
        createdAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Update a submission (title, description) - only by creator
 */
export async function updateSubmission(
    submissionId: string,
    data: { title?: string; description?: string }
): Promise<void> {
    const db = getFirebaseFirestore()
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, submissionId)
    await updateDoc(submissionRef, { ...data })
}

/**
 * Update submission status - only by enterprise owner of the project
 */
export async function updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus
): Promise<void> {
    const db = getFirebaseFirestore()
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, submissionId)
    await updateDoc(submissionRef, { status })
}

/**
 * Delete a submission record from Firestore
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, submissionId)
    await deleteDoc(submissionRef)
}

// ========================================
// Member (Project Manager) Functions
// ========================================

/**
 * Create a member account for an enterprise.
 * Uses a secondary Firebase app to create Auth user without signing out the gérant.
 * @param gerantId UID of the enterprise owner (gérant)
 * @param data Member data including password
 * @returns UID of the newly created member
 */
export async function createMemberAccount(
    gerantId: string,
    data: CreateMemberData
): Promise<string> {
    const { createUserWithoutSignIn } = await import('./auth')

    // Check phone uniqueness
    const phoneExists = await isPhoneRegistered(data.phone)
    if (phoneExists) {
        throw new Error('Ce numéro de téléphone est déjà utilisé')
    }

    // Create Firebase Auth user without disrupting current session
    const uid = await createUserWithoutSignIn(data.email, data.password)

    // Create user profile with enterpriseOwnerId linking to gérant
    await createUserProfile(uid, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'enterprise',
        status: 'active',
        enterpriseOwnerId: gerantId,
    })

    return uid
}

/**
 * Get all members created by a gérant
 */
export async function getMembersByEnterprise(gerantId: string): Promise<UserProfile[]> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(usersRef, where('enterpriseOwnerId', '==', gerantId))
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
            enterpriseOwnerId: data.enterpriseOwnerId,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as UserProfile
    })
}

/**
 * Deactivate a member account
 */
export async function deactivateMember(memberId: string): Promise<void> {
    await updateUserStatus(memberId, 'inactive')
}

/**
 * Reactivate a member account
 */
export async function reactivateMember(memberId: string): Promise<void> {
    await updateUserStatus(memberId, 'active')
}

/**
 * Assign a member to a project
 */
export async function assignMemberToProject(
    projectId: string,
    memberId: string,
    assignedBy: string
): Promise<string> {
    const db = getFirebaseFirestore()

    // Check if already assigned
    const existing = await isUserAssignedToProject(memberId, projectId)
    if (existing) {
        throw new Error('Ce membre est déjà assigné à ce projet')
    }

    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const docRef = await addDoc(membersRef, {
        projectId,
        memberId,
        assignedBy,
        assignedAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Unassign a member from a project
 */
export async function unassignMemberFromProject(
    projectId: string,
    memberId: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(
        membersRef,
        where('projectId', '==', projectId),
        where('memberId', '==', memberId)
    )
    const querySnapshot = await getDocs(q)

    for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, COLLECTIONS.PROJECT_MEMBERS, docSnap.id))
    }
}

/**
 * Get all projects assigned to a member
 */
export async function getProjectsByMember(memberId: string): Promise<Project[]> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(membersRef, where('memberId', '==', memberId))
    const querySnapshot = await getDocs(q)

    const projectIds = querySnapshot.docs.map(d => d.data().projectId as string)
    if (projectIds.length === 0) return []

    const projects: Project[] = []
    for (const projectId of projectIds) {
        const project = await getProject(projectId)
        if (project) projects.push(project)
    }

    return projects
}

/**
 * Get all members assigned to a project
 */
export async function getMembersByProject(projectId: string): Promise<ProjectMember[]> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(membersRef, where('projectId', '==', projectId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            memberId: data.memberId,
            assignedAt: data.assignedAt?.toDate() || new Date(),
            assignedBy: data.assignedBy,
        } as ProjectMember
    })
}

/**
 * Check if a user (member) is assigned to a project
 */
export async function isUserAssignedToProject(
    userId: string,
    projectId: string
): Promise<boolean> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(
        membersRef,
        where('projectId', '==', projectId),
        where('memberId', '==', userId)
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
}

/**
 * Get project assignments for a member (returns ProjectMember records)
 */
export async function getAssignmentsByMember(memberId: string): Promise<ProjectMember[]> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(membersRef, where('memberId', '==', memberId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            projectId: data.projectId,
            memberId: data.memberId,
            assignedAt: data.assignedAt?.toDate() || new Date(),
            assignedBy: data.assignedBy,
        } as ProjectMember
    })
}

/**
 * Delete a member account completely (disable Firebase Auth + delete all Firestore data)
 * This is a permanent action and cannot be undone
 */
export async function deleteMember(memberId: string): Promise<void> {
    // First, delete all project assignments
    const db = getFirebaseFirestore()
    const assignmentsRef = collection(db, COLLECTIONS.PROJECT_MEMBERS)
    const q = query(assignmentsRef, where('memberId', '==', memberId))
    const querySnapshot = await getDocs(q)
    
    // Delete all assignments
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    // Delete Firestore user document
    const userRef = doc(db, COLLECTIONS.USERS, memberId)
    await deleteDoc(userRef)
    
    // Note: Firebase Auth user deletion requires Admin SDK
    // From client-side, we can only delete Firestore data
    // The Auth user will remain but cannot access without Firestore profile
    console.log('Member deleted from Firestore. Auth user cleanup requires Cloud Function with Admin SDK')
}
