<script setup lang="ts">
import { computed } from 'vue'
import { kidAva } from '@/lib/avatar'
import { ageText, dayStats, latestGrowth, latestMood, skillProg, skillsOf, stageOf, upcoming } from '@/lib/query'
import { dayLabel } from '@/lib/date'
import { MOOD } from '@/data/constants'
import { todayStr } from '@/lib/date'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import MoodFace from '../ui/MoodFace.vue'
import Icon from '../ui/Icon.vue'
import type { Kid } from '@/types'

const props = defineProps<{ kid: Kid }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const t = todayStr()
const m = computed(() => latestMood(data.state, props.kid.id))
const ds = computed(() => dayStats(data.state, props.kid.id, t))
const lg = computed(() => latestGrowth(data.state, props.kid.id, 'h'))
const next = computed(() => upcoming(data.state, props.kid.id, 14).filter((o) => o.type !== 'bday' && !o.done)[0])
const medals = computed(() => skillsOf(data.state, props.kid.id).filter((s) => skillProg(s).finished).length)
const role = computed(() =>
  [ageText(props.kid), props.kid.grade || stageOf(props.kid).name, props.kid.school].filter(Boolean).join(' · ')
)
</script>

<template>
  <div class="hc-head">
    <span v-html="kidAva(kid, 56)"></span>
    <div style="min-width: 0">
      <div class="hc-name">{{ kid.name }}</div>
      <div class="hc-role">{{ role }}</div>
      <div class="hc-status">
        <template v-if="m">
          <MoodFace :id="m.mood" :size="14" /> {{ MOOD[m.mood]?.t }} · {{ dayLabel(m.date) }}
        </template>
        <template v-else>还没记录心情</template>
      </div>
    </div>
  </div>
  <div v-if="m && m.text" class="hc-sec">
    <div class="hc-k">最近：</div>
    <div class="hc-v">{{ m.text }}</div>
  </div>
  <div v-if="next" class="hc-sec">
    <div class="hc-k">接下来：</div>
    <div class="hc-v">{{ dayLabel(next.ds) }} {{ next.start || '' }} {{ next.title }}</div>
  </div>
  <div class="hc-stats">
    <div><b>{{ ds.done }}/{{ ds.n }}</b><span>今日清单</span></div>
    <div><b>{{ lg ? lg.h : '—' }}</b><span>身高 cm</span></div>
    <div><b>{{ medals }}</b><span>奖牌</span></div>
  </div>
  <div class="hc-act">
    <button class="btn btn-sm btn-light" @click="dialogs.open({ k: 'journal' })"><Icon name="pen" :size="14" />记一刻</button>
    <router-link class="btn btn-sm btn-dark" to="/profile">成长档案</router-link>
  </div>
</template>
