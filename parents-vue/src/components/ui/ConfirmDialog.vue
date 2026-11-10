<script setup lang="ts">
import { useUi } from '@/stores/ui'
import Icon from './Icon.vue'
const ui = useUi()
</script>

<template>
  <Teleport to="body">
    <template v-if="ui.confirmState">
      <div class="mask" @click="ui.confirmState.resolve(false)"></div>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">{{ ui.confirmState.title }}</div>
          <button class="modal-x" aria-label="关闭" @click="ui.confirmState.resolve(false)"><Icon name="x" /></button>
        </div>
        <div class="modal-body">
          <p style="margin: 4px 0 8px; color: var(--ink2); line-height: 1.7" v-html="ui.confirmState.msg"></p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-light" @click="ui.confirmState.resolve(false)">取消</button>
          <button class="btn" :class="ui.confirmState.danger ? 'btn-red' : 'btn-dark'" @click="ui.confirmState.resolve(true)">
            {{ ui.confirmState.okText }}
          </button>
        </div>
      </div>
    </template>
  </Teleport>
</template>
