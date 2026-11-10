import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Element Plus：按需引入组件样式（自行引入，避免整包 CSS）
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/time-picker/style/css'

import './styles/base.scss'
import './styles/components.scss'
// Element Plus 外观改造，必须排在 element-plus 自带样式之后
import './styles/element.scss'

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
