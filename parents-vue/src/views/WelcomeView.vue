<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import MoodFace from '@/components/ui/MoodFace.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AccountForm from '@/components/account/AccountForm.vue'
import { MOODS, STAGE, STAGES } from '@/data/constants'
import { defaultState, demoState, setupKid } from '@/data/demo'
import { adultAvatar, kidFigure } from '@/art/home'
import { brandMark } from '@/lib/avatar'
import { todayStr, uid } from '@/lib/date'
import { round1 } from '@/lib/date'
import { useAuth } from '@/stores/auth'
import { useData, type AttachResult } from '@/stores/data'
import { useUi } from '@/stores/ui'
import type { Kid } from '@/types'

const data = useData()
const auth = useAuth()
const ui = useUi()
const router = useRouter()

/** 已有账号的用户（换电脑 / 清空过浏览器数据）从这里把云端记录接回来 */
const loginOpen = ref(false)

async function onLoginDone(result: AttachResult) {
  if (result === 'pulled') {
    loginOpen.value = false
    ui.toast('已从云端载入记录')
    router.push('/home')
    return
  }
  if (result === 'pushed') {
    loginOpen.value = false
    router.push('/home')
    return
  }
  if (result === 'empty') {
    loginOpen.value = false
    ui.toast('登录成功，这个账号还没有记录，按下面的步骤开始就好', 2600)
  }
  // fail 保持弹窗，AccountForm 已经在内部给出提示
}

const W = reactive({
  step: 1,
  pg: 'F' as 'F' | 'M',
  mode: 'mine' as 'mine' | 'demo',
  stage: 'p1',
  kg: 'F' as 'F' | 'M',
  name: '',
  kn: '',
  kb: '',
  kh: '',
  kw: '',
  ks: '',
  kgr: '',
  kr: '',
  mood: 'happy'
})

const steps = computed(() => (W.mode === 'demo' ? 2 : 3))
const stage = computed(() => STAGE[W.stage])
const parentName = computed(() => W.name.trim() || (W.pg === 'F' ? '妈妈' : '爸爸'))

function setPg(g: 'F' | 'M') {
  if (!W.name || W.name === '妈妈' || W.name === '爸爸') W.name = g === 'F' ? '妈妈' : '爸爸'
  W.pg = g
}
function setMode(m: 'mine' | 'demo') {
  W.mode = m
}
function setStage(id: string) {
  W.stage = id
  W.kgr = ''
}

/** 阶段小人 */
function stageFig(id: string, g: string): string {
  const sc: Record<string, number> = { k: 0.78, p1: 0.9, p2: 1, m: 1.1, h: 1.2 }
  const c: Record<string, string> = { k: '#f2b01e', p1: '#e5483b', p2: '#2f7ff0', m: '#14b0a6', h: '#7a5af5' }
  const prop: Record<string, string> = {
    k: '<circle cx="-42" cy="-14" r="13" fill="#f08a24"/><path d="M-55 -14h26M-42 -27v26" stroke="#c96a24" stroke-width="1.2"/>',
    p1: '<rect x="30" y="-30" width="22" height="28" rx="3" fill="#2f7ff0"/><rect x="33" y="-26" width="16" height="4" rx="2" fill="#fff" opacity=".6"/>',
    p2: '<path d="M38 -98 l14 -10 l8 14 l-14 10z" fill="#e2569a"/><path d="M40 -90 C 34 -60 30 -40 20 -48" stroke="#9a9a97" fill="none" stroke-width="1"/>',
    m: '<circle cx="44" cy="-14" r="13" fill="#f08a24"/><path d="M31 -14h26M44 -27v26M35 -23q9 9 0 18M53 -23q-9 9 0 18" stroke="#a85618" stroke-width="1" fill="none"/>',
    h: '<rect x="32" y="-12" width="30" height="8" rx="1.5" fill="#e5483b"/><rect x="34" y="-20" width="26" height="8" rx="1.5" fill="#2f7ff0"/><rect x="31" y="-28" width="29" height="8" rx="1.5" fill="#f2b01e"/>'
  }
  const s = sc[id] || 1
  return (
    '<svg viewBox="-66 -140 132 148" width="132" height="148" aria-hidden="true"><ellipse cx="-3" cy="2" rx="' +
    26 * s +
    '" ry="5" fill="#000" opacity=".12"/>' +
    (prop[id] || '') +
    '<g transform="scale(' +
    s +
    ')">' +
    kidFigure({ id: 'w' + id + g, gender: g }, c[id]) +
    '</g></svg>'
  )
}

const avaF = adultAvatar({ gender: 'F' }, 96, false)
const avaM = adultAvatar({ gender: 'M' }, 96, false)

function back() {
  W.step = Math.max(1, W.step - 1)
}
function next() {
  W.step++
}

/** 生成初始数据并进入工作台 */
function go() {
  if (W.mode === 'demo') {
    const s = demoState(W.stage, W.kg, W.pg)
    if (W.name && W.name !== '妈妈' && W.name !== '爸爸') s.settings.parent.name = W.name
    s.settings.onboarded = true
    data.replaceAll(s)
    ui.toast('这是示例家庭，随时可以在设置里清空')
    router.push('/home')
    return
  }

  if (!W.kn.trim()) {
    ui.toast('写一下孩子的名字')
    return
  }

  const s = defaultState()
  s.settings.parent = { name: parentName.value, gender: W.pg }
  s.settings.partner = { show: false, name: W.pg === 'F' ? '爸爸' : '妈妈', gender: W.pg === 'F' ? 'M' : 'F' }
  const k: Kid = {
    id: uid('k'),
    name: W.kn.trim(),
    gender: W.kg,
    birthday: W.kb || '',
    stage: W.stage as Kid['stage'],
    school: W.ks.trim(),
    grade: W.kgr || stage.value.grades[0],
    cls: '',
    teacher: '',
    interests: '',
    personality: '',
    health: '',
    note: '',
    color: 0,
    tags: []
  }
  s.kids.push(k)
  setupKid(s, k)
  s.settings.cur = k.id

  const hh = parseFloat(W.kh)
  const ww = parseFloat(W.kw)
  if (hh > 30 || ww > 2) {
    const g: any = { id: uid('g'), kid: k.id, date: todayStr() }
    if (hh > 30) g.h = round1(hh)
    if (ww > 2) g.w = round1(ww)
    s.growth.push(g)
  }
  if (W.kr.trim() || W.mood) {
    s.journal.push({
      id: uid('j'),
      kid: k.id,
      date: todayStr(),
      mood: W.mood || 'calm',
      text: W.kr.trim() || '开始用学生家长工作台记录成长啦。',
      dim: '',
      first: false,
      t: Date.now()
    })
  }
  s.settings.onboarded = true
  data.replaceAll(s)
  router.push('/home')
  window.setTimeout(() => ui.toast('已按' + stage.value.name + '阶段开好了推荐的打卡项', 3000), 600)
}
</script>

<template>
  <div class="welcome">
    <div class="welcome-in">
      <div class="w-lede">
        <span class="w-brand" v-html="brandMark"></span>
      </div>
      <div class="w-steps">
        <i v-for="i in steps" :key="i" :class="{ on: i <= W.step }"></i>
      </div>

      <!-- 第一步 -->
      <template v-if="W.step === 1">
        <h1>你好，这是你的学生家长工作台</h1>
        <p class="lead">记录孩子德智体美劳的每一点成长。先告诉我，你是孩子的……</p>
        <div class="w-avatars">
          <button :class="{ on: W.pg === 'F' }" @click="setPg('F')">
            <span class="circle" v-html="avaF"></span>妈妈
          </button>
          <button :class="{ on: W.pg === 'M' }" @click="setPg('M')">
            <span class="circle" v-html="avaM"></span>爸爸
          </button>
        </div>
        <div class="muted tip">家里只出现你选的这一位，另一位家长以后可以在「设置 → 家庭」里加上</div>
        <div class="w-name field">
          <label>怎么称呼你</label>
          <input v-model="W.name" class="inp" :placeholder="W.pg === 'F' ? '妈妈' : '爸爸'" />
        </div>
        <div class="w-mode">
          <button :class="{ on: W.mode === 'mine' }" @click="setMode('mine')">
            <b>记录我的孩子</b>选阶段，填上名字、身高和最近的情况就能开始
          </button>
          <button :class="{ on: W.mode === 'demo' }" @click="setMode('demo')">
            <b>先看看示例</b>按你选的阶段生成一个虚拟的两孩家庭，随时可以清空
          </button>
        </div>
        <div class="w-restore">
          <button class="btn btn-ghost btn-sm" @click="loginOpen = true">
            <Icon name="refresh" :size="14" />已有账号，登录载入云端记录
          </button>
          <span v-if="auth.lastUser" class="muted">
            这台电脑之前用过账号 <b>{{ auth.lastUser }}</b>，登录后云端记录会覆盖这里的空白数据
          </span>
          <span v-else class="muted">换过电脑、或清空过浏览器数据？登录就能把记录接回来</span>
        </div>
        <div class="w-nav">
          <button class="btn btn-dark w-go" @click="next">下一步</button>
        </div>
      </template>

      <!-- 第二步 -->
      <template v-else-if="W.step === 2">
        <h1>孩子现在在哪个阶段？</h1>
        <p class="lead">每个阶段推荐的打卡项、技能挑战和出游点子都不一样，之后也可以改</p>
        <div class="seg light kg-seg">
          <button :class="{ on: W.kg === 'F' }" @click="W.kg = 'F'">女孩</button>
          <button :class="{ on: W.kg === 'M' }" @click="W.kg = 'M'">男孩</button>
        </div>
        <div class="stage-cards">
          <button
            v-for="s in STAGES"
            :key="s.id"
            class="stage-card"
            :class="{ on: W.stage === s.id }"
            @click="setStage(s.id)"
          >
            <div class="fig-box" v-html="stageFig(s.id, W.kg)"></div>
            <b>{{ s.name }}</b>
            <span>{{ s.sub }}</span>
            <small>{{ s.focus.split('：')[1] || s.focus }}</small>
          </button>
        </div>
        <div class="w-nav">
          <button class="btn btn-ghost" @click="back">上一步</button>
          <button v-if="W.mode === 'demo'" class="btn btn-dark w-go" @click="go">看看示例</button>
          <button v-else class="btn btn-dark w-go" @click="next">下一步</button>
        </div>
      </template>

      <!-- 第三步 -->
      <template v-else>
        <h1>孩子的基本情况</h1>
        <p class="lead">{{ stage.name }} · 只有名字是必填的，其他之后都能在成长档案里补</p>
        <div class="w-form">
          <div class="field">
            <label>名字 / 小名<span class="req">*</span></label>
            <input v-model="W.kn" class="inp" placeholder="如：朵朵" maxlength="10" />
          </div>
          <div class="field">
            <label>生日</label>
            <AppDatePicker v-model="W.kb" />
          </div>
          <div class="field">
            <label>身高（cm）</label>
            <input v-model="W.kh" class="inp num" inputmode="decimal" placeholder="选填" />
          </div>
          <div class="field">
            <label>体重（kg）</label>
            <input v-model="W.kw" class="inp num" inputmode="decimal" placeholder="选填" />
          </div>
          <div class="field">
            <label>学校</label>
            <input v-model="W.ks" class="inp" placeholder="选填" />
          </div>
          <div class="field">
            <label>年级</label>
            <select v-model="W.kgr" class="sel">
              <option value="">{{ stage.grades[0] }}</option>
              <option v-for="g in stage.grades" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>
        <div class="w-note">
          <div class="field">
            <label>最近的情况</label>
            <div class="mood-pick">
              <button
                v-for="m in MOODS"
                :key="m.id"
                type="button"
                :class="{ on: W.mood === m.id }"
                @click="W.mood = m.id"
              >
                <MoodFace :id="m.id" :size="24" />{{ m.t }}
              </button>
            </div>
            <input v-model="W.kr" class="inp" placeholder="一句话，比如：最近在学骑自行车，有点怕摔" />
          </div>
        </div>
        <div class="w-nav" style="margin-top: 14px">
          <button class="btn btn-ghost" @click="back">上一步</button>
          <button class="btn btn-dark w-go" @click="go">开启成长之家</button>
        </div>
      </template>

      <div class="muted foot-note">
        <Icon name="lock" :size="12" /> 不登录时数据只存在这台电脑的浏览器里；登录后会同步到自己的数据库
      </div>
      <div class="sign">Developed by @沐沐宝贝</div>
    </div>

    <!-- 登录弹窗：清空浏览器数据后从云端找回记录 -->
    <div v-if="loginOpen" class="w-mask" @click.self="loginOpen = false">
      <div class="w-modal">
        <div class="w-modal-head">
          <b>登录已有账号</b>
          <button class="w-x" aria-label="关闭" @click="loginOpen = false">
            <Icon name="x" :size="16" />
          </button>
        </div>
        <p class="muted w-modal-sub">
          登录后会用云端的记录替换这台电脑上的数据，并直接进入工作台。忘记账号的话，可以在原来那台设备上「设置 → 数据与备份」导出文件再导入。
        </p>
        <AccountForm tip="" autofocus @done="onLoginDone" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: radial-gradient(1000px 600px at 50% 30%, #fbfbfa, #f1f1ef);
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
}
.welcome-in {
  text-align: center;
  max-width: 860px;
  width: 100%;
}
h1 {
  font-size: 24px;
  margin: 0 0 6px;
  font-weight: 800;
  letter-spacing: 0.3px;
}
p.lead {
  color: var(--ink2);
  margin: 0 0 26px;
  font-size: 14.5px;
}
.w-lede {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.w-brand :deep(svg) {
  width: 48px;
  height: 48px;
}
.w-steps {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 22px;
  i {
    width: 26px;
    height: 5px;
    border-radius: 3px;
    background: #dcdcd9;
    transition: background 0.2s, width 0.2s;
    &.on {
      background: var(--ink);
      width: 40px;
    }
  }
}
.w-avatars {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-bottom: 22px;
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--ink3);
    .circle {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      background: #fff;
      display: grid;
      place-items: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    &:hover .circle {
      transform: translateY(-3px);
    }
    &.on .circle {
      box-shadow: 0 0 0 2.5px var(--ink), 0 10px 30px rgba(0, 0, 0, 0.08);
    }
    &.on {
      color: var(--ink);
      font-weight: 600;
    }
  }
}
.tip {
  font-size: 12px;
  margin: -6px 0 14px;
}
.w-name {
  max-width: 240px;
  margin: 0 auto 6px;
  text-align: left;
}
.w-mode {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 6px 0 24px;
  flex-wrap: wrap;
  button {
    padding: 12px 16px;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 0 0 1px var(--line);
    font-size: 12.5px;
    color: var(--ink2);
    text-align: left;
    width: 236px;
    line-height: 1.55;
    b {
      display: block;
      color: var(--ink);
      font-size: 14px;
      margin-bottom: 2px;
    }
    &.on {
      box-shadow: 0 0 0 2px var(--ink);
    }
  }
}
.kg-seg {
  margin: -8px 0 18px;
}
.stage-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.stage-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 0 0 1px var(--line), 0 8px 24px rgba(0, 0, 0, 0.04);
  padding: 14px 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 0 1px var(--line2), 0 14px 30px rgba(0, 0, 0, 0.07);
  }
  &.on {
    box-shadow: 0 0 0 2.5px var(--ink), 0 14px 30px rgba(0, 0, 0, 0.08);
  }
  .fig-box {
    height: 150px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 100%;
    background: linear-gradient(#f6f7f9, #fff);
    border-radius: 14px;
    :deep(svg) {
      max-width: 100%;
    }
  }
  b {
    font-size: 15px;
  }
  span {
    font-size: 12px;
    color: var(--ink3);
  }
  small {
    font-size: 11.5px;
    color: var(--ink2);
    line-height: 1.5;
    min-height: 34px;
    padding: 0 4px;
  }
}
.w-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
  text-align: left;
  max-width: 480px;
  margin: 0 auto;
}
.w-note {
  max-width: 480px;
  margin: 4px auto 0;
  text-align: left;
}
.w-nav {
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
}
.w-go {
  height: 44px;
  padding: 0 44px;
  font-size: 15px;
}
.num {
  font-family: var(--num);
}
.foot-note {
  font-size: 12px;
  margin-top: 18px;
  :deep(svg) {
    display: inline-block;
    vertical-align: -2px;
  }
}
.sign {
  padding-top: 22px;
  font-size: 11px;
  color: var(--ink3);
}
.w-restore {
  margin: 20px auto 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  b {
    color: var(--ink);
    font-weight: 700;
  }
}
.w-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(38, 38, 36, 0.34);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 24px;
}
.w-modal {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px;
  padding: 22px 24px 24px;
  text-align: left;
  box-shadow: 0 18px 48px rgba(30, 30, 28, 0.18);
}
.w-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  b {
    font-weight: 800;
  }
}
.w-modal-sub {
  font-size: 12.5px;
  line-height: 1.7;
  margin: 8px 0 16px;
}
.w-x {
  border: 0;
  background: transparent;
  color: var(--ink3);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--ink);
  }
}
@media (max-width: 760px) {
  .stage-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .w-form {
    grid-template-columns: 1fr;
  }
}
</style>
