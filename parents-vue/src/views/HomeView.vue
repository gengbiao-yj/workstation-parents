<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import HomeRail from '@/components/home/HomeRail.vue'
import KidCard from '@/components/home/KidCard.vue'
import ParentCard from '@/components/home/ParentCard.vue'
import RoomPop from '@/components/home/RoomPop.vue'
import Ring from '@/components/ui/Ring.vue'
import MoodFace from '@/components/ui/MoodFace.vue'
import Icon from '@/components/ui/Icon.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { HOME_MODES, SPOTS, renderScene } from '@/lib/scene'
import { addDays, clamp, fmtMD, pad2, todayStr, uid, WEEK } from '@/lib/date'
import { dayStats, kidById, latestMood, occOn, occState, stageOf, upcoming, weekStats, ageText } from '@/lib/query'
import { kidAva } from '@/lib/avatar'
import { adultAvatar } from '@/art/home'
import { DIM, DIMS, FAMILY_IDEAS, MOODS, MOOD, ROOM_DIM, EVT } from '@/data/constants'
import { confetti } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Kid, Occurrence } from '@/types'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()
const router = useRouter()

const mode = ref<'today' | 'week' | 'night'>('today')
const view = reactive({ s: 1, x: 0, y: 0, fit: true })
const kidRoom = reactive<Record<string, string>>({})
const kidSpot = reactive<Record<string, number>>({})
const parentAt = reactive<Record<number, number[]>>({})
const stageEl = ref<HTMLElement>()
const innerEl = ref<HTMLElement>()
const layerSize = reactive({ W: 1640, H: 958 })

const cur = computed(() => data.curKid)
const kidHex = (k?: Kid | null) => data.kidHex(k)
const ctx = computed(() => ({
  mode: mode.value,
  kidRoom,
  kidSpot,
  parentAt,
  tod: currentTod(),
  kidHex
}))

function currentTod(): 'day' | 'dusk' | 'night' {
  const h = new Date().getHours()
  return h >= 19 || h < 6 ? 'night' : h >= 17 ? 'dusk' : 'day'
}

/* ---------------- 画面 ---------------- */
function drawHome(keep = false) {
  if (!innerEl.value) return
  if (!cur.value) {
    innerEl.value.innerHTML = ''
    return
  }
  const res = renderScene(data.state, ctx.value)
  layerSize.W = res.W
  layerSize.H = res.H
  innerEl.value.innerHTML = res.svg
  innerEl.value.style.width = res.W + 'px'
  innerEl.value.style.height = res.H + 'px'
  if (!keep) {
    if (view.fit) fitView()
    else applyView()
  }
  tickClock()
}

function fitView() {
  const st = stageEl.value
  if (!st) return
  const W = st.clientWidth
  const H = st.clientHeight
  const top = 52
  const bottom = 70
  const s = clamp(Math.min((W - 40) / layerSize.W, (H - top - bottom) / layerSize.H), 0.28, 1.3)
  view.s = s
  view.x = (W - layerSize.W * s) / 2
  view.y = top + Math.max(0, (H - top - bottom - layerSize.H * s) / 2)
  view.fit = true
  applyView()
}

function applyView() {
  const st = stageEl.value
  if (!innerEl.value) return
  if (st) {
    const W = st.clientWidth
    const H = st.clientHeight
    const sw = layerSize.W * view.s
    const sh = layerSize.H * view.s
    const m = 140
    view.x = clamp(view.x, Math.min(m - sw, (W - sw) / 2), Math.max(W - m, (W - sw) / 2))
    view.y = clamp(view.y, Math.min(H - 90 - sh, 52), Math.max(H - m, 52))
  }
  innerEl.value.style.transform = `translate(${Math.round(view.x)}px,${Math.round(view.y)}px) scale(${view.s})`
}

function zoomAt(f: number, cx: number, cy: number) {
  const ns = clamp(view.s * f, 0.28, 2.4)
  view.x = cx - (cx - view.x) * (ns / view.s)
  view.y = cy - (cy - view.y) * (ns / view.s)
  view.s = ns
  view.fit = false
  applyView()
}

function tickClock() {
  const g = innerEl.value?.querySelector('.home-svg .clock') as SVGGElement | null
  if (!g) return
  const cx = g.getAttribute('data-cx')
  const cy = g.getAttribute('data-cy')
  const d = new Date()
  g.querySelector('.clock-h')?.setAttribute('transform', `rotate(${((d.getHours() % 12) * 30 + d.getMinutes() / 2)} ${cx} ${cy})`)
  g.querySelector('.clock-m')?.setAttribute('transform', `rotate(${d.getMinutes() * 6} ${cx} ${cy})`)
}

function figEl(kidId: string) {
  return innerEl.value?.querySelector(`.home-svg .fig.kid[data-kid="${kidId}"]`) as SVGGElement | null
}

function floatAt(x: number, y: number, text: string, color: string) {
  const fx = innerEl.value?.querySelector('.home-svg .fx-layer')
  if (!fx) return
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  t.setAttribute('x', String(x))
  t.setAttribute('y', String(y))
  t.setAttribute('text-anchor', 'middle')
  t.setAttribute('class', 'float-pt')
  t.setAttribute('fill', color)
  t.setAttribute('stroke', '#fff')
  t.setAttribute('stroke-width', '4')
  t.setAttribute('paint-order', 'stroke')
  t.textContent = text
  fx.appendChild(t)
  setTimeout(() => t.remove(), 1300)
}

function walkTo(k: Kid | null | undefined, room: string, idx = 0) {
  if (!k || !SPOTS[room]) return
  const el = figEl(k.id)
  const sp = SPOTS[room][idx || 0]
  kidRoom[k.id] = room
  kidSpot[k.id] = idx || 0
  if (!el) return
  el.classList.add('walking')
  el.style.transform = `translate(${sp[0]}px,${sp[1]}px)`
  const anyEl = el as any
  clearTimeout(anyEl._w)
  anyEl._w = setTimeout(() => el.classList.remove('walking'), 1900)
}

function onCheck(h: { kid: string; dim: keyof typeof DIM }, done: boolean) {
  const k = kidById(data.state, h.kid)
  if (!k) return
  const room = DIM[h.dim].room
  drawHome(true)
  if (done) {
    walkTo(k, room)
    const sp = SPOTS[room][0]
    setTimeout(
      () => {
        floatAt(sp[0], sp[1] - 120, '+1 ' + DIM[h.dim].t, DIM[h.dim].color)
        const f = figEl(k.id)
        if (f) {
          f.classList.add('jump')
          setTimeout(() => f.classList.remove('jump'), 1100)
        }
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500
    )
    const ds = dayStats(data.state, k.id, todayStr())
    if (ds.n && ds.done === ds.n)
      setTimeout(() => {
        confetti()
        ui.toast(k.name + ' 今天的成长清单全部完成！')
      }, 1700)
  }
}

function refresh() {
  drawHome(true)
}

/* ---------------- 交互：拖动 / 缩放 / 点击 ---------------- */
interface DownState {
  x: number
  y: number
  vx: number
  vy: number
  id: number
  moved: boolean
  fig: Element | null
  room: Element | null
  sact: Element | null
}
const down = ref<DownState | null>(null)
const lastAct = ref(0)
const hoverEl = ref<Element | null>(null)

function onWheel(e: WheelEvent) {
  const st = stageEl.value
  if (!st) return
  const r = st.getBoundingClientRect()
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top)
  else {
    view.x -= e.deltaX
    view.y -= e.deltaY
    view.fit = false
    applyView()
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  lastAct.value = Date.now()
  const t = e.target as Element
  down.value = {
    x: e.clientX,
    y: e.clientY,
    fig: t.closest('.fig'),
    room: t.closest('.room-hit, .room-tag'),
    sact: t.closest('[data-sact]'),
    moved: false,
    vx: view.x,
    vy: view.y,
    id: e.pointerId
  }
}

function onPointerMove(e: PointerEvent) {
  const d = down.value
  if (!d) return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
    d.moved = true
    hideCard()
    try {
      stageEl.value?.setPointerCapture(d.id)
    } catch {
      /* ignore */
    }
    stageEl.value?.classList.add('panning')
  }
  if (d.moved) {
    view.x = d.vx + dx
    view.y = d.vy + dy
    view.fit = false
    applyView()
  }
}

async function onPointerUp(e: PointerEvent) {
  const d = down.value
  if (!d) return
  down.value = null
  stageEl.value?.classList.remove('panning')
  try {
    stageEl.value?.releasePointerCapture(d.id)
  } catch {
    /* ignore */
  }
  if (d.moved || e.type === 'pointercancel') return
  clearTimeout(cardTimer)
  if (d.fig) {
    if (d.fig.classList.contains('kid')) {
      const id = d.fig.getAttribute('data-kid') || ''
      if (id !== data.state.settings.cur) {
        data.setCur(id)
        data.save()
        drawHome(true)
        const f = figEl(id)
        if (f) {
          f.classList.add('jump')
          setTimeout(() => f.classList.remove('jump'), 1100)
        }
        return
      }
      await showCard(d.fig, { type: 'kid', id })
    } else {
      const idx = +(d.fig.getAttribute('data-fig') || 'parent0').slice(-1)
      await showCard(d.fig, { type: 'parent', idx })
    }
    return
  }
  if (d.sact) {
    hideCard()
    const act = d.sact.getAttribute('data-sact')
    if (act === 'go-study') router.push('/study')
    else if (act === 'go-cal') router.push('/calendar')
    else if (act === 'go-wuyu-de') router.push('/wuyu')
    else if (act === 'go-wuyu-lao') router.push('/wuyu')
    else if (act === 'go-skills') router.push('/skills')
    else if (act === 'go-journal') dialogs.open({ k: 'journal' })
    else if (act === 'go-people') router.push('/people')
    else if (act === 'add-growth') dialogs.open({ k: 'growth' })
    return
  }
  if (d.room) {
    hideCard()
    openRoom(d.room.getAttribute('data-room') || 'living', e.clientX, e.clientY)
  }
}

let cardTimer: any
let hideTimer: any
function scheduleCard(el: Element) {
  clearTimeout(cardTimer)
  clearTimeout(hideTimer)
  cardTimer = setTimeout(() => {
    if (down.value || pop.value || picking.value) return
    if (el.classList.contains('parent')) {
      const idx = +(el.getAttribute('data-fig') || 'parent0').slice(-1)
      showCard(el, { type: 'parent', idx })
    } else {
      const id = el.getAttribute('data-kid') || ''
      if (id) showCard(el, { type: 'kid', id })
    }
  }, 240)
}
function scheduleHide() {
  clearTimeout(cardTimer)
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => hideCard(), 180)
}
function onOver(e: MouseEvent) {
  const el = (e.target as Element).closest('.fig')
  if (!el) return
  if (el === hoverEl.value) {
    clearTimeout(hideTimer)
    return
  }
  hoverEl.value = el
  scheduleCard(el)
}
function onOut(e: MouseEvent) {
  const el = (e.target as Element).closest('.fig')
  const rel = e.relatedTarget as Element | null
  if (el && !(rel && el.contains(rel))) {
    hoverEl.value = null
    scheduleHide()
  }
}

/* ---------------- 悬浮卡 ---------------- */
const card = ref<{ type: 'kid' | 'parent'; id?: string; idx?: number } | null>(null)
const cardPos = reactive({ x: 0, y: 0, below: true, ax: 150 })
const cardEl = ref<HTMLElement>()

async function showCard(anchor: Element, payload: { type: 'kid' | 'parent'; id?: string; idx?: number }) {
  card.value = payload
  await nextTick()
  const head = anchor.querySelector('.head') || anchor
  const r = head.getBoundingClientRect()
  const cw = 300
  const ch = cardEl.value?.offsetHeight || 260
  let x = r.left + r.width / 2 - cw / 2
  x = clamp(x, 12, window.innerWidth - cw - 12)
  const below = r.bottom + ch + 16 < window.innerHeight
  let y = below ? r.bottom + 10 : r.top - ch - 10
  if (!below && y < 8) y = 8
  cardPos.x = x
  cardPos.y = y
  cardPos.below = below
  cardPos.ax = clamp(r.left + r.width / 2 - x, 20, cw - 20)
}
function hideCard() {
  card.value = null
}
const cardEnter = () => clearTimeout(hideTimer)
const cardLeave = () => scheduleHide()

/* ---------------- 房间打卡卡片 ---------------- */
const pop = ref<{ room: string; x: number; y: number } | null>(null)
function openRoom(room: string, x: number, y: number) {
  if (!cur.value) return
  pop.value = { room, x, y }
}
function positionPop(el: HTMLElement | null) {
  if (!el || !pop.value) return
  const w = el.offsetWidth
  const h = el.offsetHeight
  el.style.left = clamp(pop.value.x - w / 2, 10, window.innerWidth - w - 10) + 'px'
  el.style.top = (pop.value.y + h + 20 > window.innerHeight ? pop.value.y - h - 14 : pop.value.y + 14) + 'px'
}
function onPopOpen(o: Occurrence) {
  hidePop()
  dialogs.open({ k: 'event', ev: o.ev, ds: o.ds })
}
function hidePop() {
  pop.value = null
}
function onDocClick(e: MouseEvent) {
  const t = e.target as Element
  if (pop.value && !t.closest('.pop') && !t.closest('.room-hit') && !t.closest('.fig')) hidePop()
  if (card.value && !t.closest('#hcard')) hideCard()
}

/* ---------------- 今天玩什么 ---------------- */
const picking = ref(false)
const pick = ref<{ text: string; spin: boolean; idea: string } | null>(null)

function closePick() {
  pick.value = null
  picking.value = false
}

function dice() {
  const k = cur.value
  if (!k || picking.value) return
  hideCard()
  hidePop()
  const pool = FAMILY_IDEAS[k.stage] || FAMILY_IDEAS.p1
  picking.value = true
  const chosen = pool[Math.floor(Math.random() * pool.length)]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const steps = reduced ? 1 : 12
  let i = 0
  let delay = 60
  const step = () => {
    if (i < steps - 1) {
      pick.value = { text: pool[Math.floor(Math.random() * pool.length)], spin: true, idea: '' }
      i++
      delay *= 1.17
      setTimeout(step, delay)
    } else {
      picking.value = false
      pick.value = { text: chosen, spin: false, idea: chosen }
      walkTo(k, 'living')
      const f = figEl(k.id)
      if (f) {
        f.classList.add('wave')
        setTimeout(() => f.classList.remove('wave'), 2200)
      }
    }
  }
  step()
}

function diceAdd() {
  const k = cur.value
  if (!k || !pick.value) return
  const dd = new Date()
  const h = Math.min(21, dd.getHours() + 1)
  data.state.events.push({
    id: uid('e'),
    kid: k.id,
    type: 'family',
    title: pick.value.text,
    date: todayStr(),
    start: pad2(h) + ':00',
    endT: pad2(Math.min(23, h + 1)) + ':00',
    repeat: 'none',
    until: '',
    place: '',
    note: '',
    list: [],
    done: {},
    skip: {},
    review: '',
    fav: '',
    rating: 0
  } as any)
  data.save()
  closePick()
  refresh()
  ui.toast('已加入今天 ' + pad2(h) + ':00 的亲子时光')
}

/* ---------------- 睡前小结 ---------------- */
const sleep = ref(false)
const sleepMood = ref('happy')
const sleepText = ref('')
const tomorrow = computed(() => (cur.value ? occOn(data.state, addDays(todayStr(), 1), cur.value.id).slice(0, 5) : []))
function openSleep() {
  sleepMood.value = 'happy'
  sleepText.value = ''
  sleep.value = true
}
function saveSleep() {
  const k = cur.value
  if (!k) return
  const txt = sleepText.value.trim()
  data.state.journal.push({
    id: uid('j'),
    kid: k.id,
    date: todayStr(),
    mood: sleepMood.value,
    text: txt || '今天完成了 ' + dayStats(data.state, k.id, todayStr()).done + ' 项成长清单。',
    dim: '',
    first: false,
    t: Date.now()
  })
  data.save()
  sleep.value = false
  mode.value = 'today'
  walkTo(k, 'bedroom')
  refresh()
  ui.toast('晚安，' + k.name)
}

/* ---------------- Dock ---------------- */
const dockSub = computed(() => {
  const k = cur.value
  if (!k) return null
  const t = todayStr()
  if (mode.value === 'today') {
    const ds = dayStats(data.state, k.id, t)
    const next = upcoming(data.state, k.id, 1).filter((o) => o.type !== 'bday' && occState(o) !== 'past' && !o.done)[0]
    return { kind: 'today' as const, ds, next }
  }
  if (mode.value === 'week') {
    const lows = DIMS.map((dm) => ({ d: dm, r: weekStat(k.id, dm.id) }))
      .filter((x) => x.r.n)
      .sort((a, b) => (a.r.rate || 0) - (b.r.rate || 0))
    return { kind: 'week' as const, low: lows[0] }
  }
  return { kind: 'night' as const }
})
function weekStat(kid: string, dim: string) {
  return weekStats(data.state, kid, todayStr(), dim)
}

/* ---------------- 顶部孩子条 ---------------- */
const kidBarStatus = computed(() => {
  const k = cur.value
  if (!k) return null
  const m = latestMood(data.state, k.id)
  const ds = dayStats(data.state, k.id, todayStr())
  return { m, ds }
})

/* ---------------- 生命周期 ---------------- */
let idleTimer: any
let clockTimer: any
let lastTod = currentTod()

function idleTick() {
  if (!data.state.settings.anim) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (document.hidden || down.value || picking.value || pop.value) return
  if (Date.now() - lastAct.value < 8000) return
  const kids = (cur.value ? [cur.value] : []).concat(data.state.kids.filter((x) => x !== cur.value).slice(0, 2))
  if (!kids.length) return
  const r = Math.random()
  const k = kids[Math.floor(Math.random() * kids.length)]
  const el = figEl(k.id)
  if (!el || el.matches(':hover')) return
  if (r < 0.35) walkTo(k, kidRoom[k.id] || 'living', ((kidSpot[k.id] || 0) + 1 + Math.floor(Math.random() * 2)) % 3)
  else if (r < 0.5) {
    const rooms = Object.keys(SPOTS)
    walkTo(k, rooms[Math.floor(Math.random() * rooms.length)], Math.floor(Math.random() * 2))
  } else if (r < 0.7) {
    el.classList.add('wave')
    setTimeout(() => el.classList.remove('wave'), 2200)
  } else if (r < 0.8) {
    el.classList.add('jump')
    setTimeout(() => el.classList.remove('jump'), 1100)
  }
  innerEl.value?.querySelectorAll('.home-svg .pupil').forEach((p) => {
    ;(p as HTMLElement).style.transform = `translateX(${(Math.random() * 3 - 1.5).toFixed(1)}px)`
  })
}

onMounted(() => {
  drawHome()
  document.addEventListener('click', onDocClick)
  idleTimer = setInterval(idleTick, 4200)
  clockTimer = setInterval(() => {
    tickClock()
    const nt = currentTod()
    if (lastTod !== nt) {
      lastTod = nt
      drawHome(true)
    }
  }, 30000)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  clearInterval(idleTimer)
  clearInterval(clockTimer)
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('resize', onResize)
  clearTimeout(cardTimer)
  clearTimeout(hideTimer)
})

let resizeT: any
function onResize() {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (view.fit) fitView()
  }, 120)
}

// 数据变动后重绘（保持视图位置）
let redrawT: any
watch(
  () => data.state,
  () => {
    clearTimeout(redrawT)
    redrawT = setTimeout(() => {
      if (cur.value) drawHome(true)
    }, 60)
  },
  { deep: true }
)
watch(cur, () => {
  Object.keys(kidRoom).forEach((k) => delete kidRoom[k])
  nextTick(() => drawHome())
})

function switchKid(id: string) {
  if (id === data.state.settings.cur) return
  data.setCur(id)
  data.save()
  hidePop()
  hideCard()
  closePick()
  drawHome(true)
  const f = figEl(id)
  if (f) {
    f.classList.add('jump')
    setTimeout(() => f.classList.remove('jump'), 1100)
  }
}

function setMode(m: 'today' | 'week' | 'night') {
  if (m === mode.value) return
  mode.value = m
  hidePop()
  closePick()
  drawHome(true)
  if (m === 'night') openSleep()
}
</script>

<template>
  <div class="home-page">
    <div
      ref="stageEl"
      class="stage"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @mouseover="onOver"
      @mouseout="onOut"
    >
      <div ref="innerEl" class="stage-inner"></div>
    </div>

    <!-- 顶部：孩子切换 -->
    <div class="kid-bar">
      <template v-if="data.state.kids.length">
        <div class="seg kid-seg">
          <button
            v-for="k in data.state.kids"
            :key="k.id"
            :class="{ on: cur && k.id === cur.id }"
            :title="k.name + ' · ' + ageText(k)"
            @click="switchKid(k.id)"
          >
            <span v-html="kidAva(k, 24)"></span>{{ k.name }}
            <small>{{ k.grade || stageOf(k).name }}</small>
          </button>
          <button class="seg-add" title="添加孩子" aria-label="添加孩子" @click="dialogs.open({ k: 'kid' })">
            <Icon name="plus" :size="15" />
          </button>
        </div>
        <button class="cls-gear" title="身高体重、基本信息、成长日记" @click="router.push('/profile')">
          <Icon name="ruler" :size="15" />成长档案
        </button>
        <div v-if="kidBarStatus" class="kid-status">
          <template v-if="kidBarStatus.m">
            <MoodFace :id="kidBarStatus.m.mood" :size="18" />{{ MOOD[kidBarStatus.m.mood]?.t }} ·
          </template>
          {{ ageText(cur) ? ageText(cur) + ' · ' : '' }}今日 {{ kidBarStatus.ds.done }}/{{ kidBarStatus.ds.n }}
        </div>
      </template>
      <button v-else class="btn btn-dark btn-sm" @click="dialogs.open({ k: 'kid' })">
        <Icon name="plus" :size="14" />添加孩子
      </button>
    </div>

    <!-- 右上工具 -->
    <div class="top-tools">
      <button class="btn btn-dark" @click="dice"><Icon name="dice" :size="15" />今天玩什么</button>
      <button class="btn btn-light" @click="dialogs.open({ k: 'journal' })"><Icon name="pen" :size="15" />记一刻</button>
      <div class="zoom">
        <button title="缩小" aria-label="缩小" @click="stageEl && zoomAt(1 / 1.2, stageEl.clientWidth / 2, stageEl.clientHeight / 2)">
          <Icon name="zout" :size="15" />
        </button>
        <button class="zoom-fit" title="恢复默认大小" @click="fitView">适应</button>
        <button title="放大" aria-label="放大" @click="stageEl && zoomAt(1.2, stageEl.clientWidth / 2, stageEl.clientHeight / 2)">
          <Icon name="zin" :size="15" />
        </button>
      </div>
    </div>

    <!-- 底部 -->
    <div v-if="cur" class="dock">
      <div v-if="dockSub" class="subbar">
        <template v-if="dockSub.kind === 'today'">
          <Ring :rate="dockSub.ds.rate" :size="30" :color="kidHex(cur)" :sw="4" />
          <span>今日成长清单 <b class="num">{{ dockSub.ds.done }}/{{ dockSub.ds.n }}</b></span>
          <span v-if="dockSub.next" class="muted">接下来 {{ dockSub.next.start || '' }} {{ dockSub.next.title }}</span>
          <span v-else class="muted">点房间可以打卡，点墙上的板子能打开对应页面</span>
          <button class="btn btn-sm btn-light" @click="dialogs.open({ k: 'journal' })"><Icon name="pen" :size="14" />记一刻</button>
          <button class="btn btn-sm btn-dark" @click="dialogs.open({ k: 'event', preset: { type: 'family' } })">
            <Icon name="plus" :size="14" />安排日程
          </button>
        </template>
        <template v-else-if="dockSub.kind === 'week'">
          <span class="legend-ramp">
            低<i style="background: #f3f3f2"></i><i style="background: #e4e4e1"></i><i style="background: #cfcfcb"></i>高
          </span>
          <span class="muted">房间颜色越深，这一育本周完成得越好</span>
          <span v-if="dockSub.low">本周最少的是 <b :style="{ color: dockSub.low.d.color }">{{ dockSub.low.d.t }} · {{ dockSub.low.d.short }}</b></span>
          <button class="btn btn-sm btn-dark" @click="router.push('/wuyu')"><Icon name="chart" :size="14" />看五育详情</button>
        </template>
        <template v-else>
          <span class="muted">睡前和孩子一起回顾今天，记下开心的事</span>
          <button class="btn btn-sm btn-dark" @click="openSleep"><Icon name="smile" :size="14" />开始今日小结</button>
        </template>
      </div>
      <div class="seg">
        <button v-for="m in HOME_MODES" :key="m.id" :class="{ on: m.id === mode }" @click="setMode(m.id as any)">
          {{ m.t }}
        </button>
      </div>
    </div>

    <!-- 抽点子 -->
    <div v-if="pick" class="pick-card">
      <div class="dice-ico" :class="{ spin: pick.spin }"><Icon name="dice" :size="30" /></div>
      <div>
        <div class="muted" style="font-size: 12px">{{ pick.spin ? '正在挑…' : '今天和' + (cur?.name || '') + '一起' }}</div>
        <div class="idea-t">{{ pick.text }}</div>
        <div v-if="!pick.spin" class="idea-d">{{ stageOf(cur).name }}阶段推荐 · 放下手机，陪 TA 玩 30 分钟</div>
      </div>
      <div v-if="!pick.spin" style="display: flex; flex-direction: column; gap: 6px; margin-left: 10px">
        <button class="btn btn-sm btn-dark" @click="diceAdd"><Icon name="cal" :size="14" />加入今天的日程</button>
        <button class="btn btn-sm btn-light" @click="dice"><Icon name="dice" :size="14" />再换一个</button>
      </div>
      <button class="modal-x" style="align-self: flex-start" aria-label="关闭" @click="closePick"><Icon name="x" /></button>
    </div>

    <!-- 没有孩子 -->
    <div v-if="!cur" class="empty-home">
      <span v-html="adultAvatar({ gender: data.state.settings.parent.gender }, 64)"></span>
      <div>
        <div style="font-weight: 700; font-size: 15px">还没有添加孩子</div>
        <div class="muted" style="font-size: 13px; margin: 2px 0 10px">先选孩子的阶段，填上名字和生日</div>
        <button class="btn btn-sm btn-dark" @click="dialogs.open({ k: 'kid' })"><Icon name="plus" :size="14" />添加孩子</button>
      </div>
    </div>
  </div>

  <!-- 悬浮个人信息卡 -->
  <Teleport to="body">
    <div
      v-if="card"
      id="hcard"
      ref="cardEl"
      class="hcard on"
      :class="cardPos.below ? 'below' : 'above'"
      :style="{ left: cardPos.x + 'px', top: cardPos.y + 'px', '--ax': cardPos.ax + 'px' }"
      @mouseenter="cardEnter"
      @mouseleave="cardLeave"
    >
      <KidCard v-if="card.type === 'kid' && data.state.kids.find((x) => x.id === card!.id)" :kid="data.state.kids.find((x) => x.id === card!.id)!" />
      <ParentCard v-else :idx="card.idx || 0" @dice="hideCard(); dice()" />
    </div>

    <div v-if="pop" :ref="(el) => positionPop(el as HTMLElement)" class="pop room-pop" style="left: 0; top: 0">
      <RoomPop :room="pop.room" @open="onPopOpen" @change="refresh" />
    </div>
  </Teleport>

  <!-- 睡前小结 -->
  <BaseModal v-if="sleep && cur" :title="'睡前小结 · ' + fmtMD(todayStr())" wide @close="sleep = false">
    <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 14px">
      <Ring :rate="dayStats(data.state, cur.id, todayStr()).rate" :size="64" :color="kidHex(cur)" :label="dayStats(data.state, cur.id, todayStr()).done + '/' + dayStats(data.state, cur.id, todayStr()).n" :sw="7" />
      <div>
        <div style="font-weight: 700; font-size: 15px">{{ cur.name }}今天完成了 {{ dayStats(data.state, cur.id, todayStr()).done }} 项</div>
        <div class="muted" style="font-size: 12.5px; margin-top: 2px">
          {{
            DIMS.map((d) => {
              const x = dayStats(data.state, cur!.id, todayStr(), d.id)
              return x.n ? d.t + ' ' + x.done + '/' + x.n : ''
            })
              .filter(Boolean)
              .join(' · ')
          }}
        </div>
      </div>
    </div>
    <div class="field">
      <label>今天的心情</label>
      <div class="mood-pick">
        <button v-for="m in MOODS" :key="m.id" type="button" :class="{ on: sleepMood === m.id }" @click="sleepMood = m.id">
          <MoodFace :id="m.id" :size="26" />{{ m.t }}
        </button>
      </div>
    </div>
    <div class="field">
      <label>今天最开心 / 最有收获的一件事</label>
      <textarea v-model="sleepText" class="ta" placeholder="让孩子自己说，家长帮忙记下来"></textarea>
    </div>
    <div class="field">
      <label>明天的安排</label>
      <template v-if="tomorrow.length">
        <div v-for="(o, i) in tomorrow" :key="i" style="font-size: 13px; padding: 3px 0">
          <span class="num muted" style="display: inline-block; width: 48px">{{ o.start || '全天' }}</span>{{ o.title }}
        </div>
      </template>
      <div v-else class="muted" style="font-size: 13px">明天没有安排</div>
    </div>
    <div v-if="dayStats(data.state, cur.id, todayStr()).n > dayStats(data.state, cur.id, todayStr()).done" class="muted" style="font-size: 12px">
      还没完成的 {{ dayStats(data.state, cur.id, todayStr()).n - dayStats(data.state, cur.id, todayStr()).done }} 项不用勉强，明天再来。
    </div>
    <template #foot>
      <button class="btn btn-light" @click="sleep = false">先不记</button>
      <button class="btn btn-dark" @click="saveSleep">记下来</button>
    </template>
  </BaseModal>

  <!-- 右侧栏 -->
  <Teleport v-if="data.curKid" to="#rail" defer>
    <HomeRail />
  </Teleport>
</template>

<style scoped lang="scss">
.home-page {
  position: absolute;
  inset: 0;
  background: radial-gradient(1200px 700px at 50% 40%, #fafaf9 0%, #f1f1ef 60%, #ebebe9 100%);
}
.home-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#dcdcd9 1px, transparent 1px);
  background-size: 22px 22px;
  opacity: 0.45;
  pointer-events: none;
}
.stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: default;
  &.panning {
    cursor: grabbing;
  }
}
.stage-inner {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  will-change: transform;
}
.top-tools {
  position: absolute;
  right: 16px;
  top: 12px;
  z-index: 6;
  display: flex;
  gap: 8px;
  align-items: center;
}
.zoom {
  display: inline-flex;
  background: #fff;
  border-radius: 999px;
  box-shadow: 0 0 0 1px var(--line2);
  button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    color: var(--ink2);
    border-radius: 999px;
    &:hover {
      color: var(--ink);
      background: var(--fill);
    }
    &.zoom-fit {
      width: auto;
      padding: 0 10px;
      font-size: 12.5px;
    }
  }
}
.kid-bar {
  position: absolute;
  left: 16px;
  top: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 460px);
}
.kid-seg {
  background: #fff;
  box-shadow: 0 0 0 1px var(--line2), 0 2px 8px rgba(0, 0, 0, 0.03);
  overflow-x: auto;
  scrollbar-width: none;
  flex: 0 1 auto;
  &::-webkit-scrollbar {
    display: none;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 30px;
    padding: 0 12px 0 4px;
    small {
      font-size: 11.5px;
      opacity: 0.65;
      font-weight: 400;
    }
  }
}
.seg-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--ink2);
  font-size: 13px;
  &:hover {
    background: var(--fill);
    color: var(--ink);
  }
  svg {
    width: 15px;
    height: 15px;
  }
}
.cls-gear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--line2), 0 2px 8px rgba(0, 0, 0, 0.03);
  font-size: 12.5px;
  color: var(--ink2);
  white-space: nowrap;
  &:hover {
    color: var(--ink);
    box-shadow: 0 0 0 1px #cfcfcc, 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  svg {
    width: 15px;
    height: 15px;
  }
}
.kid-status {
  font-size: 12.5px;
  color: var(--ink2);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  box-shadow: 0 0 0 1px var(--line2);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  flex: none;
}
.dock {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  .seg {
    background: #fff;
    box-shadow: var(--sh-card), 0 0 0 1px var(--line);
    padding: 4px;
    button {
      height: 32px;
      padding: 0 16px;
      font-size: 13.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }
}
.subbar {
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--sh-card), 0 0 0 1px var(--line);
  padding: 7px 8px 7px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  white-space: nowrap;
  animation: pop 0.18s ease-out;
  b {
    font-weight: 600;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
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
.pick-card {
  position: absolute;
  left: 50%;
  top: 64px;
  transform: translateX(-50%);
  z-index: 8;
  background: #fff;
  border-radius: 18px;
  box-shadow: var(--sh-pop);
  padding: 14px 22px 14px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  animation: pop 0.25s ease-out;
  .idea-t {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 1px;
    line-height: 1.2;
  }
  .idea-d {
    font-size: 12.5px;
    color: var(--ink2);
    margin-top: 3px;
    max-width: 320px;
  }
  .dice-ico {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: var(--fill);
    flex: none;
    &.spin svg {
      animation: spin 0.5s linear infinite;
    }
  }
}
.empty-home {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  z-index: 7;
  background: #fff;
  border-radius: 18px;
  box-shadow: var(--sh-pop);
  padding: 18px 22px 18px 18px;
  display: flex;
  gap: 14px;
  align-items: center;
  animation: pop 0.25s ease-out;
}
@media (max-width: 1440px) {
  .top-tools {
    right: 112px;
  }
}
</style>
