/**
 * Project Relations Types
 * 
 * Defines the cross-references system between documents, photos, problems, and RFIs
 */

export type RelationEntityType = 'document' | 'photo' | 'problem' | 'rfi'

export type RelationType = 
  | 'references'      // General reference
  | 'attached'        // File attachment
  | 'solved_by'       // Problem solved by document/photo
  | 'question_about'  // RFI asks about document/photo/problem
  | 'follows_up'      // Follow-up to another item
  | 'duplicates'      // Duplicate content
  | 'relates_to'      // General relation

export interface ProjectRelation {
  id: string
  projectId: string
  
  // Source of the relation
  sourceType: RelationEntityType
  sourceId: string
  
  // Target of the relation
  targetType: RelationEntityType
  targetId: string
  
  // Type and description
  relationType: RelationType
  description?: string
  
  // Metadata
  createdAt: Date
  createdBy: string
  updatedAt?: Date
  updatedBy?: string
  
  // Additional context
  context?: Record<string, any>
}

export interface RelationSummary {
  id: string
  title: string
  type: RelationEntityType
  relationType: RelationType
  createdAt: Date
  createdBy: string
}

export interface EntityRelations {
  entity: {
    id: string
    title: string
    type: RelationEntityType
  }
  outgoing: RelationSummary[]    // Relations from this entity
  incoming: RelationSummary[]    // Relations to this entity
  related: RelationSummary[]     // All related entities
}

export interface RelationStats {
  totalRelations: number
  byType: Record<RelationType, number>
  byEntityType: Record<RelationEntityType, number>
  mostConnected: Array<{
    id: string
    title: string
    type: RelationEntityType
    connectionCount: number
  }>
}

// Tag parsing for @mentions in text
export interface ParsedTag {
  type: RelationEntityType
  id: string
  displayText: string
  startPosition: number
  endPosition: number
}

export interface RelationSearchResult {
  entity: {
    id: string
    title: string
    type: RelationEntityType
  }
  relation: ProjectRelation
  relevanceScore: number
}
