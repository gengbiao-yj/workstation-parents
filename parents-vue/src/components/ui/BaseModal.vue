<script setup lang="ts">
import Icon from './Icon.vue'
withDefaults(defineProps<{ title: string; wide?: boolean; foot?: boolean }>(), { wide: false, foot: true })
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Teleport to="body">
    <div class="mask" @click="emit('close')"></div>
    <div class="modal" :class="{ wide }" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title">{{ title }}</div>
        <button class="modal-x" aria-label="关闭" @click="emit('close')"><Icon name="x" /></button>
      </div>
      <div class="modal-body"><slot /></div>
      <div v-if="foot" class="modal-foot">
        <slot name="foot">
          <button class="btn btn-light" @click="emit('close')">取消</button>
        </slot>
      </div>
    </div>
  </Teleport>
</template>
