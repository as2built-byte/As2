/**
 * Video Tutorial Types for As2Built
 * 
 * Type definitions for video tutorials
 */

// ========================================
// Video Tutorial Interface
// ========================================

/** Video tutorial stored in 'tutorials' collection */
export interface VideoTutorial {
    id: string
    title: string
    description: string
    youtubeUrl: string
    youtubeId: string
    duration: string // Format: "1m 30s" or "5m"
    tags: string[]
    isActive: boolean
    thumbnailUrl: string | null
    platform: 'Desktop' | 'Mobile' | 'Desktop & Mobile'
    createdAt: Date
    updatedAt: Date
}

/** Data for creating a new video tutorial */
export interface CreateVideoTutorialData {
    title: string
    description: string
    youtubeUrl: string
    duration: string
    tags: string[]
    isActive: boolean
    thumbnailUrl?: string | null
    platform?: 'Desktop' | 'Mobile' | 'Desktop & Mobile'
}

/** Data for updating a video tutorial */
export interface UpdateVideoTutorialData {
    title?: string
    description?: string
    youtubeUrl?: string
    duration?: string
    tags?: string[]
    isActive?: boolean
    thumbnailUrl?: string | null
    platform?: 'Desktop' | 'Mobile' | 'Desktop & Mobile'
}

// ========================================
// Form Data (for UI)
// ========================================

/** Video tutorial form data */
export interface VideoTutorialFormData {
    title: string
    description: string
    youtubeUrl: string
    duration: string
    tags: string[]
    isActive: boolean
    platform: 'Desktop' | 'Mobile' | 'Desktop & Mobile'
}

// ========================================
// Store State
// ========================================

/** Video tutorials store state */
export interface VideoTutorialsState {
    tutorials: VideoTutorial[]
    loading: boolean
    error: string | null
    statusFilter: 'all' | 'active' | 'inactive'
    selectedTutorial: VideoTutorial | null
}
