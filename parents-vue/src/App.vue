<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElConfigProvider } from 'element-plus/es/components/config-provider/index.mjs'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import WelcomeView from '@/views/WelcomeView.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import DialogHost from '@/components/forms/DialogHost.vue'
import { useData } from '@/stores/data'
import { useUi } from '@/stores/ui'

const data = useData()
const ui = useUi()
const route = useRoute()

const hasRail = computed(() => !!route.meta.rail)
const full = ref(false)

function isFull() {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}
function toggleFull() {
  const el = document.documentElement as any
  try {
    if (isFull()) {
      const fn = document.exitFullscreen || (document as any).webkitExitFullscreen
      fn.call(document)
      return
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (!req) {
      ui.toast('当前浏览器不支持网页全屏，可以按 F11')
      return
    }
    const p = req.call(el)
    if (p && p.catch) p.catch(() => ui.toast('浏览器没有允许全屏，可以按 F11'))
  } catch {
    ui.toast('浏览器没有允许全屏，可以按 F11')
  }
}
function syncFs() {
  full.value = isFull()
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && ui.confirmState) ui.confirmState.resolve(false)
}

onMounted(() => {
  ;['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, syncFs))
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  ;['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, syncFs))
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <ElConfigProvider :locale="zhCn">
    <div class="app" :class="{ 'with-rail': hasRail }">
    <AppSidebar />
    <main class="main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
    <aside v-if="hasRail" id="rail" class="rail"></aside>
    <button class="btn btn-light btn-sm fs-global" :title="full ? '退出全屏（Esc）' : '全屏显示整个工作台'" @click="toggleFull">
      <svg v-if="!full" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      </svg>
      {{ full ? '退出全屏' : '全屏' }}
    </button>
    </div>
    <WelcomeView v-if="!data.state.settings.onboarded" />
    <ToastHost />
    <ConfirmDialog />
    <DialogHost />
  </ElConfigProvider>
</template>

<style scoped lang="scss">
.app {
  display: grid;
  grid-template-columns: var(--side-w) 1fr;
  grid-template-rows: minmax(0, 1fr);
  position: fixed;
  inset: 0;

  &.with-rail {
    grid-template-columns: var(--side-w) 1fr var(--rail-w);
  }
}
.main {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.rail {
  min-height: 0;
  overflow-y: auto;
  padding: 22px 22px 22px 8px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: #dcdcda;
    border-radius: 8px;
    border: 2px solid var(--bg);
  }
}
.fs-global {
  position: fixed;
  top: 12px;
  right: 16px;
  z-index: 55;
  box-shadow: 0 0 0 1px var(--line2) inset, 0 2px 8px rgba(0, 0, 0, 0.04);
}

@media (max-width: 1280px) {
  .app.with-rail {
    grid-template-columns: var(--side-w) 1fr;
  }
  .app.with-rail .rail {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 300px;
    background: var(--bg);
    z-index: 50;
    box-shadow: var(--sh-pop);
    padding-left: 22px;
    padding-top: 60px;
    transform: translateX(100%);
    transition: transform 0.25s;
  }
}
</style>
