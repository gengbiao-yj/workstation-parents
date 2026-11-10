<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import { useAi } from '@/stores/ai'
import { skillOptions, tplById, type TplField } from '@/lib/aiTpl'
import { kidById, peopleOf, personById, skillById } from '@/lib/query'
import type { Kid } from '@/types'

const props = defineProps<{ id: string; person?: string; skill?: string }>()

const data = useData()
const dialogs = useDialogs()
const ui = useUi()
const ai = useAi()

const tpl = tplById(props.id)
const state = computed(() => data.state)

/** 来自技能详情 / 生日祝福弹窗的预选 */
const pre = { person: props.person || '', skill: props.skill || '' }

function initKid(): Kid | null {
  let k = data.curKid
  if (pre.person) {
    const p = personById(data.state, pre.person)
    if (p) k = kidById(data.state, p.kid) || k
  }
  if (pre.skill) {
    const s = skillById(data.state, pre.skill)
    if (s) k = kidById(data.state, s.kid) || k
  }
  return k
}

const formKid = ref((initKid() || { id: '' }).id)
const curKid = computed(() => kidById(data.state, formKid.value))

/** 表单值 */
const v = reactive<Record<string, any>>({})

function initValues() {
  if (!tpl) return
  Object.keys(v).forEach((key) => delete v[key])
  tpl.fields.forEach((f) => {
    if (f.type === 'select') v[f.key] = (f.opts && f.opts[0]) || ''
    else if (f.type === 'check') v[f.key] = !!f.def
    else if (f.type === 'kid') v[f.key] = formKid.value
    else if (f.type === 'person') v[f.key] = pre.person
    else if (f.type === 'skill') v[f.key] = pre.skill
    else v[f.key] = typeof f.def === 'string' ? f.def : ''
  })
}

function setKid(id: string) {
  formKid.value = id
  ai.formKid = id
  if (tpl) v.kid = id
  // 换孩子后，人物 / 技能下拉要重建
  v.person = ''
  v.skill = ''
}
initValues()
ai.formKid = formKid.value

const people = computed(() => (curKid.value ? peopleOf(data.state, curKid.value.id) : []))
const skills = computed(() => (curKid.value ? skillOptions(data.state, curKid.value) : []))
const multiKid = computed(() => state.value.kids.length > 1)

function isReq(f: TplField): boolean {
  return !!f.req
}
function personOptional(f: TplField): boolean {
  return /选填/.test(f.label)
}

/** 读表单，校验必填 */
function readForm(): Record<string, any> | null {
  if (!tpl) return null
  const out: Record<string, any> = {}
  let miss = ''
  tpl.fields.forEach((f) => {
    const val = v[f.key]
    out[f.key] = typeof val === 'string' ? val.trim() : val
    if (f.req && !out[f.key] && !miss) miss = f.label
  })
  if (miss) {
    ui.toast('请填写「' + miss + '」')
    return null
  }
  if (tpl.fields.some((f) => f.type === 'person' && !/选填/.test(f.label) && !out[f.key])) {
    ui.toast('先在关系网里添加这个人')
    return null
  }
  if (tpl.fields.some((f) => f.type === 'skill' && !out[f.key])) {
    ui.toast('先添加一个技能挑战')
    return null
  }
  return out
}

function tplJob() {
  if (!tpl) return null
  const vals = readForm()
  if (!vals) return null
  const k = kidById(data.state, vals.kid) || kidById(data.state, formKid.value) || data.curKid
  if (!k) {
    ui.toast('先添加孩子')
    return null
  }
  const job = tpl.build(vals, k, data.state)
  job.tpl = tpl.id
  return job
}

function go() {
  const job = tplJob()
  if (!job) return
  ai.startChat(job)
}

function copyPrompt() {
  const job = tplJob()
  if (!job) return
  ai.promptModal(ai.fullPrompt(job))
}
</script>

<template>
  <BaseModal :title="tpl ? tpl.title : 'AI 模板'" @close="dialogs.close()">
    <template v-if="tpl">
      <div class="tpl-head">
        <i :style="{ background: tpl.color + '1a', color: tpl.color }">{{ tpl.ico }}</i>
        <div class="sub">{{ tpl.desc }}</div>
      </div>

      <div v-for="f in tpl.fields" :key="f.key" class="field">
        <template v-if="f.type === 'kid'">
          <template v-if="multiKid">
            <label>{{ f.label }}</label>
            <select class="sel" :value="formKid" @change="setKid(($event.target as HTMLSelectElement).value)">
              <option v-for="x in state.kids" :key="x.id" :value="x.id">{{ x.name }}</option>
            </select>
          </template>
        </template>

        <template v-else-if="f.type === 'text'">
          <label>{{ f.label }}<span v-if="isReq(f)" class="req">*</span></label>
          <input v-model="v[f.key]" class="inp" :placeholder="f.ph || ''" />
        </template>

        <template v-else-if="f.type === 'textarea'">
          <label>{{ f.label }}<span v-if="isReq(f)" class="req">*</span></label>
          <textarea v-model="v[f.key]" class="ta" :placeholder="f.ph || ''" style="min-height: 70px"></textarea>
        </template>

        <template v-else-if="f.type === 'select'">
          <label>{{ f.label }}<span v-if="isReq(f)" class="req">*</span></label>
          <div class="chips pick">
            <button
              v-for="o in f.opts"
              :key="o"
              type="button"
              :class="{ on: v[f.key] === o }"
              @click="v[f.key] = o"
            >
              {{ o }}
            </button>
          </div>
        </template>

        <template v-else-if="f.type === 'check'">
          <label class="chk">
            <input v-model="v[f.key]" type="checkbox" />{{ f.label }}
          </label>
        </template>

        <template v-else-if="f.type === 'person'">
          <label>{{ f.label }}<span v-if="isReq(f)" class="req">*</span></label>
          <select v-model="v[f.key]" class="sel">
            <option value="">{{ personOptional(f) ? '不选' : '选一个人' }}</option>
            <option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </template>

        <template v-else-if="f.type === 'skill'">
          <label>{{ f.label }}<span v-if="isReq(f)" class="req">*</span></label>
          <select v-model="v[f.key]" class="sel">
            <option v-if="!skills.length" value="">先去「技能挑战」添加一个</option>
            <option v-for="s in skills" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </template>
      </div>

      <div v-if="state.settings.ai.mask" class="mask-note">
        <Icon name="lock" :size="12" /> 孩子和朋友的名字会先替换成编号再发送，结果回来后自动换回
      </div>
    </template>

    <template #foot>
      <button class="btn btn-light" @click="copyPrompt"><Icon name="copy" :size="15" />复制提示词</button>
      <button
        class="btn btn-dark"
        :title="ai.ready ? '' : '还没配置 AI 接口，会改为复制提示词'"
        @click="go"
      >
        <Icon name="spark" :size="15" />{{ ai.ready ? '开始生成' : '生成（复制提示词）' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.tpl-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  i {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 12.5px;
    flex: none;
  }
  .sub {
    font-size: 12.5px;
    color: var(--ink3);
    line-height: 1.6;
  }
}
.chips.pick {
  flex-wrap: wrap;
}
.mask-note {
  font-size: 12px;
  color: var(--ink3);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
