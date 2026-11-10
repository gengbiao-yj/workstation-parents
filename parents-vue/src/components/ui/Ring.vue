<script setup lang="ts">
import { computed } from 'vue'
import { clamp } from '@/lib/date'

const props = withDefaults(
  defineProps<{ rate: number | null | undefined; size?: number; color?: string; label?: string; sw?: number }>(),
  { size: 44, sw: 5, color: '#171717', label: undefined }
)
const r = computed(() => (props.size - props.sw) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const v = computed(() => (props.rate === null || props.rate === undefined ? 0 : clamp(props.rate, 0, 1)))
const dash = computed(() => `${(c.value * v.value).toFixed(1)} ${c.value.toFixed(1)}`)
const fontSize = computed(() => Math.round(props.size * 0.27))
</script>

<template>
  <svg class="ring" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="#efefed" :stroke-width="sw" />
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="r"
      fill="none"
      :stroke="color"
      :stroke-width="sw"
      stroke-linecap="round"
      :stroke-dasharray="dash"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`"
    />
    <text
      v-if="label !== undefined"
      x="50%"
      y="50%"
      dy=".35em"
      text-anchor="middle"
      class="ring-txt"
      :font-size="fontSize"
      fill="#171717"
    >
      {{ label }}
    </text>
  </svg>
</template>
