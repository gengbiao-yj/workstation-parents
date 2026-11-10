<script setup lang="ts">
import { computed } from 'vue'
import { MOOD } from '@/data/constants'

const props = withDefaults(defineProps<{ id: string; size?: number }>(), { size: 20 })
const MOUTHS: Record<string, string> = {
  happy: 'M7.5 13.5 Q12 18 16.5 13.5',
  excited: 'M7.5 13 Q12 19.5 16.5 13 Z',
  calm: 'M8.5 14.5 H15.5',
  tired: 'M8.5 15 Q12 13.5 15.5 15',
  worried: 'M8 15.5 Q12 12.5 16 15.5',
  sad: 'M8 16 Q12 12 16 16',
  angry: 'M8 15.5 Q12 13 16 15.5'
}
const m = computed(() => MOOD[props.id] || MOOD.calm)
const mouth = computed(() => MOUTHS[m.value.id])
</script>

<template>
  <svg class="mood-face" :width="size" :height="size" viewBox="0 0 24 24" :aria-label="m.t">
    <circle cx="12" cy="12" r="10.5" :fill="m.c" />
    <template v-if="m.id === 'tired'">
      <path d="M7.5 10h3M13.5 10h3" stroke="#171717" stroke-width="1.6" stroke-linecap="round" />
    </template>
    <template v-else-if="m.id === 'angry'">
      <path d="M7 8l3.5 1.5M17 8l-3.5 1.5" stroke="#171717" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="9" cy="11" r="1.3" fill="#171717" />
      <circle cx="15" cy="11" r="1.3" fill="#171717" />
    </template>
    <template v-else>
      <circle cx="9" cy="10" r="1.4" fill="#171717" />
      <circle cx="15" cy="10" r="1.4" fill="#171717" />
    </template>
    <path :d="mouth" :fill="m.id === 'excited' ? '#171717' : 'none'" stroke="#171717" stroke-width="1.6" stroke-linecap="round" />
  </svg>
</template>
