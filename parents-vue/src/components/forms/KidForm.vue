<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { KID_COLORS } from '@/data/constants'
import { STAGES } from '@/data/constants'
import { deepClone, round1, todayStr, uid } from '@/lib/date'
import { setupKid } from '@/data/demo'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Kid } from '@/types'

const props = defineProps<{ kid?: Kid }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.kid
const d = reactive<Kid>(
  props.kid
    ? deepClone(props.kid)
    : {
        id: uid('k'),
        name: '',
        gender: 'F',
        birthday: '',
        stage: 'p1',
        school: '',
        grade: '',
        cls: '',
        teacher: '',
        interests: '',
        personality: '',
        health: '',
        note: '',
        color: data.state.kids.length,
        tags: []
      }
)
const extra = reactive({ h: '', w: '' })

watch(
  () => d.stage,
  (s) => {
    if (!d.grade) d.grade = STAGES.find((x) => x.id === s)?.grades[0] || ''
  }
)

function save() {
  if (!d.name.trim()) {
    ui.toast('写一下孩子的名字')
    return
  }
  d.name = d.name.trim()
  if (!d.grade) d.grade = STAGES.find((x) => x.id === d.stage)?.grades[0] || ''
  if (isNew) {
    data.state.kids.push(deepClone(d) as Kid)
    setupKid(data.state, deepClone(d) as Kid)
    const hh = parseFloat(extra.h)
    const ww = parseFloat(extra.w)
    if (hh > 30 || ww > 2) {
      const g: any = { id: uid('g'), kid: d.id, date: todayStr() }
      if (hh > 30) g.h = round1(hh)
      if (ww > 2) g.w = round1(ww)
      data.state.growth.push(g)
    }
    data.setCur(d.id)
  } else {
    const i = data.state.kids.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.kids[i] = deepClone(d) as Kid
  }
  data.save(true)
  dialogs.close()
  ui.toast(isNew ? '已添加 ' + d.name + '，按阶段开好了推荐打卡项' : '已保存')
}

async function del() {
  const ok = await ui.confirm(
    '删除「' + d.name + '」',
    '这个孩子的打卡、日程、技能挑战、关系网、成长记录和日记都会一起删除，<b>无法恢复</b>。删除前可以先到 设置 → 数据与备份 导出备份。',
    '确定删除',
    true
  )
  if (!ok) return
  const id = d.id
  const s = data.state
  s.kids = s.kids.filter((k) => k.id !== id)
  ;(['habits', 'skills', 'people', 'growth', 'journal', 'abilities', 'books', 'exams'] as const).forEach((key) => {
    ;(s[key] as any[]) = (s[key] as any[]).filter((x) => x.kid !== id)
  })
  s.events = s.events.filter((e) => e.kid !== id)
  delete s.checks[id]
  if (s.settings.cur === id) s.settings.cur = s.kids.length ? s.kids[0].id : ''
  data.save(true)
  dialogs.close()
  ui.toast('已删除')
}
</script>

<template>
  <BaseModal :title="isNew ? '添加孩子' : '编辑 · ' + d.name" wide @close="dialogs.close()">
    <div class="field">
      <label>孩子现在的阶段</label>
      <div class="chips">
        <button
          v-for="s in STAGES"
          :key="s.id"
          type="button"
          :class="{ on: d.stage === s.id }"
          @click="d.stage = s.id"
        >
          {{ s.name }} <span style="opacity: 0.6; margin-left: 3px">{{ s.sub }}</span>
        </button>
      </div>
      <div class="hint">
        {{ isNew ? '会按阶段推荐打卡项、技能挑战和出游点子' : '升学了就在这里换阶段；已有的打卡项不会变，可以在五育打卡里从推荐里添加新的' }}
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label>名字 / 小名<span class="req">*</span></label>
        <input v-model="d.name" class="inp" maxlength="10" autofocus />
      </div>
      <div class="field">
        <label>性别</label>
        <div class="seg light">
          <button type="button" :class="{ on: d.gender !== 'M' }" @click="d.gender = 'F'">女孩</button>
          <button type="button" :class="{ on: d.gender === 'M' }" @click="d.gender = 'M'">男孩</button>
        </div>
      </div>
      <div class="field"><label>生日</label><input v-model="d.birthday" class="inp" type="date" /></div>
    </div>

    <div class="row3">
      <div class="field"><label>学校</label><input v-model="d.school" class="inp" placeholder="选填" /></div>
      <div class="field"><label>年级</label><input v-model="d.grade" class="inp" :placeholder="STAGES.find((s) => s.id === d.stage)?.grades[0]" /></div>
      <div class="field">
        <label>班级 / 班主任</label>
        <div style="display: flex; gap: 6px">
          <input v-model="d.cls" class="inp" placeholder="（3）班" />
          <input v-model="d.teacher" class="inp" placeholder="李老师" />
        </div>
      </div>
    </div>

    <div v-if="isNew" class="row3">
      <div class="field"><label>现在的身高（cm）</label><input v-model="extra.h" class="inp num" inputmode="decimal" placeholder="选填" /></div>
      <div class="field"><label>体重（kg）</label><input v-model="extra.w" class="inp num" inputmode="decimal" placeholder="选填" /></div>
      <div></div>
    </div>

    <div class="row2">
      <div class="field"><label>兴趣爱好</label><input v-model="d.interests" class="inp" placeholder="如：画画、游泳、恐龙" /></div>
      <div class="field"><label>性格</label><input v-model="d.personality" class="inp" placeholder="如：开朗、有点怕生" /></div>
    </div>

    <div class="row2">
      <div class="field"><label>健康注意（过敏、视力等）</label><input v-model="d.health" class="inp" placeholder="选填" /></div>
      <div class="field">
        <label>围巾颜色</label>
        <div class="chips">
          <button
            v-for="(c, i) in KID_COLORS"
            :key="c"
            type="button"
            style="width: 30px; padding: 0"
            :style="{ background: c, boxShadow: d.color % 8 === i ? '0 0 0 2px #fff,0 0 0 4px ' + c : '' }"
            aria-label="颜色"
            @click="d.color = i"
          ></button>
        </div>
      </div>
    </div>

    <div class="field">
      <label>其他备注</label>
      <textarea v-model="d.note" class="ta" style="min-height: 60px"></textarea>
    </div>

    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="14" />删除这个孩子
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">{{ isNew ? '添加' : '保存' }}</button>
    </template>
  </BaseModal>
</template>
