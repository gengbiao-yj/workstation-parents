<script setup lang="ts">
import { computed } from 'vue'
import { iconPath } from '@/data/icons'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    strokeWidth?: number
  }>(),
  { size: 16, strokeWidth: 1.8 }
)

const html = computed(() => iconPath(props.name))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="html"
  />
</template>
