/**
 * useAuth Composable
 * 
 * Provides convenient access to auth functionality in components
 */

import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'

export function useAuth() {
    const authStore = useAuthStore()

    // Destructure reactive state from store
    const {
        user,
        profile,
        enterprise,
        loading,
        error,
        isAuthenticated,
        isPending,
        isActive,
        userRole,
        isAdmin,
        isExpert,
        isEnterprise,
        isGerant,
        isMember,
    } = storeToRefs(authStore)

    // Return state and actions
    return {
        // State (reactive)
        user,
        profile,
        enterprise,
        loading,
        error,

        // Getters (reactive)
        isAuthenticated,
        isPending,
        isActive,
        userRole,
        isAdmin,
        isExpert,
        isEnterprise,
        isGerant,
        isMember,

        // Actions
        initAuthListener: authStore.initAuthListener,
        login: authStore.login,
        registerExpert: authStore.registerExpert,
        registerEnterprise: authStore.registerEnterprise,
        logout: authStore.logout,
        clearError: authStore.clearError,
        fetchProfile: authStore.fetchProfile,
        fetchEnterprise: authStore.fetchEnterprise,
    }
}
