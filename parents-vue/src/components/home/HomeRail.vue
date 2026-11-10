<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DIMS, MOOD, REL } from '@/data/constants'
import { dayLabel, fmtMD, todayStr, uid, WEEK } from '@/lib/date'
import { bdaysOf, checkVal, dayStats, isDone, latestMood, occOn, readMinutes, relOf, stageOf, weekStats, ageText } from '@/lib/query'
import { personAva } from '@/lib/avatar'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import CkRow from '@/components/ui/CkRow.vue'
import OccRow from '@/components/ui/OccRow.vue'
import MoodFace from '@/components/ui/MoodFace.vue'
import Icon from '@/components/ui/Icon.vue'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()
const router = useRouter()

const t = todayStr()
const d = new Date()
const k = computed(() => data.curKid!)
const ds = computed(() => dayStats(data.state, k.value.id, t))
const ws = computed(() => weekStats(data.state, k.value.id, t))
const rm = computed(() => readMinutes(data.state, k.value.id, t.slice(0, 8) + '01', t))
const sorted = computed(() =>
  ds.value.due
    .slice()
    .sort((a, b) => (isDone(a, checkVal(data.state, k.value.id, t, a.id)) ? 1 : 0) - (isDone(b, checkVal(data.state, k.value.id, t, b.id)) ? 1 : 0))
)
const occ = computed(() => occOn(data.state, t, k.value.id))
const bds = computed(() => bdaysOf(data.state, k.value.id, 30))
const m = computed(() => latestMood(data.state, k.value.id))
const todoNew = ref('')

const hdrMeta = computed(() =>
  [k.value.name, ageText(k.value), k.value.grade || stageOf(k.value).name].filter(Boolean).join(' · ')
)

function toggleTodo(id: string) {
  const x = data.state.todos.find((q) => q.id === id)
  if (x) {
    x.done = !x.done
    data.save()
  }
}
function delTodo(id: string) {
  data.state.todos = data.state.todos.filter((q) => q.id !== id)
  data.save()
}
function addTodo() {
  const v = todoNew.value.trim()
  if (!v) return
  data.state.todos.push({ id: uid('t'), text: v, done: false })
  data.save()
  todoNew.value = ''
}
function greet(personId: string) {
  router.push({ path: '/people', query: { person: personId } })
}
</script>

<template>
  <div class="rail-sec">
    <div class="rail-k">今天</div>
    <div class="rail-date">{{ d.getMonth() + 1 }}月{{ d.getDate() }}日 星期{{ WEEK[d.getDay()] }}</div>
    <div class="muted" style="font-size: 12px; margin-top: 2px">{{ hdrMeta }}</div>
    <div class="trio">
      <div><b>{{ ds.done }}/{{ ds.n }}</b><span>今日清单</span></div>
      <div><b>{{ ws.rate === null ? '—' : Math.round(ws.rate * 100) + '%' }}</b><span>本周完成</span></div>
      <div><b>{{ rm }}</b><span>本月阅读分钟</span></div>
    </div>
  </div>

  <div class="rail-sec">
    <div class="rail-k">今日成长清单<button @click="router.push('/wuyu')">全部</button></div>
    <div v-if="!ds.n" class="muted" style="font-size: 12.5px; margin-top: 4px">
      今天没有打卡项 · <a href="#" @click.prevent="router.push('/wuyu')">去添加</a>
    </div>
    <template v-else>
      <div class="ck-list">
        <CkRow v-for="h in sorted.slice(0, 8)" :key="h.id" :habit="h" :ds="t" @change="() => {}" />
      </div>
      <div v-if="sorted.length > 8" class="muted" style="font-size: 12px; padding: 4px 6px">
        还有 {{ sorted.length - 8 }} 项，点房间或到五育打卡查看
      </div>
    </template>
  </div>

  <div class="rail-sec">
    <div class="rail-k">今日日程<button @click="router.push('/calendar')">日历</button></div>
    <div v-if="occ.length" class="mini-list">
      <OccRow v-for="(o, i) in occ" :key="i" :occ="o" @open="(x) => dialogs.open({ k: 'event', ev: x.ev, ds: x.ds })" @toggle="(x) => dialogs.open({ k: 'event', ev: x.ev, ds: x.ds })" />
    </div>
    <div v-else class="muted" style="font-size: 12.5px; margin-top: 4px">
      今天没有日程 · <a href="#" @click.prevent="dialogs.open({ k: 'event', preset: {} })">安排一个</a>
    </div>
  </div>

  <div v-if="bds.length" class="rail-sec">
    <div class="rail-k">朋友生日提醒<button @click="router.push('/people')">关系网</button></div>
    <div class="mini-list">
      <div v-for="b in bds.slice(0, 4)" :key="b.p.id" class="bd-row">
        <span v-html="personAva(b.p, 30)"></span>
        <span class="grow">
          <b style="font-weight: 600">{{ b.p.name }}</b>
          <span class="muted" style="font-size: 11.5px">{{ b.p.label || relOf(b.p.rel).t }}</span><br />
          <span class="when">{{ b.days === 0 ? '今天' : b.days === 1 ? '明天' : b.days + ' 天后' }}</span>
          <span class="muted" style="font-size: 11.5px"> · {{ fmtMD(b.date) }}{{ b.age ? ' · ' + b.age + ' 岁' : '' }}</span>
        </span>
        <span v-if="b.greeted" class="tag green">已祝贺</span>
        <button v-else class="btn btn-xs btn-light" @click="greet(b.p.id)"><Icon name="gift" :size="13" />提醒祝贺</button>
      </div>
    </div>
  </div>

  <div class="rail-sec">
    <div class="rail-k">最近的情况<button @click="dialogs.open({ k: 'journal' })">记一刻</button></div>
    <div v-if="m" class="status-card">
      <div class="meta">
        <MoodFace :id="m.mood" :size="16" />{{ MOOD[m.mood]?.t }} · {{ dayLabel(m.date) }}
        <span v-if="m.first" class="tag first-tag" style="height: 18px; font-size: 11px">第一次</span>
      </div>
      {{ m.text }}
    </div>
    <div v-else class="muted" style="font-size: 12.5px; margin-top: 4px">
      还没有记录。孩子说的一句话、一次第一次，都值得记下来
    </div>
  </div>

  <div class="rail-sec">
    <div class="rail-k">本周五育<button @click="router.push('/wuyu')">详情</button></div>
    <div class="rail-dims">
      <div v-for="dm in DIMS" :key="dm.id" :title="dm.name + '：本周 ' + weekStats(data.state, k.id, t, dm.id).done + '/' + weekStats(data.state, k.id, t, dm.id).n">
        <div class="bar">
          <i
            :style="{
              height: Math.round((weekStats(data.state, k.id, t, dm.id).rate || 0) * 100) + '%',
              background: dm.color
            }"
          ></i>
        </div>
        <b>{{ weekStats(data.state, k.id, t, dm.id).rate === null ? '—' : Math.round((weekStats(data.state, k.id, t, dm.id).rate || 0) * 100) }}</b>{{ dm.t }}
      </div>
    </div>
  </div>

  <div class="rail-sec">
    <div class="rail-k">家长备忘</div>
    <label v-for="x in data.state.todos" :key="x.id" class="todo" :class="{ done: x.done }">
      <input type="checkbox" :checked="x.done" @change="toggleTodo(x.id)" />
      <span>{{ x.text }}</span>
      <button class="x" aria-label="删除" @click.prevent="delTodo(x.id)">×</button>
    </label>
    <div class="todo-add">
      <input v-model="todoNew" class="inp" placeholder="添加一件要做的事" @keydown.enter.prevent="addTodo" />
      <button class="btn btn-sm btn-dark btn-icon" aria-label="添加" style="width: 32px; height: 32px" @click="addTodo">
        <Icon name="plus" :size="15" />
      </button>
    </div>
  </div>

  <div class="privacy">
    <Icon name="lock" :size="14" />
    <span>数据只保存在这台电脑的浏览器里</span>
    <button @click="router.push({ path: '/settings', query: { sec: 'data' } })">备份</button>
  </div>
</template>

<style scoped lang="scss">
.rail-sec {
  padding: 0 0 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
  &:last-child {
    border-bottom: 0;
  }
}
.rail-k {
  font-size: 12px;
  color: var(--ink3);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  button {
    font-size: 12px;
    color: var(--ink2);
    &:hover {
      color: var(--ink);
    }
  }
}
.rail-date {
  font-size: 17px;
  font-weight: 700;
}
.trio {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 0 0 1px var(--line);
  padding: 12px 0;
  margin-top: 10px;
  > div {
    text-align: center;
    position: relative;
    & + div::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background: var(--line);
    }
  }
  b {
    display: block;
    font-size: 18px;
    font-family: var(--num);
    font-weight: 650;
    line-height: 1.3;
  }
  span {
    font-size: 11.5px;
    color: var(--ink3);
  }
}
.ck-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  :deep(.ck) {
    background: transparent;
    padding: 6px 6px;
    &:hover {
      background: #ededeb;
    }
  }
}
.mini-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}
.bd-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 6px;
  border-radius: 10px;
  font-size: 13px;
  span > b {
    font-weight: 600;
  }
  &:hover {
    background: #ededeb;
  }
  .grow {
    flex: 1;
    min-width: 0;
    line-height: 1.35;
  }
  .when {
    font-size: 11.5px;
    color: var(--bd);
    font-weight: 600;
  }
}
.status-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 0 0 1px var(--line);
  padding: 12px 14px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.65;
  .meta {
    font-size: 11.5px;
    color: var(--ink3);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
}
.rail-dims {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-top: 8px;
  > div {
    text-align: center;
    font-size: 11px;
    color: var(--ink3);
  }
  .bar {
    height: 46px;
    border-radius: 8px;
    background: var(--fill);
    position: relative;
    overflow: hidden;
    margin-bottom: 4px;
    i {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 8px;
    }
  }
  b {
    display: block;
    font-family: var(--num);
    font-size: 12px;
    color: var(--ink);
    font-weight: 650;
  }
}
.todo {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 6px 4px;
  font-size: 13px;
  border-radius: 8px;
  &:hover {
    background: #ededeb;
  }
  input {
    margin-top: 3px;
    accent-color: var(--ink);
    width: 15px;
    height: 15px;
    flex: none;
  }
  &.done span {
    color: var(--ink3);
    text-decoration: line-through;
  }
  .x {
    margin-left: auto;
    color: var(--ink3);
    opacity: 0;
    font-size: 15px;
    line-height: 1;
    padding: 2px 4px;
  }
  &:hover .x {
    opacity: 1;
  }
}
.todo-add {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  .inp {
    height: 32px;
    font-size: 13px;
    background: #ebebea;
  }
}
.privacy {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--ink3);
  background: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 0 0 1px var(--line);
  button {
    color: var(--ink);
    font-weight: 500;
    margin-left: auto;
    font-size: 12px;
    white-space: nowrap;
  }
}
.first-tag {
  background: linear-gradient(90deg, #ffe08a, #ffc75a);
  color: #7a4a00;
}
</style>
