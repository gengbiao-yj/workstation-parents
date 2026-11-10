<script setup lang="ts">
import { reactive } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { D_ALL, D_WD, D_WE, DIMS } from '@/data/constants'
import { deepClone, todayStr, uid } from '@/lib/date'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Habit } from '@/types'

const props = defineProps<{ habit?: Habit; dim?: string }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.habit
const k = data.curKid!
const d = reactive<Habit>(
  props.habit
    ? deepClone(props.habit)
    : {
        id: uid('h'),
        kid: k.id,
        dim: (props.dim || 'de') as Habit['dim'],
        name: '',
        unit: '',
        target: 1,
        days: D_ALL.slice(),
        on: true,
        kind: '',
        since: todayStr()
      }
)

function toggleDay(n: number) {
  const i = d.days.indexOf(n)
  if (i >= 0) {
    if (d.days.length > 1) d.days.splice(i, 1)
  } else d.days.push(n)
}
function setDays(v: 'all' | 'wd' | 'we') {
  d.days = v === 'all' ? D_ALL.slice() : v === 'wd' ? D_WD.slice() : D_WE.slice()
}
function onUnit() {
  if (d.unit === '分钟' && d.target <= 1) d.target = 20
}

function save() {
  if (!d.name.trim()) {
    ui.toast('写一下打卡项')
    return
  }
  d.name = d.name.trim()
  d.target = d.unit ? Math.max(1, d.target || 1) : 1
  if (isNew) data.state.habits.push(deepClone(d) as Habit)
  else {
    const i = data.state.habits.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.habits[i] = deepClone(d) as Habit
  }
  data.save(true)
  dialogs.close()
  ui.toast('已保存')
}

async function del() {
  const ok = await ui.confirm(
    '删除打卡项',
    '删除「' + d.name + '」和它的全部打卡记录？只想暂时不打卡的话，取消勾选「正在打卡」就行。',
    '删除',
    true
  )
  if (!ok) return
  data.state.habits = data.state.habits.filter((x) => x.id !== d.id)
  Object.keys(data.state.checks[d.kid] || {}).forEach((ds) => {
    delete data.state.checks[d.kid][ds][d.id]
  })
  data.save(true)
  dialogs.close()
}
</script>

<template>
  <BaseModal :title="isNew ? '新打卡项' : '编辑打卡项'" @close="dialogs.close()">
    <div class="field">
      <label>属于哪一育</label>
      <div class="chips">
        <button
          v-for="x in DIMS"
          :key="x.id"
          type="button"
          :class="{ on: d.dim === x.id }"
          @click="d.dim = x.id"
        >
          {{ x.t }} · {{ x.short }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>打卡项<span class="req">*</span></label>
      <input v-model="d.name" class="inp" placeholder="如：自己整理书包" maxlength="24" autofocus />
    </div>

    <div class="row2">
      <div class="field">
        <label>怎么算完成</label>
        <select v-model="d.unit" class="sel" @change="onUnit">
          <option value="">做到就算</option>
          <option v-for="u in ['分钟', '下', '页', '次', '公里', '个']" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
      <div v-if="d.unit" class="field">
        <label>每次目标</label>
        <input v-model.number="d.target" class="inp num" inputmode="numeric" />
      </div>
    </div>

    <div class="field">
      <label>哪几天打卡</label>
      <div class="chips">
        <button
          v-for="n in 7"
          :key="n"
          type="button"
          :class="{ on: d.days.indexOf(n) >= 0 }"
          @click="toggleDay(n)"
        >
          周{{ '一二三四五六日'[n - 1] }}
        </button>
      </div>
      <div style="display: flex; gap: 6px; margin-top: 8px">
        <button type="button" class="btn btn-xs btn-ghost" @click="setDays('all')">每天</button>
        <button type="button" class="btn btn-xs btn-ghost" @click="setDays('wd')">周一到周五</button>
        <button type="button" class="btn btn-xs btn-ghost" @click="setDays('we')">周末</button>
      </div>
    </div>

    <div class="row2">
      <label class="chk">
        <input type="checkbox" :checked="d.kind === 'read'" @change="d.kind = ($event.target as HTMLInputElement).checked ? 'read' : ''" />
        这是阅读打卡（分钟数会算进阅读时长）
      </label>
      <label v-if="!isNew" class="chk">
        <input v-model="d.on" type="checkbox" /> 正在打卡（取消就是暂停，记录保留）
      </label>
    </div>

    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="14" />删除
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
