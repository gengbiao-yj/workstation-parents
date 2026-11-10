import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import './styles/base.scss'
import './styles/components.scss'

async function boot() {
  // 开发期数据种子：?seed=demo 生成示例家庭，?seed=reset 清空
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search)
    const seed = q.get('seed')
    if (seed) {
      if (seed === 'reset') localStorage.removeItem('jz-workbench-v1')
      else {
        const { demoState } = await import('@/data/demo')
        const stage = seed === 'demo' ? 'p1' : seed
        localStorage.setItem('jz-workbench-v1', JSON.stringify(demoState(stage as any, 'F', 'F')))
      }
      history.replaceState(null, '', location.pathname + location.hash)
    }
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

boot()
