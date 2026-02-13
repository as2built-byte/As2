/**
 * Problem Types
 * 
 * Type definitions for project problems collection
 */

export type ProblemSeverity = 'low' | 'medium' | 'high'

export interface ProjectProblem {
    id: string
    projectId: string
    senderId: string
    title: string
    description: string
    severity: ProblemSeverity
    createdAt: Date
}

export interface CreateProblemData {
    title: string
    description: string
    severity: ProblemSeverity
}
