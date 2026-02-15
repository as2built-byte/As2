<script setup lang="ts">
/**
 * Enterprise Layout - Professional SaaS Dashboard
 * 
 * Features:
 * - Fixed sidebar with organized navigation sections
 * - Top header with page title and user menu
 * - Proper logout functionality
 * - Scalable structure for future features
 */

const route = useRoute()
const { profile, user, logout, isGerant } = useAuth()

import { useNotificationsStore } from '~/stores/notifications'
const notificationsStore = useNotificationsStore()

// Subscribe to user notifications on mount
onMounted(() => {
    if (user.value?.uid) {
        notificationsStore.subscribeAsUser(user.value.uid)
    }
})

onUnmounted(() => {
    notificationsStore.unsubscribe()
})

// Sidebar collapsed state
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)

// Close mobile sidebar on route change
watch(() => route.path, () => {
    mobileOpen.value = false
})

// User menu
const showUserMenu = ref(false)

// Navigation structure - organized by sections (Enterprise specific)
const navigation = computed(() => {
    const nav: Record<string, Array<{ path: string; label: string; icon: string; exact?: boolean; disabled: boolean }>> = {
        main: [
            { 
                path: '/entreprise', 
                label: 'Tableau de bord', 
                icon: 'heroicons:home',
                exact: true,
                disabled: false
            }
        ],
        missions: [
            { path: '/entreprise/missions', label: 'Missions', icon: 'heroicons:briefcase', disabled: false }
        ],
        projects: [
            { path: '/entreprise/projets', label: 'Nos projets', icon: 'heroicons:folder-open', disabled: false }
        ],
    }

    // Only gérant can see Audits, Formations/Packs, and Membres sections
    if (isGerant.value) {
        nav.audits = [
            { path: '/entreprise/audits', label: 'Audits', icon: 'heroicons:clipboard-document-check', disabled: true }
        ]
        nav.training = [
            { path: '/entreprise/formations', label: 'Formations/Packs', icon: 'heroicons:academic-cap', disabled: false }
        ]
        nav.membres = [
            { path: '/entreprise/membres', label: 'Membres', icon: 'heroicons:user-group', disabled: false }
        ]
    }

    return nav
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
    if (path === '/entreprise') return 'Tableau de bord'
    if (path.includes('/entreprise/missions')) return 'Missions'
    if (path.includes('/entreprise/projets')) return 'Nos projets'
    if (path.includes('/entreprise/audits')) return 'Audits'
    if (path.includes('/entreprise/formations') || path.includes('/entreprise/packs')) return 'Formations/Packs'
    if (path.includes('/entreprise/membres')) return 'Membres'
    return 'Espace Entreprise'
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
                        src="~/assets/images/logo.jpeg" 
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
            <nav class="flex-1 overflow-y-auto py-4 px-3 sidebar-scroll">
                <!-- Main -->
                <div class="space-y-1">
                    <template v-for="item in navigation.main" :key="item.path">
                        <!-- Active link -->
                        <NuxtLink 
                            v-if="!item.disabled"
                            :to="item.path"
                            class="admin-nav-item"
                            :class="{ 'admin-nav-item-active': isActive(item) }"
                            :title="sidebarCollapsed ? item.label : undefined"
                        >
                            <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                        </NuxtLink>
                        <!-- Disabled item -->
                        <div 
                            v-else
                            class="admin-nav-item nav-item-disabled"
                            :title="sidebarCollapsed ? item.label : undefined"
                        >
                            <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                            <span v-if="!sidebarCollapsed" class="flex-1">{{ item.label }}</span>
                            <span v-if="!sidebarCollapsed" class="text-xs text-slate-600">Bientôt</span>
                        </div>
                    </template>
                </div>

                <!-- Recrutement Section -->
                <div class="mt-8">
                    <div class="space-y-1">
                        <template v-for="item in navigation.missions" :key="item.path">
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="admin-nav-item"
                                :class="{ 'admin-nav-item-active': isActive(item) }"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                            </NuxtLink>
                            <div 
                                v-else
                                class="admin-nav-item nav-item-disabled"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="flex-1">{{ item.label }}</span>
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-600">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Projets Section -->
                <div class="mt-8">
                    <div class="space-y-1">
                        <template v-for="item in navigation.projects" :key="item.path">
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="admin-nav-item"
                                :class="{ 'admin-nav-item-active': isActive(item) }"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                            </NuxtLink>
                            <div 
                                v-else
                                class="admin-nav-item nav-item-disabled"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="flex-1">{{ item.label }}</span>
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-600">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Audit Section (gérant only) -->
                <div v-if="isGerant && navigation.audits" class="mt-8">
                    <div class="space-y-1">
                        <div 
                            v-for="item in navigation.audits" 
                            :key="item.path"
                            class="admin-nav-item nav-item-disabled"
                            :title="sidebarCollapsed ? item.label : undefined"
                        >
                            <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                            <span v-if="!sidebarCollapsed" class="flex-1">{{ item.label }}</span>
                            <span v-if="!sidebarCollapsed" class="text-xs text-slate-600">Bientôt</span>
                        </div>
                    </div>
                </div>

                <!-- Formation Section (gérant only) -->
                <div v-if="isGerant && navigation.training" class="mt-8">
                    <div class="space-y-1">
                        <template v-for="item in navigation.training" :key="item.path">
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 transition-all duration-200 cursor-pointer hover:text-white hover:bg-slate-800"
                                :class="{ 'text-white bg-blue-600': isActive(item) }"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                            </NuxtLink>
                            <div 
                                v-else
                                class="admin-nav-item nav-item-disabled"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="flex-1">{{ item.label }}</span>
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-600">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Membres Section (gérant only) -->
                <div v-if="navigation.membres" class="mt-8">
                    <div class="space-y-1">
                        <template v-for="item in navigation.membres" :key="item.path">
                            <NuxtLink 
                                v-if="!item.disabled"
                                :to="item.path"
                                class="admin-nav-item"
                                :class="{ 'admin-nav-item-active': isActive(item) }"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                            </NuxtLink>
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
