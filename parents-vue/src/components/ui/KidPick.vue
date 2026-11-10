<script setup lang="ts">
import { computed } from 'vue'
import { kidAva } from '@/lib/avatar'
import { useData } from '@/stores/data'

const data = useData()
const kids = computed(() => data.state.kids)
const cur = computed(() => data.curKid)

function pick(id: string) {
  if (id === (cur.value && cur.value.id)) return
  data.setCur(id)
  data.save()
}
</script>

<template>
  <div v-if="kids.length > 1" class="kid-pick">
    <button v-for="k in kids" :key="k.id" :class="{ on: cur && k.id === cur.id }" @click="pick(k.id)">
      <span v-html="kidAva(k, 24)"></span>{{ k.name }}
    </button>
  </div>
</template>
