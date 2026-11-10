<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NeedKid from '@/components/ui/NeedKid.vue'
import KidPick from '@/components/ui/KidPick.vue'
import Icon from '@/components/ui/Icon.vue'
import { REL } from '@/data/constants'
import { REL_ORDER, netSVG } from '@/art/net'
import { personAva } from '@/lib/avatar'
import { clip } from '@/lib/widgets'
import { fmtMD, parseDate, WEEK } from '@/lib/date'
import { bdaysOf, nextBday, peopleOf } from '@/lib/query'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import type { Person } from '@/types'

const data = useData()
const dialogs = useDialogs()
const route = useRoute()

const kid = computed(() => data.curKid)
const kidId = computed(() => (kid.value ? kid.value.id : ''))
const rel = ref('')

const ps = computed(() => peopleOf(data.state, kidId.value))
const bds = computed(() => bdaysOf(data.state, kidId.value, 60))

const svg = computed(() => {
  if (!kid.value) return ''
  return netSVG(kid.value, ps.value, data.kidHex(kid.value))
})

const shown = computed(() =>
  ps.value
    .filter((p) => !rel.value || p.rel === rel.value)
    .sort((a, b) => REL_ORDER.indexOf(a.rel) - REL_ORDER.indexOf(b.rel) || b.close - a.close)
)

const chips = computed(() => {
  const out: { id: string; t: string; n: number }[] = [{ id: '', t: '全部', n: ps.value.length }]
  REL_ORDER.forEach((r) => {
    const n = ps.value.filter((p) => p.rel === r).length
    if (n) out.push({ id: r, t: REL[r].t, n })
  })
  return out
})

function open(p: Person) {
  if (p.kid !== data.state.settings.cur) {
    data.setCur(p.kid)
    data.save()
  }
  dialogs.open({ k: 'person', person: p })
}

function greet(p: Person) {
  dialogs.open({ k: 'greet', id: p.id })
}

function rowSub(p: Person) {
  const nb = nextBday(p.birthday)
  return [nb ? '生日 ' + fmtMD(nb.date) : '', p.likes || p.met || ''].filter(Boolean).join(' · ') || '—'
}

/* 悬停高亮：把同一人的节点和连线点亮 */
const focus = ref(false)
const hlId = ref('')

function onOver(e: MouseEvent) {
  const t = e.target as Element
  const n = t.closest && t.closest('.net-svg .node')
  if (!n) {
    focus.value = false
    hlId.value = ''
    return
  }
  focus.value = true
  hlId.value = n.getAttribute('data-p') || ''
}

const netEl = ref<HTMLElement | null>(null)

function paintHL() {
  const root = netEl.value
  if (!root) return
  const marks = root.querySelectorAll('[data-p]')
  marks.forEach((m) => {
    m.classList.toggle('hl', !!hlId.value && m.getAttribute('data-p') === hlId.value)
  })
  const svgEl = root.querySelector('.net-svg')
  if (svgEl) svgEl.classList.toggle('focus', focus.value)
}

watch([focus, hlId, svg], () => nextTick(paintHL))

onMounted(() => {
  const pid = String(route.query.person || '')
  if (pid) {
    const p = data.state.people.find((x) => x.id === pid)
    if (p) open(p)
  }
})
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">关系网</h1>
        <div class="page-desc">{{ kid.name }}身边的人：越靠近中间越亲近。记住朋友的生日，提醒孩子去祝贺</div>
      </div>
      <KidPick />
      <div class="grow"></div>
      <button class="btn btn-light" @click="$router.push('/ai?tpl=social')">
        <Icon name="spark" :size="15" />社交问题问 AI
      </button>
      <button class="btn btn-dark" @click="dialogs.open({ k: 'person' })">
        <Icon name="userplus" :size="15" />添加
      </button>
    </div>

    <div class="net-layout">
      <div class="net-panel" ref="netEl" @mouseover="onOver" @mouseleave="focus = false, hlId = ''">
        <span v-html="svg"></span>
        <div class="net-legend">
          <span v-for="r in REL_ORDER" :key="r">
            <template v-if="ps.filter((p) => p.rel === r).length">
              <i :style="{ background: REL[r].color }"></i>{{ REL[r].t }}
              {{ ps.filter((p) => p.rel === r).length }}
            </template>
          </span>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom: 16px">
          <div class="panel-title">生日提醒</div>
          <div class="panel-sub">60 天内 · 提前提醒{{ kid.name }}准备祝福</div>
          <template v-if="bds.length">
            <div v-for="b in bds.slice(0, 5)" :key="b.p.id" class="bd-card">
              <span v-html="personAva(b.p, 40)"></span>
              <div class="grow">
                <b>{{ b.p.name }}</b>
                <span class="muted" style="font-size: 12px">{{ b.p.label || REL[b.p.rel].t }}</span>
                <div class="muted" style="font-size: 12px">
                  {{ fmtMD(b.date) }} 周{{ WEEK[(parseDate(b.date) as Date).getDay()] }}
                  <template v-if="b.age"> · {{ b.age }} 岁</template>
                  <template v-if="b.p.likes"> · {{ clip(b.p.likes, 12) }}</template>
                </div>
                <div style="margin-top: 6px">
                  <span v-if="b.greeted" class="tag green">已祝贺</span>
                  <button v-else class="btn btn-xs btn-dark" @click="greet(b.p)">
                    <Icon name="gift" :size="12" />提醒{{ kid.name }}祝贺
                  </button>
                </div>
              </div>
              <div class="d">
                {{ b.days === 0 ? '今天' : b.days }}
                <small>{{ b.days ? '天后' : '生日' }}</small>
              </div>
            </div>
          </template>
          <div v-else class="muted" style="font-size: 12.5px">60 天内没有人过生日。添加朋友时记得填生日</div>
        </div>

        <div class="panel">
          <div class="sec-h">
            <div class="panel-title">所有人</div>
            <span class="grow"></span>
            <div class="chips">
              <button
                v-for="c in chips"
                :key="c.id"
                :class="{ on: rel === c.id }"
                style="height: 26px; padding: 0 9px; font-size: 12px"
                @click="rel = c.id"
              >
                {{ c.t }}
              </button>
            </div>
          </div>
          <template v-if="shown.length">
            <button v-for="p in shown" :key="p.id" class="p-row" @click="open(p)">
              <span v-html="personAva(p, 34)"></span>
              <span class="grow">
                <b style="font-weight: 600">{{ p.name }}</b>
                <span class="muted" style="display: inline; font-size: 12px">{{ p.label || REL[p.rel].t }}</span>
                <span>{{ rowSub(p) }}</span>
              </span>
              <span :title="p.close === 3 ? '最亲近' : p.close === 2 ? '常在一起' : '认识'" style="display: flex; gap: 2px">
                <i
                  v-for="n in [1, 2, 3]"
                  :key="n"
                  :style="{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: n <= p.close ? REL[p.rel].color : '#e3e3e0'
                  }"
                ></i>
              </span>
            </button>
          </template>
          <div v-else class="muted" style="font-size: 12.5px; padding: 8px 2px">还没有添加</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media (max-width: 1200px) {
  .net-layout {
    grid-template-columns: 1fr;
  }
}
</style>
