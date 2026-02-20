<script setup lang="ts">
/**
 * NotificationBell Component
 * 
 * Displays notification bell icon with unread count badge
 * Shows dropdown panel with recent notifications
 */

import { useNotificationsStore } from '~/stores/notifications'
import { storeToRefs } from 'pinia'

const notificationsStore = useNotificationsStore()
const { unreadCount, recentNotifications, loading } = storeToRefs(notificationsStore)

// Dropdown state
const showDropdown = ref(false)

// Format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Handle notification click
function handleNotificationClick(notificationId: string) {
    notificationsStore.markAsRead(notificationId)
}

// Handle mark all as read
function handleMarkAllAsRead() {
    notificationsStore.markAllAsRead()
}

// Close dropdown on click outside
function closeDropdown() {
    showDropdown.value = false
}
</script>

<template>
    <!-- Bell Button -->
    <button 
        type="button" 
        class="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        @click="showDropdown = !showDropdown"
    >
        <Icon name="heroicons:bell" class="w-5 h-5" />
        
        <!-- Unread Badge -->
        <span 
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full"
        >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
    </button>

    <!-- Teleport dropdown to body to escape parent overflow/transform clipping -->
    <Teleport to="body">
        <!-- Overlay to close dropdown -->
        <div 
            v-if="showDropdown" 
            class="fixed inset-0 z-[90]" 
            @click="closeDropdown"
        ></div>

        <!-- Dropdown Panel -->
        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div 
                v-if="showDropdown" 
                class="fixed top-16 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[100]"
            >
                <!-- Header -->
                <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="font-semibold text-slate-800">Notifications</h3>
                    <button 
                        v-if="unreadCount > 0"
                        type="button"
                        class="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        @click="handleMarkAllAsRead"
                    >
                        Tout marquer comme lu
                    </button>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="py-8 text-center">
                    <Icon name="heroicons:arrow-path" class="w-5 h-5 text-slate-400 animate-spin mx-auto" />
                </div>

                <!-- Empty State -->
                <div v-else-if="recentNotifications.length === 0" class="py-8 text-center">
                    <Icon name="heroicons:bell-slash" class="w-8 h-8 text-slate-300 mx-auto" />
                    <p class="mt-2 text-sm text-slate-500">Aucune notification</p>
                </div>

                <!-- Notifications List -->
                <div v-else class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    <div 
                        v-for="notification in recentNotifications" 
                        :key="notification.id"
                        class="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        :class="{ 'bg-blue-50/50': !notification.read }"
                        @click="handleNotificationClick(notification.id)"
                    >
                        <div class="flex items-start gap-3">
                            <!-- Icon -->
                            <div 
                                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                :class="notification.read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'"
                            >
                                <Icon 
                                    :name="notification.type === 'new_payment' ? 'heroicons:banknotes' : 'heroicons:bell'" 
                                    class="w-4 h-4" 
                                />
                            </div>
                            
                            <!-- Content -->
                            <div class="flex-1 min-w-0">
                                <p 
                                    class="text-sm leading-snug"
                                    :class="notification.read ? 'text-slate-600' : 'text-slate-800 font-medium'"
                                >
                                    {{ notification.message }}
                                </p>
                                <p class="text-xs text-slate-400 mt-1">
                                    {{ formatRelativeTime(notification.createdAt) }}
                                </p>
                            </div>

                            <!-- Unread indicator -->
                            <div 
                                v-if="!notification.read" 
                                class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
