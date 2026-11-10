<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { EV_TYPES, OUT_LIST } from '@/data/constants'
import { deepClone, fmtMD, todayStr, uid } from '@/lib/date'
import { TITLE_SUG } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Ev, OutListItem } from '@/types'

const props = defineProps<{ ev?: Ev; preset?: Partial<Ev>; ds?: string }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.ev
const ev0: Ev = props.ev
  ? deepClone(props.ev)
  : (Object.assign(
      {
        id: uid('e'),
        kid: data.curKid ? data.curKid.id : '',
        type: 'family',
        title: '',
        date: todayStr(),
        start: '',
        endT: '',
        repeat: 'none',
        until: '',
        place: '',
        note: '',
        list: [] as OutListItem[],
        done: {},
        skip: {},
        review: '',
        fav: '',
        rating: 0
      },
      props.preset || {}
    ) as Ev)

const d = reactive<Ev>(ev0)
if (isNew && d.type === 'outing' && !d.list.length) d.list = OUT_LIST.map((x) => ({ t: x, ok: false }))
if (isNew && d.type === 'outing' && props.preset && props.preset.kid === undefined) d.kid = ''

const occDs = ref(props.ds || (props.ev ? props.ev.date : ''))
const newItem = ref('')
const kidStages = computed(() => (data.curKid ? data.curKid.stage : 'p1'))
const sug = computed<string[]>(() => {
  const s = TITLE_SUG[d.type]
  if (!s) return []
  return Array.isArray(s) ? s : s[kidStages.value] || []
})
const isPast = computed(() => d.date <= todayStr())

function setType(id: Ev['type']) {
  d.type = id
  if (d.type === 'outing' && !d.list.length) d.list = OUT_LIST.map((x) => ({ t: x, ok: false }))
}
function addItem() {
  const v = newItem.value.trim()
  if (!v) return
  d.list.push({ t: v, ok: false })
  newItem.value = ''
}

function save() {
  if (!d.title.trim()) {
    ui.toast('写一下要做什么')
    return
  }
  d.title = d.title.trim()
  if (d.endT && d.start && d.endT <= d.start) d.endT = ''
  if (d.repeat === 'none') d.until = ''
  if (isNew) data.state.events.push(deepClone(d) as Ev)
  else {
    const i = data.state.events.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.events[i] = deepClone(d) as Ev
  }
  data.save(true)
  dialogs.close()
  ui.toast(isNew ? '已加入日历' : '已保存')
}

async function toggleOcc() {
  const ev = data.state.events.find((x) => x.id === d.id)
  if (!ev) return
  const ds = occDs.value
  if (ev.done[ds]) delete ev.done[ds]
  else ev.done[ds] = true
  data.save(true)
  dialogs.close()
}

async function del() {
  const ev = data.state.events.find((x) => x.id === d.id)
  if (!ev) return
  if (ev.repeat !== 'none' && occDs.value) {
    const choice = await ui.confirm(
      '删除「' + ev.title + '」',
      '这是一个重复的日程。<br><br>点「只删这一次」只取消 ' + fmtMD(occDs.value) + '，其他时间照常。',
      '只删 ' + fmtMD(occDs.value),
      true
    )
    if (choice) {
      ev.skip[occDs.value] = true
      data.save(true)
      dialogs.close()
      ui.toast('这一次已取消')
      return
    }
    const all = await ui.confirm('全部删除', '把这个重复日程的所有次数都删掉？', '全部删除', true)
    if (all) {
      data.state.events = data.state.events.filter((x) => x.id !== ev.id)
      data.save(true)
      dialogs.close()
      ui.toast('已删除')
    }
    return
  }
  const ok = await ui.confirm('删除日程', '确定删除「' + ev.title + '」吗？', '删除', true)
  if (!ok) return
  data.state.events = data.state.events.filter((x) => x.id !== ev.id)
  data.save(true)
  dialogs.close()
}
</script>

<template>
  <BaseModal :title="isNew ? '新日程' : '编辑日程'" wide @close="dialogs.close()">
    <div class="field">
      <label>类型</label>
      <div class="chips">
        <button
          v-for="tp in EV_TYPES"
          :key="tp.id"
          type="button"
          :class="{ on: d.type === tp.id }"
          @click="setType(tp.id)"
        >
          <i class="cdot" :style="{ background: tp.color, marginRight: '6px', verticalAlign: '0' }"></i>{{ tp.short }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>做什么<span class="req">*</span></label>
      <input
        v-model="d.title"
        class="inp"
        maxlength="30"
        :placeholder="d.type === 'outing' ? '如：去科技馆' : '如：' + (sug[0] || '一起做晚饭')"
        autofocus
      />
      <div v-if="sug.length" class="chips" style="margin-top: 8px">
        <button v-for="s in sug" :key="s" type="button" @click="d.title = s">{{ s }}</button>
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label>谁</label>
        <select v-model="d.kid" class="sel">
          <option value="">全家</option>
          <option v-for="x in data.state.kids" :key="x.id" :value="x.id">{{ x.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>日期</label>
        <input v-model="d.date" class="inp" type="date" />
      </div>
      <div class="field">
        <label>重复</label>
        <select v-model="d.repeat" class="sel">
          <option value="none">不重复</option>
          <option value="weekly">每周这一天</option>
          <option value="daily">每天</option>
        </select>
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label>开始</label>
        <input v-model="d.start" class="inp num" type="time" />
      </div>
      <div class="field">
        <label>结束</label>
        <input v-model="d.endT" class="inp num" type="time" />
      </div>
      <div v-if="d.repeat !== 'none'" class="field">
        <label>重复到</label>
        <input v-model="d.until" class="inp" type="date" />
        <div class="hint">不填就一直重复</div>
      </div>
    </div>

    <div class="row2">
      <div class="field"><label>地点</label><input v-model="d.place" class="inp" placeholder="选填" /></div>
      <div class="field"><label>备注</label><input v-model="d.note" class="inp" placeholder="选填" /></div>
    </div>

    <template v-if="d.type === 'outing'">
      <div class="hr"></div>
      <div class="row2">
        <div class="field"><label>预算（元）</label><input v-model="d.budget" class="inp num" inputmode="numeric" placeholder="选填" /></div>
        <div></div>
      </div>
      <div class="field">
        <label>出行清单 <span class="muted" style="font-weight: 400">出门前一项项勾掉</span></label>
        <div class="ck-list ev-list">
          <div v-for="(it, i) in d.list" :key="i" class="ck" :class="{ done: it.ok }" style="--c: #f08a24">
            <button type="button" class="box" @click="it.ok = !it.ok">
              <Icon v-if="it.ok" name="check" :size="13" :stroke-width="2.4" />
            </button>
            <span class="nm">{{ it.t }}</span>
            <button type="button" class="btn btn-xs btn-ghost" @click="d.list.splice(i, 1)">×</button>
          </div>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px">
          <input v-model="newItem" class="inp" placeholder="再加一样，如：风筝" style="height: 32px" @keydown.enter.prevent="addItem" />
          <button type="button" class="btn btn-sm btn-light" @click="addItem">添加</button>
        </div>
      </div>
      <div class="field">
        <label>
          玩回来记一笔
          <span v-if="!isPast" class="muted" style="font-weight: 400">（出游当天之后再填）</span>
        </label>
        <div class="row2">
          <input v-model="d.fav" class="inp" placeholder="孩子最喜欢的是…" />
          <div class="chips">
            <button v-for="n in 5" :key="n" type="button" :class="{ on: n <= (d.rating || 0) }" :aria-label="n + ' 星'" @click="d.rating = n">★</button>
          </div>
        </div>
        <textarea
          v-model="d.review"
          class="ta"
          style="margin-top: 8px; min-height: 64px"
          placeholder="这次玩得怎么样、孩子学到了什么"
        ></textarea>
      </div>
    </template>

    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="14" />删除{{ d.repeat !== 'none' ? '…' : '' }}
      </button>
      <button
        v-if="!isNew && d.repeat !== 'none' && occDs"
        class="btn btn-light"
        @click="toggleOcc"
      >
        {{ d.done[occDs] ? '取消完成（' + fmtMD(occDs) + '）' : '这次完成了（' + fmtMD(occDs) + '）' }}
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
