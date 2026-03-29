<script setup lang="ts">
definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

// Get user profile for role-based filtering
const { profile } = useAuth()

// Active tab state
const activeTab = ref('documents')

// Tab configuration
const allTabs = [
    {
        key: 'documents',
        label: 'Documents',
        icon: 'heroicons:document-text',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'photos',
        label: 'Photos',
        icon: 'heroicons:photo',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'problemes',
        label: 'Problèmes',
        icon: 'heroicons:exclamation-triangle',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'rfis',
        label: 'RFIs',
        icon: 'heroicons:chat-bubble-left-right',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'planning',
        label: 'Planning',
        icon: 'heroicons:calendar-days',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'couts',
        label: 'Coûts',
        icon: 'heroicons:banknotes',
        count: 0 // Will be updated dynamically
    },
    {
        key: 'rapports',
        label: 'Rapports',
        icon: 'heroicons:document-text',
        count: 0 // Will be updated dynamically
    }
]

// Filter tabs based on user role
const tabs = computed(() => {
    return allTabs.map(tab => {
        const isLockedForExpert = profile.value?.role === 'expert' && 
            ['planning', 'couts', 'rapports'].includes(tab.key)
        
        return {
            ...tab,
            locked: isLockedForExpert,
            label: isLockedForExpert ? `${tab.label} 🔒` : tab.label
        }
    })
})

// Handle tab changes - navigate to actual pages
watch(activeTab, (newTab) => {
    // Check if tab is locked for expert
    const currentTab = tabs.value.find(tab => tab.key === newTab)
    if (currentTab?.locked) {
        // Show message and prevent navigation
        return
    }
    // Navigate to the actual page
    router.push(`/projet/${projectId}/${newTab}`)
})

// Handle tab click with lock check
function handleTabClick(tabKey: string) {
    const currentTab = tabs.value.find(tab => tab.key === tabKey)
    if (currentTab?.locked) {
        // Show toast or alert message
        alert('Cette fonctionnalité est réservée au gestionnaire du projet')
        return
    }
    activeTab.value = tabKey
}

// Initialize tab from URL
onMounted(() => {
    const pathSegments = route.path.split('/')
    const lastSegment = pathSegments[pathSegments.length - 1]
    
    // Check if the last segment matches a valid tab
    const validTab = tabs.value.find(tab => tab.key === lastSegment)
    if (validTab) {
        activeTab.value = validTab.key
    }
})
</script>

<template>
    <div class="project-view">
        <ProjectTabs 
            v-model="activeTab"
            :tabs="tabs"
        >
            <template #default="{ activeTab }">
                <!-- Show current page content or redirect -->
                <div class="tab-content">
                    <div class="text-center py-8">
                        <Icon name="heroicons:arrow-path" class="w-8 h-8 mx-auto mb-4 text-slate-400 animate-spin" />
                        <p class="text-slate-600">Chargement de l'onglet {{ activeTab }}...</p>
                        <p class="text-sm text-slate-500 mt-2">Redirection vers la page appropriée</p>
                    </div>
                </div>
            </template>
        </ProjectTabs>
    </div>
</template>
