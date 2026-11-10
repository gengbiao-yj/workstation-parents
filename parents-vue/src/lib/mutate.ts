import type { AppState } from '@/types'
import type { Habit } from '@/types'

export function setCheck(s: AppState, kid: string, ds: string, hid: string, v?: true | number | null | false) {
  if (!s.checks[kid]) s.checks[kid] = {}
  if (!s.checks[kid][ds]) s.checks[kid][ds] = {}
  if (v === undefined || v === null || v === false || v === 0) delete s.checks[kid][ds][hid]
  else s.checks[kid][ds][hid] = v
  if (!Object.keys(s.checks[kid][ds]).length) delete s.checks[kid][ds]
}

export function newHabit(o: Partial<Habit> & { id: string; kid: string; dim: Habit['dim']; name: string }): Habit {
  return {
    unit: '',
    target: 1,
    days: [1, 2, 3, 4, 5, 6, 7],
    on: true,
    kind: '',
    since: '',
    ...o
  } as Habit
}
