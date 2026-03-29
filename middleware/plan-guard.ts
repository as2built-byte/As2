/**
 * Plan Guard Middleware
 *
 * Protects routes that require specific subscription plans.
 * Redirects Bronze users away from premium features.
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import type { SubscriptionPlan } from '~/types'

// Routes that require at least Silver plan
const SILVER_ROUTES = [
    '/projet/:id/couts',
    '/projet/:id/erp',
    '/rapports'
]

// Routes that require Gold plan
const GOLD_ROUTES = [
    '/projet/:id/cashflow',
    '/projet/:id/previsions'
]

/**
 * Check if current route matches pattern
 */
function routeMatches(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
        // Convert route pattern to regex
        const regexPattern = pattern
            .replace(/:id/g, '[^/]+')
            .replace(/\//g, '\\/')
        const regex = new RegExp(`^${regexPattern}$`)
        return regex.test(path)
    })
}

/**
 * Check if user has required plan
 */
function hasRequiredPlan(currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
    const hierarchy: Record<SubscriptionPlan, number> = {
        free: 0,
        bronze: 1,
        silver: 2,
        gold: 3
    }
    return hierarchy[currentPlan] >= hierarchy[requiredPlan]
}

export default defineNuxtRouteMiddleware(async (to, from) => {
    const { profile, enterprise } = useAuth()
    
    // Wait for auth to be ready
    if (!profile.value) {
        await new Promise(resolve => {
            const unwatch = watch(() => profile.value, (profile) => {
                if (profile) {
                    unwatch()
                    resolve(true)
                }
            })
        })
    }
    
    // Get current plan using same logic as layout
    let currentPlan: SubscriptionPlan = 'free'
    
    // For enterprise users, get plan from enterprise data
    if (profile.value?.role === 'enterprise') {
        currentPlan = enterprise.value?.plan || 'free'
    }
    // For experts, give limited access
    else if (profile.value?.role === 'expert') {
        currentPlan = 'free'
    }
    // For admin, give full access
    else {
        currentPlan = 'gold'
    }
    
    const path = to.path
    
    console.log('🔍 planGuard check:', {
        path,
        role: profile.value?.role,
        currentPlan,
        enterprisePlan: enterprise.value?.plan
    })
    
    // Check Silver routes
    if (routeMatches(path, SILVER_ROUTES)) {
        console.log('🔍 Checking silver route access:', {
            path,
            currentPlan,
            hasRequired: hasRequiredPlan(currentPlan, 'silver')
        })
        if (!hasRequiredPlan(currentPlan, 'silver')) {
            console.log('🔍 Redirecting to upgrade - silver required')
            return navigateTo('/upgrade?plan=silver&from=' + encodeURIComponent(path))
        }
    }
    
    // Check Gold routes
    if (routeMatches(path, GOLD_ROUTES)) {
        console.log('🔍 Checking gold route access:', {
            path,
            currentPlan,
            hasRequired: hasRequiredPlan(currentPlan, 'gold')
        })
        if (!hasRequiredPlan(currentPlan, 'gold')) {
            console.log('🔍 Redirecting to upgrade - gold required')
            return navigateTo('/upgrade?plan=gold&from=' + encodeURIComponent(path))
        }
    }
    
    console.log('🔍 Access granted')
})
