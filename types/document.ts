/**
 * Document Types for As2Built
 * 
 * Type definitions for project documents (PDF)
 */

// ========================================
// Document Types
// ========================================

/** Document type values */
export type DocumentType = 'plan' | 'report' | 'contract'

/** Document stored in 'documents' collection */
export interface ProjectDocument {
    id: string
    projectId: string
    senderId: string
    title: string
    fileUrl: string
    type: DocumentType
    createdAt: Date
    description?: string
    fileSize?: number
    updatedAt?: Date
    updatedBy?: string
    tags?: string[]
    version?: number
}

/** Data for creating a new document */
export interface CreateDocumentData {
    title: string
    type: DocumentType
}
