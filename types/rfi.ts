/**
 * RFI Types
 * 
 * Type definitions for project RFIs (Requests for Information) collection
 */

export interface ProjectRFI {
    id: string
    projectId: string
    senderId: string
    title: string
    question: string
    createdAt: Date
}

export interface CreateRFIData {
    title: string
    question: string
}
