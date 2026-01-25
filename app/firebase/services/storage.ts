/**
 * Firebase Storage Service
 * 
 * Provides cloud storage functionality for As2Built.
 * Use cases: Profile images, BIM files, Audit documents, Certifications
 */

import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFirebaseApp } from '../index'

let storageInstance: FirebaseStorage | null = null

/**
 * Get the Firebase Storage instance
 * Lazy initialization ensures app is ready before accessing storage
 */
export function getFirebaseStorage(): FirebaseStorage {
    if (storageInstance) {
        return storageInstance
    }

    const app = getFirebaseApp()
    storageInstance = getStorage(app)
    return storageInstance
}

// ========================================
// Storage Paths (to be implemented)
// ========================================

// export const STORAGE_PATHS = {
//     USER_AVATARS: 'users/avatars',
//     BIM_FILES: 'bim-files',
//     AUDIT_DOCUMENTS: 'audits/documents',
//     CERTIFICATIONS: 'certifications',
// } as const

// ========================================
// Future Storage Utilities
// ========================================

// export async function uploadFile(path: string, file: File): Promise<string> { ... }
// export async function downloadFile(path: string): Promise<Blob> { ... }
// export async function deleteFile(path: string): Promise<void> { ... }
// export function getDownloadUrl(path: string): Promise<string> { ... }
