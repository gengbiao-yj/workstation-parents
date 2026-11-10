<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import AppDatePicker from '../ui/AppDatePicker.vue'
import { DIMS, SKILL_PRESETS, skillPreset, type SkillPresetDef } from '@/data/constants'
import { icon as artIcon } from '@/art/home'
import { deepClone, todayStr, uid } from '@/lib/date'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { DimId, Skill } from '@/types'

const props = defineProps<{ skill?: Skill; presetId?: string }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.skill
const k = data.curKid!
const d = reactive<Skill>(
  props.skill
    ? deepClone(props.skill)
    : {
        id: uid('sk'),
        kid: k.id,
        pre: '',
        name: '',
        dim: 'ti',
        icon: 'star',
        tip: '',
        start: todayStr(),
        note: '',
        steps: []
      }
)

const stepsText = ref(d.steps.map((x) => x.t).join('\n'))
const ICONS = [
  'bike',
  'swim',
  'rope',
  'run',
  'shoe',
  'clock',
  'poem',
  'book',
  'egg',
  'pot',
  'bus',
  'coin',
  'piano',
  'mic',
  'palette',
  'code',
  'tent',
  'heart',
  'star'
]

const presets = SKILL_PRESETS.filter((p) => p.stages.indexOf(k.stage) >= 0)

function usePreset(p: SkillPresetDef) {
  d.pre = p.id
  d.dim = p.dim as DimId
  d.icon = p.icon
  d.name = p.t
  d.tip = p.tip
  stepsText.value = p.steps.join('\n')
}

if (props.presetId) {
  const p = skillPreset(props.presetId)
  if (p) usePreset(p)
}

function save() {
  d.name = d.name.trim()
  d.tip = d.tip.trim()
  if (!d.name) {
    ui.toast('写一下挑战名称')
    return
  }
  const old: Record<string, string> = {}
  d.steps.forEach((x) => (old[x.t] = x.done))
  const steps = stepsText.value
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((t) => ({ t, done: old[t] || '' }))
  if (steps.length < 2) {
    ui.toast('至少拆成两步')
    return
  }
  const payload: Skill = { ...d, steps }
  if (isNew) data.state.skills.push(payload)
  else {
    const i = data.state.skills.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.skills[i] = payload
  }
  data.save()
  dialogs.open({ k: 'skillDetail', id: payload.id })
}
</script>

<template>
  <BaseModal
    :title="isNew ? '新的技能挑战' : `修改「${skill?.name}」`"
    wide
    @close="dialogs.close()"
  >
    <div v-if="isNew" class="field">
      <label>从常见挑战开始</label>
      <div class="chips">
        <button v-for="p in presets" :key="p.id" type="button" :class="{ on: d.pre === p.id }" @click="usePreset(p)">
          {{ p.t }}
        </button>
      </div>
      <div class="hint">也可以自己写一个，比如「自己洗头」「学会滑板」</div>
    </div>

    <div class="row2">
      <div class="field">
        <label>挑战名称<span class="req">*</span></label>
        <input v-model="d.name" class="inp" maxlength="20" placeholder="如：学会滑板" />
      </div>
      <div class="field">
        <label>开始日期</label>
        <AppDatePicker v-model="d.start" />
      </div>
    </div>

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
      <label>图标</label>
      <div class="chips">
        <button
          v-for="ic in ICONS"
          :key="ic"
          type="button"
          :class="{ on: d.icon === ic }"
          style="width: 36px; padding: 0; justify-content: center; display: inline-flex; align-items: center"
          @click="d.icon = ic"
        >
          <span v-html="artIcon(ic, 17)"></span>
        </button>
      </div>
    </div>

    <div class="field">
      <label>拆成哪几步 <span class="muted" style="font-weight: 400">一行一步，从最容易的开始，4–8 步最好</span></label>
      <textarea v-model="stepsText" class="ta" style="min-height: 150px"></textarea>
      <div v-if="!isNew" class="hint">已经做到的步骤，只要文字不变，完成日期会保留</div>
    </div>

    <div class="field">
      <label>小提示</label>
      <input v-model="d.tip" class="inp" placeholder="选填，比如安全注意事项" />
    </div>

    <template #foot>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
