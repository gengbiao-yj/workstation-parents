<script setup lang="ts">
import { useUi } from '@/stores/ui'
import BaseModal from './BaseModal.vue'
const ui = useUi()
</script>

<template>
  <BaseModal
    v-if="ui.confirmState"
    :title="ui.confirmState.title"
    @close="ui.confirmState.resolve(false)"
  >
    <p style="margin: 4px 0 8px; color: var(--ink2); line-height: 1.7" v-html="ui.confirmState.msg"></p>
    <template #foot>
      <button class="btn btn-light" @click="ui.confirmState.resolve(false)">取消</button>
      <button
        class="btn"
        :class="ui.confirmState.danger ? 'btn-red' : 'btn-dark'"
        @click="ui.confirmState.resolve(true)"
      >
        {{ ui.confirmState.okText }}
      </button>
    </template>
  </BaseModal>
</template>
