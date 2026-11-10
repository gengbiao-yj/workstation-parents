<script setup lang="ts">
import { computed } from 'vue'
import { REL } from '@/data/constants'
import { dayLabel, parseDate, WEEK } from '@/lib/date'
import { bdayAge, kidById, occState } from '@/lib/query'
import type { Occurrence } from '@/types'
import { useData } from '@/stores/data'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{ occ: Occurrence; day?: boolean; showKid?: boolean; noFade?: boolean }>(),
  { day: false, showKid: false, noFade: false }
)
const emit = defineEmits<{ (e: 'open', o: Occurrence): void; (e: 'toggle', o: Occurrence): void }>()
const data = useData()

const stt = computed(() => occState(props.occ))
const sub = computed(() => {
  const o = props.occ
  const out: string[] = []
  if (o.bday) {
    const age = bdayAge(o.bday.birthday, o.ds)
    const owner = kidById(data.state, o.bday.kid)
    out.push((owner ? owner.name + '的' : '') + (o.bday.label || REL[o.bday.rel].t) + (age ? ' · ' + age + ' 岁' : ''))
  } else if (o.kidBday) out.push('过生日啦')
  else if (o.ev) {
    const e = o.ev
    if (e.place) out.push(e.place)
    if (e.repeat === 'weekly') out.push('每周' + WEEK[(parseDate(e.date) as Date).getDay()])
    if (!e.kid) out.push('全家')
    else if (data.state.kids.length > 1 && props.showKid) {
      const k = kidById(data.state, e.kid)
      out.push(k ? k.name : '')
    }
  }
  return out.join(' · ')
})
</script>

<template>
  <button
    class="occ"
    :class="{ past: stt === 'past' && !noFade, now: stt === 'now' }"
    @click="emit('open', occ)"
  >
    <span class="tm">
      <b>{{ occ.start || '全天' }}</b>
      {{ occ.endT ? occ.endT : day ? dayLabel(occ.ds) : '' }}
    </span>
    <i class="bar" :style="{ background: occ.color }"></i>
    <span class="grow">
      <b>{{ occ.title }}</b>
      <span v-if="sub">{{ sub }}</span>
    </span>
    <span
      v-if="occ.ev"
      class="tick"
      :class="{ on: occ.done }"
      title="标记完成"
      @click.stop="emit('toggle', occ)"
    >
      <Icon v-if="occ.done" name="check" :size="13" :stroke-width="2.4" />
    </span>
    <span
      v-else-if="occ.bday"
      class="tag"
      :class="occ.done ? 'green' : 'red'"
      :style="occ.done ? '' : 'background:#fdeef4;color:#c0396f'"
    >
      {{ occ.done ? '已祝贺' : '去祝贺' }}
    </span>
  </button>
</template>

<style scoped lang="scss">
.occ {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 11px;
  width: 100%;
  text-align: left;
  font-size: 13px;

  &:hover {
    background: var(--fill);
  }
  .tm {
    width: 46px;
    flex: none;
    font-family: var(--num);
    font-size: 12px;
    color: var(--ink3);
    line-height: 1.3;
    b {
      display: block;
      color: var(--ink);
      font-size: 12.5px;
      font-weight: 600;
    }
  }
  .bar {
    width: 3px;
    align-self: stretch;
    border-radius: 3px;
    flex: none;
  }
  .grow {
    flex: 1;
    min-width: 0;
    line-height: 1.4;
    b {
      font-weight: 600;
    }
    span {
      display: block;
      font-size: 11.5px;
      color: var(--ink3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  .tick {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    box-shadow: 0 0 0 1.5px #cfcfcc inset;
    display: grid;
    place-items: center;
    color: #fff;
    flex: none;
    &.on {
      background: var(--green);
      box-shadow: none;
    }
  }
  &.past {
    opacity: 0.62;
  }
  &.now {
    background: #fff7dc;
  }
}
</style>
