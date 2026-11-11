<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NeedKid from '@/components/ui/NeedKid.vue'
import OccRow from '@/components/ui/OccRow.vue'
import Icon from '@/components/ui/Icon.vue'
import { BDAY_COLOR, EV_TYPES, EVT, OUTING_IDEAS } from '@/data/constants'
import { icon as artIcon } from '@/art/home'
import { addDays, dayLabel, dowOf, nowMin, pad2, parseDate, todayStr, WEEK } from '@/lib/date'
import { dayStats, occOn, occState, stageOf, upcoming } from '@/lib/query'
import { dimDotHtml, ringHtml } from '@/lib/widgets'
import { downloadIcs } from '@/lib/ics'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import type { Occurrence } from '@/types'

const data = useData()
const dialogs = useDialogs()
const ui = useUi()
const route = useRoute()
const router = useRouter()

const t = todayStr()
const month = ref(t.slice(0, 7))
const sel = ref(t)
const hide = reactive<Record<string, boolean>>({})
const all = ref(false)

const kid = computed(() => data.curKid)
const kidId = computed(() => (all.value ? '' : kid.value ? kid.value.id : ''))
const curKidId = computed(() => (kid.value ? kid.value.id : ''))

const y = computed(() => +month.value.slice(0, 4))
const m = computed(() => +month.value.slice(5, 7))
const isThisMonth = computed(() => month.value === t.slice(0, 7))

/** 类型筛选条：原有 8 类 + 生日 */
const typeChips = computed(() => EV_TYPES.concat([{ id: 'bday', short: '生日', color: BDAY_COLOR } as any]))

const ADDTYPES = ['study', 'sport', 'class', 'outing', 'family', 'school', 'health']

interface Cell {
  ds: string
  day: number
  other: boolean
  today: boolean
  sel: boolean
  ring: string
  occ: Occurrence[]
  more: number
  done: number
  n: number
}

/** 42 格月历（第 6 行整行属于下个月时裁掉） */
const cells = computed<Cell[]>(() => {
  const first = `${y.value}-${pad2(m.value)}-01`
  const start = addDays(first, 1 - dowOf(first))
  const out: Cell[] = []
  for (let i = 0; i < 42; i++) {
    const ds = addDays(start, i)
    if (i === 35 && ds.slice(0, 7) !== month.value) break
    const occAll = occOn(data.state, ds, kidId.value).filter((o) => !hide[o.type])
    const bd = occAll.filter((o) => o.type === 'bday')
    const rest = occAll.filter((o) => o.type !== 'bday')
    const show = bd.concat(rest)
    const dd = dayStats(data.state, curKidId.value, ds)
    out.push({
      ds,
      day: (parseDate(ds) as Date).getDate(),
      other: ds.slice(0, 7) !== month.value,
      today: ds === t,
      sel: ds === sel.value,
      ring: ds <= t && dd.n ? ringHtml(dd.rate, 16, data.kidHex(kid.value), undefined, 3) : '',
      occ: show.slice(0, 3),
      more: show.length > 3 ? show.length - 3 : 0,
      done: dd.done,
      n: dd.n
    })
  }
  return out
})

/* ---------- 右侧：选中那天的安排 ---------- */
const selDate = computed(() => parseDate(sel.value) as Date)
const selOcc = computed(() => occOn(data.state, sel.value, kidId.value))
const selStats = computed(() => dayStats(data.state, curKidId.value, sel.value))

/* ---------- 接下来 45 天（每周重复只留最近一次） ---------- */
const nextList = computed<Occurrence[]>(() => {
  const up = upcoming(data.state, kidId.value, 45, ['outing', 'school', 'health', 'bday', 'family']).filter(
    (o) => o.ds > t || occState(o) !== 'past'
  )
  const seen: Record<string, 1> = {}
  const out: Occurrence[] = []
  up.forEach((o) => {
    const key = (o.ev ? o.ev.id : o.title) + o.ds
    if (o.ev && o.ev.repeat === 'weekly') {
      if (seen[o.ev.id]) return
      seen[o.ev.id] = 1
    }
    if (seen[key]) return
    seen[key] = 1
    out.push(o)
  })
  return out
})

const ideas = computed(() => (kid.value ? OUTING_IDEAS[kid.value.stage] || [] : []))
const stageName = computed(() => (kid.value ? stageOf(kid.value).name : ''))

/* ---------- 交互 ---------- */
function shiftMonth(d: number) {
  if (!d) {
    month.value = t.slice(0, 7)
    sel.value = t
    return
  }
  let yy = y.value
  let mm = m.value + d
  if (mm < 1) {
    mm = 12
    yy--
  }
  if (mm > 12) {
    mm = 1
    yy++
  }
  month.value = `${yy}-${pad2(mm)}`
}

function toggleType(id: string) {
  hide[id] = !hide[id]
}

function pickDay(ds: string) {
  sel.value = ds
  if (ds.slice(0, 7) !== month.value) month.value = ds.slice(0, 7)
}

function dblDay(ds: string) {
  pickDay(ds)
  newEvent({ date: ds })
}

function newEvent(preset: Record<string, any> = {}) {
  dialogs.open({ k: 'event', preset: { date: sel.value, ...preset } })
}

function openOcc(o: Occurrence) {
  if (o.ev) dialogs.open({ k: 'event', ev: o.ev, ds: o.ds })
  else if (o.bday) router.push('/people')
}

function toggleOcc(o: Occurrence) {
  const e = o.ev
  if (!e) return
  const d = e.done || (e.done = {})
  if (d[o.ds]) delete d[o.ds]
  else d[o.ds] = true
  data.save()
}

function addIdea(i: number) {
  const x = ideas.value[i]
  if (!x) return
  const w = dowOf(t)
  let sat = addDays(t, w <= 6 ? 6 - w : 6)
  if (w === 6 && nowMin() > 12 * 60) sat = addDays(t, 7)
  dialogs.open({
    k: 'event',
    preset: {
      type: 'outing',
      title: x[0],
      date: sat,
      start: '09:30',
      endT: x[3] === '1 天' ? '17:00' : '12:30',
      note: x[1],
      kid: ''
    }
  })
}

function exportIcs() {
  const n = downloadIcs(data.state)
  ui.toast(n ? `已导出 ${n} 个日程，导入手机日历就能提前提醒` : '还没有可以导出的日程')
}

const dayHead = computed(
  () => `${selDate.value.getMonth() + 1}月${selDate.value.getDate()}日 周${WEEK[selDate.value.getDay()]}`
)

onMounted(() => {
  const ds = String(route.query.ds || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
    sel.value = ds
    month.value = ds.slice(0, 7)
  }
  const evId = String(route.query.ev || '')
  if (evId) {
    const e = data.state.events.find((x) => x.id === evId)
    if (e) {
      sel.value = e.date
      month.value = e.date.slice(0, 7)
      dialogs.open({ k: 'event', ev: e, ds: e.date })
    }
  }
})
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">成长日历</h1>
        <div class="page-desc">学习计划、兴趣班、出去玩、亲子时光和朋友生日都在这里</div>
      </div>
      <div class="seg light" style="margin-left: 6px">
        <button aria-label="上个月" @click="shiftMonth(-1)"><Icon name="back" :size="15" /></button>
        <button :class="{ on: isThisMonth }" @click="shiftMonth(0)">{{ y }}年{{ m }}月</button>
        <button aria-label="下个月" @click="shiftMonth(1)"><Icon name="fwd" :size="15" /></button>
      </div>
      <div v-if="data.state.kids.length > 1" class="seg light">
        <button :class="{ on: !all }" @click="all = false">{{ kid.name }}</button>
        <button :class="{ on: all }" @click="all = true">全家</button>
      </div>
      <div class="grow"></div>
      <button class="btn btn-light" title="导出 .ics 文件，导入手机或电脑日历，提前提醒" @click="exportIcs">
        <Icon name="cal" :size="15" />导出到手机日历
      </button>
      <button class="btn btn-dark" @click="newEvent()"><Icon name="plus" :size="15" />新日程</button>
    </div>

    <div class="filterbar">
      <div class="type-chips">
        <button v-for="tp in typeChips" :key="tp.id" :class="{ off: !!hide[tp.id] }" @click="toggleType(tp.id)">
          <i :style="{ background: tp.color }"></i>{{ tp.short }}
        </button>
      </div>
    </div>

    <div class="cal-layout">
      <div class="cal-wrap">
        <div class="cal-head">
          <div v-for="(w, i) in ['一', '二', '三', '四', '五', '六', '日']" :key="w" :class="{ we: i >= 5 }">周{{ w }}</div>
        </div>
        <div class="cal-grid">
          <div
            v-for="c in cells"
            :key="c.ds"
            class="cal-cell"
            :class="{ other: c.other, today: c.today, sel: c.sel }"
            @click="pickDay(c.ds)"
            @dblclick="dblDay(c.ds)"
          >
            <div class="cal-num">
              <b>{{ c.day }}</b>
              <small v-if="c.today">今天</small>
            </div>
            <span
              v-if="c.ring"
              class="cal-dots"
              :title="`成长清单 ${c.done}/${c.n}`"
              v-html="c.ring"
            ></span>
            <div
              v-for="(o, oi) in c.occ"
              :key="o.ds + '-' + oi"
              class="cal-ev"
              :class="{ done: o.done && o.type !== 'bday', bd: o.type === 'bday' }"
              :style="{ background: o.color + '14' }"
            >
              <i :style="{ background: o.color }"></i>
              <span v-if="o.start" class="tm">{{ o.start }}</span>
              <span v-if="o.type === 'bday'" v-html="artIcon('gift', 11, o.color, 2.2)"></span>
              <span>{{ o.title }}</span>
            </div>
            <div v-if="c.more" class="cal-more">还有 {{ c.more }} 项</div>
          </div>
        </div>
      </div>

      <div class="cal-side">
        <div class="panel" style="margin-bottom: 16px">
          <div class="sec-h">
            <div>
              <div class="panel-title">{{ dayHead }}</div>
              <div class="muted" style="font-size: 12px">{{ dayLabel(sel) }} · {{ selOcc.length }} 项安排</div>
            </div>
            <span class="grow"></span>
          </div>
          <div v-if="selOcc.length" class="mini-list">
            <OccRow
              v-for="(o, i) in selOcc"
              :key="o.ds + '-' + i"
              :occ="o"
              :show-kid="all"
              :no-fade="sel !== t"
              @open="openOcc"
              @toggle="toggleOcc"
            />
          </div>
          <div v-else class="muted" style="font-size: 12.5px; padding: 6px 2px">这天还没有安排</div>
          <div class="type-chips" style="margin-top: 12px">
            <button v-for="id in ADDTYPES" :key="id" @click="newEvent({ type: id })">
              <i :style="{ background: EVT[id].color }"></i>+ {{ EVT[id].short }}
            </button>
          </div>
          <template v-if="sel <= t && selStats.n">
            <div class="hr"></div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px">
              <span v-html="ringHtml(selStats.rate, 34, data.kidHex(kid), undefined, 4)"></span>
              <div>
                {{ kid.name }}这天的成长清单 <b class="num">{{ selStats.done }}/{{ selStats.n }}</b><br />
                <router-link to="/wuyu">去补打卡</router-link>
              </div>
            </div>
          </template>
        </div>

        <div class="panel" style="margin-bottom: 16px">
          <div class="panel-title">接下来</div>
          <div class="panel-sub">45 天内的出游、学校、健康和生日</div>
          <div v-if="nextList.length" class="mini-list">
            <OccRow
              v-for="(o, i) in nextList.slice(0, 7)"
              :key="o.ds + '-' + i"
              :occ="o"
              day
              :show-kid="all"
              @open="openOcc"
              @toggle="toggleOcc"
            />
          </div>
          <div v-else class="muted" style="font-size: 12.5px">暂时没有</div>
        </div>

        <div class="panel">
          <div class="sec-h">
            <div class="panel-title">周末带{{ kid.name }}去哪玩</div>
            <span class="grow"></span>
            <button class="btn btn-xs btn-light" @click="$router.push('/ai?tpl=outing')">
              <Icon name="spark" :size="13" />AI 规划
            </button>
          </div>
          <div class="panel-sub">{{ stageName }}阶段推荐，点一下排到最近的周六</div>
          <div class="idea-grid">
            <button v-for="(x, i) in ideas" :key="i" class="idea" @click="addIdea(i)">
              <b>
                <span v-html="dimDotHtml(x[2] || 'ti', true)"></span>{{ x[0] }}
                <span class="muted" style="font-size: 11.5px; margin: 0 0 0 auto; font-weight: 400">{{ x[3] }}</span>
              </b>
              <span>{{ x[1] }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cal-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}
.cal-wrap {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 0 0 1px var(--line);
  overflow: hidden;
}
.cal-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--line);
  div {
    padding: 9px 10px;
    font-size: 12px;
    color: var(--ink3);
    &.we {
      color: #c0396f;
    }
  }
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.cal-cell {
  min-height: 112px;
  border-right: 1px solid #f0f0ee;
  border-bottom: 1px solid #f0f0ee;
  padding: 6px 6px 8px;
  cursor: pointer;
  position: relative;
  min-width: 0;
  transition: background 0.12s;
  user-select: none;
  &:nth-child(7n) {
    border-right: 0;
  }
  &:hover {
    background: #fafaf9;
  }
  &.other {
    background: #fcfcfb;
    .cal-num {
      color: #c9c9c6;
    }
  }
  &.sel {
    background: #f6f9ff;
    box-shadow: 0 0 0 1.5px var(--blue) inset;
  }
  &.today .cal-num b {
    background: var(--ink);
    color: #fff;
    border-radius: 999px;
    min-width: 22px;
    height: 22px;
    display: inline-grid;
    place-items: center;
    padding: 0 6px;
  }
}
.cal-num {
  font-family: var(--num);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  small {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ink3);
    font-family: var(--font);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
.cal-dots {
  position: absolute;
  right: 6px;
  top: 9px;
  display: flex;
  gap: 2px;
}
.cal-ev {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  line-height: 1.25;
  padding: 2px 5px;
  border-radius: 5px;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  i {
    width: 3px;
    height: 12px;
    border-radius: 2px;
    flex: none;
  }
  &.done {
    color: var(--ink3);
    span:last-child {
      text-decoration: line-through;
    }
  }
  &.bd {
    color: #c0396f;
    font-weight: 600;
  }
  .tm {
    font-family: var(--num);
    color: var(--ink3);
    font-size: 10.5px;
    flex: none;
  }
  :deep(svg) {
    flex: none;
  }
}
.cal-more {
  font-size: 11px;
  color: var(--ink3);
  padding: 2px 5px;
}
.cal-side {
  min-width: 0;
}

@media (max-width: 1080px) {
  .cal-layout {
    grid-template-columns: 1fr;
  }
}
</style>
