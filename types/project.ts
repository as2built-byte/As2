/**
 * Project Types for As2Built
 * 
 * Type definitions for construction projects
 */

// ========================================
// Project Types
// ========================================

/** Project status values */
export type ProjectStatus = 'active' | 'completed'

/** Project stored in 'projects' collection */
export interface Project {
    id: string
    enterpriseId: string
    title: string
    description: string
    address: string
    startDate: Date
    status: ProjectStatus
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new project */
export interface CreateProjectData {
    title: string
    description: string
    address: string
    startDate: Date
}

/** Data for updating a project */
export interface UpdateProjectData {
    title?: string
    description?: string
    address?: string
    startDate?: Date
    status?: ProjectStatus
}
