<script setup lang="ts">
/**
 * Enterprise Dashboard - Main dashboard page
 * 
 * Coming soon - will include:
 * - Calendar with projects and events
 * - Quick stats
 * - Recent activities
 */

definePageMeta({
    layout: 'entreprise' as const,
    middleware: ['auth'],
})
</script>

<template>
    <div>
        <!-- Coming Soon Card -->
        <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto mt-20">
            <div class="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <Icon name="heroicons:building-office-2" class="w-10 h-10 text-emerald-600" />
            </div>
            
            <h1 class="text-2xl font-bold text-slate-800 mb-3">
                Tableau de bord Entreprise
            </h1>
            
            <p class="text-slate-500 mb-6 max-w-md mx-auto">
                Votre espace entreprise est en cours de développement. 
                Vous pourrez bientôt gérer vos projets, missions et équipes BIM depuis cette page.
            </p>

            <div class="flex flex-wrap justify-center gap-3">
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                    <Icon name="heroicons:calendar" class="w-4 h-4 text-emerald-500" />
                    Calendrier projets
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                    <Icon name="heroicons:user-group" class="w-4 h-4 text-blue-500" />
                    Pool d'experts
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                    <Icon name="heroicons:chart-bar" class="w-4 h-4 text-amber-500" />
                    Statistiques
                </div>
            </div>

            <p class="text-xs text-slate-400 mt-8">
                Fonctionnalité à venir prochainement
            </p>
        </div>
    </div>
</template>
