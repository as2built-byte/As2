<script setup lang="ts">
/**
 * Role Selection Page
 * 
 * Choose between Expert BIM or Entreprise before registration
 */

definePageMeta({
    middleware: ['guest'],
})

const { clearError } = useAuth()

// Clear any previous errors on mount
onMounted(() => {
    clearError()
})
</script>

<template>
    <div class="auth-container">
        <div class="w-full max-w-2xl slide-up">
            <!-- Back Link -->
            <NuxtLink 
                to="/" 
                class="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors text-sm font-medium"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Retour à la connexion</span>
            </NuxtLink>

            <!-- Title -->
            <div class="text-center mb-12">
                <h1 class="text-3xl font-bold text-white mb-3">Créer un compte</h1>
                <p class="text-white/60">Choisissez votre type de profil pour commencer</p>
            </div>

            <!-- Role Cards -->
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Expert Card -->
                <NuxtLink to="/register/expert" class="role-card group">
                    <div class="role-card-icon bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600">
                        <Icon name="heroicons:user-circle" class="w-10 h-10" />
                    </div>
                    <h2 class="role-card-title">Expert BIM</h2>
                    <p class="role-card-description">
                        Vous êtes un professionnel BIM à la recherche de missions et d'opportunités de collaboration
                    </p>
                    <div class="mt-6 text-blue-600 text-sm font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        <span>Continuer</span>
                        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
                    </div>
                </NuxtLink>

                <!-- Enterprise Card -->
                <NuxtLink to="/register/entreprise" class="role-card group">
                    <div class="role-card-icon bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600">
                        <Icon name="heroicons:building-office-2" class="w-10 h-10" />
                    </div>
                    <h2 class="role-card-title">Entreprise</h2>
                    <p class="role-card-description">
                        Vous représentez une entreprise de construction à la recherche d'experts BIM certifiés
                    </p>
                    <div class="mt-6 text-emerald-600 text-sm font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        <span>Continuer</span>
                        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
