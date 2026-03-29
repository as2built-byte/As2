<script setup lang="ts">
/**
 * Admin Layout - Professional SaaS Dashboard
 * 
 * Features:
 * - Fixed sidebar with organized navigation sections
 * - Top header with page title and user menu
 * - Proper logout functionality
 * - Scalable structure for future features
 */

const route = useRoute()
const { profile, logout } = useAuth()

// Sidebar collapsed state
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)

// Close mobile sidebar on route change
watch(() => route.path, () => {
    mobileOpen.value = false
})

// User menu
const showUserMenu = ref(false)

// Navigation structure - organized by sections
const navigation = {
    main: [
        { 
            path: '/admin', 
            label: 'Tableau de bord', 
            icon: 'heroicons:home',
            exact: true 
        }
    ],
    users: [
        { 
            path: '/admin/users', 
            label: 'Utilisateurs', 
            icon: 'heroicons:users',
            exact: false 
        },
        { 
            path: '/admin/entreprises', 
            label: 'Entreprises', 
            icon: 'heroicons:building-office-2',
            exact: false 
        }
    ],
    content: [
        { path: '/admin/projets', label: 'Projets', icon: 'heroicons:folder-open', disabled: false },
        { path: '/admin/missions', label: 'Missions', icon: 'heroicons:briefcase', disabled: false },
        { path: '/admin/formations', label: 'Formations', icon: 'heroicons:academic-cap', disabled: false },
        { path: '/admin/audits', label: 'Audits', icon: 'heroicons:clipboard-document-check', disabled: false },
        { path: '/admin/messages', label: 'Messages', icon: 'heroicons:envelope', disabled: false }
    ],
    finance: [
        { path: '/admin/plan-requests', label: 'Demandes Plan', icon: 'heroicons:arrows-right-left', disabled: false },
        { path: '/admin/transactions', label: 'Transactions', icon: 'heroicons:banknotes', disabled: false }
    ]
}

// Get pending count from store
const adminStore = useAdminStore()
const pendingCount = computed(() => adminStore.stats.pendingUsers || 0)

// Import stores
import { useAdminStore } from '~/stores/admin'
import { useNotificationsStore } from '~/stores/notifications'

// Notifications store
const notificationsStore = useNotificationsStore()

// Subscribe to notifications on mount
onMounted(() => {
    notificationsStore.subscribe()
})

// Unsubscribe on unmount
onUnmounted(() => {
    notificationsStore.unsubscribe()
})

// Check if route is active
function isActive(item: { path: string; exact?: boolean }): boolean {
    if (item.exact) {
        return route.path === item.path
    }
    const basePath = item.path.split('?')[0] || item.path
    return route.path.startsWith(basePath)
}

// Get page title
const pageTitle = computed(() => {
    const path = route.path
    if (path === '/admin') return 'Tableau de bord'
    if (path.includes('/admin/users')) return 'Gestion des utilisateurs'
    if (path.includes('/admin/entreprises')) return 'Gestion des entreprises'
    if (path.includes('/admin/projets')) return 'Projets'
    if (path.includes('/admin/missions')) return 'Missions'
    if (path.includes('/admin/formations')) return 'Formations'
    if (path.includes('/admin/audits')) return 'Audits'
    if (path.includes('/admin/transactions')) return 'Transactions'
    if (path.includes('/admin/messages')) return 'Messages de contact'
    return 'Administration'
})

// Handle logout
async function handleLogout() {
    showUserMenu.value = false
    await logout()
    navigateTo('/')
}

// Close user menu on click outside
function closeUserMenu() {
    showUserMenu.value = false
}
</script>

<template>
    <div class="min-h-screen bg-slate-100">
        <!-- Email Verification Banner -->
        <EmailVerificationBanner />

        <!-- Mobile sidebar overlay -->
        <Transition name="fade">
            <div
                v-if="mobileOpen"
                class="fixed inset-0 z-40 bg-black/50 lg:hidden"
                @click="mobileOpen = false"
            />
        </Transition>

        <!-- Sidebar -->
        <aside 
            class="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300"
            :class="[
                sidebarCollapsed ? 'w-20' : 'w-64',
                mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            ]"
        >
            <!-- Logo -->
            <div class="h-16 flex items-center justify-between px-4 border-b border-slate-700">
                <div class="flex items-center gap-3">
                    <img 
                        src="/images/logo.jpeg" 
                        alt="As2Built"
                        class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <span v-if="!sidebarCollapsed" class="text-white font-bold text-lg">As2Built</span>
                </div>
                <button 
                    v-if="!sidebarCollapsed"
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    @click="sidebarCollapsed = true"
                >
                    <Icon name="heroicons:chevron-left" class="w-5 h-5" />
                </button>
                <button 
                    v-else
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg mx-auto"
                    @click="sidebarCollapsed = false"
                >
                    <Icon name="heroicons:chevron-right" class="w-5 h-5" />
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                <!-- Main Section -->
                <div>
                    <div v-if="!sidebarCollapsed" class="px-3 pt-2 pb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">PRINCIPAL</p>
                    </div>
                    <div class="space-y-1">
                        <NuxtLink 
                            v-for="item in navigation.main" 
                            :key="item.path"
                            :to="item.path"
                            class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                            :class="isActive(item)
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'"
                            :title="sidebarCollapsed ? item.label : undefined"
                        >
                            <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span v-if="!sidebarCollapsed" class="font-medium">{{ item.label }}</span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Users Section -->
                <div>
                    <div v-if="!sidebarCollapsed" class="px-3 pt-4 pb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">UTILISATEURS</p>
                    </div>
                    <div class="space-y-1">
                        <NuxtLink 
                            v-for="item in navigation.users" 
                            :key="item.path"
                            :to="item.path"
                            class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                            :class="isActive(item)
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'"
                            :title="sidebarCollapsed ? item.label : undefined"
                        >
                            <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span v-if="!sidebarCollapsed" class="font-medium">{{ item.label }}</span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Content Section -->
                <div>
                    <div v-if="!sidebarCollapsed" class="px-3 pt-4 pb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">CONTENU</p>
                    </div>
                    <div class="space-y-1">
                        <template v-for="item in navigation.content" :key="item.path">
                            <!-- Active link -->
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                                :class="isActive(item)
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700'"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span v-if="!sidebarCollapsed" class="font-medium">{{ item.label }}</span>
                            </NuxtLink>
                            <!-- Disabled item -->
                            <div 
                                v-else
                                class="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed opacity-60"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="flex items-center gap-2">
                                    {{ item.label }}
                                    <span class="text-xs text-slate-600">Bientôt</span>
                                </span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Finance Section -->
                <div>
                    <div v-if="!sidebarCollapsed" class="px-3 pt-4 pb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">FINANCE</p>
                    </div>
                    <div class="space-y-1">
                        <template v-for="item in navigation.finance" :key="item.path">
                            <!-- Active link -->
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                                :class="isActive(item)
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700'"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span v-if="!sidebarCollapsed" class="font-medium">{{ item.label }}</span>
                            </NuxtLink>
                            <!-- Disabled item -->
                            <div 
                                v-else
                                class="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed opacity-60"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="flex items-center gap-2">
                                    {{ item.label }}
                                    <span class="text-xs text-slate-600">Bientôt</span>
                                </span>
                            </div>
                        </template>
                    </div>
                </div>
            </nav>
        </aside>

        <!-- Main Content Area -->
        <div 
            class="transition-all duration-300"
            :class="sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'"
        >
            <!-- Top Header -->
            <header class="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
                <!-- Mobile menu button + Page Title -->
                <div class="flex items-center gap-3">
                    <button
                        type="button"
                        class="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        @click="mobileOpen = true"
                    >
                        <Icon name="heroicons:bars-3" class="w-6 h-6" />
                    </button>
                    <h1 class="text-xl font-semibold text-slate-800">{{ pageTitle }}</h1>
                </div>

                <!-- Right Actions -->
                <div class="flex items-center gap-4">
                    <!-- Notifications -->
                    <NotificationBell />

                    <!-- User Menu -->
                    <div class="relative">
                        <button 
                            type="button"
                            class="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            @click="showUserMenu = !showUserMenu"
                        >
                            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                {{ profile?.firstName?.charAt(0) }}{{ profile?.lastName?.charAt(0) }}
                            </div>
                            <Icon name="heroicons:chevron-down" class="w-4 h-4 text-slate-400" />
                        </button>

                        <!-- Dropdown -->
                        <Transition
                            enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95"
                        >
                            <div 
                                v-if="showUserMenu" 
                                class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2"
                            >
                                <div class="px-4 py-2 border-b border-slate-100">
                                    <p class="text-sm font-medium text-slate-800">
                                        {{ profile?.firstName }} {{ profile?.lastName }}
                                    </p>
                                    <p class="text-xs text-slate-500">{{ profile?.email }}</p>
                                </div>
                                <button 
                                    type="button"
                                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    @click="handleLogout"
                                >
                                    <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
                                    <span>Déconnexion</span>
                                </button>
                            </div>
                        </Transition>
                    </div>
                </div>
            </header>

            <!-- Page Content -->
            <main class="p-6">
                <slot />
            </main>
        </div>

        <!-- Overlay for user menu click outside -->
        <div 
            v-if="showUserMenu" 
            class="fixed inset-0 z-20" 
            @click="closeUserMenu"
        ></div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
