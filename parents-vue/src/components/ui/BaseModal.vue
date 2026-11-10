<script setup lang="ts">
import { computed } from 'vue'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import Icon from './Icon.vue'

// 统一的弹窗外壳：基于 element-plus el-dialog，外观由
// src/styles/element.scss 的第 2 段接管，这里只负责结构与行为。
const props = withDefaults(
  defineProps<{
    title: string
    /** 宽版（760px），用于内容较多的表单 */
    wide?: boolean
    /** 是否显示底部按钮区 */
    foot?: boolean
    /** 头部可拖动（默认开启） */
    draggable?: boolean
    /** 自定义宽度，优先级高于 wide */
    width?: string
    /** 点遮罩是否关闭，默认关闭（与原行为一致） */
    closeOnClickModal?: boolean
  }>(),
  { wide: false, foot: true, draggable: true, closeOnClickModal: true }
)

const emit = defineEmits<{ (e: 'close'): void }>()

const boxWidth = computed(
  () => props.width || (props.wide ? 'min(760px, calc(100vw - 32px))' : 'min(520px, calc(100vw - 32px))')
)
</script>

<template>
  <ElDialog
    :model-value="true"
    :width="boxWidth"
    :append-to-body="true"
    :draggable="draggable"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="true"
    :show-close="false"
    align-center
    modal-class="app-overlay"
    class="app-dialog"
    @update:model-value="(v: boolean) => !v && emit('close')"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">{{ title }}</div>
        <button class="modal-x" aria-label="关闭" @click="emit('close')"><Icon name="x" /></button>
      </div>
    </template>

    <slot />

    <template v-if="foot" #footer>
      <div class="modal-foot">
        <slot name="foot">
          <button class="btn btn-light" @click="emit('close')">取消</button>
        </slot>
      </div>
    </template>
  </ElDialog>
</template>
