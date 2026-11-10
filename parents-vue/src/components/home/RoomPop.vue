<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ROOMS } from '@/art/home'
import { DIM, EVT, ROOM_DIM } from '@/data/constants'
import { fmtMD, todayStr } from '@/lib/date'
import { dayStats, latestGrowth, occOn, stageOf, yearGain, weekStats } from '@/lib/query'
import { useData } from '@/stores/data'
import CkRow from '../ui/CkRow.vue'
import OccRow from '../ui/OccRow.vue'
import Icon from '../ui/Icon.vue'
import { useDialogs } from '@/stores/dialogs'
import type { Occurrence } from '@/types'

const props = defineProps<{ room: string }>()
const emit = defineEmits<{ (e: 'open', o: Occurrence): void; (e: 'change'): void }>()
const data = useData()
const dialogs = useDialogs()
const router = useRouter()

const k = computed(() => data.curKid!)
const t = todayStr()
const dim = computed(() => ROOM_DIM[props.room as keyof typeof ROOM_DIM])
const d = computed(() => (dim.value ? DIM[dim.value] : null))
const ds = computed(() => dayStats(data.state, k.value.id, t, dim.value))
const ws = computed(() => weekStats(data.state, k.value.id, t, dim.value))
const lg = computed(() => latestGrowth(data.state, k.value.id, 'h'))
const yg = computed(() => yearGain(data.state, k.value.id))
const st = computed(() => stageOf(k.value))
const evs = computed(() =>
  occOn(data.state, t, k.value.id, { nobd: true }).filter((o) => o.ev && EVT[o.type]?.dim === dim.value)
)
const sleepHabits = computed(() =>
  dayStats(data.state, k.value.id, t, 'ti').due.filter((x) => /睡|作息/.test(x.name))
)

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div v-if="room === 'bedroom'">
    <div class="rp-h">
      <i class="dim-dot" style="background: #e2569a">长</i>儿童房
      <span class="muted" style="font-weight: 400; font-size: 12px; margin-left: auto">{{ k.name }}</span>
    </div>
    <div class="info-grid" style="grid-template-columns: 72px 1fr; font-size: 13px; gap: 6px 10px">
      <div class="k">身高</div>
      <div>
        <template v-if="lg"><b class="num">{{ lg.h }}</b> cm <span class="muted">· {{ fmtMD(lg.date) }}</span></template>
        <span v-else class="muted">还没量过</span>
      </div>
      <template v-if="yg">
        <div class="k">一年长了</div>
        <div><b class="num">{{ yg.per }}</b> cm</div>
      </template>
      <div class="k">睡眠建议</div>
      <div>{{ st.sleep }}，{{ st.bed }} 前睡</div>
    </div>
    <div style="display: flex; gap: 6px; margin-top: 12px">
      <button class="btn btn-sm btn-dark" @click="dialogs.open({ k: 'growth' })"><Icon name="ruler" :size="14" />量身高体重</button>
      <button class="btn btn-sm btn-light" @click="go('/profile')">成长档案</button>
    </div>
    <div v-if="sleepHabits.length" class="ck-list" style="margin-top: 10px">
      <CkRow v-for="h in sleepHabits" :key="h.id" :habit="h" :ds="t" @change="emit('change')" />
    </div>
  </div>

  <div v-else>
    <div class="rp-h">
      <i class="dim-dot" :style="{ background: d!.color }">{{ d!.t }}</i>{{ ROOMS[room]?.name }} · {{ d!.short }}
      <span class="muted" style="font-weight: 400; font-size: 12px; margin-left: auto">
        本周 {{ ws.rate === null ? '—' : Math.round(ws.rate * 100) + '%' }}
      </span>
    </div>
    <div v-if="ds.n" class="ck-list">
      <CkRow v-for="h in ds.due" :key="h.id" :habit="h" :ds="t" @change="emit('change')" />
    </div>
    <template v-if="evs.length">
      <div class="muted" style="font-size: 12px; margin: 10px 0 4px">今天的日程</div>
      <OccRow v-for="(o, i) in evs" :key="i" :occ="o" @open="emit('open', $event)" @toggle="emit('open', $event)" />
    </template>
    <div v-if="!ds.n && !evs.length" class="muted" style="font-size: 12.5px; padding: 8px 2px">
      今天这一育没有安排。{{ d!.desc }}
    </div>
    <div style="display: flex; gap: 6px; margin-top: 10px">
      <button class="btn btn-xs btn-light" @click="go('/wuyu')">管理打卡项</button>
      <button v-if="dim === 'zhi'" class="btn btn-xs btn-light" @click="go('/study')">学习计划</button>
      <button v-if="dim === 'ti' || dim === 'mei'" class="btn btn-xs btn-light" @click="go('/skills')">技能挑战</button>
    </div>
  </div>
</template>
