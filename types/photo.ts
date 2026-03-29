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
    createdAt: Date
}

export interface CreatePhotoData {
    note: string
}
