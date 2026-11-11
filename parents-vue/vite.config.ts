import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // history 路由下资源必须用绝对路径：/skills 刷新时若仍按 './' 解析会 404。
  // 需要部署到子目录时用 VITE_BASE=/sub/ pnpm build 覆盖。
  base: process.env.VITE_BASE || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/styles/_tokens.scss" as *;`
      }
    }
  },
  server: {
    port: 5173,
    open: false,
    // 开发时把 /api 转发到 NestJS，前端代码里统一用相对路径，免去跨域与端口配置
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    // element-plus 的日期/时间面板体积较大，单独拆一个 chunk，主包与缓存都更友好
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('element-plus') || id.includes('dayjs')) return 'element'
          return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
})
