<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { DIM, DIMS, HABIT_PRESETS } from '@/data/constants'
import { todayStr, uid } from '@/lib/date'
import { habitsOf, stageOf } from '@/lib/query'
import { daysText } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { DimId } from '@/types'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const k = data.curKid!
const have = new Map<string, boolean>()
habitsOf(data.state, k.id, '', true).forEach((h) => have.set(h.name, true))
const checked = ref<string[]>([])

const groups = computed(() =>
  DIMS.map((d) => ({
    d,
    items: (HABIT_PRESETS[k.stage] || []).filter((p) => p[0] === d.id)
  })).filter((g) => g.items.length)
)

function save() {
  let n = 0
  ;(HABIT_PRESETS[k.stage] || []).forEach((p) => {
    if (checked.value.indexOf(p[1]) >= 0) {
      data.state.habits.push({
        id: uid('h'),
        kid: k.id,
        dim: p[0] as DimId,
        name: p[1],
        unit: p[2],
        target: p[3],
        days: p[4].slice(),
        on: true,
        kind: p[6] || '',
        since: todayStr()
      })
      n++
    }
  })
  data.save(true)
  dialogs.close()
  ui.toast(n ? '已添加 ' + n + ' 项' : '没有新选中的')
}
</script>

<template>
  <BaseModal title="推荐的打卡项" wide @close="dialogs.close()">
    <p style="margin: 0 0 12px; color: var(--ink2); font-size: 13px; line-height: 1.7">
      按 {{ stageOf(k).name }} 阶段推荐。勾上的会加进打卡表，已经有的显示为已添加。也可以在 设置 → 孩子 里换阶段。
    </p>

    <template v-for="g in groups" :key="g.d.id">
      <div class="flabel" style="margin: 12px 0 6px; display: flex; align-items: center; gap: 6px">
        <i class="dim-dot sm" :style="{ background: g.d.color }">{{ g.d.t }}</i>{{ g.d.name }}
      </div>
      <div class="ck-list">
        <label
          v-for="p in g.items"
          :key="p[1]"
          class="ck"
          :class="{ done: have.has(p[1]) }"
          :style="{ '--c': g.d.color, cursor: 'pointer' }"
        >
          <input
            v-model="checked"
            type="checkbox"
            :value="p[1]"
            :disabled="have.has(p[1])"
            :style="{ accentColor: g.d.color, width: '16px', height: '16px', margin: 0 }"
          />
          <span class="nm" style="text-decoration: none">{{ p[1] }}{{ p[2] ? ' · ' + p[3] + ' ' + p[2] : '' }}</span>
          <span class="v">{{ daysText(p[4]) }}</span>
        </label>
      </div>
    </template>

    <template #foot>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">添加选中的</button>
    </template>
  </BaseModal>
</template>
