import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Book, Ev, Exam, Habit, Kid, Person, Skill } from '@/types'

export type Dialog =
  | { k: 'event'; ev?: Ev; preset?: Partial<Ev>; ds?: string }
  | { k: 'kid'; kid?: Kid }
  | { k: 'journal' }
  | { k: 'growth' }
  | { k: 'habit'; habit?: Habit; dim?: string }
  | { k: 'presets' }
  | { k: 'skill'; skill?: Skill; presetId?: string }
  | { k: 'skillDetail'; id: string }
  | { k: 'person'; person?: Person }
  | { k: 'greet'; id: string }
  | { k: 'book'; book?: Book }
  | { k: 'exam'; exam?: Exam }
  | { k: 'ability' }
  | { k: 'aiTpl'; id: string; person?: string; skill?: string }
  | { k: 'prompt'; text: string }
  | null

export const useDialogs = defineStore('dialogs', () => {
  const current = ref<Dialog>(null)
  function open(d: Exclude<Dialog, null>) {
    current.value = d
  }
  function close() {
    current.value = null
  }
  return { current, open, close }
})
