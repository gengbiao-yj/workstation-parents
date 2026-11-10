<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { ABILITIES, LEVELS } from '@/data/constants'
import { deepClone, todayStr, uid } from '@/lib/date'
import { abilitiesOf } from '@/lib/query'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { AbilityRecord } from '@/types'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const k = data.curKid!
const mk = todayStr().slice(0, 7)
const list = abilitiesOf(data.state, k.id)
const ex = list.filter((a) => a.month === mk)[0] as AbilityRecord | undefined
const last = list.length ? list[list.length - 1] : null

const s = reactive<Record<string, number>>(ex ? deepClone(ex.s) : last ? deepClone(last.s) : {})
const note = ref(ex ? ex.note || '' : '')

function pick(id: string, v: number) {
  s[id] = v
}

function save() {
  const miss = ABILITIES.filter((a) => !s[a.id])
  if (miss.length) {
    ui.toast(`还有「${miss[0].t}」没选`)
    return
  }
  const cur = abilitiesOf(data.state, k.id).filter((a) => a.month === mk)[0]
  if (cur) {
    cur.s = { ...s }
    cur.note = note.value.trim()
  } else {
    data.state.abilities.push({
      id: uid('a'),
      kid: k.id,
      month: mk,
      s: { ...s },
      note: note.value.trim()
    } as AbilityRecord)
  }
  data.save()
  dialogs.close()
  ui.toast('评估已保存')
}
</script>

<template>
  <BaseModal :title="`${+mk.slice(5, 7)}月 学习能力评估 · ${k.name}`" wide @close="dialogs.close()">
    <p style="margin: 0 0 14px; color: var(--ink2); font-size: 13px; line-height: 1.7">
      按 {{ k.name }} 最近一个月平时的样子来选，凭感觉就行。
      <template v-if="last && !ex">默认是上个月的分数。</template>
    </p>
    <div v-for="a in ABILITIES" :key="a.id" class="field">
      <label>{{ a.t }} <span class="muted" style="font-weight: 400">{{ a.d }}</span></label>
      <div class="lv-pick">
        <button
          v-for="(l, i) in LEVELS"
          :key="l"
          type="button"
          :class="{ on: s[a.id] === i + 1 }"
          @click="pick(a.id, i + 1)"
        >
          <b>{{ i + 1 }}</b>{{ l }}
        </button>
      </div>
    </div>
    <div class="field">
      <label>这个月的观察</label>
      <textarea v-model="note" class="ta" placeholder="比如：能自己安排周末作业了；读书时容易走神"></textarea>
    </div>
    <template #foot>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
