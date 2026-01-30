/**
 * Formation Types for As2Built
 * 
 * Type definitions for formations and packs
 */

// ========================================
// Formation Interface
// ========================================

/** Formation stored in 'formations' collection */
export interface Formation {
    id: string
    title: string
    description: string
    durationHours: number
    price: number // en DZD
    isActive: boolean
    coverUrl: string | null
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new formation */
export interface CreateFormationData {
    title: string
    description: string
    durationHours: number
    price: number
    isActive: boolean
    coverUrl?: string | null
}

/** Data for updating a formation */
export interface UpdateFormationData {
    title?: string
    description?: string
    durationHours?: number
    price?: number
    isActive?: boolean
    coverUrl?: string | null
}

// ========================================
// Pack Interface
// ========================================

/** Pack stored in 'packs' collection */
export interface Pack {
    id: string
    title: string
    formationIds: string[]
    price: number // en DZD
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new pack */
export interface CreatePackData {
    title: string
    formationIds: string[]
    price: number
}

/** Data for updating a pack */
export interface UpdatePackData {
    title?: string
    formationIds?: string[]
    price?: number
}

// ========================================
// Form Data (for UI)
// ========================================

/** Formation form data */
export interface FormationFormData {
    title: string
    description: string
    durationHours: number
    price: number
    isActive: boolean
    coverFile: File | null
}

/** Pack form data */
export interface PackFormData {
    title: string
    formationIds: string[]
    price: number
}

// ========================================
// Store State (isolated - no conflicts)
// ========================================

/** Formations store state */
export interface FormationsState {
    formations: Formation[]
    packs: Pack[]
    formationsLoading: boolean
    packsLoading: boolean
    error: string | null
    activeTab: 'formations' | 'packs'
    statusFilter: 'all' | 'active' | 'inactive'
}
