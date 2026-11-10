<script setup lang="ts">
import { useUi } from '@/stores/ui'
const ui = useUi()
</script>

<template>
  <Teleport to="body">
    <div v-for="t in ui.toasts" :key="t.id" class="toast">{{ t.msg }}</div>
  </Teleport>
</template>
