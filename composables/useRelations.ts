/**
 * Relations Composable
 * 
 * Provides reactive functions for managing cross-references between project entities
 */

import { ref, computed, watch } from 'vue'
import type { 
    ProjectRelation, 
    RelationEntityType, 
    RelationType,
    EntityRelations,
    RelationSearchResult,
    ParsedTag
} from '~/types'
import {
    createRelation,
    updateRelation,
    deleteRelation,
    getRelationsByProject,
    getOutgoingRelations,
    getIncomingRelations,
    getEntityRelations,
    parseRelationTags,
    createRelationsFromTags,
    searchRelations
} from '~/firebase/services/relations'

export function useRelations(projectId: string) {
    // State
    const relations = ref<ProjectRelation[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const searchResults = ref<RelationSearchResult[]>([])
    const searching = ref(false)

    // Computed properties
    const relationsByType = computed(() => {
        const grouped: Record<RelationType, ProjectRelation[]> = {} as any
        relations.value.forEach(relation => {
            if (!grouped[relation.relationType]) {
                grouped[relation.relationType] = []
            }
            grouped[relation.relationType].push(relation)
        })
        return grouped
    })

    const relationsByEntityType = computed(() => {
        const grouped: Record<RelationEntityType, ProjectRelation[]> = {} as any
        relations.value.forEach(relation => {
            // Group by source type
            if (!grouped[relation.sourceType]) {
                grouped[relation.sourceType] = []
            }
            grouped[relation.sourceType].push(relation)
            
            // Group by target type
            if (!grouped[relation.targetType]) {
                grouped[relation.targetType] = []
            }
            grouped[relation.targetType].push(relation)
        })
        return grouped
    })

    // Actions
    const loadRelations = async () => {
        loading.value = true
        error.value = null
        try {
            relations.value = await getRelationsByProject(projectId)
            console.log(`✅ Loaded ${relations.value.length} relations for project ${projectId}`)
        } catch (err) {
            console.error('❌ Error loading relations:', err)
            error.value = 'Erreur lors du chargement des relations'
        } finally {
            loading.value = false
        }
    }

    const createRelationBetween = async (
        sourceType: RelationEntityType,
        sourceId: string,
        targetType: RelationEntityType,
        targetId: string,
        relationType: RelationType,
        description?: string,
        createdBy?: string
    ) => {
        try {
            const relationId = await createRelation({
                projectId,
                sourceType,
                sourceId,
                targetType,
                targetId,
                relationType,
                description,
                createdBy: createdBy || 'current-user'
            })
            
            // Reload relations to update the list
            await loadRelations()
            
            console.log(`✅ Created relation: ${sourceType}:${sourceId} -> ${targetType}:${targetId}`)
            return relationId
        } catch (err) {
            console.error('❌ Error creating relation:', err)
            throw err
        }
    }

    const removeRelation = async (relationId: string) => {
        try {
            await deleteRelation(relationId)
            
            // Remove from local state
            relations.value = relations.value.filter(r => r.id !== relationId)
            
            console.log(`✅ Deleted relation: ${relationId}`)
        } catch (err) {
            console.error('❌ Error deleting relation:', err)
            throw err
        }
    }

    const fetchEntityRelations = async (
        entityType: RelationEntityType,
        entityId: string
    ): Promise<EntityRelations | null> => {
        try {
            return await getEntityRelations(projectId, entityType, entityId)
        } catch (err) {
            console.error('❌ Error getting entity relations:', err)
            return null
        }
    }

    const searchRelationsQuery = async (query: string, limit: number = 20) => {
        searching.value = true
        try {
            searchResults.value = await searchRelations(projectId, query, limit)
            console.log(`✅ Found ${searchResults.value.length} results for "${query}"`)
        } catch (err) {
            console.error('❌ Error searching relations:', err)
            searchResults.value = []
        } finally {
            searching.value = false
        }
    }

    const parseTags = (text: string): ParsedTag[] => {
        return parseRelationTags(text)
    }

    const createRelationsFromText = async (
        sourceType: RelationEntityType,
        sourceId: string,
        text: string,
        createdBy: string,
        relationType: RelationType = 'references'
    ) => {
        try {
            const relationIds = await createRelationsFromTags(
                projectId,
                sourceType,
                sourceId,
                text,
                createdBy,
                relationType
            )
            
            // Reload relations to update the list
            await loadRelations()
            
            console.log(`✅ Created ${relationIds.length} relations from text`)
            return relationIds
        } catch (err) {
            console.error('❌ Error creating relations from text:', err)
            throw err
        }
    }

    // Auto-load when projectId changes
    watch(() => projectId, loadRelations, { immediate: true })

    return {
        // State
        relations,
        loading,
        error,
        searchResults,
        searching,
        
        // Computed
        relationsByType,
        relationsByEntityType,
        
        // Actions
        loadRelations,
        createRelationBetween,
        removeRelation,
        getEntityRelations: fetchEntityRelations,
        searchRelationsQuery,
        parseTags,
        createRelationsFromText
    }
}

/**
 * Tag editor composable for managing @mentions in text
 */
export function useRelationTags() {
    const tags = ref<ParsedTag[]>([])
    const text = ref('')
    
    const parseText = (newText: string) => {
        text.value = newText
        tags.value = parseRelationTags(newText)
    }
    
    const addTag = (type: RelationEntityType, id: string, displayText?: string) => {
        const tag: ParsedTag = {
            type,
            id,
            displayText: displayText || `@${type}:${id}`,
            startPosition: text.value.length,
            endPosition: text.value.length + (displayText?.length || `@${type}:${id}`.length)
        }
        
        tags.value.push(tag)
        text.value += tag.displayText + ' '
    }
    
    const removeTag = (index: number) => {
        const tag = tags.value[index]
        if (tag) {
            // Remove tag from text
            const before = text.value.substring(0, tag.startPosition)
            const after = text.value.substring(tag.endPosition)
            text.value = before + after
            
            // Update positions of remaining tags
            tags.value.splice(index, 1)
            tags.value.forEach((t, i) => {
                if (i >= index) {
                    t.startPosition -= (tag.endPosition - tag.startPosition)
                    t.endPosition -= (tag.endPosition - tag.startPosition)
                }
            })
            
            // Re-parse to ensure consistency
            parseText(text.value)
        }
    }
    
    const clearTags = () => {
        tags.value = []
        text.value = ''
    }
    
    return {
        tags,
        text,
        parseText,
        addTag,
        removeTag,
        clearTags
    }
}

/**
 * Entity navigation composable for quick navigation between related items
 */
export function useEntityNavigation() {
    const currentEntity = ref<{
        type: RelationEntityType
        id: string
        title: string
    } | null>(null)
    
    const relatedEntities = ref<EntityRelations | null>(null)
    
    const navigateToEntity = (
        type: RelationEntityType,
        id: string,
        title: string
    ) => {
        currentEntity.value = { type, id, title }
        
        // Navigate to the appropriate page
        const router = useRouter()
        const routes = {
            document: `/projet/${type}/documents`,
            photo: `/projet/${type}/photos`,
            problem: `/projet/${type}/problemes`,
            rfi: `/projet/${type}/rfis`
        }
        
        if (routes[type]) {
            router.push(`${routes[type]}#${id}`)
        }
    }
    
    const loadRelatedEntities = async (
        projectId: string,
        entityType: RelationEntityType,
        entityId: string
    ) => {
        try {
            const relationsComposable = useRelations(projectId)
            relatedEntities.value = await relationsComposable.getEntityRelations(entityType, entityId)
        } catch (err) {
            console.error('❌ Error loading related entities:', err)
            relatedEntities.value = null
        }
    }
    
    return {
        currentEntity,
        relatedEntities,
        navigateToEntity,
        loadRelatedEntities
    }
}
