<script setup lang="ts">
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Teleport to="body">
    <div class="mask" @click="emit('close')"></div>
    <div class="drawer" role="dialog"><slot /></div>
  </Teleport>
</template>
