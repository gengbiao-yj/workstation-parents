<script setup lang="ts">
import { reactive } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import AppDatePicker from '../ui/AppDatePicker.vue'
import MoodFace from '../ui/MoodFace.vue'
import { DIMS, MOODS } from '@/data/constants'
import { todayStr, uid } from '@/lib/date'
import { confetti } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'

const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const f = reactive({ mood: 'happy', text: '', dim: '' as string, date: todayStr(), first: false })

function save() {
  const k = data.curKid
  if (!k) return
  const txt = f.text.trim()
  if (!txt) {
    ui.toast('写一句发生了什么')
    return
  }
  data.state.journal.push({
    id: uid('j'),
    kid: k.id,
    date: f.date || todayStr(),
    mood: f.mood,
    text: txt,
    dim: f.dim as any,
    first: f.first,
    t: Date.now()
  })
  data.save(true)
  dialogs.close()
  if (f.first) confetti()
  ui.toast('记下来了')
}
</script>

<template>
  <BaseModal title="记一刻" @close="dialogs.close()">
    <div class="field">
      <label>{{ data.curKid?.name }}现在的心情</label>
      <div class="mood-pick">
        <button
          v-for="m in MOODS"
          :key="m.id"
          type="button"
          :class="{ on: f.mood === m.id }"
          @click="f.mood = m.id"
        >
          <MoodFace :id="m.id" :size="26" />{{ m.t }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>发生了什么</label>
      <textarea
        v-model="f.text"
        class="ta"
        placeholder="比如：今天第一次自己骑车滑了 5 米，摔了一下没哭"
        autofocus
        style="min-height: 96px"
      ></textarea>
    </div>

    <div class="row2">
      <div class="field">
        <label>和哪一育有关</label>
        <div class="chips">
          <button type="button" :class="{ on: f.dim === '' }" @click="f.dim = ''">不选</button>
          <button v-for="d in DIMS" :key="d.id" type="button" :class="{ on: f.dim === d.id }" @click="f.dim = d.id">
            {{ d.t }}
          </button>
        </div>
      </div>
      <div class="field"><label>日期</label><AppDatePicker v-model="f.date" /></div>
    </div>

    <label class="chk"><input v-model="f.first" type="checkbox" /> 这是一个「第一次」</label>

    <template #foot>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">记下来</button>
    </template>
  </BaseModal>
</template>
