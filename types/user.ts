/**
 * User Types for As2Built
 * 
 * Type definitions for users, experts, and enterprises
 */

// ========================================
// Enums / Union Types
// ========================================

/** User roles in the system */
export type UserRole = 'enterprise' | 'expert' | 'admin' | 'guest'

/** User account status */
export type UserStatus = 'active' | 'pending' | 'inactive' | 'deleted'

/** Expert status */
export type ExpertStatus = 'available' | 'busy' | 'unavailable'

/** User with enterprise details for admin display */
export interface UserWithDetails extends UserProfile {
    enterprise?: EnterpriseProfile
}

/** Subscription plan tiers */
export type SubscriptionPlan = 'free' | 'bronze' | 'silver' | 'gold'

/** Plan change request status */
export type PlanChangeStatus = 'pending' | 'approved' | 'rejected' | 'trial'

// ========================================
// Plan Limits Configuration
// ========================================

export const PLAN_LIMITS = {
    free: {
        maxProjects: 1,
        maxStorage: 500 * 1024 * 1024, // 500MB in bytes
        maxUsers: 1,
        hasAdvancedPlanning: false,
        hasExports: false,
        hasCostsModule: false,
        hasPurchases: false,
        hasCashFlow: false,
        hasMFA: false,
        isTrial: true,
        price: 0
    },
    bronze: {
        maxProjects: 3,
        maxStorage: 2 * 1024 * 1024 * 1024, // 2GB in bytes
        maxUsers: 3,
        hasAdvancedPlanning: false,
        hasExports: false,
        hasCostsModule: false,
        hasPurchases: false,
        hasCashFlow: false,
        hasMFA: false,
        isTrial: false,
        price: 4500
    },
    silver: {
        maxProjects: 10,
        maxStorage: 50 * 1024 * 1024 * 1024, // 50GB in bytes
        maxUsers: 15,
        hasAdvancedPlanning: true,
        hasExports: true,
        hasCostsModule: true,
        hasPurchases: true,
        hasCashFlow: false,
        hasMFA: false,
        isTrial: false,
        price: 12000
    },
    gold: {
        maxProjects: Infinity,
        maxStorage: 500 * 1024 * 1024 * 1024, // 500GB in bytes
        maxUsers: Infinity,
        hasAdvancedPlanning: true,
        hasExports: true,
        hasCostsModule: true,
        hasPurchases: true,
        hasCashFlow: true,
        hasMFA: true,
        isTrial: false,
        price: null // Sur devis
    }
} as const

/** Plan change request */
export interface PlanChangeRequest {
    id?: string
    enterpriseId: string
    requestedBy: string
    previousPlan: SubscriptionPlan
    requestedPlan: SubscriptionPlan
    status: PlanChangeStatus
    trialEndDate?: Date
    requestedAt: Date
    processedAt?: Date
    processedBy?: string
    adminNotes?: string
    paymentProofUrl?: string  // URL du PDF de preuve de paiement
    paymentProofUploadedAt?: Date
    paymentProofUploadedBy?: string
}

// ========================================
// Base User Interface
// ========================================

/** Base user profile stored in 'users' collection */
export interface UserProfile {
    uid: string
    email: string
    firstName: string
    lastName: string
    phone: string
    role: UserRole
    status: UserStatus
    enterpriseOwnerId?: string  // Set for members created by a gérant (value = gérant's uid)
    createdAt: Date
}

/** Data for creating a new user (without uid and createdAt) */
export interface CreateUserData {
    email: string | null
    firstName: string
    lastName: string
    phone: string
    role: UserRole
    status: UserStatus
    enterpriseOwnerId?: string
    memberRole?: string
    authProvider?: string
    isAnonymous?: boolean
}

// ========================================
// Expert Interface
// ========================================

/** Expert profile stored in 'experts' collection */
export interface ExpertProfile {
    uid: string
    certifications: string[]
    cvUrl: string | null
    availability: boolean
    createdAt: Date
}

/** Data for creating a new expert profile */
export interface CreateExpertData {
    cvUrl?: string | null
}

// ========================================
// Enterprise Interface
// ========================================

/** Enterprise profile stored in 'enterprises' collection */
export interface EnterpriseProfile {
    uid: string
    companyName: string
    plan: SubscriptionPlan           // 'free', 'bronze', 'silver', 'gold'
    previousPlan?: SubscriptionPlan   // Plan before change request
    projectCount: number             // Number of projects created
    storageUsed: number              // Storage used in bytes
    usersCount: number               // Number of team members
    hasSubscription: boolean         // Legacy: Whether enterprise has active subscription
    subscriptionRequestPending: boolean // Whether subscription request is pending
    planChangeRequestId?: string     // Reference to pending plan change request
    isInTrialPeriod?: boolean        // Whether currently in 7-day trial
    trialEndDate?: Date              // When trial period ends
    status?: 'pending' | 'active' | 'suspended'  // Account approval status
    createdAt: Date
}

/** Data for creating a new enterprise profile */
export interface CreateEnterpriseData {
    companyName: string
    plan?: SubscriptionPlan          // Default to 'bronze'
}

// ========================================
// Registration Form Data
// ========================================

/** Expert registration form data */
export interface ExpertRegistrationForm {
    email: string
    password: string
    firstName: string
    lastName: string
    phone: string
    cvFile: File | null
}

/** Enterprise registration form data */
export interface EnterpriseRegistrationForm {
    email: string
    password: string
    companyName: string
    firstName: string
    lastName: string
    phone: string
}

// ========================================
// Member (Project Manager) Types
// ========================================

/** Data for creating a member account (by gérant) */
export interface CreateMemberData {
    firstName: string
    lastName: string
    email: string
    role: string
}

/** Project-member assignment stored in 'project_members' collection */
export interface ProjectMember {
    id: string
    projectId: string
    memberId: string
    assignedAt: Date
    assignedBy: string
}

// ========================================
// Auth State
// ========================================

/** Authentication state for the store */
export interface AuthState {
    user: { uid: string; email: string | null } | null
    profile: UserProfile | null
    enterprise: any | null
    loading: boolean
    error: string | null
}

// ========================================
// Admin Types
// ========================================

/** User with details for admin view (conditionally loaded) */
export interface UserWithDetails extends UserProfile {
    expertProfile?: ExpertProfile
    enterpriseProfile?: EnterpriseProfile
}

/** Admin dashboard statistics */
export interface AdminDashboardStats {
    totalUsers: number
    pendingUsers: number
    totalExperts: number
    totalEnterprises: number
    // Projects
    totalProjects: number
    activeProjects: number
    completedProjects: number
    // Missions
    totalMissions: number
    pendingMissions: number
    activeMissions: number
    completedMissions: number
    // Formations
    totalFormations: number
    activeFormations: number
    // Payments
    totalPayments: number
}

/** Admin store state */
export interface AdminState {
    users: UserWithDetails[]
    usersLoading: boolean
    usersError: string | null
    userRoleFilter: 'all' | 'expert' | 'enterprise'
    userStatusFilter: 'all' | UserStatus
    userSearchQuery: string
    userNameEmailQuery: string
    userCompanyQuery: string
    stats: AdminDashboardStats
    dashboardLoading: boolean
}

