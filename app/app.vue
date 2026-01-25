<script setup lang="ts">
/**
 * App Root Component
 * 
 * Wraps the entire application with loading state management
 * to prevent FOUC (Flash of Unstyled Content)
 */

const nuxtApp = useNuxtApp()
const isLoading = ref(true)

// Wait for app to be fully mounted
onMounted(() => {
    // Small delay to ensure styles are loaded
    setTimeout(() => {
        isLoading.value = false
    }, 100)
})

// Also listen to Nuxt hooks
nuxtApp.hook('app:mounted', () => {
    isLoading.value = false
})
</script>

<template>
    <!-- Loading Screen - prevents FOUC -->
    <div 
        v-if="isLoading" 
        class="fixed inset-0 z-[9999] flex items-center justify-center"
        style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);"
    >
        <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden animate-pulse">
                <img 
                    src="~/assets/images/logo.jpeg" 
                    alt="As2Built"
                    class="w-full h-full object-cover"
                />
            </div>
            <div class="flex items-center justify-center gap-1">
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
            </div>
        </div>
    </div>

    <!-- Main App Content -->
    <div 
        :class="{ 'opacity-0': isLoading, 'opacity-100': !isLoading }"
        class="transition-opacity duration-300"
    >
        <NuxtPage />
    </div>
</template>

<style>
/* Prevent FOUC - hide content until Vue is ready */
html.loading body {
    visibility: hidden;
}

html:not(.loading) body {
    visibility: visible;
}
</style>
