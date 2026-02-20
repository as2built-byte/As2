<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
    <div class="max-w-md w-full text-center">
      <!-- Icon -->
      <div class="mb-6">
        <div class="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
      </div>

      <!-- Error Code -->
      <h1 class="text-6xl font-bold text-blue-600 mb-2">
        {{ error?.statusCode || 500 }}
      </h1>

      <!-- Title -->
      <h2 class="text-xl font-semibold text-gray-800 mb-3">
        {{ errorTitle }}
      </h2>

      <!-- Message -->
      <p class="text-gray-500 mb-8 leading-relaxed">
        {{ errorMessage }}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="handleError"
          class="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Retour à l'accueil
        </button>
        <button
          @click="goBack"
          class="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200"
        >
          Page précédente
        </button>
      </div>

      <!-- Brand -->
      <p class="mt-12 text-sm text-gray-400">As2Built</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const errorTitle = computed(() => {
  switch (props.error?.statusCode) {
    case 404:
      return 'Page introuvable'
    case 403:
      return 'Accès refusé'
    case 401:
      return 'Non autorisé'
    default:
      return 'Une erreur est survenue'
  }
})

const errorMessage = computed(() => {
  switch (props.error?.statusCode) {
    case 404:
      return 'La page que vous recherchez n\'existe pas ou a été déplacée.'
    case 403:
      return 'Vous n\'avez pas les droits nécessaires pour accéder à cette page.'
    case 401:
      return 'Veuillez vous connecter pour accéder à cette page.'
    default:
      return 'Un problème est survenu. Veuillez réessayer ou retourner à la page d\'accueil.'
  }
})

const handleError = () => clearError({ redirect: '/' })

const goBack = () => {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    clearError({ redirect: '/' })
  }
}

useHead({
  title: `${props.error?.statusCode || 'Erreur'} - As2Built`
})
</script>
