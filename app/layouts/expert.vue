<script setup lang="ts">
/**
 * Expert Layout - Professional Dashboard for BIM Experts
 * 
 * Features:
 * - Fixed sidebar with organized navigation sections
 * - Top header with page title and user menu
 * - Proper logout functionality
 * - Personalized for expert role
 */

const route = useRoute()
const { profile, logout } = useAuth()

// Sidebar collapsed state
const sidebarCollapsed = ref(false)

// User menu
const showUserMenu = ref(false)

// Navigation structure - organized by sections with single items
const navigation = {
    main: [
        { path: '/expert', label: 'Tableau de bord', icon: 'heroicons:home', exact: true, disabled: true }
    ],
    missions: [
        { path: '/expert/missions', label: 'Mes missions', icon: 'heroicons:briefcase', disabled: true }
    ],
    projects: [
        { path: '/expert/projects', label: 'Les projets', icon: 'heroicons:folder-open', disabled: true }
    ],
    training: [
        { path: '/expert/formations', label: 'Formations/Packs', icon: 'heroicons:academic-cap', disabled: false }
    ],
    profile: [
        { path: '/expert/profile', label: 'Mon profil', icon: 'heroicons:user-circle', disabled: false }
    ]
}

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
    if (path === '/expert') return 'Tableau de bord'
    if (path.includes('/expert/missions')) return 'Missions'
    if (path.includes('/expert/projects')) return 'Projets'
    if (path.includes('/expert/formations') || path.includes('/expert/packs')) return 'Formations/Packs'
    if (path.includes('/expert/profile')) return 'Mon profil'
    return 'Espace Expert'
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
        <!-- Sidebar -->
        <aside 
            class="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300"
            :class="sidebarCollapsed ? 'w-20' : 'w-64'"
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
                    class="p-1.5 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg mx-auto"
                    @click="sidebarCollapsed = false"
                >
                    <Icon name="heroicons:chevron-right" class="w-5 h-5" />
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto py-4 px-3 sidebar-scroll">
                <!-- Main Dashboard -->
                <div class="space-y-1">
                    <template v-for="item in navigation.main" :key="item.path">
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
                            <span v-if="!sidebarCollapsed" class="text-xs text-slate-500">Bientôt</span>
                        </div>
                    </template>
                </div>

                <!-- Missions Section -->
                <div class="mt-6">
                    <p v-if="!sidebarCollapsed" class="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Missions
                    </p>
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
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-500">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Projects Section -->
                <div class="mt-6">
                    <p v-if="!sidebarCollapsed" class="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Projets
                    </p>
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
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-500">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Training Section -->
                <div class="mt-6">
                    <p v-if="!sidebarCollapsed" class="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Formation
                    </p>
                    <div class="space-y-1">
                        <template v-for="item in navigation.training" :key="item.path">
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
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-500">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Profile Section -->
                <div class="mt-6">
                    <p v-if="!sidebarCollapsed" class="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Compte
                    </p>
                    <div class="space-y-1">
                        <template v-for="item in navigation.profile" :key="item.path">
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
                                <span v-if="!sidebarCollapsed" class="text-xs text-slate-500">Bientôt</span>
                            </div>
                        </template>
                    </div>
                </div>
            </nav>
        </aside>

        <!-- Main Content Area -->
        <div 
            class="transition-all duration-300"
            :class="sidebarCollapsed ? 'ml-20' : 'ml-64'"
        >
            <!-- Top Header -->
            <header class="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
                <!-- Page Title -->
                <div>
                    <h1 class="text-xl font-semibold text-slate-800">{{ pageTitle }}</h1>
                </div>

                <!-- Right Actions -->
                <div class="flex items-center gap-4">
                    <!-- Notifications (placeholder) -->
                    <button type="button" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Icon name="heroicons:bell" class="w-5 h-5" />
                    </button>

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
                                    <span class="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        Expert BIM
                                    </span>
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

        <!-- Overlay for mobile or click outside -->
        <div 
            v-if="showUserMenu" 
            class="fixed inset-0 z-30" 
            @click="closeUserMenu"
        ></div>
    </div>
</template>

