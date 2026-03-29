/**
 * Role-based Route Protection Middleware
 * 
 * Protects routes based on user role (admin, expert, enterprise)
 * Usage: definePageMeta({ middleware: ['role'], requiredRole: 'admin' })
 */

export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client side
    if (import.meta.server) return

    const { isAuthenticated, loading, userRole, initAuthListener } = useAuth()
    const requiredRole = to.meta.requiredRole as string | undefined

    // Initialize auth listener if not already done
    if (loading.value) {
        initAuthListener()

        // Wait for auth state to be determined
        await new Promise<void>((resolve) => {
            const unwatch = watch(loading, (isLoading) => {
                if (!isLoading) {
                    unwatch()
                    resolve()
                }
            }, { immediate: true })
        })
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated.value) {
        return navigateTo('/login')
    }

    // If no specific role required, just check authentication
    if (!requiredRole) {
        return
    }

    // Check if user has the required role
    const currentRole = userRole.value
    
    // Role hierarchy: admin can access everything
    if (currentRole === 'admin') {
        return // Admin can access all routes
    }

    // Check specific role requirements
    if (requiredRole === 'admin' && currentRole !== 'admin') {
        console.warn(`Access denied: Admin role required, user is ${currentRole}`)
        return navigateTo(`/${currentRole}`)
    }

    if (requiredRole === 'expert' && currentRole !== 'expert' && currentRole !== 'admin') {
        console.warn(`Access denied: Expert role required, user is ${currentRole}`)
        return navigateTo(`/${currentRole}`)
    }

    if (requiredRole === 'enterprise' && currentRole !== 'enterprise' && currentRole !== 'admin') {
        console.warn(`Access denied: Enterprise role required, user is ${currentRole}`)
        return navigateTo(`/${currentRole}`)
    }

    // If we get here, access is granted
})
