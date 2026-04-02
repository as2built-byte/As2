/**
 * RFI Types
 * 
 * Type definitions for project RFIs (Requests for Information) collection
 */

export type RFIStatus = 'open' | 'closed'

export interface ProjectRFI {
    id: string
    projectId: string
    senderId: string
    title: string
    question: string
    linkedDocuments?: string[] // IDs of linked documents
    status: RFIStatus
    assignedTo?: string // ID du membre assigné
    dueDate?: Date // Date d'échéance
    closedAt?: Date
    closedBy?: string
    closingDocumentVersion?: number // Version du document qui a permis la cloture
    createdAt: Date
}

export interface CreateRFIData {
    title: string
    question: string
    linkedDocuments?: string[]
    status?: RFIStatus
    assignedTo?: string
    dueDate?: Date
}
