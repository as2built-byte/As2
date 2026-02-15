/**
 * User Types for As2Built
 * 
 * Type definitions for users, experts, and enterprises
 */

// ========================================
// Enums / Union Types
// ========================================

/** User roles in the system */
export type UserRole = 'enterprise' | 'expert' | 'admin'

/** User account status */
export type UserStatus = 'active' | 'pending' | 'inactive' | 'rejected'

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
    email: string
    firstName: string
    lastName: string
    phone: string
    role: UserRole
    status: UserStatus
    enterpriseOwnerId?: string
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
    projectCount: number        // Number of projects created (for free limit)
    hasSubscription: boolean    // Whether enterprise has active subscription
    subscriptionRequestPending: boolean // Whether subscription request is pending
    createdAt: Date
}

/** Data for creating a new enterprise profile */
export interface CreateEnterpriseData {
    companyName: string
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
    phone: string
    password: string
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
    stats: AdminDashboardStats
    dashboardLoading: boolean
}

