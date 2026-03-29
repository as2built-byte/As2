<script setup lang="ts">
/**
 * Registration Success Page
 * 
 * Redirects to appropriate page based on user role
 */

const router = useRouter()
const { profile } = useAuth()

// Redirect to appropriate page based on role
onMounted(() => {
    const role = profile.value?.role
    if (role === 'expert') {
        router.push('/expert')
    } else if (role === 'enterprise') {
        router.push('/entreprise')
    } else {
        router.push('/')
    }
})
</script>

<template>
    <div class="auth-container">
        <div class="auth-card text-center slide-up max-w-md">
            <!-- Loading message while redirecting -->
            <div class="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                <Icon name="heroicons:arrow-path" class="w-14 h-14 text-blue-600 animate-spin" />
            </div>
            <h1 class="text-2xl font-bold text-slate-800 mb-4">Redirection...</h1>
            <p class="text-slate-600">Vous allez être redirigé vers votre espace.</p>
        </div>
    </div>
</template>
