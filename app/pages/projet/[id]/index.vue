<script setup lang="ts">
definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

const route = useRoute()
const projectId = route.params.id as string

// Redirect to documents by default
navigateTo(`/projet/${projectId}/documents`, { replace: true })
</script>

<template>
    <div />
</template>
