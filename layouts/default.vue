<script setup lang="ts">
/**
 * Global Layout - Modern As2Built Interface
 * 
 * Features:
 * - Retractable sidebar with navigation
 * - Top header with search bar
 * - Fully responsive design
 * - Modern UI with Nuxt UI components
 */

const route = useRoute()
const { user, profile } = useAuth()

// Sidebar state
const sidebarOpen = ref(true)
const sidebarCollapsed = ref(false)
const isMobile = ref(false)

// Search state
const searchQuery = ref('')
const searchOpen = ref(false)

// Navigation items
const navigation = computed(() => {
  const navItems = [
    {
      label: 'Tableau de bord',
      icon: 'i-heroicons-home',
      to: '/',
      badge: null
    }
  ]

  // Add role-based navigation
  if (profile.value?.role === 'enterprise') {
    navItems.push(
      {
        label: 'Projets',
        icon: 'i-heroicons-folder-open',
        to: '/entreprise/projets',
        badge: null
      },
      {
        label: 'Formations',
        icon: 'i-heroicons-academic-cap',
        to: '/entreprise/formations',
        badge: null
      },
      {
        label: 'Membres',
        icon: 'i-heroicons-users',
        to: '/entreprise/membres',
        badge: null
      }
    )
  } else if (profile.value?.role === 'expert') {
    navItems.push(
      {
        label: 'Mes Projets',
        icon: 'i-heroicons-briefcase',
        to: '/expert/projets',
        badge: null
      }
    )
  } else if (profile.value?.role === 'admin') {
    navItems.push(
      {
        label: 'Administration',
        icon: 'i-heroicons-cog-6-tooth',
        to: '/admin',
        badge: null
      }
    )
  }

  return navItems
})

// Mobile detection
onMounted(() => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    sidebarOpen.value = false
    sidebarCollapsed.value = false
  }

  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
    if (!isMobile.value) {
      sidebarOpen.value = true
    }
  })
})

// Toggle sidebar
function toggleSidebar() {
  if (isMobile.value) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

// Close sidebar on mobile when clicking outside
function closeSidebar() {
  if (isMobile.value) {
    sidebarOpen.value = false
  }
}

// Search functionality
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    nextTick(() => {
      document.getElementById('search-input')?.focus()
    })
  }
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
}

// Handle search
async function handleSearch() {
  if (searchQuery.value.trim()) {
    await navigateTo(`/search?q=${encodeURIComponent(searchQuery.value)}`)
    closeSearch()
  }
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      toggleSearch()
    }
    // Escape to close search
    if (e.key === 'Escape' && searchOpen.value) {
      closeSearch()
    }
  }

  document.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Mobile sidebar overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen && isMobile"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-in-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="sidebarOpen"
        class="fixed left-0 top-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:static lg:translate-x-0"
        :class="{ 'w-16': sidebarCollapsed && !isMobile }"
      >
        <!-- Logo and brand -->
        <div class="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Icon name="i-heroicons-cube" class="h-5 w-5" />
            </div>
            <Transition
              enter-active-class="transition-opacity duration-200"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-200"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <span v-show="!sidebarCollapsed || isMobile" class="text-lg font-semibold text-gray-900 dark:text-white">
                As2Built
              </span>
            </Transition>
          </div>
          <UButton
            v-if="!isMobile"
            icon="i-herobars-3-center-left"
            size="sm"
            color="gray"
            variant="ghost"
            @click="toggleSidebar"
          />
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 p-4">
          <UVerticalNavigation
            :links="navigation"
            :ui="{ wrapper: 'space-y-2' }"
          />
        </nav>

        <!-- User section -->
        <div class="border-t border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center space-x-3">
            <UAvatar
              :src="null"
              :alt="`${profile?.firstName} ${profile?.lastName}` || 'User'"
              size="sm"
            />
            <Transition
              enter-active-class="transition-opacity duration-200"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-200"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div v-show="!sidebarCollapsed || isMobile" class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {{ `${profile?.firstName} ${profile?.lastName}` || 'Utilisateur' }}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ profile?.role || 'Chargement...' }}
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Main content -->
    <div
      class="flex flex-1 flex-col lg:pl-0"
      :class="{ 'lg:ml-64': !sidebarCollapsed && !isMobile, 'lg:ml-16': sidebarCollapsed && !isMobile }"
    >
      <!-- Top header -->
      <header class="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <!-- Left side -->
          <div class="flex items-center space-x-4">
            <UButton
              icon="i-heroicons-bars-3"
              size="sm"
              color="gray"
              variant="ghost"
              @click="toggleSidebar"
            />
            
            <!-- Search bar -->
            <div class="relative">
              <UButton
                icon="i-heroicons-magnifying-glass"
                size="sm"
                color="gray"
                variant="ghost"
                @click="toggleSearch"
              />
              
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div
                  v-if="searchOpen"
                  class="absolute left-0 top-0 flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2"
                >
                  <UInput
                    id="search-input"
                    v-model="searchQuery"
                    placeholder="Rechercher..."
                    icon="i-heroicons-magnifying-glass"
                    size="sm"
                    @keyup.enter="handleSearch"
                    @keyup.esc="closeSearch"
                  />
                  <UButton
                    icon="i-heroicons-x-mark"
                    size="sm"
                    color="gray"
                    variant="ghost"
                    @click="closeSearch"
                  />
                </div>
              </Transition>
            </div>
          </div>

          <!-- Right side -->
          <div class="flex items-center space-x-4">
            <!-- Notifications -->
            <UDropdown :items="[]">
              <UButton icon="i-heroicons-bell" size="sm" color="gray" variant="ghost" />
            </UDropdown>

            <!-- User menu -->
            <UDropdown
              :items="[
                [{
                  label: 'Profil',
                  icon: 'i-heroicons-user',
                  click: () => navigateTo('/profile')
                }],
                [{
                  label: 'Déconnexion',
                  icon: 'i-heroicons-arrow-right-on-rectangle',
                  click: async () => {
                    const { logout } = useAuth()
                    await logout()
                    await navigateTo('/')
                  }
                }]
              ]"
            >
              <UAvatar
                :src="null"
                :alt="`${profile?.firstName} ${profile?.lastName}` || 'User'"
                size="sm"
              />
            </UDropdown>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Custom animations for smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
