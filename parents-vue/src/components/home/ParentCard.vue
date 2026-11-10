<script setup lang="ts">
import { computed } from 'vue'
import { adultAvatar } from '@/art/home'
import { MOOD } from '@/data/constants'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'
import Icon from '../ui/Icon.vue'

const props = defineProps<{ idx: number }>()
const emit = defineEmits<{ (e: 'dice'): void }>()
const data = useData()
const ui = useUi()

const p = computed(() => (props.idx ? data.state.settings.partner : data.state.settings.parent))
const todo = computed(() => data.state.todos.filter((x) => !x.done))
const meSub = computed(() =>
  data.state.kids.length ? data.state.kids.map((k) => k.name).join('、') + '的家长' : '还没有添加孩子'
)
const ava = computed(() => adultAvatar({ gender: p.value.gender }, 56))
</script>

<template>
  <div class="hc-head">
    <span v-html="ava"></span>
    <div>
      <div class="hc-name">{{ p.name }}</div>
      <div class="hc-role">{{ meSub }}</div>
      <div class="hc-status">
        <i></i>{{ todo.length ? '还有 ' + todo.length + ' 件备忘' : '备忘都处理完了' }}
      </div>
    </div>
  </div>
  <div v-if="todo.length" class="hc-sec">
    <div class="hc-k">备忘：</div>
    <div class="hc-v">{{ todo.slice(0, 3).map((x) => x.text).join('；') }}</div>
  </div>
  <div class="hc-sec">
    <div class="hc-k">AI 能帮你：</div>
    <div class="tags">
      <span class="tag">周末去哪玩</span><span class="tag">学习计划</span><span class="tag">睡前故事</span><span class="tag">和老师沟通</span>
    </div>
  </div>
  <div class="hc-act">
    <button class="btn btn-sm btn-light" @click="emit('dice')"><Icon name="dice" :size="14" />今天玩什么</button>
    <router-link class="btn btn-sm btn-dark" to="/ai">打开 AI 助手</router-link>
  </div>
</template>
