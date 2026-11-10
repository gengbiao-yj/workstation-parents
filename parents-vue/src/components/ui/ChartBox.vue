<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ draw: (w: number) => string; min?: number }>()

const el = ref<HTMLElement | null>(null)
const html = ref('')
let ro: ResizeObserver | null = null
let last = 0

function render() {
  const w = el.value ? el.value.clientWidth : 300
  if (!w) return
  last = w
  html.value = props.draw(w)
}

onMounted(() => {
  render()
  ro = new ResizeObserver(() => {
    const w = el.value ? el.value.clientWidth : 0
    if (w && Math.abs(w - last) > 1) render()
  })
  if (el.value) ro.observe(el.value)
})
onUnmounted(() => {
  if (ro) ro.disconnect()
})
watch(() => props.draw, render)
</script>

<template>
  <div ref="el" class="chart" v-html="html"></div>
</template>
