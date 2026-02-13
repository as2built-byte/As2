<script setup lang="ts">
/**
 * Project Management Layout
 * 
 * Dedicated layout for project workspace with:
 * - Custom sidebar with AS2BUILT logo and project navigation
 * - Professional header with project name and enterprise name
 * - No default layout inheritance
 */

import { getProject, getEnterpriseProfile } from '~/firebase/services/firestore'
import type { Project, EnterpriseProfile } from '~/types'

const route = useRoute()
const router = useRouter()
const { user, profile } = useAuth()

// Sidebar state
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

// Project data
const project = ref<Project | null>(null)
const enterprise = ref<EnterpriseProfile | null>(null)
const loading = ref(true)

// Extract project ID from route
const projectId = computed(() => {
    // Route pattern: /projet/[id]/documents, /projet/[id]/photos, etc.
    const segments = route.path.split('/')
    const projetIndex = segments.indexOf('projet')
    return projetIndex >= 0 ? segments[projetIndex + 1] : null
})

// Load project and enterprise data
async function loadProjectData(id: string) {
    loading.value = true
    try {
        const p = await getProject(id)
        project.value = p
        if (p?.enterpriseId) {
            enterprise.value = await getEnterpriseProfile(p.enterpriseId)
        }
    } catch (err) {
        console.error('Error loading project data:', err)
    } finally {
        loading.value = false
    }
}

// Wait for auth before loading
onMounted(async () => {
    const id = projectId.value
    if (!id) return
    // Small delay to ensure auth is fully ready (middleware ensures auth)
    await new Promise(resolve => setTimeout(resolve, 100))
    if (user.value?.uid) {
        await loadProjectData(id)
    }
})

// Watch for project ID changes (navigating between projects)
watch(projectId, async (newId, oldId) => {
    if (newId && newId !== oldId && user.value?.uid) {
        await loadProjectData(newId)
    }
})

// Navigation items
const navigation = [
    { path: 'documents', label: 'Documents', icon: 'heroicons:document-text' },
    { path: 'problemes', label: 'Problèmes', icon: 'heroicons:exclamation-triangle' },
    { path: 'rfis', label: 'RFIs', icon: 'heroicons:chat-bubble-left-right' },
    { path: 'soumissions', label: 'Soumissions', icon: 'heroicons:paper-airplane' },
    { path: 'photos', label: 'Photos', icon: 'heroicons:camera' },
]

// Check if nav item is active
function isActive(navPath: string): boolean {
    return route.path.includes(`/projet/${projectId.value}/${navPath}`)
}

// Build full path for nav item
function navTo(navPath: string): string {
    return `/projet/${projectId.value}/${navPath}`
}

// Back to origin based on user role
function goBack() {
    const role = profile.value?.role
    if (role === 'admin') {
        router.push('/admin/projets')
    } else if (role === 'expert') {
        router.push('/expert/projects')
    } else {
        router.push(`/entreprise/projets/${projectId.value}`)
    }
}

// Close mobile sidebar on route change
watch(() => route.path, () => {
    mobileSidebarOpen.value = false
})
</script>

<template>
    <div class="min-h-screen bg-slate-100">
        <!-- Mobile sidebar overlay -->
        <Transition name="fade">
            <div
                v-if="mobileSidebarOpen"
                class="fixed inset-0 z-40 bg-black/50 lg:hidden"
                @click="mobileSidebarOpen = false"
            />
        </Transition>

        <!-- Sidebar -->
        <aside
            class="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300"
            :class="[
                sidebarCollapsed ? 'w-20' : 'w-64',
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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

            <!-- Back button -->
            <div class="px-3 pt-4 pb-2">
                <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    :title="sidebarCollapsed ? 'Retour' : undefined"
                    @click="goBack"
                >
                    <Icon name="heroicons:arrow-left" class="w-5 h-5 flex-shrink-0" />
                    <span v-if="!sidebarCollapsed">Retour</span>
                </button>
            </div>

            <!-- Section label -->
            <div v-if="!sidebarCollapsed" class="px-6 pt-2 pb-3">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestion projet</p>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto px-3 space-y-1">
                <NuxtLink
                    v-for="item in navigation"
                    :key="item.path"
                    :to="navTo(item.path)"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    :class="isActive(item.path)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'"
                    :title="sidebarCollapsed ? item.label : undefined"
                >
                    <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                    <span v-if="!sidebarCollapsed">{{ item.label }}</span>
                </NuxtLink>
            </nav>
        </aside>

        <!-- Main content area -->
        <div
            class="transition-all duration-300"
            :class="sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'"
        >
            <!-- Header -->
            <header class="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm">
                <!-- Mobile menu button -->
                <button
                    type="button"
                    class="lg:hidden p-2 -ml-2 mr-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    @click="mobileSidebarOpen = true"
                >
                    <Icon name="heroicons:bars-3" class="w-6 h-6" />
                </button>

                <!-- Project info -->
                <div v-if="!loading && project" class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-sm font-bold text-slate-900 truncate">{{ project.title }}</h1>
                        <p class="text-xs text-slate-500 truncate">{{ enterprise?.companyName || '—' }}</p>
                    </div>
                </div>
                <div v-else-if="loading" class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                    <div>
                        <div class="h-4 w-32 bg-slate-100 rounded animate-pulse mb-1" />
                        <div class="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                </div>
            </header>

            <!-- Page content -->
            <main class="p-6">
                <slot />
            </main>
        </div>
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
