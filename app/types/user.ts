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
export type UserStatus = 'active' | 'pending' | 'inactive'

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
// Auth State
// ========================================

/** Authentication state for the store */
export interface AuthState {
    user: { uid: string; email: string | null } | null
    profile: UserProfile | null
    loading: boolean
    error: string | null
}
