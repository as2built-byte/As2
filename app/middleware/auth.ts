/**
 * Auth Middleware
 * 
 * Protects routes that require authentication
 */

export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client side
    if (import.meta.server) return

    const { isAuthenticated, loading, isPending, isActive, userRole, initAuthListener } = useAuth()

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

    // Account pending - redirect to pending page
    if (isPending.value && to.path !== '/pending') {
        return navigateTo('/pending')
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
})
