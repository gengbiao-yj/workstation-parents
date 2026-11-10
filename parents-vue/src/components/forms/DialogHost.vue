<script setup lang="ts">
import { computed } from 'vue'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import EventForm from '@/components/forms/EventForm.vue'
import KidForm from '@/components/forms/KidForm.vue'
import JournalForm from '@/components/forms/JournalForm.vue'
import GrowthForm from '@/components/forms/GrowthForm.vue'
import HabitForm from '@/components/forms/HabitForm.vue'
import PresetsModal from '@/components/forms/PresetsModal.vue'
import AbilityForm from '@/components/forms/AbilityForm.vue'
import BookForm from '@/components/forms/BookForm.vue'
import ExamForm from '@/components/forms/ExamForm.vue'
import SkillForm from '@/components/forms/SkillForm.vue'
import SkillOpen from '@/components/forms/SkillOpen.vue'
import PersonForm from '@/components/forms/PersonForm.vue'
import GreetDialog from '@/components/forms/GreetDialog.vue'
import AiTplForm from '@/components/forms/AiTplForm.vue'
import PromptModal from '@/components/forms/PromptModal.vue'

const dialogs = useDialogs()
const data = useData()
const cur = computed(() => dialogs.current)

const ev = computed(() => (cur.value && cur.value.k === 'event' ? cur.value : null))
const kid = computed(() => (cur.value && cur.value.k === 'kid' ? cur.value : null))
const habit = computed(() => (cur.value && cur.value.k === 'habit' ? cur.value : null))
const book = computed(() => (cur.value && cur.value.k === 'book' ? cur.value : null))
const exam = computed(() => (cur.value && cur.value.k === 'exam' ? cur.value : null))
const skill = computed(() => (cur.value && cur.value.k === 'skill' ? cur.value : null))
const person = computed(() => (cur.value && cur.value.k === 'person' ? cur.value : null))
const greetId = computed(() => (cur.value && cur.value.k === 'greet' ? cur.value.id : ''))
const aiTpl = computed(() => (cur.value && cur.value.k === 'aiTpl' ? cur.value : null))
const prompt = computed(() => (cur.value && cur.value.k === 'prompt' ? cur.value : null))
const skillOpen = computed(() => {
  if (!cur.value || cur.value.k !== 'skillDetail') return null
  return data.state.skills.find((x) => x.id === (cur.value as any).id) || null
})
</script>

<template>
  <EventForm v-if="ev" :ev="ev.ev" :preset="ev.preset" :ds="ev.ds" />
  <KidForm v-if="kid" :kid="kid.kid" />
  <JournalForm v-if="cur && cur.k === 'journal'" />
  <GrowthForm v-if="cur && cur.k === 'growth'" />
  <HabitForm v-if="habit" :habit="habit.habit" :dim="habit.dim" />
  <PresetsModal v-if="cur && cur.k === 'presets'" />
  <AbilityForm v-if="cur && cur.k === 'ability'" />
  <BookForm v-if="book" :key="book.book ? book.book.id : 'new-book'" :book="book.book" />
  <ExamForm v-if="exam" :key="exam.exam ? exam.exam.id : 'new-exam'" :exam="exam.exam" />
  <SkillForm v-if="skill" :key="skill.skill ? skill.skill.id : skill.presetId || 'new-skill'" :skill="skill.skill" :preset-id="skill.presetId" />
  <SkillOpen v-if="skillOpen" :key="skillOpen.id" :skill="skillOpen" />
  <PersonForm v-if="person" :key="person.person ? person.person.id : 'new-person'" :person="person.person" />
  <GreetDialog v-if="greetId" :key="greetId" :id="greetId" />
  <AiTplForm
    v-if="aiTpl"
    :key="aiTpl.id + (aiTpl.person || '') + (aiTpl.skill || '')"
    :id="aiTpl.id"
    :person="aiTpl.person"
    :skill="aiTpl.skill"
  />
  <PromptModal v-if="prompt" :text="prompt.text" />
</template>
