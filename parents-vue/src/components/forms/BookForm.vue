<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { BOOK_COLORS } from '@/data/constants'
import { deepClone, todayStr, uid } from '@/lib/date'
import { booksOf } from '@/lib/query'
import { confetti } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import { useDialogs } from '@/stores/dialogs'
import type { Book, BookStatus } from '@/types'

const props = defineProps<{ book?: Book }>()
const data = useData()
const ui = useUi()
const dialogs = useDialogs()

const isNew = !props.book
const k = data.curKid!
const d = reactive<Book>(
  props.book
    ? deepClone(props.book)
    : {
        id: uid('b'),
        kid: k.id,
        title: '',
        author: '',
        status: 'reading',
        date: '',
        rating: 0,
        note: '',
        color: BOOK_COLORS[booksOf(data.state, k.id).length % BOOK_COLORS.length]
      }
)

const title = computed(() => (isNew ? '添加一本书' : `《${d.title}》`))

function setStatus(v: BookStatus) {
  d.status = v
  if (d.status === 'done' && !d.date) d.date = todayStr()
}

function save() {
  const t = d.title.trim().replace(/^《|》$/g, '')
  if (!t) {
    ui.toast('写一下书名')
    return
  }
  d.title = t
  if (d.status === 'done' && !d.date) d.date = todayStr()
  if (isNew) {
    data.state.books.push({ ...d })
  } else {
    const i = data.state.books.findIndex((x) => x.id === d.id)
    if (i >= 0) data.state.books[i] = { ...d }
  }
  data.save()
  dialogs.close()
  if (d.status === 'done' && isNew) confetti()
}

function del() {
  data.state.books = data.state.books.filter((x) => x.id !== d.id)
  data.save()
  dialogs.close()
}
</script>

<template>
  <BaseModal :title="title" @close="dialogs.close()">
    <div class="row2">
      <div class="field">
        <label>书名<span class="req">*</span></label>
        <input v-model="d.title" class="inp" maxlength="40" autofocus />
      </div>
      <div class="field">
        <label>作者</label>
        <input v-model="d.author" class="inp" />
      </div>
    </div>
    <div class="field">
      <label>状态</label>
      <div class="seg light">
        <button :class="{ on: d.status === 'want' }" @click="setStatus('want')">想读</button>
        <button :class="{ on: d.status === 'reading' }" @click="setStatus('reading')">在读</button>
        <button :class="{ on: d.status === 'done' }" @click="setStatus('done')">读完了</button>
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>读完日期</label>
        <input v-model="d.date" class="inp" type="date" />
      </div>
      <div class="field">
        <label>孩子打几颗星</label>
        <div class="chips">
          <button
            v-for="n in [1, 2, 3, 4, 5]"
            :key="n"
            type="button"
            :class="{ on: n <= d.rating }"
            @click="d.rating = n"
          >
            ★
          </button>
        </div>
      </div>
    </div>
    <div class="field">
      <label>书脊颜色</label>
      <div class="chips">
        <button
          v-for="c in BOOK_COLORS"
          :key="c"
          type="button"
          :style="{
            width: '30px',
            padding: 0,
            background: c,
            boxShadow: d.color === c ? `0 0 0 2px #fff,0 0 0 4px ${c}` : ''
          }"
          aria-label="颜色"
          @click="d.color = c"
        ></button>
      </div>
    </div>
    <div class="field">
      <label>读后感 / 孩子说的话</label>
      <textarea v-model="d.note" class="ta"></textarea>
    </div>
    <template #foot>
      <button v-if="!isNew" class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="del">
        <Icon name="trash" :size="15" />删除
      </button>
      <button class="btn btn-light" @click="dialogs.close()">取消</button>
      <button class="btn btn-dark" @click="save">保存</button>
    </template>
  </BaseModal>
</template>
