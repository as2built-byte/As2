/**
 * Auth Middleware
 * 
 * Protects routes that require authentication
 */

export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client side
    if (import.meta.server) return

    const { isAuthenticated, loading, isPending, isActive, userRole, initAuthListener, enterprise } = useAuth()

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

    // Not authenticated - redirect to login
    if (!isAuthenticated.value) {
        return navigateTo('/')
    }

    // Check if account is inactive or deleted - block access and logout
    const { profile, logout } = useAuth()
    if (profile.value?.status === 'inactive' || profile.value?.status === 'deleted') {
        await logout()
        return navigateTo('/?error=account_suspended')
    }

    // Account pending - redirect to pending page (but NOT for enterprises with active status)
    if (isPending.value && to.path !== '/pending') {
        // Enterprises with 'active' status go directly to dashboard, others to pending
        if (userRole.value === 'enterprise' && enterprise.value?.status === 'active') {
            // Allow access, don't redirect to pending
        } else {
            return navigateTo('/pending')
        }
    }

    // Check role-based access
    const path = to.path

    if (path.startsWith('/entreprise') && userRole.value !== 'enterprise') {
        return navigateTo('/')
    }

    if (path.startsWith('/expert') && userRole.value !== 'expert') {
        return navigateTo('/')
    }

    if (path.startsWith('/admin') && userRole.value !== 'admin') {
        return navigateTo('/')
    }

    // Additional safety check - ensure user is not null before proceeding
    if (!userRole.value && path !== '/') {
        return navigateTo('/')
    }
})
