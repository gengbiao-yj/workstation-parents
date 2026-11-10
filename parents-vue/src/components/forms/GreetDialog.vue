<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { REL } from '@/data/constants'
import { giftIdeas, greetLines, greetRemindDate } from '@/art/net'
import { personAva } from '@/lib/avatar'
import { copyText } from '@/lib/download'
import { addDays, fmtMD, parseDate, todayStr, uid, WEEK } from '@/lib/date'
import { bdayAge, kidById, nextBday, personById } from '@/lib/query'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'

const props = defineProps<{ id: string }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const p = computed(() => personById(data.state, props.id))
const k = computed(() => (p.value ? kidById(data.state, p.value.kid) : null))
const nb = computed(() => (p.value ? nextBday(p.value.birthday) : null))
const age = computed(() => (p.value && nb.value ? bdayAge(p.value.birthday, nb.value.date) : null))
const lines = computed(() => (p.value && k.value ? greetLines(k.value, p.value, age.value) : []))
const gifts = computed(() => (p.value && k.value ? giftIdeas(k.value, p.value) : []))

function whenText() {
  if (!nb.value) return ''
  return nb.value.days === 0 ? '今天' : nb.value.days === 1 ? '明天' : `${nb.value.days} 天后`
}

function copy(t: string) {
  copyText(t)
  ui.toast('已复制')
}

function addToCal() {
  if (!p.value || !k.value || !nb.value) return
  const ds = greetRemindDate(nb.value.days, nb.value.date)
  data.state.events.push({
    id: uid('e'),
    kid: p.value.kid,
    type: 'family',
    title: `提醒${k.value.name}：${nb.value.days >= 1 ? '明天' : '今天'}是${p.value.name}的生日`,
    date: ds,
    start: '19:30',
    endT: '',
    repeat: 'none',
    until: '',
    place: '',
    note: '准备祝福或小礼物',
    list: [],
    done: {},
    skip: {},
    fav: '',
    review: '',
    rating: 0,
    budget: ''
  } as any)
  data.save()
  ui.toast(`已在 ${fmtMD(ds)} 19:30 加了提醒`)
}

function markGreeted() {
  if (!p.value || !nb.value) return
  const per = data.state.people.find((x) => x.id === p.value!.id)
  if (per) {
    if (!per.greeted) per.greeted = {}
    per.greeted[nb.value.date.slice(0, 4)] = true
  }
  data.state.journal.push({
    id: uid('j'),
    kid: p.value.kid,
    date: todayStr(),
    mood: 'happy',
    text: `记得祝${p.value.name}生日快乐${k.value ? '，' + k.value.name + '自己准备了祝福' : ''}。`,
    dim: 'de',
    first: false,
    t: Date.now()
  } as any)
  data.save()
  dialogs.close()
  ui.toast('已标记为祝贺过了')
}
</script>

<template>
  <BaseModal v-if="p && k && nb" title="生日祝福" wide @close="dialogs.close()">
    <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px">
      <span v-html="personAva(p, 60)"></span>
      <div>
        <div style="font-size: 17px; font-weight: 800">
          提醒{{ k.name }}：{{ whenText() }}是{{ p.name }}的{{ age ? age + ' 岁' : '' }}生日
        </div>
        <div class="muted" style="font-size: 12.5px; margin-top: 2px">
          {{ fmtMD(nb.date) }} 周{{ WEEK[(parseDate(nb.date) as Date).getDay()] }} · {{ p.label || REL[p.rel].t
          }}<template v-if="p.likes"> · {{ p.likes }}</template>
        </div>
      </div>
    </div>

    <div class="flabel" style="margin-bottom: 8px">可以这样说 / 写在贺卡上</div>
    <div v-for="(l, i) in lines" :key="i" class="greet-box">
      {{ l }}
      <button class="btn btn-xs btn-light" @click="copy(l)"><Icon name="copy" :size="12" />复制</button>
    </div>

    <div class="flabel" style="margin: 16px 0 8px">礼物小点子</div>
    <div class="tags">
      <span v-for="g in gifts" :key="g" class="tag" style="height: 28px; padding: 0 11px; font-size: 12.5px">{{ g }}</span>
    </div>

    <div class="muted" style="font-size: 12px; margin-top: 14px; line-height: 1.7">
      让孩子自己决定说什么、送什么，家长只负责提醒。比礼物更重要的，是孩子学会记得别人、关心别人。
    </div>

    <template #foot>
      <button class="btn btn-light" @click="addToCal"><Icon name="cal" :size="15" />加到日历提醒</button>
      <button class="btn btn-light" @click="$router.push(`/ai?tpl=greet&person=${p.id}`)">
        <Icon name="spark" :size="15" />AI 写一段更特别的
      </button>
      <button class="btn btn-dark" @click="markGreeted"><Icon name="check" :size="15" />已经祝贺了</button>
    </template>
  </BaseModal>
</template>
