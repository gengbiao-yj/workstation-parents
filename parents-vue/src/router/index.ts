import { createRouter, createWebHistory } from 'vue-router'

// 兼容旧链接：#/skills 这类老书签在 router 初始化前改写成 /skills，
// 否则 createWebHistory 会把它当成根路径，用户会莫名回到首页。
if (typeof location !== 'undefined' && location.hash.startsWith('#/')) {
  history.replaceState(null, '', location.hash.slice(1) + location.search)
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { rail: true } },
    { path: '/calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue') },
    { path: '/wuyu', name: 'wuyu', component: () => import('@/views/WuyuView.vue') },
    { path: '/study', name: 'study', component: () => import('@/views/StudyView.vue') },
    { path: '/skills', name: 'skills', component: () => import('@/views/SkillsView.vue') },
    { path: '/people', name: 'people', component: () => import('@/views/PeopleView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/ai', name: 'ai', component: () => import('@/views/AiView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ]
})

export default router
