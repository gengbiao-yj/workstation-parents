<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import Icon from '../ui/Icon.vue'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import { maskList } from '@/lib/ai'
import { copyText } from '@/lib/download'

const props = defineProps<{ text: string }>()

const data = useData()
const dialogs = useDialogs()
const ui = useUi()
const router = useRouter()

const state = computed(() => data.state)
/** 提示词里出现过的编号，供家长对照 */
const refs = computed(() => {
  if (!state.value.settings.ai.mask || !/【(孩子|人物)\d+】/.test(props.text)) return []
  return maskList(state.value).filter((x) => props.text.indexOf(x[1]) >= 0)
})

function copy() {
  copyText(props.text)
  ui.toast('已复制')
}

function goSettings() {
  dialogs.close()
  router.push({ path: '/settings', query: { sec: 'ai' } })
}
</script>

<template>
  <BaseModal title="复制提示词，粘贴到任意 AI 网页版" wide @close="dialogs.close()">
    <p class="lead">
      还没有配置 AI 接口也没关系：复制下面这段，打开 <b>豆包</b>、<b>DeepSeek</b>、<b>Kimi</b>、<b>通义</b>
      等任意一个网页版或 App，粘贴发送即可。<template v-if="state.settings.ai.mask">
        孩子和朋友的名字已替换成编号，拿到结果后对照编号即可。</template>
    </p>
    <div class="prompt-box">{{ text }}</div>
    <details v-if="refs.length" class="ref-box">
      <summary>查看编号对照表</summary>
      <div class="ref-list">
        <span v-for="r in refs" :key="r[1]">{{ r[1] }}{{ r[0] }}</span>
      </div>
    </details>

    <template #foot>
      <button class="btn btn-light" @click="goSettings">配置 API，直接生成</button>
      <button class="btn btn-dark" @click="copy"><Icon name="copy" :size="15" />复制提示词</button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.lead {
  margin: 0 0 10px;
  color: var(--ink2);
  font-size: 13px;
  line-height: 1.7;
}
.prompt-box {
  background: var(--fill);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  color: var(--ink2);
  font-family: inherit;
}
.ref-box {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--ink2);
  summary {
    cursor: pointer;
  }
  .ref-list {
    margin-top: 6px;
    line-height: 1.9;
    span {
      margin-right: 12px;
    }
  }
}
</style>
