/**
 * Submission Types
 * 
 * Type definitions for project submissions collection
 */

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface ProjectSubmission {
    id: string
    projectId: string
    senderId: string
    title: string
    description: string
    status: SubmissionStatus
    createdAt: Date
}

export interface CreateSubmissionData {
    title: string
    description: string
}
