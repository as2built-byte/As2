/**
 * Project Relations Firestore Services
 * 
 * Handles all database operations for cross-references between project entities
 */

import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    Timestamp 
} from 'firebase/firestore'
import { getFirebaseFirestore } from './firestore'
import type { 
    ProjectRelation, 
    RelationEntityType, 
    RelationType,
    EntityRelations,
    RelationStats,
    RelationSearchResult,
    ParsedTag
} from '~/types'

const RELATIONS_COLLECTION = 'projectRelations'

// ========== CRUD OPERATIONS ==========

/**
 * Create a new relation between two entities
 */
export async function createRelation(data: Omit<ProjectRelation, 'id' | 'createdAt'>): Promise<string> {
    try {
        const db = getFirebaseFirestore()
        const relationData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }
        
        const docRef = await addDoc(collection(db, RELATIONS_COLLECTION), relationData)
        console.log('✅ Relation created:', docRef.id)
        return docRef.id
    } catch (error) {
        console.error('❌ Error creating relation:', error)
        throw error
    }
}

/**
 * Update an existing relation
 */
export async function updateRelation(id: string, data: Partial<ProjectRelation>): Promise<void> {
    try {
        const db = getFirebaseFirestore()
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        }
        
        await updateDoc(doc(db, RELATIONS_COLLECTION, id), updateData)
        console.log('✅ Relation updated:', id)
    } catch (error) {
        console.error('❌ Error updating relation:', error)
        throw error
    }
}

/**
 * Delete a relation
 */
export async function deleteRelation(id: string): Promise<void> {
    try {
        const db = getFirebaseFirestore()
        await deleteDoc(doc(db, RELATIONS_COLLECTION, id))
        console.log('✅ Relation deleted:', id)
    } catch (error) {
        console.error('❌ Error deleting relation:', error)
        throw error
    }
}

/**
 * Get a specific relation by ID
 */
export async function getRelation(id: string): Promise<ProjectRelation | null> {
    try {
        const db = getFirebaseFirestore()
        const docSnap = await getDoc(doc(db, RELATIONS_COLLECTION, id))
        if (docSnap.exists()) {
            const data = docSnap.data()
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate()
            } as ProjectRelation
        }
        return null
    } catch (error) {
        console.error('❌ Error getting relation:', error)
        throw error
    }
}

// ========== QUERY OPERATIONS ==========

/**
 * Get all relations for a specific project
 */
export async function getRelationsByProject(projectId: string): Promise<ProjectRelation[]> {
    try {
        const db = getFirebaseFirestore()
        const q = query(
            collection(db, RELATIONS_COLLECTION),
            where('projectId', '==', projectId),
            orderBy('createdAt', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate()
            } as ProjectRelation
        })
    } catch (error) {
        console.error('❌ Error getting project relations:', error)
        throw error
    }
}

/**
 * Get all relations where an entity is the source
 */
export async function getOutgoingRelations(
    projectId: string, 
    entityType: RelationEntityType, 
    entityId: string
): Promise<ProjectRelation[]> {
    try {
        const db = getFirebaseFirestore()
        const q = query(
            collection(db, RELATIONS_COLLECTION),
            where('projectId', '==', projectId),
            where('sourceType', '==', entityType),
            where('sourceId', '==', entityId),
            orderBy('createdAt', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate()
            } as ProjectRelation
        })
    } catch (error) {
        console.error('❌ Error getting outgoing relations:', error)
        throw error
    }
}

/**
 * Get all relations where an entity is the target
 */
export async function getIncomingRelations(
    projectId: string, 
    entityType: RelationEntityType, 
    entityId: string
): Promise<ProjectRelation[]> {
    try {
        const db = getFirebaseFirestore()
        const q = query(
            collection(db, RELATIONS_COLLECTION),
            where('projectId', '==', projectId),
            where('targetType', '==', entityType),
            where('targetId', '==', entityId),
            orderBy('createdAt', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate()
            } as ProjectRelation
        })
    } catch (error) {
        console.error('❌ Error getting incoming relations:', error)
        throw error
    }
}

/**
 * Get all relations for an entity (both incoming and outgoing)
 */
export async function getEntityRelations(
    projectId: string,
    entityType: RelationEntityType,
    entityId: string
): Promise<EntityRelations> {
    try {
        const [outgoing, incoming] = await Promise.all([
            getOutgoingRelations(projectId, entityType, entityId),
            getIncomingRelations(projectId, entityType, entityId)
        ])
        
        // Convert to summaries and get entity details
        const outgoingSummaries = await convertRelationsToSummaries(outgoing, 'target')
        const incomingSummaries = await convertRelationsToSummaries(incoming, 'source')
        const allRelated = [...outgoingSummaries, ...incomingSummaries]
        
        // Get entity details
        const entityDetails = await getEntityDetails(projectId, entityType, entityId)
        
        return {
            entity: entityDetails,
            outgoing: outgoingSummaries,
            incoming: incomingSummaries,
            related: allRelated
        }
    } catch (error) {
        console.error('❌ Error getting entity relations:', error)
        throw error
    }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Parse @mentions in text to extract relation tags
 */
export function parseRelationTags(text: string): ParsedTag[] {
    const tags: ParsedTag[] = []
    const regex = /@(\w+):([a-zA-Z0-9-_]+)/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
        const [fullMatch, entityType, entityId] = match
        tags.push({
            type: entityType as RelationEntityType,
            id: entityId,
            displayText: fullMatch,
            startPosition: match.index,
            endPosition: match.index + fullMatch.length
        })
    }
    
    return tags
}

/**
 * Create relations from parsed tags
 */
export async function createRelationsFromTags(
    projectId: string,
    sourceType: RelationEntityType,
    sourceId: string,
    text: string,
    createdBy: string,
    relationType: RelationType = 'references'
): Promise<string[]> {
    const tags = parseRelationTags(text)
    const relationIds: string[] = []
    
    for (const tag of tags) {
        try {
            const relationId = await createRelation({
                projectId,
                sourceType,
                sourceId,
                targetType: tag.type,
                targetId: tag.id,
                relationType,
                description: `Auto-created from @mention: ${tag.displayText}`,
                createdBy: createdBy || 'system',
                context: { tag: tag.displayText }
            })
            relationIds.push(relationId)
        } catch (error) {
            console.warn(`⚠️ Could not create relation for tag ${tag.displayText}:`, error)
        }
    }
    
    return relationIds
}

/**
 * Search for relations matching a query
 */
export async function searchRelations(
    projectId: string,
    query: string,
    limit: number = 20
): Promise<RelationSearchResult[]> {
    try {
        // This is a simplified search - in production you'd want to use Algolia or similar
        const allRelations = await getRelationsByProject(projectId)
        
        // Filter and rank results based on query relevance
        const results: RelationSearchResult[] = []
        const queryLower = query.toLowerCase()
        
        for (const relation of allRelations) {
            if (relation.description?.toLowerCase().includes(queryLower)) {
                const entityDetails = await getEntityDetails(
                    projectId, 
                    relation.targetType, 
                    relation.targetId
                )
                
                results.push({
                    entity: entityDetails,
                    relation,
                    relevanceScore: calculateRelevanceScore(query, relation.description || '')
                })
            }
        }
        
        return results
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit)
    } catch (error) {
        console.error('❌ Error searching relations:', error)
        throw error
    }
}

// ========== HELPER FUNCTIONS ==========

async function convertRelationsToSummaries(
    relations: ProjectRelation[], 
    direction: 'source' | 'target'
): Promise<any[]> {
    // This would need to be implemented based on your entity fetching logic
    // For now, return a basic structure
    return relations.map(rel => ({
        id: direction === 'source' ? rel.targetId : rel.sourceId,
        title: `${direction === 'source' ? rel.targetType : rel.sourceType}-${direction === 'source' ? rel.targetId : rel.sourceId}`,
        type: direction === 'source' ? rel.targetType : rel.sourceType,
        relationType: rel.relationType,
        createdAt: rel.createdAt,
        createdBy: rel.createdBy || 'unknown'
    }))
}

async function getEntityDetails(
    projectId: string,
    entityType: RelationEntityType,
    entityId: string
): Promise<{ id: string; title: string; type: RelationEntityType }> {
    // This would need to be implemented based on your entity fetching logic
    // For now, return a basic structure
    return {
        id: entityId,
        title: `${entityType}-${entityId}`,
        type: entityType
    }
}

function calculateRelevanceScore(query: string, text: string): number {
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()
    
    if (textLower === queryLower) return 100
    if (textLower.startsWith(queryLower)) return 90
    if (textLower.includes(queryLower)) return 70
    
    // Word-based scoring
    const queryWords = queryLower.split(' ')
    const textWords = textLower.split(' ')
    const matches = queryWords.filter(word => textWords.includes(word)).length
    
    return (matches / queryWords.length) * 50
}
