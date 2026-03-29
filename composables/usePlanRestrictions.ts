/**
 * Plan Restrictions Composable
 *
 * Central utility for checking subscription plan permissions
 * and enforcing limits across the application.
 */

import { PLAN_LIMITS, type SubscriptionPlan } from '~/types'

export interface PlanRestrictions {
    // Plan info
    plan: SubscriptionPlan
    planName: string
    planPrice: number | null
    
    // Projects
    canCreateProject: boolean
    maxProjects: number
    remainingProjects: number
    
    // Storage
    canUploadFile: (fileSize: number) => boolean
    maxStorage: number
    remainingStorage: number
    
    // Users
    canAddUser: boolean
    maxUsers: number
    remainingUsers: number
    
    // Features
    hasAdvancedPlanning: boolean
    hasExports: boolean
    hasCostsModule: boolean
    hasPurchases: boolean
    hasCashFlow: boolean
    hasMFA: boolean
    
    // Messages
    getUpgradeMessage: (feature: string) => string
}

export function usePlanRestrictions(
    plan: Ref<SubscriptionPlan>,
    projectCount: Ref<number>,
    storageUsed: Ref<number>,
    usersCount: Ref<number>
): PlanRestrictions {
    const limits = computed(() => PLAN_LIMITS[plan.value])
    
    // Projects
    const canCreateProject = computed(() => {
        return projectCount.value < limits.value.maxProjects
    })
    
    const maxProjects = computed(() => limits.value.maxProjects)
    
    const remainingProjects = computed(() => {
        return Math.max(0, limits.value.maxProjects - projectCount.value)
    })
    
    // Storage
    const canUploadFile = (fileSize: number): boolean => {
        return (storageUsed.value + fileSize) <= limits.value.maxStorage
    }
    
    const maxStorage = computed(() => limits.value.maxStorage)
    
    const remainingStorage = computed(() => {
        return Math.max(0, limits.value.maxStorage - storageUsed.value)
    })
    
    // Users
    const canAddUser = computed(() => {
        return usersCount.value < limits.value.maxUsers
    })
    
    const maxUsers = computed(() => limits.value.maxUsers)
    
    const remainingUsers = computed(() => {
        return Math.max(0, limits.value.maxUsers - usersCount.value)
    })
    
    // Feature flags
    const hasAdvancedPlanning = computed(() => limits.value.hasAdvancedPlanning)
    const hasExports = computed(() => limits.value.hasExports)
    const hasCostsModule = computed(() => limits.value.hasCostsModule)
    const hasPurchases = computed(() => limits.value.hasPurchases)
    const hasCashFlow = computed(() => limits.value.hasCashFlow)
    const hasMFA = computed(() => limits.value.hasMFA)
    
    // Plan info
    const planName = computed(() => {
        const names: Record<SubscriptionPlan, string> = {
            free: 'Gratuit',
            bronze: 'Bronze',
            silver: 'Silver',
            gold: 'Gold'
        }
        return names[plan.value]
    })
    
    const planPrice = computed(() => limits.value.price)
    
    // Upgrade messages
    const getUpgradeMessage = (feature: string): string => {
        if (plan.value === 'free') {
            return `Cette fonctionnalité nécessite le Pack Bronze. [Passer au Bronze]`
        } else if (plan.value === 'bronze') {
            return `Cette fonctionnalité nécessite le Pack Silver. [Passer au Silver]`
        } else if (plan.value === 'silver') {
            return `Cette fonctionnalité nécessite le Pack Gold. [Passer au Gold]`
        }
        return ''
    }
    
    return {
        // Plan info
        plan: plan.value,
        planName: planName.value,
        planPrice: planPrice.value,
        
        // Projects
        canCreateProject: canCreateProject.value,
        maxProjects: maxProjects.value,
        remainingProjects: remainingProjects.value,
        
        // Storage
        canUploadFile,
        maxStorage: maxStorage.value,
        remainingStorage: remainingStorage.value,
        
        // Users
        canAddUser: canAddUser.value,
        maxUsers: maxUsers.value,
        remainingUsers: remainingUsers.value,
        
        // Features
        hasAdvancedPlanning: hasAdvancedPlanning.value,
        hasExports: hasExports.value,
        hasCostsModule: hasCostsModule.value,
        hasPurchases: hasPurchases.value,
        hasCashFlow: hasCashFlow.value,
        hasMFA: hasMFA.value,
        
        // Messages
        getUpgradeMessage
    }
}

/**
 * Check if a route requires a specific plan
 */
export function requirePlan(plan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
    const hierarchy: Record<SubscriptionPlan, number> = {
        free: 0,
        bronze: 1,
        silver: 2,
        gold: 3
    }
    return hierarchy[plan] >= hierarchy[requiredPlan]
}

/**
 * Format storage size for display
 */
export function formatStorage(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
