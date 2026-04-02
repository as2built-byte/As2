<script setup lang="ts">
import { Icon as Iconify } from '@iconify/vue'

defineProps<{ name: string }>()
</script>

<template>
    <Iconify :icon="name" v-bind="$attrs" />
</template>
