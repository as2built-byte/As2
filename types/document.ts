/**
 * Document Types for As2Built
 * 
 * Type definitions for project documents (PDF)
 */

// ========================================
// Document Types
// ========================================

/** Document type values */
export type DocumentType = 'plan' | 'report' | 'contract' | 'excel' | 'dwg' | 'revit' | 'navisworks'

/** ISO 19650 document status values */
export type DocumentStatus = 'wip' | 's0' | 's4' | 'cr'

/** Document approval status */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/** Document metadata extracted from filename */
export interface DocumentMetadata {
    project?: string
    zone?: string
    discipline?: string
    phase?: string
    level?: string
    originalName?: string
}

/** Document stored in 'documents' collection */
export interface ProjectDocument {
    id: string
    projectId: string
    senderId: string
    title: string
    fileUrl: string
    type: DocumentType
    status: DocumentStatus
    createdAt: Date
    description?: string
    fileSize?: number
    updatedAt?: Date
    updatedBy?: string
    tags?: string[]
    version?: number
    metadata?: DocumentMetadata
    lockedBy?: string | null
    lockedAt?: Date | null
    extractedText?: string | null
    hasTextContent?: boolean
}

/** Data for creating a new document */
export interface CreateDocumentData {
    title: string
    type: DocumentType
    status?: DocumentStatus
    description?: string
    fileSize?: number
    metadata?: DocumentMetadata
}

// ========================================
// Document Approval / Workflow (ISO 19650)
// ========================================

/** Approval review step - for comments and annotations */
export interface ApprovalReview {
    id: string
    approvalId: string
    reviewerId: string
    comment: string
    annotations?: PDFAnnotation[]
    createdAt: Date
}

/** PDF annotation for review */
export interface PDFAnnotation {
    page: number
    x: number
    y: number
    text: string
    type: 'highlight' | 'comment' | 'stamp'
}

/** Approval history entry - tracks all status changes */
export interface ApprovalHistory {
    id: string
    documentId: string
    projectId: string
    action: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'revision_requested'
    actorId: string
    actorName?: string
    comment?: string
    previousStatus?: DocumentStatus
    newStatus?: DocumentStatus
    createdAt: Date
}

/** Approval request for a document */
export interface DocumentApproval {
    id: string
    documentId: string
    projectId: string
    requesterId: string
    approverId: string
    status: ApprovalStatus
    comment?: string
    reviewStep?: ApprovalReview
    createdAt: Date
    updatedAt?: Date
}

/** Data for creating an approval request */
export interface CreateApprovalData {
    documentId: string
    approverId: string
    comment?: string
}

/** Data for review step */
export interface CreateReviewData {
    approvalId: string
    comment: string
    annotations?: PDFAnnotation[]
}

// ========================================
// Document Versions
// ========================================

/** Document version for history tracking */
export interface DocumentVersion {
    id: string
    documentId: string
    projectId: string
    uploadedBy: string
    versionNumber: number
    fileUrl: string
    fileSize: number
    comment?: string
    createdAt: Date
}

/** Data for creating a document version */
export interface CreateVersionData {
    documentId: string
    fileUrl: string
    fileSize: number
    comment?: string
}
