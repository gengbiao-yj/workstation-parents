<script setup lang="ts">
import { computed, reactive } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import AppDatePicker from '../ui/AppDatePicker.vue'
import { round1, todayStr, uid } from '@/lib/date'
import { latestGrowth } from '@/lib/query'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { GrowthRecord } from '@/types'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const k = data.curKid!
const lh = latestGrowth(data.state, k.id, 'h')
const lw = latestGrowth(data.state, k.id, 'w')
const f = reactive({ date: todayStr(), h: '', w: '', vl: '', vr: '' })
const title = computed(() => '量一量 · ' + k.name)

function save() {
  const h = parseFloat(f.h)
  const w = parseFloat(f.w)
  const vl = parseFloat(f.vl)
  const vr = parseFloat(f.vr)
  if (!(h > 30) && !(w > 2) && !(vl > 0)) {
    ui.toast('至少填一项')
    return
  }
  if (h && (h < 40 || h > 220)) {
    ui.toast('身高看起来不太对，单位是厘米')
    return
  }
  const g: GrowthRecord = { id: uid('g'), kid: k.id, date: f.date || todayStr(), h: 0, w: 0 }
  if (h > 30) g.h = round1(h)
  if (w > 2) g.w = round1(w)
  if (vl > 0) g.vl = vl
  if (vr > 0) g.vr = vr
  const prev = latestGrowth(data.state, k.id, 'h')
  data.state.growth.push(g)
  data.save(true)
  dialogs.close()
  ui.toast(g.h && prev ? '比上次长高了 ' + round1(g.h - prev.h) + ' cm' : '已记录')
}
</script>

<template>
  <BaseModal :title="title" @close="dialogs.close()">
    <div class="row2">
      <div class="field"><label>日期</label><AppDatePicker v-model="f.date" /></div>
      <div></div>
    </div>
    <div class="row2">
      <div class="field">
        <label>身高（cm）</label>
        <input v-model="f.h" class="inp num" inputmode="decimal" :placeholder="lh ? '上次 ' + lh.h : '如 124.5'" autofocus />
      </div>
      <div class="field">
        <label>体重（kg）</label>
        <input v-model="f.w" class="inp num" inputmode="decimal" :placeholder="lw ? '上次 ' + lw.w : '如 23.5'" />
      </div>
    </div>
    <div class="row2">
      <div class="field"><label>视力 · 左眼</label><input v-model="f.vl" class="inp num" inputmode="decimal" placeholder="选填，如 5.0" /></div>
      <div class="field"><label>视力 · 右眼</label><input v-model="f.vr" class="inp num" inputmode="decimal" placeholder="选填" /></div>
    </div>
    <div class="muted" style="font-size: 12px; line-height: 1.7">
      早上起床后量身高最准，脱鞋、靠墙、脚跟并拢。量完会画在儿童房的身高尺上。
    </div>

    <template #foot>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
