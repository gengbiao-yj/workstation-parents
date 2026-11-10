import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
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
