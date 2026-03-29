<script setup lang="ts">
/**
 * Test Page - Simple test page
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

console.log('Test page loaded with project ID:', projectId.value)
</script>

<template>
    <div class="p-6">
        <div class="bg-white rounded-xl border border-slate-200 p-8">
            <h1 class="text-2xl font-bold text-slate-800 mb-4">Page de Test - Chronogramme</h1>
            <p class="text-slate-600 mb-4">Cette page de test vérifie si la navigation fonctionne correctement.</p>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 class="text-lg font-semibold text-blue-800 mb-2">Informations de débogage</h2>
                <p class="text-blue-700">ID du projet : <strong>{{ projectId }}</strong></p>
                <p class="text-blue-700">Chemin actuel : <strong>{{ $route.path }}</strong></p>
            </div>
            
            <div class="mt-6">
                <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Bouton de test
                </button>
            </div>
        </div>
    </div>
</template>