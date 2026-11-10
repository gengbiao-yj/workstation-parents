<script setup lang="ts">
/**
 * 时间选择器 · 统一封装
 * - 与原有 <input type="time"> 行为一致：值为 'HH:mm' 字符串，清空为 ''
 * - 外观由 src/styles/element.scss 第 3、5 段接管
 */
import { computed } from 'vue'
import { ElTimePicker } from 'element-plus/es/components/time-picker/index.mjs'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 等宽数字（原 class="inp num"） */
    num?: boolean
  }>(),
  { placeholder: '选择时间', disabled: false, clearable: true, num: false }
)

const model = defineModel<string>()
const value = computed({
  get: () => (model.value ? model.value : ''),
  set: (v: string | null) => {
    model.value = v || ''
  }
})
</script>

<template>
  <ElTimePicker
    v-model="value"
    value-format="HH:mm"
    format="HH:mm"
    popper-class="app-picker-popper"
    class="app-picker el-date-editor"
    :class="{ num: props.num }"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :clearable="props.clearable"
  />
</template>
