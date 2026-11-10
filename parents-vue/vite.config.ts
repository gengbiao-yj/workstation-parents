import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
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
    open: false
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
