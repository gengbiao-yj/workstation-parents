<script setup lang="ts">
import { computed } from 'vue'
import { adultAvatar } from '@/art/home'
import Icon from './Icon.vue'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'

const data = useData()
const dialogs = useDialogs()
const ava = computed(() =>
  adultAvatar({ gender: data.state.settings.parent.gender || 'F' }, 72, false)
)
</script>

<template>
  <div class="page scroll">
    <div class="panel">
      <div class="empty">
        <span v-html="ava"></span>
        <div>还没有添加孩子</div>
        <div style="margin-top: 14px">
          <button class="btn btn-dark" @click="dialogs.open({ k: 'kid' })">
            <Icon name="plus" :size="15" />添加孩子
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
