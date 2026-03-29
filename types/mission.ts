/**
 * Mission Types for As2Built
 * 
 * Type definitions for project missions
 */

// ========================================
// Mission Types
// ========================================

/** Mission status values - workflow states */
export type MissionStatus =
    | 'pending_admin'  // Created by enterprise, waiting for admin
    | 'proposed'       // Admin assigned an expert, waiting for response
    | 'accepted'       // Expert accepted the mission
    | 'refused'        // Expert refused (returns to pending_admin)
    | 'completed'      // Mission finished

/** Mission stored in 'missions' collection */
export interface Mission {
    id: string
    projectId: string
    enterpriseId: string
    title: string
    description: string
    status: MissionStatus
    expertId: string | null
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new mission */
export interface CreateMissionData {
    title: string
    description: string
}

/** Data for updating a mission */
export interface UpdateMissionData {
    title?: string
    description?: string
    status?: MissionStatus
    expertId?: string | null
}

/** Mission with related data (for display) */
export interface MissionWithDetails extends Mission {
    projectTitle?: string
    enterpriseName?: string
    expertName?: string
}
