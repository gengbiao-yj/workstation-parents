<script setup lang="ts">
/**
 * 日期选择器 · 统一封装
 * - 与原有 <input type="date"> 行为一致：值为 'YYYY-MM-DD' 字符串，清空为 ''
 * - 外观由 src/styles/element.scss 第 3 段接管，和 .inp 完全一致
 */
import { computed } from 'vue'
import { ElDatePicker } from 'element-plus/es/components/date-picker/index.mjs'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 等宽数字（原 class="inp num"） */
    num?: boolean
  }>(),
  { placeholder: '选择日期', disabled: false, clearable: true, num: false }
)

// 父组件永远拿到字符串，不会出现 null
const model = defineModel<string>()
const value = computed({
  get: () => (model.value ? model.value : ''),
  set: (v: string | null) => {
    model.value = v || ''
  }
})
</script>

<template>
  <ElDatePicker
    v-model="value"
    type="date"
    value-format="YYYY-MM-DD"
    format="YYYY-MM-DD"
    popper-class="app-picker-popper"
    class="app-picker el-date-editor"
    :class="{ num: props.num }"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :clearable="props.clearable"
  />
</template>
