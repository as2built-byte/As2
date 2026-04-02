<script setup lang="ts">
/**
 * Project Management Layout
 * 
 * Dedicated layout for project workspace with:
 * - Custom sidebar with AS2BUILT logo and project navigation
 * - Professional header with project name and enterprise name
 * - No default layout inheritance
 */

import { getProject, getEnterpriseProfile, getFirebaseFirestore } from '~/firebase/services/firestore'
import { collection, query, where, getDocs } from 'firebase/firestore'
import type { Project, EnterpriseProfile } from '~/types'
import NotificationDropdown from '~/components/NotificationDropdown.vue'

const route = useRoute()
const router = useRouter()
const { user, profile, enterprise: enterpriseData, isMember } = useAuth()

// Member section access map (loaded from project_members for staff)
const memberAccess = ref<Record<string, boolean>>({})

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

// Load member access toggles from project_members collection
async function loadMemberAccess(projectId: string) {
    if (!user.value?.uid) return
    try {
        const db = getFirebaseFirestore()
        const snap = await getDocs(
            query(
                collection(db, 'project_members'),
                where('projectId', '==', projectId),
                where('memberId', '==', user.value.uid)
            )
        )
        if (!snap.empty) {
            memberAccess.value = snap.docs[0].data().access || {}
        }
    } catch (e) {
        console.error('Error loading member access:', e)
    }
}

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
        // Load member access toggles (for staff; harmless no-op for gérant)
        await loadMemberAccess(id)
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
      { path: 'dashboard',  label: 'Tableau de Bord', icon: 'heroicons:home' },
      { path: 'documents',  label: 'Documents',       icon: 'heroicons:document-text' },
      { path: 'photos',     label: 'Photos',          icon: 'heroicons:camera' },
      { path: 'problemes',  label: 'Problèmes',       icon: 'heroicons:exclamation-triangle' },
      { path: 'rfis',       label: 'RFIs',            icon: 'heroicons:chat-bubble-left-right' },
      { path: 'membres',    label: 'Membres',         icon: 'heroicons:users' },
    ]
  },
  {
    title: 'ANALYSE',
    items: [
      { path: 'planning', label: 'Chronogramme', icon: 'heroicons:calendar-days', requiredPlan: 'bronze' },
      { path: 'couts', label: 'Coûts', icon: 'heroicons:banknotes', requiredPlan: 'silver' },
      { path: 'rapports', label: 'Rapports', icon: 'heroicons:clipboard-document-list', requiredPlan: 'bronze' }
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
  if (!item.requiredPlan) return true // No restriction on this item

  // Staff members: use the section access toggles set by the gérant in Membres page
  if (isMember.value) {
    return memberAccess.value[item.path] === true
  }

  // Gérant / admin / expert: use plan-based check
  const planOrder = ['free', 'bronze', 'silver', 'gold']
  const currentPlanIndex = planOrder.indexOf(currentPlan.value)
  const requiredPlanIndex = planOrder.indexOf(item.requiredPlan)
  return currentPlanIndex >= requiredPlanIndex
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

// French label map for header breadcrumb
const sectionLabels: Record<string, string> = {
    dashboard:  'Tableau de Bord',
    documents:  'Documents',
    photos:     'Photos',
    problemes:  'Problèmes',
    rfis:       'RFIs',
    membres:    'Membres',
    planning:   'Chronogramme',
    couts:      'Coûts',
    rapports:   'Rapports',
}

function currentSectionLabel(): string {
    const seg = route.path.split('/').at(-1) || ''
    return sectionLabels[seg] || seg
}

// Active check also handles exact dashboard path
function isActivePath(navPath: string): boolean {
    const currentPath = route.path
    if (navPath === 'dashboard') return currentPath === `/projet/${projectId.value}/dashboard` || currentPath === `/projet/${projectId.value}`
    return currentPath === `/projet/${projectId.value}/${navPath}` || currentPath.includes(`/${navPath}`)
}
</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <!-- Mobile sidebar overlay -->
        <Transition name="fade">
            <div
                v-if="mobileSidebarOpen && !hideSidebar"
                class="fixed inset-0 z-40 bg-black/60 lg:hidden"
                @click="mobileSidebarOpen = false"
            />
        </Transition>

        <!-- ─── SIDEBAR ──────────────────────────────────────────────── -->
        <aside
            v-if="!hideSidebar"
            class="fixed inset-y-0 left-0 z-50 flex flex-col bg-blue-900 transition-all duration-300"
            :class="[
                sidebarCollapsed ? 'w-20' : 'w-64',
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            ]"
        >
            <!-- Logo -->
            <div class="h-16 flex items-center justify-between px-4 border-b border-blue-800 shrink-0">
                <div class="flex items-center gap-3 min-w-0">
                    <img src="/images/logo.jpeg" alt="As2Built" class="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <span v-if="!sidebarCollapsed" class="text-white font-bold text-lg truncate">As2Built</span>
                </div>
                <button
                    v-if="!sidebarCollapsed"
                    type="button"
                    class="p-1.5 text-blue-400 hover:text-white hover:bg-blue-800 rounded-lg flex-shrink-0"
                    @click="sidebarCollapsed = true"
                    title="Réduire"
                >
                    <Icon name="heroicons:chevron-left" class="w-4 h-4" />
                </button>
                <button
                    v-else
                    type="button"
                    class="p-1.5 text-blue-400 hover:text-white hover:bg-blue-800 rounded-lg mx-auto"
                    @click="sidebarCollapsed = false"
                    title="Agrandir"
                >
                    <Icon name="heroicons:chevron-right" class="w-4 h-4" />
                </button>
            </div>

            <!-- Project name pill (when expanded) -->
            <div v-if="!sidebarCollapsed && !loading && project" class="px-4 py-3 border-b border-blue-800 shrink-0">
                <p class="text-xs text-blue-400 font-medium uppercase tracking-wide mb-0.5">Projet</p>
                <p class="text-white font-semibold text-sm truncate">{{ project.title }}</p>
                <p class="text-blue-400 text-xs truncate">{{ enterpriseProfile?.companyName || '' }}</p>
            </div>

            <!-- Back button -->
            <div class="px-3 pt-3 pb-1 shrink-0">
                <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
                    :title="sidebarCollapsed ? 'Retour' : undefined"
                    @click="goBack"
                >
                    <Icon name="heroicons:arrow-left" class="w-5 h-5 flex-shrink-0" />
                    <span v-if="!sidebarCollapsed">Retour</span>
                </button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 overflow-y-auto px-3 pb-4">
                <template v-for="section in navigationSections" :key="section.title">
                    <!-- Section title -->
                    <div v-if="!sidebarCollapsed" class="px-3 pt-5 pb-2">
                        <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{{ section.title }}</p>
                    </div>
                    <div v-else class="pt-4 pb-1 flex justify-center">
                        <div class="w-6 border-t border-blue-700"></div>
                    </div>

                    <!-- Section items -->
                    <div class="space-y-0.5">
                        <template v-for="item in section.items" :key="item.path">
                            <!-- Accessible navigation item -->
                            <NuxtLink
                                v-if="canAccessNavItem(item)"
                                :to="navTo(item.path)"
                                class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                                :class="isActivePath(item.path)
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-blue-200 hover:text-white hover:bg-blue-800'"
                                :title="sidebarCollapsed ? item.label : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
                                <!-- Active dot when collapsed -->
                                <span v-if="sidebarCollapsed && isActivePath(item.path)"
                                    class="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></span>
                            </NuxtLink>

                            <!-- Locked navigation item -->
                            <div
                                v-else
                                @click.prevent.stop="handleLockedClick"
                                class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg cursor-not-allowed opacity-40 text-blue-300"
                                :title="sidebarCollapsed ? (item.label + ' 🔒') : undefined"
                            >
                                <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                                <span v-if="!sidebarCollapsed" class="truncate flex items-center gap-1.5">
                                    {{ item.label }}
                                    <Icon name="heroicons:lock-closed" class="w-3 h-3" />
                                </span>
                            </div>
                        </template>
                    </div>
                </template>
            </nav>

            <!-- Footer -->
            <div v-if="!sidebarCollapsed" class="px-4 py-3 border-t border-blue-800 shrink-0">
                <p class="text-[10px] text-blue-500 text-center">As2Built · Module Projet</p>
            </div>
        </aside>

        <!-- ─── MAIN CONTENT ─────────────────────────────────────────── -->
        <div
            class="transition-all duration-300 flex flex-col min-h-screen"
            :class="hideSidebar ? '' : (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')"
        >
            <!-- Header -->
            <header class="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
                <!-- Left: mobile menu + breadcrumb -->
                <div class="flex items-center gap-3 min-w-0">
                    <button
                        v-if="!hideSidebar"
                        type="button"
                        class="lg:hidden p-2 -ml-2 mr-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        @click="mobileSidebarOpen = true"
                    >
                        <Icon name="heroicons:bars-3" class="w-6 h-6" />
                    </button>

                    <template v-if="!loading && project">
                        <div class="flex items-center gap-2 min-w-0">
                            <h1 class="text-base font-bold text-slate-800 truncate">{{ project.title }}</h1>
                            <span class="hidden sm:inline text-slate-300">/</span>
                            <span class="hidden sm:inline text-sm text-blue-600 font-medium truncate">
                                {{ currentSectionLabel() }}
                            </span>
                        </div>
                    </template>
                    <template v-else>
                        <div class="h-5 w-40 bg-slate-100 rounded animate-pulse"></div>
                    </template>
                </div>

                <!-- Right: enterprise name + notifications -->
                <div class="flex items-center gap-3 shrink-0">
                    <span v-if="!loading && enterpriseProfile" class="hidden md:inline text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {{ enterpriseProfile.companyName }}
                    </span>
                    <NotificationDropdown />
                </div>
            </header>

            <!-- Page content -->
            <main class="flex-1 p-6">
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
