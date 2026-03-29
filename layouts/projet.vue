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
import NotificationDropdown from '~/components/NotificationDropdown.vue'

const route = useRoute()
const router = useRouter()
const { user, profile, enterprise: enterpriseData } = useAuth()

// Sidebar state
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

// Project data
const project = ref<Project | null>(null)
const enterpriseProfile = ref<EnterpriseProfile | null>(null)
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
    if (!id) return
    loading.value = true
    try {
        const p = await getProject(id)
        project.value = p
        if (p?.enterpriseId) {
            enterpriseProfile.value = await getEnterpriseProfile(p.enterpriseId)
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

// Navigation items organized by sections with plan restrictions
const navigationSections = [
  {
    title: 'PROJET',
    items: [
      { path: 'documents', label: 'Documents', icon: 'heroicons:document-text' },
      { path: 'photos', label: 'Photos', icon: 'heroicons:camera' },
      { path: 'problemes', label: 'Problèmes', icon: 'heroicons:exclamation-triangle' },
      { path: 'rfis', label: 'RFIs', icon: 'heroicons:chat-bubble-left-right' }
    ]
  },
  {
    title: 'ANALYSE',
    items: [
      { path: 'planning', label: 'Chronogramme', icon: 'heroicons:calendar-days', requiredPlan: 'bronze' },
      { path: 'couts', label: 'Coûts', icon: 'heroicons:banknotes', requiredPlan: 'silver' },
      { path: 'rapports', label: 'Rapports', icon: 'heroicons:document-text', requiredPlan: 'bronze' }
    ]
  }
]

// Get current user plan
const currentPlan = computed(() => {
  // For enterprise users, get plan from enterprise data
  if (profile.value?.role === 'enterprise') {
    // Use enterprise data from useAuth
    const plan = enterpriseData.value?.plan || 'free'
    console.log('🔍 Plan detection:', {
      role: profile.value?.role,
      enterprisePlan: enterpriseData.value?.plan,
      detectedPlan: plan,
      enterpriseData: enterpriseData.value
    })
    return plan
  }
  
  // For experts, give limited access (equivalent to free plan)
  if (profile.value?.role === 'expert') {
    console.log('🔍 Expert user, giving limited access')
    return 'free' // Experts have free-level access
  }
  
  // For admin, give full access
  console.log('🔍 Admin user, giving gold access')
  return 'gold'
})

// Check if user can access navigation item
function canAccessNavItem(item: any): boolean {
  if (!item.requiredPlan) return true // No restriction
  
  const planOrder = ['free', 'bronze', 'silver', 'gold']
  const currentPlanIndex = planOrder.indexOf(currentPlan.value)
  const requiredPlanIndex = planOrder.indexOf(item.requiredPlan)
  
  const canAccess = currentPlanIndex >= requiredPlanIndex
  
  console.log('🔍 Access check for', item.label, ':', {
    role: profile.value?.role,
    currentPlan: currentPlan.value,
    currentPlanIndex,
    requiredPlan: item.requiredPlan,
    requiredPlanIndex,
    canAccess
  })
  
  return canAccess
}

// Check if export is allowed (PDF/Excel)
function canExport(): boolean {
  // Experts cannot export
  if (profile.value?.role === 'expert') {
    console.log('🔍 Export blocked for expert')
    return false
  }
  
  const planOrder = ['free', 'bronze', 'silver', 'gold']
  const currentPlanIndex = planOrder.indexOf(currentPlan.value)
  const canExportResult = currentPlanIndex >= planOrder.indexOf('silver') // Silver et plus peuvent exporter
  
  console.log('🔍 Export check:', {
    role: profile.value?.role,
    currentPlan: currentPlan.value,
    currentPlanIndex,
    silverIndex: planOrder.indexOf('silver'),
    canExport: canExportResult
  })
  
  return canExportResult
}

// Check if current page has export restrictions for bronze plan
function hasExportRestriction(): boolean {
  if (currentPlan.value === 'silver' || currentPlan.value === 'gold') return false
  
  // Bronze plan: export blocked on planning and rapports pages
  const restrictedPaths = ['/planning', '/rapports']
  return restrictedPaths.some(path => route.path.includes(path))
}

// Provide functions to child components
provide('canExport', canExport)
provide('hasExportRestriction', hasExportRestriction)

// Check if nav item is active
function isActive(navPath: string): boolean {
    const currentPath = route.path
    const expectedPath = `/projet/${projectId.value}/${navPath}`
    return currentPath === expectedPath || currentPath.includes(`/${navPath}`)
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
        router.push('/expert/projets')
    } else {
        router.push(`/entreprise/projets/${projectId.value}`)
    }
}

// Handle locked item clicks
function handleLockedClick() {
    alert('Cette fonctionnalité est réservée au gestionnaire du projet')
}

// Close mobile sidebar on route change
watch(() => route.path, () => {
    mobileSidebarOpen.value = false
})

// Hide sidebar on couts, planning, and rapports pages (they have their own sidebar)
const hideSidebar = computed(() => {
    return route.path.includes('/couts') || route.path.includes('/planning') || route.path.includes('/rapports')
})
</script>

<template>
    <div class="min-h-screen bg-slate-100">
        <!-- Mobile sidebar overlay -->
        <Transition name="fade">
            <div
                v-if="mobileSidebarOpen && !hideSidebar"
                class="fixed inset-0 z-40 bg-black/50 lg:hidden"
                @click="mobileSidebarOpen = false"
            />
        </Transition>

        <!-- Sidebar -->
        <aside
            v-if="!hideSidebar"
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

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto px-3 space-y-6">
                <template v-for="section in navigationSections" :key="section.title">
                    <!-- Section title -->
                    <div v-if="!sidebarCollapsed" class="px-3 pt-4 pb-2">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ section.title }}</p>
                    </div>
                    
                    <!-- Section items -->
                    <div class="space-y-1">
                        <template v-for="item in section.items" :key="item.path">
                            <!-- Accessible navigation item -->
                            <NuxtLink
                                v-if="canAccessNavItem(item)"
                                :to="navTo(item.path)"
                                class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                                :class="isActive(item.path)
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700'"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span v-if="!sidebarCollapsed" class="font-medium">{{ item.label }}</span>
                            </NuxtLink>
                            
                            <!-- Locked navigation item -->
                            <div
                                v-else
                                @click.prevent.stop="handleLockedClick"
                                class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group cursor-not-allowed opacity-50"
                                :class="isActive(item.path)
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500'"
                                :title="sidebarCollapsed ? (item.label + ' 🔒') : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span v-if="!sidebarCollapsed" class="font-medium">
                                    {{ item.label }}
                                    <span class="ml-2">🔒</span>
                                </span>
                            </div>
                        </template>
                    </div>
                </template>
            </nav>
        </aside>

        <!-- Main content area -->
        <div
            class="transition-all duration-300"
            :class="hideSidebar ? '' : (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')"
        >
            <!-- Header -->
            <header class="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
                <!-- Mobile menu button -->
                <button
                    v-if="!hideSidebar"
                    type="button"
                    class="lg:hidden p-2 -ml-2 mr-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    @click="mobileSidebarOpen = true"
                >
                    <Icon name="heroicons:bars-3" class="w-6 h-6" />
                </button>

                <!-- Project info -->
                <div v-if="!loading && project" class="flex items-center gap-3 min-w-0">
                    <div>
                        <h1 class="text-lg font-semibold text-slate-800 truncate">{{ project.title }}</h1>
                        <p class="text-sm text-slate-500 truncate">{{ enterpriseProfile?.companyName || 'Entreprise' }}</p>
                    </div>
                </div>

                <!-- Loading skeleton -->
                <div v-else class="flex items-center gap-3 min-w-0">
                    <div>
                        <div class="h-4 w-32 bg-slate-100 rounded animate-pulse mb-1" />
                        <div class="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                </div>

                <!-- Notifications -->
                <div class="flex items-center gap-3">
                    <NotificationDropdown />
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
