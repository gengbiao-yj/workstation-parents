<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import AppDatePicker from '../ui/AppDatePicker.vue'
import { DIM } from '@/data/constants'
import { icon as artIcon } from '@/art/home'
import { fmtMD, todayStr, uid } from '@/lib/date'
import { kidById, skillProg } from '@/lib/query'
import { ringHtml, confetti } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Skill } from '@/types'

const props = defineProps<{ skill: Skill }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const note = ref(props.skill.note || '')

/** 行内正在改日期的步骤下标，-1 表示没有 */
const editing = ref(-1)
/** 补记模式：所有步骤同时露出日期框，用于一次补录「以前就掌握」的技能 */
const batch = ref(false)
/** 行内日期框实例（v-for 里的普通 ref 会被收集成数组，这里用函数 ref 拿到单个实例） */
let pickEl: { open: () => void } | null = null
function setPickEl(el: unknown) {
  pickEl = el as { open: () => void } | null
}

const d = computed(() => DIM[props.skill.dim] || DIM.ti)
const k = computed(() => kidById(data.state, props.skill.kid))
const prog = computed(() => skillProg(props.skill))
const ring = computed(() =>
  ringHtml(prog.value.rate, 58, d.value.color, `${prog.value.done}/${prog.value.n}`, 6)
)

/** 时间顺序体检：只在数据真的对不上时提示一句，不阻塞保存 */
const hint = computed(() => {
  const st = props.skill.steps
  const back: number[] = []
  for (let i = 1; i < st.length; i++) {
    if (st[i].done && st[i - 1].done && st[i].done < st[i - 1].done) back.push(i + 1)
  }
  if (back.length) return `第 ${back.join('、')} 步的时间比前一步还早，可以核对一下`
  const gap: number[] = []
  st.forEach((x, i) => {
    if (!x.done && st.slice(i + 1).some((y) => y.done)) gap.push(i + 1)
  })
  if (gap.length) return `第 ${gap.join('、')} 步还没记录时间`
  return ''
})

function commitNote() {
  props.skill.note = note.value.trim()
  data.save()
}

/** 完成状态变化后的统一收尾：刚好全部完成时写日记、撒花、发奖牌提示 */
function afterChange(wasFinished: boolean): boolean {
  const s = props.skill
  const now = skillProg(s)
  let justFinished = false
  if (!wasFinished && now.finished) {
    data.state.journal.push({
      id: uid('j'),
      kid: s.kid,
      date: todayStr(),
      mood: 'excited',
      text: `完成了技能挑战「${s.name}」：${s.steps[s.steps.length - 1].t}！`,
      dim: s.dim,
      first: true,
      t: Date.now()
    } as any)
    window.setTimeout(confetti, 120)
    ui.toast(`${k.value ? k.value.name : '孩子'} 拿到了「${s.name}」的奖牌！`, 2600)
    justFinished = true
  }
  data.save()
  return justFinished
}

function toggleStep(i: number) {
  const s = props.skill
  const was = skillProg(s).finished
  const st = s.steps[i]
  if (st.done) {
    for (let j = i; j < s.steps.length; j++) s.steps[j].done = ''
  } else {
    for (let q = 0; q <= i; q++) if (!s.steps[q].done) s.steps[q].done = todayStr()
  }
  commitNote()
  const justFinished = afterChange(was)
  if (!justFinished && s.steps[i].done) {
    ui.toast(`第 ${i + 1} 步做到了：${s.steps[i].t}`)
  }
}

/** 点日期进入行内编辑，并直接展开日历 */
function startEdit(i: number) {
  editing.value = i
  nextTick(() => pickEl?.open())
}

/** 点到别处（含日历面板内）就退出编辑，避免行里一直挂着输入框 */
function onDocDown(e: MouseEvent) {
  if (batch.value || editing.value < 0) return
  const t = e.target as HTMLElement | null
  if (!t) return
  if (t.closest('.st-pick') || t.closest('.app-picker-popper') || t.closest('.el-picker__popper')) return
  editing.value = -1
}
onMounted(() => document.addEventListener('mousedown', onDocDown, true))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown, true))

/**
 * 写入某一步的完成时间（行内编辑与补记模式共用）
 * - 只改这一步，不改动其它步骤，避免「改一个日期连带改一串」
 * - 早于技能开始时间时，把开始时间一起前移，否则时间线首尾矛盾
 */
function setDone(i: number, v: string | undefined | null) {
  const s = props.skill
  const was = skillProg(s).finished
  const val = String(v || '')
  let movedStart = ''
  if (val) {
    s.steps[i].done = val
    if (s.start && val < s.start) {
      s.start = val
      movedStart = val
    }
  } else {
    s.steps[i].done = ''
  }
  commitNote()
  afterChange(was)
  if (!batch.value) editing.value = -1
  if (movedStart) ui.toast(`技能开始时间已同步到 ${movedStart}`)
}

function toggleBatch() {
  batch.value = !batch.value
  editing.value = -1
}

async function del() {
  const ok = await ui.confirm('删除技能挑战', `确定删除「${props.skill.name}」和它的练习记录吗？`, '删除', true)
  if (!ok) return
  data.state.skills = data.state.skills.filter((x) => x.id !== props.skill.id)
  data.save()
  dialogs.close()
}

function edit() {
  const s = props.skill
  commitNote()
  dialogs.open({ k: 'skill', skill: s })
}
</script>

<template>
  <BaseModal title="技能挑战" wide @close="dialogs.close()">
    <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px">
      <span class="sk-ico" :style="{ width: '56px', height: '56px', borderRadius: '17px', background: d.soft }">
        <span v-html="artIcon(skill.icon || 'star', 30, d.color)"></span>
      </span>
      <div style="flex: 1">
        <div style="font-size: 18px; font-weight: 800">{{ skill.name }}</div>
        <div class="muted" style="font-size: 12.5px">
          {{ k ? k.name : '' }} · {{ d.t }} · {{ d.short }}<template v-if="skill.start"> · {{ fmtMD(skill.start) }} 开始</template>
        </div>
      </div>
      <span v-html="ring"></span>
    </div>

    <div v-if="skill.tip" class="note-bar" :style="{ background: d.soft, boxShadow: 'none' }">
      <Icon name="spark" :size="16" /><span>{{ skill.tip }}</span>
    </div>

    <div class="st-head">
      <span class="hint" :class="{ warn: !!hint }">
        <Icon v-if="hint" name="bulb" :size="12" />
        {{ hint || (batch ? '选日期即记为完成，可以一次把以前的进度补上' : '') }}
      </span>
      <button class="btn btn-xs" :class="batch ? 'btn-dark' : 'btn-light'" @click="toggleBatch">
        <Icon name="cal" :size="12" />{{ batch ? '完成补记' : '补记时间' }}
      </button>
    </div>

    <div class="steps-tl" :style="{ '--c': d.color }">
      <div
        v-for="(x, i) in skill.steps"
        :key="i"
        class="st-item"
        :class="{ done: !!x.done, cur: prog.cur && prog.cur.i === i }"
      >
        <span class="dot" :title="x.done ? '取消完成' : '这一步做到了'" @click="toggleStep(i)">
          <Icon v-if="x.done" name="check" :size="13" :stroke-width="2.4" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <div class="t">
          {{ x.t }}

          <!-- ① 单步改时间：行内换成日期框，选完自动收起 -->
          <div v-if="!batch && editing === i" class="st-pick">
            <AppDatePicker
              :ref="setPickEl"
              class="is-sm"
              :model-value="x.done"
              :clearable="false"
              placeholder="选一个完成日期"
              @update:model-value="(v) => setDone(i, v)"
            />
          </div>

          <!-- ② 补记模式：每一步都能直接填日期 -->
          <div v-else-if="batch" class="st-pick">
            <AppDatePicker
              class="is-sm"
              :model-value="x.done"
              :clearable="false"
              placeholder="未记录，选个日期"
              @update:model-value="(v) => setDone(i, v)"
            />
          </div>

          <!-- ③ 展示态：日期可点，hover 出铅笔 -->
          <template v-else>
            <small v-if="x.done" class="st-date">
              <button type="button" class="st-date-btn" title="改一下完成时间" @click="startEdit(i)">
                {{ fmtMD(x.done) }} 做到了
                <Icon class="pen" name="edit" :size="12" :stroke-width="2" />
              </button>
            </small>
            <small v-else-if="prog.cur && prog.cur.i === i">现在练的就是这一步</small>
          </template>
        </div>
        <button
          v-if="!batch && prog.cur && prog.cur.i === i"
          class="btn btn-xs btn-dark"
          @click="toggleStep(i)"
        >
          做到了
        </button>
      </div>
    </div>

    <div class="field" style="margin-top: 6px">
      <label>练习记录</label>
      <textarea
        v-model="note"
        class="ta"
        placeholder="比如：今天在小区里滑行了 3 米，有点怕摔"
        @change="commitNote"
      ></textarea>
    </div>

    <template #foot>
      <button class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="15" />删除
      </button>
      <button class="btn btn-light" @click="edit"><Icon name="edit" :size="15" />改步骤</button>
      <button class="btn btn-light" @click="$router.push(`/ai?tpl=skill&skill=${skill.id}`)">
        <Icon name="spark" :size="15" />问 AI 怎么教
      </button>
      <button class="btn btn-dark" @click="dialogs.close()">好的</button>
    </template>
  </BaseModal>
</template>
