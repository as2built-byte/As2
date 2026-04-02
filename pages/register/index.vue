<script setup lang="ts">
/**
 * Role Selection Page
 * 
 * Choose between Expert BIM or Entreprise before registration
 */

definePageMeta({
    middleware: ['guest'],
    layout: false
})

const { clearError } = useAuth()

// Clear any previous errors on mount
onMounted(() => {
    clearError()
})
</script>

<template>
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div class="w-full max-w-2xl">
            <!-- Back Link -->
            <NuxtLink 
                to="/login" 
                class="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors text-sm font-medium"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Retour à la connexion</span>
            </NuxtLink>

            <!-- Title -->
            <div class="text-center mb-10">
                <h1 class="text-3xl font-bold text-white mb-3">Créer un compte</h1>
                <p class="text-slate-400">Choisissez votre type de profil pour commencer</p>
            </div>

            <!-- Role Cards -->
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Expert Card -->
                <NuxtLink to="/register/expert" class="group bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300">
                    <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon name="heroicons:user-circle" class="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">Expert BIM</h2>
                    <p class="text-slate-400 text-sm mb-4 leading-relaxed">
                        Accédez aux formations certifiantes, proposez vos compétences aux entreprises et participez à des missions BIM
                    </p>
                    <div class="inline-flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
                        <span>Continuer</span>
                        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
                    </div>
                </NuxtLink>

                <!-- Enterprise Card -->
                <NuxtLink to="/register/entreprise" class="group bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all duration-300">
                    <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon name="heroicons:building-office-2" class="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">Entreprise</h2>
                    <p class="text-slate-400 text-sm mb-4 leading-relaxed">
                        Recrutez des experts certifiés, gérez vos projets et bénéficiez d'audits digitaux BIM personnalisés
                    </p>
                    <div class="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
                        <span>Continuer</span>
                        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style>
/* Remove default browser margins */
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>
