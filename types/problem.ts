/**
 * Problem Types
 * 
 * Type definitions for project problems collection
 */

export type ProblemSeverity = 'minor' | 'major' | 'critical'
export type ProblemType = 'safety' | 'quality' | 'design'

export interface ProjectProblem {
    id: string
    projectId: string
    senderId: string
    title: string
    description: string
    type: ProblemType
    severity: ProblemSeverity
    linkedDocuments?: string[] // IDs of linked documents
    linkedPhotos?: string[] // IDs of linked photos
    locationX?: number // X coordinate on plan
    locationY?: number // Y coordinate on plan
    dueDate?: Date
    assignedTo?: string
    createdAt: Date
}

export interface CreateProblemData {
    title: string
    description: string
    type: ProblemType
    severity: ProblemSeverity
    linkedDocuments?: string[]
    linkedPhotos?: string[]
    locationX?: number
    locationY?: number
    dueDate?: Date
    assignedTo?: string
}
