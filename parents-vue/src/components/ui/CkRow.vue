<script setup lang="ts">
import { computed } from 'vue'
import { DIM } from '@/data/constants'
import { checkVal, habitText, isDone } from '@/lib/query'
import { setCheck } from '@/lib/mutate'
import { useData } from '@/stores/data'
import type { Habit } from '@/types'
import Icon from './Icon.vue'

const props = defineProps<{ habit: Habit; ds: string }>()
const emit = defineEmits<{ (e: 'change', habit: Habit, done: boolean): void }>()
const data = useData()

const v = computed(() => checkVal(data.state, props.habit.kid, props.ds, props.habit.id))
const done = computed(() => isDone(props.habit, v.value))
const dim = computed(() => DIM[props.habit.dim])

function toggle() {
  const was = done.value
  setCheck(data.state, props.habit.kid, props.ds, props.habit.id, was ? undefined : props.habit.unit ? props.habit.target : true)
  data.save()
  emit('change', props.habit, !was)
}
function onVal(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  const was = done.value
  setCheck(data.state, props.habit.kid, props.ds, props.habit.id, n > 0 ? n : undefined)
  data.save()
  emit('change', props.habit, !was && isDone(props.habit, n))
}
</script>

<template>
  <div v-if="habit.unit" class="ck" :class="{ done }" :style="{ '--c': dim.color }">
    <button class="box" aria-label="完成" @click="toggle">
      <Icon v-if="done" name="check" :size="13" :stroke-width="2.4" />
    </button>
    <span class="nm" :title="habitText(habit)">{{ habit.name }}</span>
    <input
      class="val"
      inputmode="numeric"
      :value="v === true ? habit.target : v || ''"
      :placeholder="String(habit.target)"
      :aria-label="habit.name"
      @change="onVal"
    />
    <span class="v">{{ habit.unit }}</span>
  </div>
  <button v-else class="ck" :class="{ done }" :style="{ '--c': dim.color }" @click="toggle">
    <span class="box"><Icon v-if="done" name="check" :size="13" :stroke-width="2.4" /></span>
    <span class="nm">{{ habit.name }}</span>
    <i class="dim-dot sm" :style="{ background: dim.color }">{{ dim.t }}</i>
  </button>
</template>

<style scoped lang="scss">
.ck {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 10px;
  font-size: 13px;
  width: 100%;
  text-align: left;
  background: var(--fill);

  &:hover {
    background: var(--fill2);
  }
  .box {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    box-shadow: 0 0 0 1.5px #cfcfcc inset;
    flex: none;
    display: grid;
    place-items: center;
    color: #fff;
    background: #fff;
  }
  &.done .box {
    background: var(--c, var(--green));
    box-shadow: none;
  }
  &.done .nm {
    color: var(--ink3);
    text-decoration: line-through;
  }
  .nm {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .v {
    font-family: var(--num);
    font-size: 12px;
    color: var(--ink3);
    white-space: nowrap;
  }
  .val {
    width: 54px;
    height: 26px;
    border: 0;
    border-radius: 7px;
    background: #fff;
    text-align: center;
    font-family: var(--num);
    font-size: 12.5px;
    outline: none;
    box-shadow: 0 0 0 1px var(--line2) inset;
    &:focus {
      box-shadow: 0 0 0 1.5px var(--ink) inset;
    }
  }
}
</style>
