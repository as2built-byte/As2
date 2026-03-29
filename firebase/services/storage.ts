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
    FORMATION_COVERS: 'formations/covers',
    PROJECT_DOCUMENTS: 'projects/documents',
    PROJECT_PHOTOS: 'projects/photos',
    AUDIT_REPORTS: 'audits/reports',
    PAYMENT_PROOFS: 'payment-proofs',
} as const

// ========================================
// Payment Proof Upload (PDF only, max 5MB)
// ========================================

/**
 * Upload a payment proof PDF for plan change request
 * @param enterpriseId Enterprise ID
 * @param requestId Plan change request ID
 * @param file PDF file to upload
 * @returns Download URL of the uploaded file
 */
export async function uploadPaymentProof(
    enterpriseId: string,
    requestId: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()

    // Validate file type
    if (file.type !== 'application/pdf') {
        throw new Error('Le fichier doit être un PDF')
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 5MB')
    }

    const timestamp = Date.now()
    const filename = `payment_proof_${timestamp}.pdf`
    const filePath = `${STORAGE_PATHS.PAYMENT_PROOFS}/${enterpriseId}/${requestId}/${filename}`

    const storageRef = ref(storage, filePath)

    const metadata: UploadMetadata = {
        contentType: 'application/pdf',
        customMetadata: {
            enterpriseId,
            requestId,
            uploadedAt: new Date().toISOString(),
        }
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
}

/**
 * Delete a payment proof by URL
 */
export async function deletePaymentProofByUrl(proofUrl: string): Promise<void> {
    if (!proofUrl) return

    const storage = getFirebaseStorage()

    try {
        const urlPath = decodeURIComponent(proofUrl.split('/o/')[1]?.split('?')[0] || '')
        if (urlPath) {
            const fileRef = ref(storage, urlPath)
            await deleteObject(fileRef)
        }
    } catch (error) {
        console.warn('Could not delete payment proof:', error)
    }
}

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

/**
 * Delete an expert's CV by URL
 * Extracts the path from the download URL and deletes the file
 * @param cvUrl The download URL of the CV
 */
export async function deleteExpertCVByUrl(cvUrl: string): Promise<void> {
    if (!cvUrl) {
        console.warn('deleteExpertCVByUrl: No CV URL provided')
        return
    }

    const storage = getFirebaseStorage()

    try {
        // Extract the path from the download URL
        // Firebase Storage URLs contain the path after /o/ and before ?
        // Example: https://firebasestorage.googleapis.com/v0/b/bucket/o/experts%2Fcv%2Fuid%2Ffile.pdf?token=...
        const urlParts = cvUrl.split('/o/')
        if (urlParts.length < 2) {
            console.error('deleteExpertCVByUrl: Invalid Firebase Storage URL format:', cvUrl)
            return
        }

        const pathWithToken = urlParts[1]
        if (!pathWithToken) {
            console.error('deleteExpertCVByUrl: Could not extract path segment from URL:', cvUrl)
            return
        }

        const pathParts = pathWithToken.split('?')
        const urlPath = pathParts[0] ? decodeURIComponent(pathParts[0]) : ''

        if (!urlPath) {
            console.error('deleteExpertCVByUrl: Could not extract path from URL:', cvUrl)
            return
        }

        console.log('deleteExpertCVByUrl: Attempting to delete file at path:', urlPath)
        const fileRef = ref(storage, urlPath)
        await deleteObject(fileRef)
        console.log('deleteExpertCVByUrl: Successfully deleted old CV')
    } catch (error: any) {
        // Log detailed error for debugging
        console.error('deleteExpertCVByUrl: Error deleting CV:', {
            url: cvUrl,
            error: error.message || error,
            code: error.code
        })
        // Don't throw - allow the upload to continue even if deletion fails
        // The old file will remain but the new URL will be stored in Firestore
    }
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

// ========================================
// Formation Cover Upload
// ========================================

/**
 * Upload a formation cover image
 * @param formationId Formation ID
 * @param file Image file to upload (jpg, png, webp)
 * @returns Download URL of the uploaded image
 */
export async function uploadFormationCover(
    formationId: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const filename = `cover_${timestamp}.${extension}`
    const filePath = `${STORAGE_PATHS.FORMATION_COVERS}/${formationId}/${filename}`

    // Create storage reference
    const storageRef = ref(storage, filePath)

    // Set metadata
    const metadata: UploadMetadata = {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
            formationId,
            uploadedAt: new Date().toISOString(),
        }
    }

    // Upload file
    await uploadBytes(storageRef, file, metadata)

    // Get and return download URL
    const downloadUrl = await getDownloadURL(storageRef)
    return downloadUrl
}

/**
 * Delete a formation cover image by URL
 * Extracts the path from the download URL and deletes the file
 * @param coverUrl The download URL of the cover image
 */
export async function deleteFormationCoverByUrl(coverUrl: string): Promise<void> {
    if (!coverUrl) return

    const storage = getFirebaseStorage()

    try {
        // Extract the path from the download URL
        // Firebase Storage URLs contain the path after /o/ and before ?
        const urlPath = decodeURIComponent(coverUrl.split('/o/')[1]?.split('?')[0] || '')

        if (urlPath) {
            const fileRef = ref(storage, urlPath)
            await deleteObject(fileRef)
        }
    } catch (error) {
        // Log but don't throw - cover might already be deleted or URL invalid
        console.warn('Could not delete formation cover:', error)
    }
}

// ========================================
// Project Document Upload (PDF, max 10MB)
// ========================================

/**
 * Upload a project document (PDF only, max 10MB)
 * @param projectId Project ID
 * @param senderId User ID of the uploader
 * @param file PDF file to upload
 * @returns Download URL of the uploaded file
 */
export async function uploadProjectDocument(
    projectId: string,
    senderId: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()

    const timestamp = Date.now()
    const filename = `doc_${timestamp}.pdf`
    const filePath = `${STORAGE_PATHS.PROJECT_DOCUMENTS}/${projectId}/${senderId}/${filename}`

    const storageRef = ref(storage, filePath)

    const metadata: UploadMetadata = {
        contentType: 'application/pdf',
        customMetadata: {
            projectId,
            uploadedBy: senderId,
            uploadedAt: new Date().toISOString(),
        }
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
}

/**
 * Delete a project document file from Storage by URL
 */
export async function deleteProjectDocumentByUrl(fileUrl: string): Promise<void> {
    if (!fileUrl) return

    const storage = getFirebaseStorage()

    try {
        const urlPath = decodeURIComponent(fileUrl.split('/o/')[1]?.split('?')[0] || '')
        if (urlPath) {
            const fileRef = ref(storage, urlPath)
            await deleteObject(fileRef)
        }
    } catch (error) {
        console.warn('Could not delete project document:', error)
    }
}

// ========================================
// Project Photo Functions
// ========================================

/**
 * Upload a project photo (image only, max 10MB)
 * Path: projects/photos/{projectId}/{senderId}/{timestamp}_{filename}
 */
export async function uploadProjectPhoto(
    projectId: string,
    senderId: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${STORAGE_PATHS.PROJECT_PHOTOS}/${projectId}/${senderId}/${timestamp}_${safeName}`
    const fileRef = ref(storage, filePath)

    const metadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: {
            uploadedBy: senderId,
            projectId: projectId,
            originalName: file.name,
        },
    }

    const snapshot = await uploadBytes(fileRef, file, metadata)
    return await getDownloadURL(snapshot.ref)
}

/**
 * Delete a project photo file from Storage by URL
 */
export async function deleteProjectPhotoByUrl(imageUrl: string): Promise<void> {
    if (!imageUrl) return

    const storage = getFirebaseStorage()

    try {
        const urlPath = decodeURIComponent(imageUrl.split('/o/')[1]?.split('?')[0] || '')
        if (urlPath) {
            const fileRef = ref(storage, urlPath)
            await deleteObject(fileRef)
        }
    } catch (error) {
        console.warn('Could not delete project photo:', error)
    }
}

// ========================================
// Audit Report Upload (PDF only, max 20MB)
// ========================================

/**
 * Upload an audit report PDF (admin only)
 * @param auditId Audit ID
 * @param file PDF file to upload
 * @returns Download URL of the uploaded file
 */
export async function uploadAuditReport(
    auditId: string,
    file: File
): Promise<string> {
    const storage = getFirebaseStorage()

    const timestamp = Date.now()
    const filename = `rapport_audit_${timestamp}.pdf`
    const filePath = `${STORAGE_PATHS.AUDIT_REPORTS}/${auditId}/${filename}`

    const storageRef = ref(storage, filePath)

    const metadata: UploadMetadata = {
        contentType: 'application/pdf',
        customMetadata: {
            auditId,
            uploadedAt: new Date().toISOString(),
        }
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
}

/**
 * Delete an audit report by URL
 */
export async function deleteAuditReportByUrl(reportUrl: string): Promise<void> {
    if (!reportUrl) return

    const storage = getFirebaseStorage()

    try {
        const urlPath = decodeURIComponent(reportUrl.split('/o/')[1]?.split('?')[0] || '')
        if (urlPath) {
            const fileRef = ref(storage, urlPath)
            await deleteObject(fileRef)
        }
    } catch (error) {
        console.warn('Could not delete audit report:', error)
    }
}
