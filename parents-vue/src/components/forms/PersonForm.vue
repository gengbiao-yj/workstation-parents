<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { CLOSE, REL } from '@/data/constants'
import { REL_ORDER } from '@/art/net'
import { deepClone, todayStr, uid } from '@/lib/date'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Person, RelId } from '@/types'

const props = defineProps<{ person?: Person }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.person
const k = data.curKid!
const d = reactive<Person>(
  props.person
    ? deepClone(props.person)
    : {
        id: uid('p'),
        kid: k.id,
        name: '',
        rel: 'friend' as RelId,
        label: '',
        close: 2,
        gender: 'F',
        birthday: '',
        likes: '',
        contact: '',
        note: '',
        met: '',
        greeted: {}
      }
)

const noYear = ref(/^0000-/.test(d.birthday))
const bd = ref(d.birthday ? (noYear.value ? '2000' + d.birthday.slice(4) : d.birthday) : '')

function save() {
  d.name = d.name.trim()
  if (!d.name) {
    ui.toast('写一下名字')
    return
  }
  d.label = d.label.trim()
  d.likes = d.likes.trim()
  d.met = d.met.trim()
  d.contact = d.contact.trim()
  d.note = d.note.trim()
  d.birthday = bd.value ? (noYear.value ? '0000' + bd.value.slice(4) : bd.value) : ''
  if (isNew) {
    if (!d.greeted) d.greeted = {}
    data.state.people.push({ ...d })
  } else {
    const i = data.state.people.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.people[i] = { ...d }
  }
  data.save()
  dialogs.close()
  ui.toast('已保存')
}

async function del() {
  const ok = await ui.confirm('从关系网删除', `确定删除「${d.name}」吗？`, '删除', true)
  if (!ok) return
  data.state.people = data.state.people.filter((x) => x.id !== d.id)
  data.save()
  dialogs.close()
}

function openGreet() {
  dialogs.open({ k: 'greet', id: d.id })
}
</script>

<template>
  <BaseModal :title="isNew ? '添加到关系网' : d.name" wide @close="dialogs.close()">
    <div class="row2">
      <div class="field">
        <label>名字<span class="req">*</span></label>
        <input v-model="d.name" class="inp" maxlength="12" autofocus />
      </div>
      <div class="field">
        <label>{{ k.name }}怎么称呼 / 什么关系</label>
        <input v-model="d.label" class="inp" placeholder="如：奶奶、同桌、游泳课认识" maxlength="14" />
      </div>
    </div>

    <div class="field">
      <label>分类</label>
      <div class="chips">
        <button
          v-for="r in REL_ORDER"
          :key="r"
          type="button"
          :class="{ on: d.rel === r }"
          @click="d.rel = r"
        >
          <i class="cdot" :style="{ background: REL[r].color, marginRight: '6px', verticalAlign: '0' }"></i>{{ REL[r].t }}
        </button>
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label>亲近程度</label>
        <div class="seg light">
          <button v-for="c in [3, 2, 1]" :key="c" :class="{ on: d.close === c }" @click="d.close = c">
            {{ CLOSE[c] }}
          </button>
        </div>
      </div>
      <div class="field">
        <label>性别</label>
        <div class="seg light">
          <button :class="{ on: d.gender !== 'M' }" @click="d.gender = 'F'">女</button>
          <button :class="{ on: d.gender === 'M' }" @click="d.gender = 'M'">男</button>
        </div>
      </div>
      <div></div>
    </div>

    <div class="row2">
      <div class="field">
        <label>生日</label>
        <input v-model="bd" class="inp" type="date" />
        <label class="chk" style="margin-top: 6px; font-size: 12px">
          <input v-model="noYear" type="checkbox" /> 不知道是哪一年出生
        </label>
      </div>
      <div class="field">
        <label>喜欢什么</label>
        <input v-model="d.likes" class="inp" placeholder="选礼物、找话题用得上" />
      </div>
    </div>

    <div class="row2">
      <div class="field">
        <label>怎么认识的</label>
        <input v-model="d.met" class="inp" placeholder="选填" />
      </div>
      <div class="field">
        <label>联系方式（如对方家长电话）</label>
        <input v-model="d.contact" class="inp" placeholder="选填，只存在这台电脑上" />
      </div>
    </div>

    <div class="field">
      <label>社交小记</label>
      <textarea v-model="d.note" class="ta" placeholder="比如：上周因为玩具闹别扭，已经和好了"></textarea>
    </div>

    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="15" />删除
      </button>
      <button v-if="!isNew && d.birthday" class="btn btn-light" @click="openGreet">
        <Icon name="gift" :size="15" />生日祝福
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
