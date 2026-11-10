<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import NeedKid from '@/components/ui/NeedKid.vue'
import KidPick from '@/components/ui/KidPick.vue'
import ChartBox from '@/components/ui/ChartBox.vue'
import Icon from '@/components/ui/Icon.vue'
import { DIM, DIMS, MOOD } from '@/data/constants'
import { kidAva } from '@/lib/avatar'
import { dayLabel, fmtMD, fmtShort, parseDate, round1, WEEK } from '@/lib/date'
import {
  ageOf,
  ageText,
  growthOf,
  journalOf,
  latestGrowth,
  latestMood,
  stageOf,
  yearGain
} from '@/lib/query'
import { lines } from '@/lib/chart'
import { clip, moodFaceHtml } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'

const data = useData()
const dialogs = useDialogs()
const route = useRoute()

const kid = computed(() => data.curKid)
const kidId = computed(() => (kid.value ? kid.value.id : ''))
const kidHexVal = computed(() => data.kidHex(kid.value))
const st = computed(() => stageOf(kid.value))

const gr = computed(() => growthOf(data.state, kidId.value))
const lh = computed(() => latestGrowth(data.state, kidId.value, 'h'))
const lw = computed(() => latestGrowth(data.state, kidId.value, 'w'))
const lv = computed(() => latestGrowth(data.state, kidId.value, 'vl'))
const yg = computed(() => yearGain(data.state, kidId.value))
const m = computed(() => latestMood(data.state, kidId.value))

const GROW_TIP = '3 岁到青春期前，孩子一般每年长 5–7 厘米；如果一年长不到 5 厘米，可以带去儿科或儿保科看看'

const gh = computed(() => gr.value.filter((g) => g.h > 0 || g.w > 0))

function drawHeight(w: number) {
  const hs = gh.value.map((g) => g.h || null)
  const hv = hs.filter(Boolean) as number[]
  const lo = Math.floor((Math.min(...hv) - 4) / 5) * 5
  const hi = Math.ceil((Math.max(...hv) + 4) / 5) * 5
  return lines([{ name: '身高 cm', color: kidHexVal.value, values: hs, area: true }], gh.value.map((g) => fmtShort(g.date).replace('-', '/')), w, {
    h: 220,
    min: lo,
    max: hi,
    fmt: (v: number) => String(Math.round(v)),
    tipFmt: (v: number) => round1(v) + ' cm'
  })
}

const weightVals = computed(() => gh.value.map((g) => g.w || null).filter(Boolean) as number[])

function drawWeight(w: number) {
  const ws = gh.value.map((g) => g.w || null)
  if (weightVals.value.length < 2) return ''
  const lo = Math.floor(Math.min(...weightVals.value) - 2)
  const hi = Math.ceil(Math.max(...weightVals.value) + 2)
  return lines([{ name: '体重 kg', color: '#8b9099', values: ws }], gh.value.map((g) => fmtShort(g.date).replace('-', '/')), w, {
    h: 150,
    min: lo,
    max: hi,
    ticks: 2,
    fmt: (v: number) => String(Math.round(v)),
    tipFmt: (v: number) => round1(v) + ' kg'
  })
}

/* ---------- 成长日记 ---------- */
const jf = ref('')
const journals = computed(() =>
  journalOf(data.state, kidId.value).filter((j) => !jf.value || (jf.value === 'first' ? j.first : j.dim === jf.value))
)
const jfChips = computed(() => [
  { id: '', t: '全部' },
  { id: 'first', t: '第一次' },
  ...DIMS.map((d) => ({ id: d.id as string, t: d.t }))
])

function delJournal(id: string) {
  data.state.journal = data.state.journal.filter((j) => j.id !== id)
  data.save()
}

function delGrowth(id: string) {
  data.state.growth = data.state.growth.filter((g) => g.id !== id)
  data.save()
}

const measure = computed(() => {
  const arr = gr.value.slice().reverse().slice(0, 10)
  return arr.map((g, i) => {
    let prev = null
    for (let j = i + 1; j < arr.length; j++) if (arr[j].h) { prev = arr[j]; break }
    const a = ageOf(kid.value ? kid.value.birthday : '', g.date)
    return { g, prev, age: a }
  })
})

const infoRows = computed(() => {
  const k = kid.value!
  return [
    ['学校', `${k.school || ''} ${k.grade || ''}${k.cls || ''}`],
    ['班主任', k.teacher],
    ['兴趣', k.interests],
    ['性格', k.personality],
    ['健康', k.health],
    ['备注', k.note]
  ] as [string, string][]
})

const journalEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (String(route.query.sec || '') === 'journal') {
    setTimeout(() => journalEl.value && journalEl.value.scrollIntoView({ behavior: 'smooth' }), 80)
  }
})
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">成长档案</h1>
        <div class="page-desc">身高体重、最近的情况、每一个「第一次」</div>
      </div>
      <KidPick />
      <div class="grow"></div>
      <button class="btn btn-light" @click="dialogs.open({ k: 'growth' })">
        <Icon name="ruler" :size="15" />量身高体重
      </button>
      <button class="btn btn-dark" @click="dialogs.open({ k: 'journal' })">
        <Icon name="pen" :size="15" />记一刻
      </button>
    </div>

    <div class="pf-hero" :style="{ '--kc': kidHexVal }">
      <span v-html="kidAva(kid, 96)"></span>
      <div style="min-width: 0">
        <h2>
          {{ kid.name }}
          <span class="tag" :style="{ background: kidHexVal + '1f', color: kidHexVal }">{{ st.name }}</span>
        </h2>
        <div class="meta">
          {{ kid.gender === 'F' ? '女孩' : '男孩' }}<template v-if="ageText(kid)"> · {{ ageText(kid) }}</template>
          <template v-if="kid.birthday"> · {{ fmtMD(kid.birthday) }}生日</template>
          <template v-if="kid.school"> · {{ kid.school }}</template>
          <template v-if="kid.grade"> {{ kid.grade }}</template>{{ kid.cls }}
          <template v-if="kid.teacher"> · 班主任 {{ kid.teacher }}</template>
        </div>
        <div v-if="m" class="meta" style="margin-top: 6px">
          <span v-html="moodFaceHtml(m.mood, 16)"></span> 最近{{ MOOD[m.mood].t }}：{{ clip(m.text, 40) }}
        </div>
        <div v-if="kid.interests" class="tags">
          <span v-for="x in kid.interests.split(/[、，,\s]+/).filter(Boolean)" :key="x" class="tag">{{ x }}</span>
        </div>
      </div>
      <div class="acts">
        <button class="btn btn-sm btn-light" @click="dialogs.open({ k: 'kid', kid })">
          <Icon name="edit" :size="14" />编辑资料
        </button>
      </div>
    </div>

    <div class="kpis" style="grid-template-columns: repeat(5, 1fr); margin-top: 0">
      <div class="kpi">
        <div class="k">身高</div>
        <div class="v">{{ lh ? lh.h : '—' }}<small>cm</small></div>
        <div class="d muted">{{ lh ? fmtMD(lh.date) + ' 量的' : '还没量过' }}</div>
      </div>
      <div class="kpi">
        <div class="k">近一年长高</div>
        <div class="v">{{ yg ? yg.per : '—' }}<small>cm</small></div>
        <div class="d muted">{{ yg ? '按 ' + Math.round(yg.days / 30) + ' 个月换算' : '量两次以上就能算' }}</div>
      </div>
      <div class="kpi">
        <div class="k">体重</div>
        <div class="v">{{ lw ? lw.w : '—' }}<small>kg</small></div>
        <div class="d muted">{{ lw ? fmtMD(lw.date) : '—' }}</div>
      </div>
      <div class="kpi">
        <div class="k">视力 左 / 右</div>
        <div class="v" style="font-size: 19px">{{ lv ? lv.vl + ' / ' + (lv.vr || '—') : '—' }}</div>
        <div class="d muted">{{ lv ? fmtMD(lv.date) + ' 查的' : '体检时记一下' }}</div>
      </div>
      <div class="kpi">
        <div class="k">建议睡眠</div>
        <div class="v" style="font-size: 19px">{{ st.sleep }}</div>
        <div class="d muted">{{ st.bed }} 前上床</div>
      </div>
    </div>

    <div class="grid2" style="grid-template-columns: minmax(0, 1fr) 360px; margin-bottom: 16px">
      <div class="panel">
        <div class="sec-h">
          <div>
            <div class="panel-title">成长曲线</div>
            <div class="muted" style="font-size: 12px">每次量的身高和体重</div>
          </div>
          <span class="grow"></span>
        </div>
        <template v-if="gh.length >= 2">
          <ChartBox :draw="drawHeight" />
          <ChartBox v-if="weightVals.length >= 2" :draw="drawWeight" />
          <div class="legend">
            <span><i :style="{ background: kidHexVal }"></i>身高</span>
            <span><i style="background: #8b9099"></i>体重</span>
          </div>
        </template>
        <div v-else class="empty">
          量过两次以上就能看到曲线。
          <div style="margin-top: 12px">
            <button class="btn btn-dark btn-sm" @click="dialogs.open({ k: 'growth' })">
              <Icon name="ruler" :size="14" />量一次
            </button>
          </div>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom: 16px">
          <div class="panel-title">{{ st.name }}阶段 · 家长可以关注</div>
          <div style="font-size: 13.5px; line-height: 1.75; margin-top: 8px; color: #333">{{ st.focus }}</div>
          <ul style="margin: 10px 0 0; padding-left: 18px; font-size: 12.5px; line-height: 1.9; color: var(--ink2)">
            <li>睡眠 {{ st.sleep }}，{{ st.bed }} 前上床</li>
            <li>每天户外活动 2 小时，对视力和身体都好</li>
            <li>{{ kid.stage === 'k' ? '屏幕时间每天不超过 1 小时' : '娱乐屏幕时间和孩子一起约定好' }}</li>
            <li>{{ GROW_TIP }}</li>
          </ul>
        </div>
        <div class="panel">
          <div class="panel-title">基本信息</div>
          <div class="info-grid" style="grid-template-columns: 72px 1fr; margin-top: 10px; font-size: 13px">
            <template v-for="row in infoRows" :key="row[0]">
              <div class="k">{{ row[0] }}</div>
              <div>
                <template v-if="(row[1] || '').trim()">{{ row[1].trim() }}</template>
                <span v-else class="muted">—</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="gr.length" class="tbl-wrap" style="margin-bottom: 16px">
      <table class="tbl">
        <thead>
          <tr>
            <th>日期</th>
            <th>年龄</th>
            <th class="r">身高 cm</th>
            <th class="r">比上次</th>
            <th class="r">体重 kg</th>
            <th class="r">视力 左 / 右</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in measure" :key="row.g.id">
            <td class="num">{{ row.g.date }}</td>
            <td class="sub">{{ row.age ? row.age.y + ' 岁 ' + row.age.m + ' 个月' : '' }}</td>
            <td class="r num"><b>{{ row.g.h || '—' }}</b></td>
            <td class="r num">
              <span v-if="row.g.h && row.prev" class="up">+{{ round1(row.g.h - row.prev.h) }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="r num">{{ row.g.w || '—' }}</td>
            <td class="r num">
              <template v-if="row.g.vl">{{ row.g.vl }} / {{ row.g.vr || '—' }}</template>
              <span v-else class="muted">—</span>
            </td>
            <td class="r">
              <button class="btn btn-xs btn-ghost" @click="delGrowth(row.g.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div ref="journalEl" class="panel">
      <div class="sec-h">
        <div>
          <div class="panel-title">成长日记</div>
          <div class="muted" style="font-size: 12px">孩子说的一句话、一次第一次、一次小情绪</div>
        </div>
        <span class="grow"></span>
        <div class="chips">
          <button
            v-for="c in jfChips"
            :key="c.id"
            :class="{ on: jf === c.id }"
            style="height: 26px; padding: 0 10px; font-size: 12px"
            @click="jf = c.id"
          >
            {{ c.t }}
          </button>
        </div>
        <button class="btn btn-sm btn-dark" @click="dialogs.open({ k: 'journal' })">
          <Icon name="plus" :size="14" />记一刻
        </button>
      </div>

      <template v-if="journals.length">
        <div v-for="j in journals.slice(0, 40)" :key="j.id" class="jn-item">
          <div class="d">
            <b>{{ (parseDate(j.date) as Date).getDate() }}</b>
            <span>{{ (parseDate(j.date) as Date).getMonth() + 1 }}月 · 周{{ WEEK[(parseDate(j.date) as Date).getDay()] }}</span>
          </div>
          <div class="body">
            <div class="meta">
              <template v-if="j.mood">
                <span v-html="moodFaceHtml(j.mood, 16)"></span>{{ MOOD[j.mood].t }}
              </template>
              <span
                v-if="j.dim && DIM[j.dim]"
                class="tag"
                :style="{ background: DIM[j.dim].soft, color: DIM[j.dim].ink }"
              >
                {{ DIM[j.dim].t }} · {{ DIM[j.dim].short }}
              </span>
              <span v-if="j.first" class="tag first-tag">第一次</span>
              <span>{{ dayLabel(j.date) }}</span>
            </div>
            {{ j.text }}
          </div>
          <button class="x" @click="delJournal(j.id)">删除</button>
        </div>
      </template>
      <div v-else class="empty">还没有记录</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media (max-width: 1200px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
