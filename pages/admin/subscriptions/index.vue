<!-- Page supprimée - Redirection vers /admin/entreprises -->
<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// Rediriger vers la page entreprises qui gère maintenant tout
onMounted(() => {
  navigateTo('/admin/entreprises')
})
</script>

<template>
  <div class="text-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    <p class="mt-4 text-slate-600">Redirection...</p>
  </div>
</template>
