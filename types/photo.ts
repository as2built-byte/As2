/**
 * Photo Types
 * 
 * Type definitions for project photos collection
 */

export interface ProjectPhoto {
    id: string
    projectId: string
    senderId: string
    imageUrl: string
    note: string
    tags?: string[] // Construction site tags e.g., ['Fondations', 'Étage1', 'Coffrage']
    gpsLatitude?: number // EXIF GPS latitude
    gpsLongitude?: number // EXIF GPS longitude
    linkedDocuments?: string[] // IDs of linked documents
    promotedToProblem?: boolean // Whether this photo has been promoted to a problem
    problemId?: string // ID of the linked problem if promoted
    createdAt: Date
}

export interface CreatePhotoData {
    note: string
    tags?: string[]
    gpsLatitude?: number
    gpsLongitude?: number
    linkedDocuments?: string[]
}
