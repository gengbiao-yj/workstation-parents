import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface ConfirmState {
  title: string
  msg: string
  okText: string
  danger: boolean
  resolve: (v: boolean) => void
}

export const useUi = defineStore('ui', () => {
  const toasts = ref<{ id: number; msg: string }[]>([])
  const confirmState = ref<ConfirmState | null>(null)
  let tid = 0

  function toast(msg: string, ms = 1700) {
    const id = ++tid
    toasts.value.push({ id, msg })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, ms)
  }

  /** Promise 版确认框，替代原版 UI.confirm 的回调写法 */
  function confirm(title: string, msg: string, okText = '确定', danger = false): Promise<boolean> {
    if (confirmState.value) confirmState.value.resolve(false)
    return new Promise<boolean>((resolve) => {
      confirmState.value = {
        title,
        msg,
        okText,
        danger,
        resolve: (v: boolean) => {
          confirmState.value = null
          resolve(v)
        }
      }
    })
  }

  return { toasts, toast, confirm, confirmState }
})
