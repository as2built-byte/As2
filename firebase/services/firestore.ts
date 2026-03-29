/**
 * Firebase Firestore Service
 * 
 * Provides Firestore database functionality for As2Built.
 * Collections: users, experts, enterprises, formations, packs, projects, missions
 */

import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy as firestoreOrderBy, limit as firestoreLimit, serverTimestamp, Timestamp, setDoc, documentId, writeBatch, arrayUnion, arrayRemove, QueryConstraint, type FieldValue, getCountFromServer } from 'firebase/firestore'
import type { Firestore, DocumentData } from 'firebase/firestore'
import { getFirebaseApp } from '../index'
import {
    PLAN_LIMITS,
    type SubscriptionPlan,
    type UserProfile,
    type UserRole,
    type UserStatus,
    type UserWithDetails,
    type ExpertProfile,
    type ExpertStatus,
    type EnterpriseProfile,
    type CreateEnterpriseData,
    type Project,
    type ProjectStatus,
    type CreateProjectData,
    type UpdateProjectData,
    type CreateUserData,
    type Notification,
    type CreateNotificationData,
    type Formation,
    type CreateFormationData,
    type UpdateFormationData,
    type Pack,
    type CreatePackData,
    type UpdatePackData,
    type Mission,
    type CreateMissionData,
    type UpdateMissionData,
    type MissionStatus,
    type ProjectDocument,
    type CreateDocumentData,
    type DocumentType,
    type ProjectPhoto,
    type CreatePhotoData,
    type ProjectProblem,
    type CreateProblemData,
    type ProblemSeverity,
    type ProjectRFI,
    type CreateRFIData,
    type ProjectSubmission,
    type CreateSubmissionData,
    type SubmissionStatus,
    type CreateMemberData,
    type ProjectMember,
    type Audit,
    type CreateAuditData,
    type UpdateAuditData,
    type AuditWithDetails,
    type PlanChangeRequest
} from '~/types'

let firestoreInstance: Firestore | null = null

/**
 * Convertit un Timestamp Firebase ou une date en Date JavaScript de manière sécurisée
 */
function safeToDate(date: any): Date {
    if (!date) return new Date()
    
    // Si c'est un Timestamp Firebase (a la méthode toDate)
    if (typeof date.toDate === 'function') {
        return date.toDate()
    }
    
    // Si c'est déjà une Date ou une chaîne ISO
    return new Date(date)
}

/**
 * Get the Firebase Firestore instance
 */
export function getFirebaseFirestore(): Firestore {
    if (firestoreInstance) {
        return firestoreInstance
    }

    try {
        const app = getFirebaseApp()
        if (!app) {
            throw new Error('[Firebase] App not initialized')
        }
        firestoreInstance = getFirestore(app)
        return firestoreInstance
    } catch (error) {
        console.error('[Firebase] Error initializing Firestore:', error)
        throw new Error('Firebase Firestore initialization failed')
    }
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
    AUDITS: 'audits',
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
        createdAt: safeToDate(data.createdAt),
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
    data?: { cvUrl?: string | null }
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
        createdAt: safeToDate(data.createdAt),
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
 * @param email User's email for sending welcome email
 */
export async function createEnterpriseProfile(
    uid: string,
    data: CreateEnterpriseData,
    email?: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, uid)

    await setDoc(enterpriseRef, {
        uid,
        companyName: data.companyName,
        plan: data.plan || 'free',  // Default to free plan
        projectCount: 0,
        storageUsed: 0,
        usersCount: 0,
        hasSubscription: false,
        subscriptionRequestPending: false,
        status: 'active', // Auto-approved for immediate access
        createdAt: serverTimestamp(),
    })

    // Send welcome email if email is provided
    if (email) {
        try {
            const { sendEnterpriseWelcomeEmail } = await import('./email')
            await sendEnterpriseWelcomeEmail(email, data.companyName)
        } catch (error) {
            console.error('Error sending welcome email:', error)
            // Don't throw - we don't want to fail account creation if email fails
        }
    }
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
        plan: data.plan || 'free',  // Default to free for new enterprises
        projectCount: data.projectCount ?? 0,
        storageUsed: data.storageUsed ?? 0,
        usersCount: data.usersCount ?? 0,
        hasSubscription: data.hasSubscription ?? false,
        subscriptionRequestPending: data.subscriptionRequestPending ?? false,
        status: data.status || 'active', // Default to active
        createdAt: data.createdAt?.toDate() || new Date(),
    } as EnterpriseProfile
}

/**
 * Create a plan change request
 * This function is called when an enterprise manager wants to upgrade/downgrade their plan
 * @param enterpriseId Enterprise ID
 * @param requestedBy User ID who requested the change
 * @param requestedPlan The new plan requested
 * @param previousPlan The current plan
 * @param isTrial Whether this is a trial request (true) or normal upgrade request (false)
 */
export async function createPlanChangeRequest(
    enterpriseId: string,
    requestedBy: string,
    requestedPlan: SubscriptionPlan,
    previousPlan: SubscriptionPlan,
    isTrial: boolean = false
): Promise<string> {
    console.log('🔥 createPlanChangeRequest called:', { enterpriseId, requestedPlan, previousPlan, isTrial })
    
    const db = getFirebaseFirestore()
    
    // Create plan change request
    const requestData: {
        enterpriseId: string
        requestedBy: string
        previousPlan: SubscriptionPlan
        requestedPlan: SubscriptionPlan
        status: 'pending' | 'trial'
        requestedAt: any
        trialEndDate?: Date
    } = {
        enterpriseId,
        requestedBy,
        previousPlan,
        requestedPlan,
        status: isTrial ? 'trial' : 'pending',
        requestedAt: serverTimestamp()
    }
    
    // Add trial end date only for trial requests
    if (isTrial) {
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7)
        Object.assign(requestData, { trialEndDate })
        console.log('📅 Trial end date set:', trialEndDate)
    }
    
    const requestsRef = collection(db, 'planChangeRequests')
    const requestDoc = await addDoc(requestsRef, requestData)
    console.log('✅ Plan change request created:', requestDoc.id, 'Status:', requestData.status)
    
    // Update enterprise - ONLY change plan immediately if it's a trial
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, enterpriseId)
    const enterpriseUpdate: any = {
        planChangeRequestId: requestDoc.id,
        updatedAt: serverTimestamp()
    }
    
    if (isTrial) {
        // For trial: change plan immediately and start trial period
        enterpriseUpdate.plan = requestedPlan
        enterpriseUpdate.previousPlan = previousPlan
        enterpriseUpdate.isInTrialPeriod = true
        enterpriseUpdate.trialEndDate = requestData.trialEndDate
        console.log('🚀 Trial activated - Plan changed to:', requestedPlan)
    } else {
        // For normal upgrade: keep current plan, just mark request as pending
        enterpriseUpdate.subscriptionRequestPending = true
        console.log('⏳ Normal upgrade - Plan stays:', previousPlan)
    }
    
    await updateDoc(enterpriseRef, enterpriseUpdate)
    console.log('✅ Enterprise updated:', enterpriseUpdate)
    
    // Create notification for admin ONLY for normal upgrades (not trials)
    // Trials are auto-approved so no admin action needed
    if (!isTrial) {
        await createNotification(
            'admin',
            {
                type: 'plan_change_request',
                title: 'Nouvelle demande de changement de plan',
                message: `L'entreprise ${enterpriseId} demande le plan ${requestedPlan} (en attente d'approbation)`
            }
        )
    }
    
    return requestDoc.id
}

/**
 * Approve a plan change request
 * Called by admin when approving the plan change after trial period
 * REQUIRES payment proof URL - subscription requests can only be approved with payment proof
 * @param requestId Plan change request ID
 * @param adminId Admin user ID
 * @param paymentProofUrl URL of the payment proof PDF (required)
 * @param notes Optional admin notes
 */
export async function approvePlanChangeRequest(
    requestId: string,
    adminId: string,
    paymentProofUrl: string,
    notes?: string
): Promise<void> {
    // Validate that payment proof is provided
    if (!paymentProofUrl || paymentProofUrl.trim() === '') {
        throw new Error('Preuve de paiement requise : Vous devez uploader un PDF de preuve de paiement avant d\'approuver cette demande.')
    }
    
    const db = getFirebaseFirestore()
    
    // Get the request
    const requestRef = doc(db, 'planChangeRequests', requestId)
    const requestSnap = await getDoc(requestRef)
    
    if (!requestSnap.exists()) {
        throw new Error('Plan change request not found')
    }
    
    const request = requestSnap.data() as { enterpriseId: string; requestedPlan: SubscriptionPlan }
    
    // Update request status with payment proof
    await updateDoc(requestRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminId,
        adminNotes: notes || null,
        paymentProofUrl: paymentProofUrl,
        paymentProofUploadedAt: serverTimestamp(),
        paymentProofUploadedBy: adminId
    })
    
    // Update enterprise - confirm the plan, remove trial status
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, request.enterpriseId)
    await updateDoc(enterpriseRef, {
        plan: request.requestedPlan,
        previousPlan: null,
        planChangeRequestId: null,
        isInTrialPeriod: false,
        trialEndDate: null,
        updatedAt: serverTimestamp()
    })
    
    // Notify enterprise manager
    await createNotification(
        request.enterpriseId,
        {
            type: 'plan_change_approved',
            title: 'Changement de plan approuvé',
            message: `Votre changement de plan vers ${request.requestedPlan} a été confirmé avec succès.`
        }
    )
}

/**
 * Reject a plan change request
 * Called by admin when rejecting the plan change - reverts to previous plan
 * @param requestId Plan change request ID
 * @param adminId Admin user ID
 * @param notes Admin notes explaining the rejection
 */
export async function rejectPlanChangeRequest(
    requestId: string,
    adminId: string,
    notes: string
): Promise<void> {
    const db = getFirebaseFirestore()
    
    // Get the request
    const requestRef = doc(db, 'planChangeRequests', requestId)
    const requestSnap = await getDoc(requestRef)
    
    if (!requestSnap.exists()) {
        throw new Error('Plan change request not found')
    }
    
    const request = requestSnap.data() as { enterpriseId: string; previousPlan: SubscriptionPlan; requestedPlan: SubscriptionPlan }
    
    // Update request status
    await updateDoc(requestRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: adminId,
        adminNotes: notes
    })
    
    // Revert enterprise to previous plan
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, request.enterpriseId)
    await updateDoc(enterpriseRef, {
        plan: request.previousPlan,
        previousPlan: null,
        planChangeRequestId: null,
        isInTrialPeriod: false,
        trialEndDate: null,
        updatedAt: serverTimestamp()
    })
    
    // Notify enterprise manager
    await createNotification(
        request.enterpriseId,
        {
            type: 'plan_change_rejected',
            title: 'Changement de plan refusé',
            message: `Votre demande de changement vers ${request.requestedPlan} a été refusée. Motif: ${notes}`
        }
    )
}

/**
 * Check and handle expired trial periods
 * This should be called periodically (e.g., via a scheduled function)
 * Automatically reverts to previous plan if admin hasn't responded
 */
export async function checkExpiredTrialPeriods(): Promise<void> {
    const db = getFirebaseFirestore()
    const now = new Date()
    
    // Find all requests in trial status with expired trial dates
    const requestsRef = collection(db, 'planChangeRequests')
    const q = query(
        requestsRef,
        where('status', '==', 'trial'),
        where('trialEndDate', '<=', now)
    )
    
    const snapshot = await getDocs(q)
    
    for (const docSnap of snapshot.docs) {
        const request = docSnap.data() as { enterpriseId: string; previousPlan: SubscriptionPlan; requestedPlan: SubscriptionPlan }
        
        // Auto-revert to previous plan
        const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, request.enterpriseId)
        await updateDoc(enterpriseRef, {
            plan: request.previousPlan,
            previousPlan: null,
            planChangeRequestId: null,
            isInTrialPeriod: false,
            trialEndDate: null,
            updatedAt: serverTimestamp()
        })
        
        // Update request status
        await updateDoc(doc(db, 'planChangeRequests', docSnap.id), {
            status: 'rejected',
            processedAt: serverTimestamp(),
            adminNotes: 'Période d\'essai expirée sans réponse de l\'admin'
        })
        
        // Notify enterprise
        await createNotification(
            request.enterpriseId,
            {
                type: 'plan_change_expired',
                title: 'Période d\'essai expirée',
                message: `Votre période d'essai pour le plan ${request.requestedPlan} a expiré. Vous êtes revenu au plan ${request.previousPlan}.`
            }
        )
    }
}

/**
 * Get all pending/trial plan change requests for an enterprise
 * Returns both pending upgrade requests and active trial requests
 */
export async function getPendingPlanChangeRequests(enterpriseId: string): Promise<PlanChangeRequest[]> {
    const db = getFirebaseFirestore()
    const requestsRef = collection(db, 'planChangeRequests')
    const q = query(
        requestsRef,
        where('enterpriseId', '==', enterpriseId),
        where('status', 'in', ['pending', 'trial'])
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            enterpriseId: data.enterpriseId,
            requestedBy: data.requestedBy,
            previousPlan: data.previousPlan,
            requestedPlan: data.requestedPlan,
            status: data.status,
            trialEndDate: data.trialEndDate?.toDate(),
            requestedAt: data.requestedAt?.toDate(),
            processedAt: data.processedAt?.toDate(),
            processedBy: data.processedBy,
            adminNotes: data.adminNotes,
            paymentProofUrl: data.paymentProofUrl,
            paymentProofUploadedAt: data.paymentProofUploadedAt?.toDate(),
            paymentProofUploadedBy: data.paymentProofUploadedBy
        } as PlanChangeRequest
    })
}

/**
 * Get pending/trial plan change request for an enterprise
 * Returns the first active request found (for backward compatibility)
 * @deprecated Use getPendingPlanChangeRequests instead
 */
export async function getPendingPlanChangeRequest(enterpriseId: string): Promise<PlanChangeRequest | null> {
    const requests = await getPendingPlanChangeRequests(enterpriseId)
    return requests[0] ?? null
}

/**
 * Update enterprise subscription plan (direct update - for admin use only)
 * @param uid Enterprise ID
 * @param plan New subscription plan
 */
export async function updateEnterprisePlan(uid: string, plan: SubscriptionPlan): Promise<void> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, COLLECTIONS.ENTERPRISES, uid)

    await updateDoc(enterpriseRef, {
        plan,
        updatedAt: serverTimestamp()
    })
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
            enterpriseOwnerId: data.enterpriseOwnerId, // Ajout du champ manquant
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
 * Check if enterprise can create a new project based on plan limits
 */
export async function canCreateProject(enterpriseId: string): Promise<boolean> {
    console.log('🔍 canCreateProject called for:', enterpriseId)
    
    const enterprise = await getEnterpriseProfile(enterpriseId)
    if (!enterprise) {
        console.log('❌ Enterprise not found')
        return false
    }

    const plan = enterprise.plan || 'bronze'
    const maxProjects = PLAN_LIMITS[plan].maxProjects
    
    // Obtenir le nombre réel de projets
    const actualProjects = await getProjectsByEnterprise(enterpriseId)
    const actualProjectsCount = actualProjects.length
    
    console.log('🔍 Project limit check:', {
        plan,
        maxProjects,
        currentCount: enterprise.projectCount,
        actualProjectsCount,
        canCreate: actualProjectsCount < maxProjects,
        enterpriseData: {
            plan: enterprise.plan,
            projectCount: enterprise.projectCount,
            PLAN_LIMITS: PLAN_LIMITS
        }
    })
    
    return actualProjectsCount < maxProjects
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

    // Get enterprise to check limits
    const enterprise = await getEnterpriseProfile(enterpriseId)
    if (!enterprise) {
        throw new Error('Enterprise not found')
    }

    // Check if enterprise can create project based on plan
    const plan = enterprise.plan || 'bronze'
    const maxProjects = PLAN_LIMITS[plan].maxProjects
    
    // Unified error message for plan limits
    if (enterprise.projectCount >= maxProjects) {
        throw new Error('Limite atteinte : Votre plan actuel est limité. Passez au plan supérieur pour continuer ou profitez d\'une période d\'essai de 7 jours offerte !')
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
    await updateDoc(enterpriseRef, {
        projectCount: enterprise.projectCount + 1
    })

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
        createdBy: enterpriseId,
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
                plan: data.plan || 'bronze',
                projectCount: projectCount,
                storageUsed: data.storageUsed || 0,
                usersCount: data.usersCount || 0,
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
export async function getAvailableExperts(): Promise<Array<UserProfile & { expertProfile?: ExpertProfile }>> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(
        usersRef,
        where('role', '==', 'expert'),
        where('status', '==', 'active')
    )
    const querySnapshot = await getDocs(q)

    const experts: Array<UserProfile & { expertProfile?: ExpertProfile }> = []

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
        } as UserProfile & { expertProfile?: ExpertProfile })
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
 * @param data Member data including role
 * @param companyName Name of the enterprise
 * @returns UID of the newly created member
 */
export async function createMemberAccount(
    gerantId: string,
    data: CreateMemberData,
    companyName: string
): Promise<string> {
    const { createUserWithoutSignIn } = await import('./auth')

    // Check plan limits for all plans
    try {
        // Check plan limits before creating member
        // Get enterprise profile from 'enterprises' collection
        const { getDoc, doc } = await import('firebase/firestore')
        const { getFirebaseFirestore } = await import('../index')
        const db = getFirebaseFirestore()
        const enterpriseDoc = await getDoc(doc(db, 'enterprises', gerantId))
        if (enterpriseDoc.exists()) {
            const enterpriseData = enterpriseDoc.data()
            
            // Check for active trial first
            const trialQuery = query(
                collection(db, 'planChangeRequests'),
                where('enterpriseId', '==', gerantId),
                where('status', '==', 'trial')
            )
            const trialSnapshot = await getDocs(trialQuery)
            const activeTrial = trialSnapshot.docs[0]?.data()
            
            console.log(`🔍 DEBUG: Trial snapshot size:`, trialSnapshot.size)
            console.log(`🔍 DEBUG: Active trial:`, activeTrial)
            console.log(`🔍 DEBUG: Active trial requested plan:`, activeTrial?.requestedPlan)
            
            // Use trial plan if active, otherwise use enterprise plan
            const currentPlan = activeTrial?.requestedPlan || enterpriseData.plan || 'free'
            
            console.log(`DEBUG: Enterprise=${gerantId}, Plan=${currentPlan}, ActiveTrial=${!!activeTrial}`)
            
            // Define limits for all plans
            const limits: Record<string, number> = { free: 1, bronze: 3, silver: 15, gold: 100 }
            const maxAllowed = limits[currentPlan] || 1
            
            console.log(`DEBUG: Plan=${currentPlan}, Max=${maxAllowed}`)
            
            // Count all members for this enterprise (simple query, no role filter)
            const membersQuery = query(
                collection(db, 'users'),
                where('enterpriseOwnerId', '==', gerantId)
            )
            const membersSnapshot = await getCountFromServer(membersQuery)
            const currentMemberCount = membersSnapshot.data().count
            
            console.log(`DEBUG: Current member count: ${currentMemberCount}, Max allowed: ${maxAllowed}`)
            
            if (currentMemberCount >= maxAllowed) {
                console.log(`❌ LIMIT REACHED: ${currentMemberCount} >= ${maxAllowed}`)
                throw new Error(`Limite atteinte : Vous avez atteint la limite de ${maxAllowed} membre(s) pour votre plan ${currentPlan}.`)
            } else {
                console.log(`✅ LIMIT OK: ${currentMemberCount} < ${maxAllowed}`)
            }
            
            console.log(`DEBUG: Actuel=${currentMemberCount}`)
            
            // Check limit
            if (currentMemberCount >= maxAllowed) {
                console.log('🚫 LIMITE ATTEINTE - BLOCAGE')
                throw new Error('Limite atteinte : Votre plan actuel est limité. Passez au plan supérieur pour continuer ou profitez d\'une période d\'essai de 7 jours offerte !')
            } else {
                console.log('✅ LIMITE OK - CRÉATION AUTORISÉE')
            }
        } else {
            console.log('❌ ENTREPRISE NON TROUVÉE dans enterprises/')
            // Try to get from users collection as fallback
            const userDoc = await getDoc(doc(db, 'users', gerantId))
            if (userDoc.exists()) {
                const userData = userDoc.data()
                const currentPlan = userData.plan || 'free'
                console.log(`DEBUG (fallback): Plan from users=${currentPlan}`)
            }
        }
    } catch (planError: any) {
        // If it's our custom error, throw it
        if (planError.message && planError.message.includes('Limite atteinte')) {
            throw planError
        }
        // If it's another error, log but continue (don't block member creation)
        console.warn('Could not verify plan limits:', planError)
    }

    // Generate a random temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

    // Create Firebase Auth user without disrupting current session
    const uid = await createUserWithoutSignIn(data.email, tempPassword)

    // Create user profile with enterpriseOwnerId linking to gérant
    await createUserProfile(uid, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: '+33000000000', // Placeholder phone
        role: 'enterprise',
        status: 'active',
        enterpriseOwnerId: gerantId,
        memberRole: data.role, // Store the member's role in the enterprise
    })

    // Send invitation email using EmailJS (if available)
    try {
        // Import EmailJS
        const emailjs = await import('@emailjs/browser')
        
        // Get current admin user info
        const { getAuth } = await import('firebase/auth')
        const auth = getAuth()
        const currentUser = auth.currentUser
        
        let adminName = 'L\'équipe as2built' // Default fallback
        
        if (currentUser?.uid) {
            try {
                const { getDoc, doc } = await import('firebase/firestore')
                const { getFirebaseFirestore } = await import('../index')
                const db = getFirebaseFirestore()
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
                
                if (userDoc.exists()) {
                    const userData = userDoc.data()
                    if (userData.firstName && userData.lastName) {
                        adminName = `${userData.firstName} ${userData.lastName}`
                    }
                }
            } catch (profileError) {
                console.warn('Could not fetch user profile:', profileError)
            }
        }
        
        console.log('🔥 NOM TROUVÉ DANS FIRESTORE:', adminName)
        
        // Generate a unique token for password setup
        const setupToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        
        // Store the setup token and temp password in Firestore
        const db = getFirebaseFirestore()
        await setDoc(doc(db, 'passwordSetups', setupToken), {
            uid: uid,
            email: data.email,
            tempPassword: tempPassword,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })
        
        // Initialize EmailJS
        emailjs.default.init('bDBhJp4YFlrLyRsdx')
        
        // Send invitation email with setup link containing token
        const templateParams = {
            user_email: data.email,
            user_name: `${data.firstName} ${data.lastName}`,
            company_name: companyName,
            user_role: data.role,
            admin_name: adminName,
            setup_link: typeof window !== 'undefined' 
                ? `${window.location.origin}/auth/set-password?token=${setupToken}`
                : `http://localhost:3000/auth/set-password?token=${setupToken}`
        }
        
        await emailjs.default.send(
            'service_185sjsq',
            'template_aj5l1po',
            templateParams
        )
        
        console.log('Invitation email sent successfully with token:', setupToken)
    } catch (emailError) {
        console.warn('EmailJS not configured or failed, skipping email:', (emailError as Error).message)
        // Don't fail the account creation if email fails
    }

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

// ========================================
// Audits Collection
// ========================================

/**
 * Create a new audit request
 */
export async function createAudit(
    requestedBy: string,
    data: CreateAuditData
): Promise<string> {
    const db = getFirebaseFirestore()
    const auditsRef = collection(db, COLLECTIONS.AUDITS)

    const docRef = await addDoc(auditsRef, {
        requestedBy,
        status: 'pending',
        formData: data.formData,
        reportPdfUrl: null,
        actionPlan: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

/**
 * Get all audits for an enterprise
 */
export async function getAuditsByEnterprise(enterpriseId: string): Promise<Audit[]> {
    const db = getFirebaseFirestore()
    const auditsRef = collection(db, COLLECTIONS.AUDITS)
    const q = query(auditsRef, where('requestedBy', '==', enterpriseId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            requestedBy: data.requestedBy,
            status: data.status,
            formData: data.formData,
            reportPdfUrl: data.reportPdfUrl || null,
            bimProtocolUrl: data.bimProtocolUrl || null,
            bimGuideUrl: data.bimGuideUrl || null,
            actionPlan: data.actionPlan || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Audit
    })
}

/**
 * Get a single audit by ID
 */
export async function getAudit(auditId: string): Promise<Audit | null> {
    const db = getFirebaseFirestore()
    const auditRef = doc(db, COLLECTIONS.AUDITS, auditId)
    const auditSnap = await getDoc(auditRef)

    if (!auditSnap.exists()) {
        return null
    }

    const data = auditSnap.data()
    return {
        id: auditSnap.id,
        requestedBy: data.requestedBy,
        status: data.status,
        formData: data.formData,
        reportPdfUrl: data.reportPdfUrl || null,
        bimProtocolUrl: data.bimProtocolUrl || null,
        bimGuideUrl: data.bimGuideUrl || null,
        actionPlan: data.actionPlan || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Audit
}

/**
 * Get all audits (admin only)
 */
export async function getAllAudits(): Promise<AuditWithDetails[]> {
    const db = getFirebaseFirestore()
    const auditsRef = collection(db, COLLECTIONS.AUDITS)
    const querySnapshot = await getDocs(auditsRef)

    const audits: AuditWithDetails[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data()
            const audit: AuditWithDetails = {
                id: docSnap.id,
                requestedBy: data.requestedBy,
                status: data.status,
                formData: data.formData,
                reportPdfUrl: data.reportPdfUrl || null,
                bimProtocolUrl: data.bimProtocolUrl || null,
                bimGuideUrl: data.bimGuideUrl || null,
                actionPlan: data.actionPlan || [],
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            }

            // Fetch enterprise name
            try {
                const userProfile = await getUserProfile(data.requestedBy)
                const enterpriseProfile = await getEnterpriseProfile(data.requestedBy)
                if (userProfile && enterpriseProfile) {
                    audit.enterpriseName = enterpriseProfile.companyName
                }
            } catch (e) {
                console.error(`Failed to fetch enterprise for audit ${docSnap.id}`, e)
            }

            return audit
        })
    )

    return audits
}

/**
 * Update an audit (admin only)
 */
export async function updateAudit(
    auditId: string,
    data: UpdateAuditData
): Promise<void> {
    const db = getFirebaseFirestore()
    const auditRef = doc(db, COLLECTIONS.AUDITS, auditId)

    await updateDoc(auditRef, {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData)
}

/**
 * Add a task to a project
 */
export async function addTaskToProject(
    projectId: string,
    taskData: {
        title: string
        startDate: string
        endDate: string
        status: 'pending' | 'in-progress' | 'completed'
        type: string
        workType: string
        description: string
        duration: number
        completionPercentage: number
        assigneeId: string
        assigneeName: string
        role: string
        position: string
        workDivision: string
        priority: 'low' | 'medium' | 'high'
        parentId?: string | null  // Ajout du parentId pour les tâches enfants
        createdBy?: string | null  // Ajout du createdBy pour le créateur
        creatorName?: string | null  // Ajout du creatorName pour le nom du créateur
        updates?: Array<any>  // Ajout du tableau updates pour l'historique (type simple pour Firestore)
    }
): Promise<string> {
    const db = getFirebaseFirestore()
    const tasksRef = collection(db, COLLECTIONS.PROJECTS, projectId, 'tasks')
    
    const taskDoc = await addDoc(tasksRef, JSON.parse(JSON.stringify({
        ...taskData,
        parentId: taskData.parentId || null,  // Force l'inclusion du parentId
        createdBy: taskData.createdBy || null,  // Force l'inclusion du createdBy
        creatorName: taskData.creatorName || null,  // Force l'inclusion du creatorName
        updates: taskData.updates || [],  // Force l'inclusion du tableau updates
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })))
    
    // Send notification to assignee if assigned
    if (taskData.assigneeId && taskData.assigneeId !== '') {
        try {
            await createNotification(taskData.assigneeId, {
                title: 'Nouvelle tâche assignée',
                message: `Vous avez été assigné à la tâche : ${taskData.title}`,
                type: 'task_assigned',
                relatedId: taskDoc.id,
                relatedType: 'task',
                actionUrl: `/projet/${projectId}/planning`
            })
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError)
            // Don't fail the task creation if notification fails
        }
    }
    
    return taskDoc.id
}

/**
 * Get all tasks for a project
 */
export async function getProjectTasks(projectId: string): Promise<any[]> {
    const db = getFirebaseFirestore()
    const tasksRef = collection(db, COLLECTIONS.PROJECTS, projectId, 'tasks')
    const querySnapshot = await getDocs(tasksRef)
    
    const tasksData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            parentId: data.parentId || null,  // Ajout du champ parentId manquant
            assigneeId: data.assigneeId || '',
            assigneeName: data.assigneeName || '',
            type: data.type || '',
            workType: data.workType || '',
            description: data.description || '',
            duration: data.duration || 0,
            completionPercentage: data.completionPercentage || 0,
            role: data.role || '',
            position: data.position || '',
            workDivision: data.workDivision || '',
            priority: data.priority || 'medium',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            createdBy: data.createdBy || null,
            creatorName: data.creatorName || null,
            updates: data.updates || []
        }
    })
    
    // Log de diagnostic pour vérifier les données brutes
    console.log('Données brutes Firebase:', tasksData)
    
    return tasksData
}

/**
 * Get project members from users collection
 * Automatically includes all experts and enterprise users
 */
export async function getProjectMembers(projectId: string): Promise<Array<{ id: string; name: string; role?: string; email?: string }>> {
    try {
        const db = getFirebaseFirestore()
        
        // Get all experts and enterprise users (they are automatically available for all projects)
        const usersRef = collection(db, COLLECTIONS.USERS)
        const usersQuery = query(usersRef, where('role', 'in', ['expert', 'enterprise']))
        const usersSnapshot = await getDocs(usersQuery)
        
        const users = usersSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            return {
                id: docSnap.id,
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Membre',
                role: data.role === 'expert' ? 'Expert' : 'Entreprise',
                email: data.email || '',
                uid: docSnap.id
            }
        })
        
        // Sort by name for better organization
        return users.sort((a, b) => a.name.localeCompare(b.name))
        
    } catch (error) {
        console.error('Error fetching project members:', error)
        // Return mock data as fallback
        return [
            { id: '1', name: 'Islem Zelagi', role: 'Expert', email: 'islem@example.com' },
            { id: '2', name: 'Larbi Ferdi', role: 'Expert', email: 'larbi@example.com' },
            { id: '3', name: 'Minou Atamna', role: 'Entreprise', email: 'minou@example.com' }
        ]
    }
}

/**
 * Assign task to member
 */
export async function assignTaskToMember(
    projectId: string,
    taskId: string,
    memberId: string
): Promise<void> {
    const db = getFirebaseFirestore()
    const taskRef = doc(db, COLLECTIONS.PROJECTS, projectId, 'tasks', taskId)
    
    await updateDoc(taskRef, {
        assigneeId: memberId,
        updatedAt: serverTimestamp(),
    })
}

/**
 * Add member to project
 */
export async function addMemberToProject(
    projectId: string,
    memberData: {
        uid: string
        name: string
        email: string
        role: string
    }
): Promise<void> {
    const db = getFirebaseFirestore()
    const membersRef = collection(db, COLLECTIONS.PROJECTS, projectId, 'members')
    
    await addDoc(membersRef, {
        ...memberData,
        addedAt: serverTimestamp(),
    })
}

/**
 * Get users by name for project assignment
 */
export async function getUsersByName(searchTerm: string): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
    const db = getFirebaseFirestore()
    const usersRef = collection(db, COLLECTIONS.USERS)
    
    // Search users by firstName or lastName
    const usersQuery = query(usersRef, where('role', 'in', ['expert', 'enterprise']))
    const querySnapshot = await getDocs(usersQuery)
    
    const users = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim()
        return {
            id: docSnap.id,
            name: fullName || data.email || 'Membre',
            email: data.email || '',
            role: data.role === 'expert' ? 'Expert' : 'Entreprise',
            firstName: data.firstName || '',
            lastName: data.lastName || ''
        }
    })
    
    // Filter by search term
    if (searchTerm) {
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }
    
    return users
}

/**
 * Create a notification for a user
 */
export async function createNotification(
    userId: string,
    notificationData: {
        title: string
        message: string
        type: 'task_assigned' | 'task_updated' | 'task_completed' | 'project_updated' | 'plan_change_request' | 'plan_change_approved' | 'plan_change_rejected' | 'plan_change_expired'
        relatedId?: string
        relatedType?: 'task' | 'project'
        actionUrl?: string
    }
): Promise<string> {
    const db = getFirebaseFirestore()
    const notificationsRef = collection(db, 'notifications')
    
    const notificationDoc = await addDoc(notificationsRef, {
        userId,
        ...notificationData,
        read: false,
        createdAt: serverTimestamp(),
    })
    
    return notificationDoc.id
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, limit: number = 50): Promise<any[]> {
    const db = getFirebaseFirestore()
    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('userId', '==', userId),
        firestoreOrderBy('createdAt', 'desc'),
        firestoreLimit(limit)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        }
    })
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const notificationRef = doc(db, 'notifications', notificationId)
    
    await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
    })
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    const db = getFirebaseFirestore()
    const notificationsRef = collection(db, 'notifications')
    const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
}
