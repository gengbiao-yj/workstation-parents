<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
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

const d = computed(() => DIM[props.skill.dim] || DIM.ti)
const k = computed(() => kidById(data.state, props.skill.kid))
const prog = computed(() => skillProg(props.skill))
const ring = computed(() =>
  ringHtml(prog.value.rate, 58, d.value.color, `${prog.value.done}/${prog.value.n}`, 6)
)

function commitNote() {
  props.skill.note = note.value.trim()
  data.save()
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
  const now = skillProg(s)
  if (!was && now.finished) {
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
  } else if (s.steps[i].done) {
    ui.toast(`第 ${i + 1} 步做到了：${s.steps[i].t}`)
  }
  data.save()
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
          <small v-if="x.done">{{ fmtMD(x.done) }} 做到了</small>
          <small v-else-if="prog.cur && prog.cur.i === i">现在练的就是这一步</small>
        </div>
        <button
          v-if="prog.cur && prog.cur.i === i"
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
