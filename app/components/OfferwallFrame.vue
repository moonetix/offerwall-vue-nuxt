<script setup lang="ts">
const { src, title = 'Offerwall', height = '100vh' } = defineProps<{
  src: string
  title?: string
  height?: string
}>()
</script>

<template>
  <!-- Without the inline size, browsers draw the frame as a 300 by 150 pixel box. -->
  <iframe :key="src" :title="title" :src="src" :style="{ border: '0', width: '100%', height }" />
</template>
