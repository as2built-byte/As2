/**
 * Notification Types
 * 
 * Types for admin in-app notifications system
 */

export type NotificationType =
    | 'new_payment'
    | 'new_registration'
    | 'certification_request'
    | 'subscription_request'  // Enterprise requests subscription for more projects
    | 'new_mission'           // Enterprise creates a new mission (pending admin)

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message: string
    /** Additional data for linking/context */
    data: {
        userId?: string
        userName?: string
        userRole?: 'expert' | 'enterprise'
        itemType?: 'formation' | 'pack'
        itemId?: string
        itemTitle?: string
        amount?: number
    }
    /** Target role for the notification */
    targetRole: 'admin'
    /** Has the notification been read */
    read: boolean
    createdAt: Date
}

export interface CreateNotificationData {
    type: NotificationType
    title: string
    message: string
    data: Notification['data']
    targetRole: 'admin'
}
