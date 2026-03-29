/**
 * Notification Types
 * 
 * Types for in-app notifications system (admin, expert, enterprise)
 */

export type NotificationType =
    | 'new_payment'
    | 'new_registration'
    | 'certification_request'
    | 'subscription_request'
    | 'audit_request'         // Enterprise requested a BIM maturity audit
    | 'new_mission'
    | 'mission_invitation'    // Expert invited to a mission
    | 'mission_accepted'      // Expert accepted a mission (notify enterprise)

export type NotificationTargetRole = 'admin' | 'expert' | 'enterprise'

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
        itemType?: 'formation' | 'pack' | 'mission' | 'audit'
        itemId?: string
        itemTitle?: string
        amount?: number
    }
    /** Target role for the notification */
    targetRole: NotificationTargetRole
    /** Target user ID (for user-specific notifications) */
    targetUserId?: string
    /** Has the notification been read */
    read: boolean
    /** UID of the user who created this notification */
    createdBy: string
    createdAt: Date
}

export interface CreateNotificationData {
    type: NotificationType
    title: string
    message: string
    data: Notification['data']
    targetRole: NotificationTargetRole
    targetUserId?: string
    createdBy?: string // Auto-set by createNotification if not provided
}
