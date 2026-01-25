/**
 * Guest Middleware
 * 
 * Protects login/register pages from authenticated users
 */

export default defineNuxtRouteMiddleware(async () => {
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

    // If authenticated, redirect to appropriate dashboard
    if (isAuthenticated.value) {
        // If pending, redirect to pending page
        if (isPending.value) {
            return navigateTo('/pending')
        }

        // Redirect based on role
        switch (userRole.value) {
            case 'enterprise':
                return navigateTo('/entreprise')
            case 'expert':
                return navigateTo('/expert')
            case 'admin':
                return navigateTo('/admin')
            default:
                return navigateTo('/')
        }
    }
})
