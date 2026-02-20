/**
 * Audit Types for As2Built
 * 
 * Type definitions for BIM Maturity Audit system
 */

// ========================================
// Audit Types
// ========================================

/** Audit status values */
export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

/** Sector of activity */
export type AuditSector = 'promotion' | 'bureau_etudes' | 'construction' | 'other'

/** Number of projects per year */
export type ProjectsPerYear = '1' | '1_5' | '5_10' | '10_50' | '50_plus'

/** Average delays */
export type AverageDelays = '0' | '0_3' | '3_6' | '6_12' | '12_18' | '18_24' | '24_plus'

/** Non-quality cost percentage */
export type NonQualityCost = '0' | '0_2' | '2_5' | '5_10' | '10_20' | '20_plus'

/** BIM maturity level */
export type BimLevel = '0' | '1' | '2'

/** Priority objective */
export type AuditPriority = 'cost' | 'time' | 'standards'

/** Action plan item status */
export type ActionPlanStatus = 'completed' | 'in_progress' | 'upcoming'

/** Form data submitted by enterprise */
export interface AuditFormData {
    sector: AuditSector
    employeeCount: number
    projectsPerYear: ProjectsPerYear
    delays: AverageDelays
    nonQualityCost: NonQualityCost
    technicalStaffCount: number
    bimLevel: BimLevel
    softwares: string[]
    priority: AuditPriority[]
}

/** Action plan item */
export interface ActionPlanItem {
    phase: string
    title: string
    description: string
    status: ActionPlanStatus
}

/** Audit stored in 'audits' collection */
export interface Audit {
    id: string
    requestedBy: string
    status: AuditStatus
    formData: AuditFormData
    reportPdfUrl: string | null
    bimProtocolUrl: string | null
    bimGuideUrl: string | null
    actionPlan: ActionPlanItem[]
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new audit request */
export interface CreateAuditData {
    formData: AuditFormData
}

/** Data for updating an audit (admin only) */
export interface UpdateAuditData {
    status?: AuditStatus
    reportPdfUrl?: string | null
    bimProtocolUrl?: string | null
    bimGuideUrl?: string | null
    actionPlan?: ActionPlanItem[]
}

/** Audit with enterprise details (for display) */
export interface AuditWithDetails extends Audit {
    enterpriseName?: string
}
