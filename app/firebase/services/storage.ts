/**
 * Firebase Storage Service
 * 
 * Provides cloud storage functionality for As2Built.
 * Use cases: Profile images, BIM files, Audit documents, Certifications, CVs
 */

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    type FirebaseStorage,
    type UploadMetadata
} from 'firebase/storage'
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
// Storage Paths
// ========================================

export const STORAGE_PATHS = {
    EXPERT_CVS: 'experts/cv',
} as const

// ========================================
// CV Upload Functions
// ========================================

/**
 * Upload an expert's CV (PDF only)
 * @param uid User ID from Firebase Auth
 * @param file PDF file to upload
 * @returns Download URL of the uploaded file
 */
export async function uploadExpertCV(
    uid: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const filename = `cv_${timestamp}.pdf`
    const filePath = `${STORAGE_PATHS.EXPERT_CVS}/${uid}/${filename}`

    // Create storage reference
    const storageRef = ref(storage, filePath)

    // Set metadata
    const metadata: UploadMetadata = {
        contentType: 'application/pdf',
        customMetadata: {
            uploadedBy: uid,
            uploadedAt: new Date().toISOString(),
        }
    }

    // Upload file
    await uploadBytes(storageRef, file, metadata)

    // Get and return download URL
    const downloadUrl = await getDownloadURL(storageRef)
    return downloadUrl
}

// ========================================
// General Storage Utilities
// ========================================

/**
 * Delete a file from storage
 * @param filePath Full path to the file in storage
 */
export async function deleteStorageFile(filePath: string): Promise<void> {
    const storage = getFirebaseStorage()
    const fileRef = ref(storage, filePath)
    await deleteObject(fileRef)
}

/**
 * Get download URL for a file
 * @param filePath Full path to the file in storage
 * @returns Download URL
 */
export async function getFileDownloadUrl(filePath: string): Promise<string> {
    const storage = getFirebaseStorage()
    const fileRef = ref(storage, filePath)
    return getDownloadURL(fileRef)
}

