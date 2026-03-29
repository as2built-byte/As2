<!-- Page supprimée - Redirection vers Documents -->
<script setup lang="ts">
definePageMeta({
  layout: 'projet',
  middleware: ['auth']
})

const route = useRoute()

// Rediriger vers la page Documents
onMounted(() => {
  navigateTo(`/projet/${route.params.id}/documents`)
})
</script>

<template>
  <div class="text-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    <p class="mt-4 text-slate-600">Redirection vers Documents...</p>
  </div>
</template>
