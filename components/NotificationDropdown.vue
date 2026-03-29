<script setup lang="ts">
/**
 * Notification Dropdown Component
 * 
 * Displays user notifications with unread count and actions
 */

import { getUserNotifications, markNotificationAsRead, getUnreadNotificationsCount } from '~/firebase/services/firestore'

// State
const isOpen = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)
const loading = ref(false)

// Get current user
const { $auth } = useNuxtApp()
const currentUser = computed(() => $auth?.currentUser)

// Fetch notifications
async function fetchNotifications() {
    if (!currentUser.value) return
    
    loading.value = true
    try {
        notifications.value = await getUserNotifications(currentUser.value.uid)
        unreadCount.value = notifications.value.filter(n => !n.read).length
    } catch (error) {
        console.error('Error fetching notifications:', error)
    } finally {
        loading.value = false
    }
}

// Mark notification as read
async function markAsRead(notificationId: string) {
    try {
        await markNotificationAsRead(notificationId)
        // Update local state
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification) {
            notification.read = true
            unreadCount.value--
        }
    } catch (error) {
        console.error('Error marking notification as read:', error)
    }
}

// Mark all as read
async function markAllAsRead() {
    const unreadNotifications = notifications.value.filter(n => !n.read)
    await Promise.all(unreadNotifications.map(n => markAsRead(n.id)))
    unreadCount.value = 0
}

// Get notification icon
function getNotificationIcon(type: string): string {
    switch (type) {
        case 'task_assigned': return 'heroicons:clipboard-document-check'
        case 'task_updated': return 'heroicons:pencil-square'
        case 'task_completed': return 'heroicons:check-circle'
        case 'project_updated': return 'heroicons:building-office'
        default: return 'heroicons:bell'
    }
}

// Get notification color
function getNotificationColor(type: string): string {
    switch (type) {
        case 'task_assigned': return 'text-blue-600 bg-blue-100'
        case 'task_updated': return 'text-amber-600 bg-amber-100'
        case 'task_completed': return 'text-green-600 bg-green-100'
        case 'project_updated': return 'text-purple-600 bg-purple-100'
        default: return 'text-slate-600 bg-slate-100'
    }
}

// Format date
function formatNotificationDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours} h`
    if (days < 7) return `Il y a ${days} j`
    return date.toLocaleDateString('fr-FR')
}

// Close dropdown when clicking outside
onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(event: Event) {
    const target = event.target as HTMLElement
    if (!target.closest('.notification-dropdown')) {
        isOpen.value = false
    }
}

// Watch for user changes and fetch notifications
watch(currentUser, (newUser) => {
    if (newUser) {
        fetchNotifications()
    }
}, { immediate: true })

// Refresh notifications periodically
let refreshInterval: NodeJS.Timeout
onMounted(() => {
    refreshInterval = setInterval(fetchNotifications, 30000) // Refresh every 30 seconds
})

onUnmounted(() => {
    if (refreshInterval) {
        clearInterval(refreshInterval)
    }
})
</script>

<template>
    <div class="notification-dropdown relative">
        <!-- Notification Button -->
        <button
            @click="isOpen = !isOpen"
            class="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
            <Icon name="heroicons:bell" class="w-5 h-5" />
            <!-- Unread count badge -->
            <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
            >
                {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
        </button>

        <!-- Dropdown -->
        <Transition name="dropdown">
            <div
                v-if="isOpen"
                class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
            >
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 class="font-semibold text-slate-800">Notifications</h3>
                    <button
                        v-if="unreadCount > 0"
                        @click="markAllAsRead"
                        class="text-sm text-blue-600 hover:text-blue-700"
                    >
                        Tout marquer comme lu
                    </button>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex justify-center py-8">
                    <div class="spinner text-blue-600"></div>
                </div>

                <!-- Notifications List -->
                <div v-else-if="notifications.length > 0" class="max-h-96 overflow-y-auto">
                    <div
                        v-for="notification in notifications"
                        :key="notification.id"
                        class="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                        :class="{ 'bg-blue-50': !notification.read }"
                        @click="markAsRead(notification.id)"
                    >
                        <!-- Icon -->
                        <div
                            class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            :class="getNotificationColor(notification.type)"
                        >
                            <Icon :name="getNotificationIcon(notification.type)" class="w-4 h-4" />
                        </div>

                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-slate-800">
                                {{ notification.title }}
                            </p>
                            <p class="text-sm text-slate-600 mt-1">
                                {{ notification.message }}
                            </p>
                            <p class="text-xs text-slate-400 mt-2">
                                {{ formatNotificationDate(notification.createdAt) }}
                            </p>
                        </div>

                        <!-- Unread indicator -->
                        <div
                            v-if="!notification.read"
                            class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"
                        />
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else class="text-center py-8">
                    <Icon name="heroicons:bell" class="w-8 h-8 text-slate-400 mx-auto" />
                    <p class="text-slate-500 mt-2">Aucune notification</p>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.spinner {
    border: 2px solid #f3f4f6;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
