<script setup lang="ts">
import { computed } from 'vue'
import NeedKid from '@/components/ui/NeedKid.vue'
import KidPick from '@/components/ui/KidPick.vue'
import Icon from '@/components/ui/Icon.vue'
import { DIM, SKILL_PRESETS, skillPreset } from '@/data/constants'
import { icon as artIcon } from '@/art/home'
import { daysBetween, fmtMD, parseDate, todayStr } from '@/lib/date'
import { skillProg, skillsOf, stageOf } from '@/lib/query'
import { ringHtml } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import type { Skill } from '@/types'

const data = useData()
const dialogs = useDialogs()

const kid = computed(() => data.curKid)
const kidId = computed(() => (kid.value ? kid.value.id : ''))

const list = computed(() => skillsOf(data.state, kidId.value))
const ing = computed(() => list.value.filter((s) => !skillProg(s).finished))
const fin = computed(() => list.value.filter((s) => skillProg(s).finished))
const ordered = computed(() => ing.value.concat(fin.value))

const rec = computed(() => {
  const have: Record<string, 1> = {}
  list.value.forEach((s) => {
    if (s.pre) have[s.pre] = 1
  })
  return SKILL_PRESETS.filter((p) => p.stages.indexOf(kid.value!.stage) >= 0 && !have[p.id])
})

function meta(s: Skill) {
  const p = skillProg(s)
  const d = DIM[s.dim] || DIM.ti
  const days = s.start ? daysBetween(parseDate(s.start) as Date, new Date()) : 0
  const finishedDs = p.finished ? s.steps[s.steps.length - 1].done : ''
  let out = `${d.t} · ${d.short}`
  if (p.finished) out += ` · ${fmtMD(finishedDs)} 完成`
  else if (days) out += ` · 开始 ${days} 天`
  return out
}

function cardRing(s: Skill) {
  const p = skillProg(s)
  const d = DIM[s.dim] || DIM.ti
  return ringHtml(p.rate, 46, d.color, `${p.done}/${p.n}`, 5)
}

function open(s: Skill) {
  dialogs.open({ k: 'skillDetail', id: s.id })
}

function addPreset(p: { id: string }) {
  const pre = skillPreset(p.id)
  if (!pre) return
  dialogs.open({ k: 'skill', presetId: pre.id })
}
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">技能挑战</h1>
        <div class="page-desc">把一个大本领拆成几个小步骤，一步一步来。完成的奖牌会挂到运动角的奖牌墙上</div>
      </div>
      <KidPick />
      <div class="grow"></div>
      <button class="btn btn-dark" @click="dialogs.open({ k: 'skill' })">
        <Icon name="plus" :size="15" />新挑战
      </button>
    </div>

    <div class="sec-h">
      <span class="pill">进行中 <b class="num">{{ ing.length }}</b></span>
      <span class="pill"><Icon name="medal" :size="14" />已获得奖牌 <b class="num">{{ fin.length }}</b></span>
    </div>

    <div class="sk-grid">
      <button
        v-for="s in ordered"
        :key="s.id"
        class="sk-card"
        :class="{ fin: skillProg(s).finished }"
        @click="open(s)"
      >
        <div class="top">
          <span
            class="sk-ico"
            :style="{ background: skillProg(s).finished ? '#fff3d6' : (DIM[s.dim] || DIM.ti).soft }"
          >
            <span
              v-html="artIcon(s.icon || 'star', 26, skillProg(s).finished ? '#d9a420' : (DIM[s.dim] || DIM.ti).color)"
            ></span>
          </span>
          <div style="min-width: 0">
            <div class="nm">{{ s.name }}</div>
            <div class="meta">{{ meta(s) }}</div>
          </div>
          <span v-if="skillProg(s).finished" class="badge-done" v-html="artIcon('medal', 30, '#d9a420')"></span>
          <span v-else v-html="cardRing(s)"></span>
        </div>
        <div
          class="cur"
          :style="skillProg(s).finished ? 'background:#fff7e3' : ''"
        >
          <small>{{ skillProg(s).finished ? '奖牌到手' : `现在练的是第 ${skillProg(s).cur ? skillProg(s).cur!.i + 1 : 1} 步` }}</small>
          {{ skillProg(s).finished ? s.steps[s.steps.length - 1].t : skillProg(s).cur ? skillProg(s).cur!.s.t : '' }}
        </div>
        <div class="sk-steps">
          <i
            v-for="(x, i) in s.steps"
            :key="i"
            :style="x.done ? { background: skillProg(s).finished ? '#e9b93c' : (DIM[s.dim] || DIM.ti).color } : ''"
          ></i>
        </div>
      </button>

      <button class="sk-card sk-new" @click="dialogs.open({ k: 'skill' })">
        <Icon name="plus" :size="18" />
        <span style="font-size: 13px">新的技能挑战</span>
      </button>
    </div>

    <div v-if="rec.length" class="panel" style="margin-top: 20px">
      <div class="panel-title">适合{{ stageOf(kid).name }}的挑战</div>
      <div class="panel-sub">点一下就加进来，步骤已经拆好了，之后也可以改</div>
      <div class="idea-grid">
        <button v-for="p in rec" :key="p.id" class="idea" @click="addPreset(p)">
          <b>
            <span
              class="sk-ico"
              :style="{
                width: '28px',
                height: '28px',
                borderRadius: '9px',
                background: (DIM[p.dim] || DIM.ti).soft
              }"
            >
              <span v-html="artIcon(p.icon, 16, (DIM[p.dim] || DIM.ti).color)"></span>
            </span>
            {{ p.t }}
            <span class="muted" style="font-size: 11.5px; margin: 0 0 0 auto; font-weight: 400">{{ p.steps.length }} 步</span>
          </b>
          <span>{{ p.steps[0] }} → … → {{ p.steps[p.steps.length - 1] }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
