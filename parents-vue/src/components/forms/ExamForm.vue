<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import AppDatePicker from '../ui/AppDatePicker.vue'
import Icon from '../ui/Icon.vue'
import { SUBJECT_PRESETS } from '@/data/constants'
import { deepClone, todayStr, uid } from '@/lib/date'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Exam, ExamItem } from '@/types'

const props = defineProps<{ exam?: Exam }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.exam
const k = data.curKid!
const d = reactive<Exam>(
  props.exam
    ? deepClone(props.exam)
    : {
        id: uid('x'),
        kid: k.id,
        date: todayStr(),
        name: '',
        note: '',
        items: (SUBJECT_PRESETS[k.stage] || []).map((s) => ({ sub: s, score: '', full: 100 }) as unknown as ExamItem)
      }
)

const items = ref<{ sub: string; score: string | number; full: number }[]>(
  d.items.map((it) => ({ sub: it.sub, score: it.score === null || it.score === undefined ? '' : it.score, full: it.full || 100 }))
)

function addItem() {
  items.value.push({ sub: '', score: '', full: 100 })
}

function save() {
  const name = d.name.trim()
  if (!name) {
    ui.toast('写一下考试名称')
    return
  }
  d.name = name
  d.date = d.date || todayStr()
  d.note = d.note.trim()
  const clean = items.value
    .filter((it) => it.sub.trim() && String(it.score).trim() !== '' && !isNaN(parseFloat(String(it.score))))
    .map((it) => ({
      sub: it.sub.trim(),
      score: parseFloat(String(it.score)),
      full: +it.full > 0 ? +it.full : 100
    })) as ExamItem[]
  d.items = clean
  if (isNew) data.state.exams.push({ ...d, items: clean })
  else {
    const i = data.state.exams.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.exams[i] = { ...d, items: clean }
  }
  data.save()
  dialogs.close()
}

function del() {
  data.state.exams = data.state.exams.filter((x) => x.id !== d.id)
  data.save()
  dialogs.close()
}
</script>

<template>
  <BaseModal :title="isNew ? '记一次考试' : '编辑考试'" @close="dialogs.close()">
    <div class="row2">
      <div class="field">
        <label>考试名称<span class="req">*</span></label>
        <input v-model="d.name" class="inp" placeholder="如：期中、单元测" autofocus />
      </div>
      <div class="field">
        <label>日期</label>
        <AppDatePicker v-model="d.date" />
      </div>
    </div>
    <div class="field">
      <label>各科分数 <span class="muted" style="font-weight: 400">空着的科目不记录</span></label>
      <div>
        <div v-for="(it, i) in items" :key="i" style="display: flex; gap: 6px; margin-bottom: 6px; align-items: center">
          <input v-model="it.sub" class="inp" style="width: 110px; height: 34px" placeholder="科目" />
          <input v-model="it.score" class="inp num" style="width: 90px; height: 34px" placeholder="分数" inputmode="decimal" />
          <span class="muted">/</span>
          <input v-model="it.full" class="inp num" style="width: 80px; height: 34px" inputmode="numeric" />
          <button type="button" class="btn btn-xs btn-ghost" @click="items.splice(i, 1)">×</button>
        </div>
      </div>
      <button type="button" class="btn btn-xs btn-light" style="margin-top: 8px" @click="addItem">
        <Icon name="plus" :size="13" />加一科
      </button>
    </div>
    <div class="field">
      <label>老师说的 / 孩子自己的总结</label>
      <textarea v-model="d.note" class="ta"></textarea>
    </div>
    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="15" />删除
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
