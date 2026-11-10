<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import NeedKid from '@/components/ui/NeedKid.vue'
import KidPick from '@/components/ui/KidPick.vue'
import ChartBox from '@/components/ui/ChartBox.vue'
import Icon from '@/components/ui/Icon.vue'
import { DIM, DIMS } from '@/data/constants'
import { addDays, fmtMD, mondayOf, parseDate, todayStr } from '@/lib/date'
import {
  checkVal,
  dayStats,
  dueOn,
  habitById,
  habitsOf,
  isDone,
  rangeStats,
  stageOf,
  streakOf
} from '@/lib/query'
import { daysText, dimDotHtml } from '@/lib/widgets'
import { setCheck } from '@/lib/mutate'
import { radar } from '@/lib/chart'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import type { Habit } from '@/types'

const data = useData()
const dialogs = useDialogs()

const t = todayStr()
const dim = ref('')
const week = ref(0)

const kid = computed(() => data.curKid)
const kidId = computed(() => (kid.value ? kid.value.id : ''))

const mon = computed(() => addDays(mondayOf(t), week.value * 7))
const sun = computed(() => addDays(mon.value, 6))
const lmon = computed(() => addDays(mon.value, -7))
const endDs = computed(() => (sun.value > t ? t : sun.value))
const WD = '一二三四五六日'

/** 五张五育卡 */
const cards = computed(() =>
  DIMS.map((d) => {
    const r = rangeStats(data.state, kidId.value, mon.value, endDs.value, d.id)
    const lr = rangeStats(data.state, kidId.value, lmon.value, addDays(lmon.value, 6), d.id)
    const cnt = habitsOf(data.state, kidId.value, d.id).length
    const bars = [] as { k: string; style: string; title: string }[]
    for (let i = 0; i < 7; i++) {
      const ds = addDays(mon.value, i)
      const x = ds > t ? null : dayStats(data.state, kidId.value, ds, d.id)
      bars.push({
        k: ds,
        style:
          x && x.n
            ? `background:${d.color};opacity:${(0.18 + 0.82 * (x.rate || 0)).toFixed(2)}`
            : '',
        title: `周${WD[i]}${x && x.n ? ' ' + x.done + '/' + x.n : ''}`
      })
    }
    const diff = r.rate !== null && lr.rate !== null ? Math.round((r.rate - lr.rate) * 100) : null
    return { d, r, cnt, bars, diff }
  })
)

/** 打卡表行 */
interface CellInfo {
  ds: string
  future: boolean
  due: boolean
  done: boolean
  part: boolean
  text: string
}
interface Row {
  hb: Habit
  color: string
  streak: number
  cells: CellInfo[]
}

const dimOrder = computed(() => DIMS.map((d) => d.id))

const rows = computed<Row[]>(() => {
  const list = habitsOf(data.state, kidId.value, dim.value, true).slice()
  list.sort((a, b) => {
    const ia = dimOrder.value.indexOf(a.dim)
    const ib = dimOrder.value.indexOf(b.dim)
    return ia - ib || (b.on ? 1 : 0) - (a.on ? 1 : 0)
  })
  return list.map((hb) => {
    const color = DIM[hb.dim].color
    const cells: CellInfo[] = []
    for (let i = 0; i < 7; i++) {
      const ds = addDays(mon.value, i)
      const due = dueOn(hb, ds)
      const v = checkVal(data.state, kidId.value, ds, hb.id)
      const done = isDone(hb, v)
      const part = !!hb.unit && !!v && !done
      cells.push({
        ds,
        future: ds > t,
        due,
        done,
        part,
        text: done ? (hb.unit ? String(v === true ? hb.target : v) : '✓') : part ? String(v) : ''
      })
    }
    return { hb, color, streak: hb.on ? streakOf(data.state, kidId.value, hb.id) : 0, cells }
  })
})

const headDays = computed(() =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const ds = addDays(mon.value, i)
    return { i, ds, today: ds === t, num: (parseDate(ds) as Date).getDate() }
  })
)

const tableTitle = computed(() => (dim.value ? `${DIM[dim.value].t} · ${DIM[dim.value].name}` : '全部打卡项'))

/* ---------- 雷达 ---------- */
const radarWeekNow = computed(() =>
  DIMS.map((d) => rangeStats(data.state, kidId.value, mon.value, endDs.value, d.id).rate || 0)
)
const radarWeekLast = computed(() =>
  DIMS.map((d) => rangeStats(data.state, kidId.value, lmon.value, addDays(lmon.value, 6), d.id).rate || 0)
)
const radarLegend = computed(() => (week.value ? '那周' : '本周'))
const kidHexVal = computed(() => data.kidHex(kid.value))

function drawRadar(w: number) {
  return radar(
    DIMS.map((d) => `${d.t} ${d.short}`),
    [
      { name: '上周', color: '#b8b7b1', values: radarWeekLast.value, fill: false },
      { name: radarLegend.value, color: kidHexVal.value, values: radarWeekNow.value }
    ],
    w,
    { h: 250 }
  )
}

/** 最需要关注的一育 */
const lowDim = computed(() => {
  const arr = DIMS.map((d, i) => ({ d, v: radarWeekNow.value[i], n: habitsOf(data.state, kidId.value, d.id).length }))
    .filter((x) => x.n)
    .sort((a, b) => a.v - b.v)
  return arr.length ? arr[0] : null
})

const DIM_TIPS: Record<string, Record<string, string>> = {
  de: {
    k: '把「谢谢」「对不起」变成家里的日常，家长先做到，孩子就会跟着做。',
    p1: '每天睡前问一句「今天你帮了谁？」，孩子会开始留意别人。',
    p2: '让孩子参与家庭决定，比如周末去哪、怎么花钱，责任感就是这样长出来的。',
    m: '多听少说。孩子愿意说的时候，先听完再表达观点。',
    h: '把孩子当大人一样商量事情，尊重 TA 的选择，同时说清楚后果。'
  },
  zhi: {
    k: '这个阶段不急着认字算数，多读绘本、多问「为什么」比什么都重要。',
    p1: '固定的阅读时间比读多少更重要，每天 20 分钟，雷打不动。',
    p2: '让孩子自己做当天的学习计划，家长只看结果，不盯过程。',
    m: '错题当天弄懂比多刷题有用，帮孩子建一个错题本。',
    h: '学习节奏交给孩子，家长做好后勤和情绪支持。'
  },
  ti: {
    k: '每天户外活动 2 小时，跑跳爬攀都算，对眼睛和身体都好。',
    p1: '户外活动加睡眠，这两项比任何补习班都值得投入。',
    p2: '找一项孩子喜欢的运动长期坚持，比如游泳、跳绳、球类。',
    m: '运动是最好的减压方式，体育中考项目可以早点开始练。',
    h: '再忙也要保证睡眠和每周几次运动，身体是一切的基础。'
  },
  mei: {
    k: '画画、唱歌、玩泥巴，过程开心最重要，不用评价像不像。',
    p1: '把孩子的作品贴出来，认真看、认真问，比夸一句「真棒」更有用。',
    p2: '带孩子去看一次展览或演出，回来聊聊最喜欢哪部分。',
    m: '尊重孩子自己的审美，哪怕和你不一样。',
    h: '艺术是很好的放松方式，鼓励孩子保留一项爱好。'
  },
  lao: {
    k: '自己穿衣、收玩具、送碗，这些都是劳动，做得慢也让 TA 自己来。',
    p1: '给孩子一项固定的家务，比如每天摆碗筷，做完要说谢谢。',
    p2: '学做一道菜，从买菜到上桌都让孩子参与。',
    m: '自己的衣服自己洗，自己的房间自己打扫。',
    h: '能独立照顾好自己的生活，是上大学前最重要的准备。'
  }
}

const lowTip = computed(() => {
  const l = lowDim.value
  if (!l) return ''
  const stage = kid.value ? kid.value.stage : 'p1'
  return (DIM_TIPS[l.d.id] && (DIM_TIPS[l.d.id][stage] || DIM_TIPS[l.d.id].p1)) || ''
})

/* ---------- 16 周热力图 ---------- */
const heat = computed(() => {
  const weeks = 16
  const start = addDays(mondayOf(t), -(weeks - 1) * 7)
  const cells: { ds: string; style: string; title: string }[] = []
  for (let wk = 0; wk < weeks; wk++) {
    for (let di = 0; di < 7; di++) {
      const ds = addDays(start, wk * 7 + di)
      if (ds > t) {
        cells.push({ ds, style: 'background:transparent', title: '' })
        continue
      }
      const x = dayStats(data.state, kidId.value, ds, dim.value)
      const base = dim.value ? DIM[dim.value].color : kidHexVal.value
      cells.push({
        ds,
        style:
          x.n && x.done
            ? `background:${base};opacity:${(0.2 + 0.8 * (x.rate || 0)).toFixed(2)}`
            : '',
        title: `${fmtMD(ds)}${x.n ? ' · ' + x.done + '/' + x.n : ' · 无打卡项'}`
      })
    }
  }
  return cells
})
const heatBase = computed(() => (dim.value ? DIM[dim.value].color : kidHexVal.value))
const heatName = computed(() => (dim.value ? DIM[dim.value].name : '所有打卡项'))

/* ---------- 交互 ---------- */
const valPop = ref<{ hb: Habit; ds: string; left: number; top: number; v: string } | null>(null)
const valInput = ref<HTMLInputElement | null>(null)

function pickDim(id: string) {
  dim.value = dim.value === id ? '' : id
}

function shiftWeek(d: number) {
  week.value = d === 0 ? 0 : Math.min(0, week.value + d)
}

function cellClick(hb: Habit, ds: string, e: MouseEvent) {
  const v = checkVal(data.state, kidId.value, ds, hb.id)
  if (!hb.unit) {
    setCheck(data.state, kidId.value, ds, hb.id, v ? undefined : true)
    data.save()
    return
  }
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  valPop.value = {
    hb,
    ds,
    left: r.left + r.width / 2,
    top: r.bottom + 6,
    v: v === true ? String(hb.target) : v ? String(v) : ''
  }
  nextTick(() => {
    if (valInput.value) {
      valInput.value.focus()
      valInput.value.select()
    }
  })
}

function closeVal() {
  valPop.value = null
}

function saveVal(n?: number) {
  const p = valPop.value
  if (!p) return
  setCheck(data.state, kidId.value, p.ds, p.hb.id, n && n > 0 ? n : undefined)
  data.save()
  closeVal()
}

function okVal() {
  const p = valPop.value
  if (!p) return
  const n = parseFloat(p.v)
  saveVal(isNaN(n) ? undefined : n)
}

function openHabit(hb: Habit) {
  dialogs.open({ k: 'habit', habit: hb })
}

function newHabit() {
  dialogs.open({ k: 'habit', dim: dim.value || 'de' })
}

const onDocDown = (e: MouseEvent) => {
  if (!valPop.value) return
  const el = e.target as HTMLElement
  if (el.closest('.valpop') || el.closest('.hb-cell')) return
  closeVal()
}
onMounted(() => document.addEventListener('mousedown', onDocDown))
onUnmounted(() => document.removeEventListener('mousedown', onDocDown))
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">五育打卡</h1>
        <div class="page-desc">德智体美劳每天做一点。看的是习惯，不是分数</div>
      </div>
      <KidPick />
      <div class="seg light">
        <button aria-label="上一周" @click="shiftWeek(-1)"><Icon name="back" :size="15" /></button>
        <button :class="{ on: week === 0 }" @click="shiftWeek(0)">
          {{ week === 0 ? '本周' : fmtMD(mon) + ' 那周' }}
        </button>
        <button aria-label="下一周" :disabled="week >= 0" @click="shiftWeek(1)"><Icon name="fwd" :size="15" /></button>
      </div>
      <div class="grow"></div>
      <button class="btn btn-light" @click="dialogs.open({ k: 'presets' })"><Icon name="star" :size="15" />从推荐里添加</button>
      <button class="btn btn-dark" @click="newHabit"><Icon name="plus" :size="15" />新打卡项</button>
    </div>

    <div class="dim-cards">
      <button
        v-for="c in cards"
        :key="c.d.id"
        class="dim-card"
        :class="{ on: dim === c.d.id }"
        :style="{ '--c': c.d.color }"
        @click="pickDim(c.d.id)"
      >
        <div class="h">
          <span v-html="dimDotHtml(c.d.id)"></span>{{ c.d.name }}<small>{{ c.cnt }} 项</small>
        </div>
        <div class="big">
          <template v-if="c.r.rate === null">—</template>
          <template v-else>{{ Math.round(c.r.rate * 100) }}<small>%</small></template>
        </div>
        <div class="sub">
          完成 {{ c.r.done }}/{{ c.r.n }}
          <template v-if="c.diff">
            · <span :class="c.diff > 0 ? 'up' : 'dn'">{{ c.diff > 0 ? '↑' : '↓' }}{{ Math.abs(c.diff) }}</span> 比上周
          </template>
        </div>
        <div class="wk">
          <i v-for="b in c.bars" :key="b.k" :style="b.style" :title="b.title"></i>
        </div>
      </button>
    </div>

    <div class="grid2" style="grid-template-columns: minmax(0, 1fr) 360px; margin-bottom: 16px">
      <div class="panel" style="padding: 18px 0 6px">
        <div class="sec-h" style="padding: 0 20px">
          <div>
            <div class="panel-title">{{ tableTitle }}</div>
            <div class="muted" style="font-size: 12px">
              点格子打卡；有数字的格子点开可以填多少 · {{ fmtMD(mon) }}–{{ fmtMD(sun) }}
            </div>
          </div>
          <span class="grow"></span>
          <button v-if="dim" class="btn btn-xs btn-ghost" @click="dim = ''">看全部</button>
        </div>

        <div v-if="!rows.length" class="empty">
          还没有打卡项。点右上角「从推荐里添加」，按{{ stageOf(kid).name }}阶段挑几项开始
        </div>

        <div v-else style="overflow: auto">
          <table class="tbl hb-tbl">
            <thead>
              <tr>
                <th>打卡项</th>
                <th v-for="h in headDays" :key="h.ds" class="hc" :class="{ today: h.today }">
                  {{ WD[h.i] }}<br /><span class="num" style="font-size: 11px; font-weight: 400">{{ h.num }}</span>
                </th>
                <th class="r">连续</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.hb.id" :style="row.hb.on ? '' : 'opacity:.5'">
                <td>
                  <div class="hb-name">
                    <span v-html="dimDotHtml(row.hb.dim, true)"></span>
                    <span>
                      {{ row.hb.name }}
                      <span v-if="row.hb.unit" class="muted">{{ row.hb.target }} {{ row.hb.unit }}</span>
                      <span v-if="!row.hb.on" class="tag gray" style="height: 18px; font-size: 11px">已暂停</span>
                      <br /><span class="muted">{{ daysText(row.hb.days) }}</span>
                    </span>
                  </div>
                </td>
                <td v-for="c in row.cells" :key="c.ds" class="hc">
                  <span v-if="c.future" class="hb-cell off" :style="{ '--c': row.color }"></span>
                  <button
                    v-else
                    class="hb-cell"
                    :class="{ done: c.done, part: c.part, due: c.due && !c.done && !c.part }"
                    :style="{ '--c': row.color }"
                    :title="fmtMD(c.ds) + (c.due ? '' : ' · 这天不用打卡')"
                    @click="cellClick(row.hb, c.ds, $event)"
                  >
                    {{ c.text }}
                  </button>
                </td>
                <td class="r">
                  <span v-if="row.streak" class="streak"><Icon name="flag" :size="12" />{{ row.streak }} 次</span>
                  <span v-else class="muted">—</span>
                </td>
                <td class="r">
                  <span class="ops"><button class="btn btn-xs btn-ghost" @click="openHabit(row.hb)">编辑</button></span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom: 16px">
          <div class="panel-title">五育平衡</div>
          <div class="panel-sub">各育完成率 · 这周和上周</div>
          <ChartBox :draw="drawRadar" />
          <div class="legend">
            <span><i :style="{ background: kidHexVal }"></i>{{ radarLegend }}</span>
            <span><i style="background: #b8b7b1"></i>上周</span>
          </div>
        </div>

        <div v-if="lowDim" class="panel insight">
          <div class="panel-title" style="margin-bottom: 8px">
            <Icon name="spark" :size="15" /> 这周可以多关注「{{ lowDim.d.t }}」
          </div>
          <ul>
            <li>{{ lowDim.d.name }}：{{ lowDim.d.desc }}</li>
            <li>{{ lowTip }}</li>
            <li>完成率低不一定是孩子不努力，也可能是目标定高了，可以把目标改小一点。</li>
          </ul>
          <button class="btn btn-sm btn-light" style="margin-top: 10px" @click="$router.push('/ai?tpl=report')">
            <Icon name="spark" :size="14" />让 AI 写本月五育成长报告
          </button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="sec-h">
        <div>
          <div class="panel-title">最近 16 周</div>
          <div class="muted" style="font-size: 12px">{{ heatName }}每天的完成情况，颜色越深完成得越多</div>
        </div>
        <span class="grow"></span>
        <span class="legend-ramp">
          少<i v-for="o in [0.2, 0.45, 0.7, 1]" :key="o" :style="{ background: heatBase, opacity: o }"></i>多
        </span>
      </div>
      <div class="heat-wrap">
        <div class="heat-days"><span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span></div>
        <div class="heat">
          <i v-for="(c, i) in heat" :key="i" :style="c.style" :title="c.title"></i>
        </div>
      </div>
    </div>

    <div v-if="valPop" class="valpop" :style="{ left: valPop.left + 'px', top: valPop.top + 'px' }">
      <div class="pop-title">
        <span v-html="dimDotHtml(valPop.hb.dim, true)"></span>{{ valPop.hb.name }}
        <span class="muted" style="font-weight: 400; margin-left: auto; font-size: 12px">{{ fmtMD(valPop.ds) }}</span>
      </div>
      <div style="display: flex; gap: 6px; align-items: center">
        <input
          ref="valInput"
          v-model="valPop.v"
          class="inp num"
          :placeholder="String(valPop.hb.target)"
          inputmode="numeric"
          style="width: 90px"
          @keydown.enter="okVal"
        />
        <span class="muted">{{ valPop.hb.unit }}（目标 {{ valPop.hb.target }}）</span>
      </div>
      <div style="display: flex; gap: 6px; margin-top: 10px">
        <button class="btn btn-sm btn-dark" @click="okVal">保存</button>
        <button class="btn btn-sm btn-light" @click="saveVal(valPop.hb.target)">达成目标</button>
        <button class="btn btn-sm btn-ghost" @click="saveVal(undefined)">清除</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dim-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.dim-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 0 0 1px var(--line);
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
  text-align: left;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow:
      0 0 0 1px var(--line2),
      0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  &.on {
    box-shadow: 0 0 0 2px var(--c);
  }
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 4px;
    background: var(--c);
  }
  .h {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
    small {
      font-weight: 400;
      color: var(--ink3);
      font-size: 12px;
      margin-left: auto;
    }
  }
  .big {
    font-size: 26px;
    font-weight: 700;
    font-family: var(--num);
    margin-top: 8px;
    letter-spacing: -0.4px;
    line-height: 1.1;
    small {
      font-size: 12.5px;
      color: var(--ink3);
      font-weight: 500;
      margin-left: 4px;
      letter-spacing: 0;
    }
  }
  .sub {
    font-size: 12px;
    color: var(--ink3);
    margin-top: 3px;
  }
  .wk {
    display: flex;
    gap: 3px;
    margin-top: 10px;
    i {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: var(--fill2);
    }
  }
}
.hb-tbl {
  td.hc {
    padding: 4px 2px;
    text-align: center;
  }
  th.hc {
    text-align: center;
    padding: 10px 2px;
    &.today {
      color: var(--blue);
    }
  }
}
.hb-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  .muted {
    font-weight: 400;
    font-size: 12px;
  }
}
.hb-cell {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  font-family: var(--num);
  color: #fff;
  background: var(--fill);
  &:hover {
    box-shadow: 0 0 0 1.5px var(--line2) inset;
  }
  &.due {
    background: #fff;
    box-shadow: 0 0 0 1.5px #dcdcd9 inset;
    color: var(--ink3);
  }
  &.part {
    background: color-mix(in srgb, var(--c) 35%, #fff);
    color: var(--ink);
  }
  &.done {
    background: var(--c);
  }
  &.off {
    background: transparent;
    color: #d4d4d1;
    cursor: default;
    &::before {
      content: '·';
    }
  }
}
.streak {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--num);
  font-size: 12px;
  color: #c05f14;
}
.insight {
  ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13.5px;
    line-height: 1.9;
    color: #333;
  }
  .panel-title svg {
    display: inline;
    vertical-align: -2px;
  }
}
.legend-ramp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink3);
  font-size: 12px;
  i {
    display: inline-block;
    width: 14px;
    height: 10px;
    border-radius: 3px;
  }
}
.heat-wrap {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 4px;
}
.heat-days {
  display: grid;
  grid-template-rows: repeat(7, 13px);
  gap: 3px;
  font-size: 10px;
  color: var(--ink3);
  line-height: 13px;
}
.heat {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 13px);
  gap: 3px;
  i {
    width: 13px;
    height: 13px;
    border-radius: 3px;
    background: #eeeeec;
    display: block;
  }
}
.valpop {
  position: fixed;
  z-index: 60;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 0 0 1px var(--line),
    0 12px 32px rgba(0, 0, 0, 0.14);
  padding: 12px 14px;
  width: 268px;
  animation: pop 0.14s ease-out;
}
.ops {
  opacity: 0;
}
tr:hover .ops {
  opacity: 1;
}

@media (max-width: 1440px) {
  .dim-cards {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (max-width: 1080px) {
  .dim-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
