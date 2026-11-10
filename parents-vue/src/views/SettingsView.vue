<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import { AI_PRESETS, VERSION } from '@/data/constants'
import { demoState } from '@/data/demo'
import { adultAvatar } from '@/art/home'
import { brandMark, kidAva } from '@/lib/avatar'
import { aiStream, presetOf } from '@/lib/ai'
import { copyText, downloadFile } from '@/lib/download'
import { fmtTime, pad2, todayStr } from '@/lib/date'
import { ageText, habitsOf, peopleOf, stageOf } from '@/lib/query'

const SECS: [string, string][] = [
  ['family', '家庭'],
  ['kids', '孩子'],
  ['ai', 'AI 接口'],
  ['data', '数据与备份'],
  ['about', '关于']
]
const DEV_MAIL = 'cyberdaddyleo@outlook.com'

const data = useData()
const dialogs = useDialogs()
const ui = useUi()
const route = useRoute()
const router = useRouter()

const state = computed(() => data.state)
const st = computed(() => state.value.settings)
const sec = ref(String(route.query.sec || 'family'))

watch(
  () => route.query.sec,
  (v) => {
    if (v && SECS.some((x) => x[0] === v)) sec.value = String(v)
  }
)
function setSec(id: string) {
  sec.value = id
  router.replace({ path: '/settings', query: { sec: id } })
}

const avaF = computed(() => adultAvatar({ gender: 'F' }, 88))
const avaM = computed(() => adultAvatar({ gender: 'M' }, 88))

function setParentGender(g: 'F' | 'M') {
  st.value.parent.gender = g
  if (!st.value.parent.name || st.value.parent.name === '妈妈' || st.value.parent.name === '爸爸') {
    st.value.parent.name = g === 'F' ? '妈妈' : '爸爸'
  }
}

/* ---------- 孩子 ---------- */
const kidRows = computed(() =>
  state.value.kids.map((k) => ({
    k,
    stage: stageOf(k).name,
    age: ageText(k),
    school: [k.school, k.grade].filter(Boolean).join(' '),
    habits: habitsOf(state.value, k.id).length,
    people: peopleOf(state.value, k.id).length
  }))
)

/* ---------- AI ---------- */
const a = computed(() => st.value.ai)
const preset = computed(() => presetOf(a.value.provider))
const keyShown = ref(false)
const testRes = ref<{ cls: string; text: string } | null>(null)

function setProvider(id: string) {
  const p = presetOf(id)
  a.value.provider = p.id
  if (p.id !== 'custom') {
    a.value.base = p.base
    a.value.model = p.model
  }
  testRes.value = null
}

async function testConn() {
  if (!a.value.base || !a.value.model || !(a.value.key || /localhost|127\.0\.0\.1/.test(a.value.base))) {
    testRes.value = { cls: 'dn', text: '请先填写接口地址、模型名称和 API Key' }
    return
  }
  testRes.value = { cls: 'muted', text: '正在连接…' }
  const t0 = Date.now()
  try {
    const txt = await aiStream(state.value, [{ role: 'user', content: '请只回复四个字：连接成功' }], () => {}, undefined, 20)
    testRes.value = {
      cls: 'up',
      text: `连接成功（${((Date.now() - t0) / 1000).toFixed(1)} 秒）  模型回复：${String(txt).slice(0, 30)}`
    }
  } catch (e: any) {
    testRes.value = { cls: 'dn', text: e.message }
  }
}

/* ---------- 数据 ---------- */
const sizeKB = computed(() => (data.serialize().length / 1024).toFixed(1))
const nChecks = computed(() => {
  let n = 0
  Object.keys(state.value.checks).forEach((kid) => {
    Object.keys(state.value.checks[kid]).forEach((ds) => {
      n += Object.keys(state.value.checks[kid][ds]).length
    })
  })
  return n
})

function exportBackup() {
  st.value.lastBackup = Date.now()
  data.save(true)
  const d = new Date()
  downloadFile(
    '学生家长工作台备份-' + todayStr() + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + '.json',
    JSON.stringify(state.value, null, 1),
    'application/json'
  )
  ui.toast('备份已下载，请妥善保存')
}

function onRestore(e: Event) {
  const el = e.target as HTMLInputElement
  const f = el.files && el.files[0]
  if (!f) return
  const rd = new FileReader()
  rd.onload = async () => {
    try {
      const d = JSON.parse(String(rd.result))
      if (!d || !d.settings || !Array.isArray(d.kids)) throw new Error('bad')
      const ok = await ui.confirm(
        '从备份恢复',
        `备份里有 ${d.kids.length} 个孩子、${(d.events || []).length} 个日程、${(d.journal || []).length} 条成长日记。恢复会覆盖当前全部数据，确定吗？`,
        '恢复'
      )
      if (!ok) return
      data.importBackup(String(rd.result))
      router.push('/home')
      ui.toast('已恢复')
    } catch {
      ui.toast('这不是有效的学生家长工作台备份文件')
    }
  }
  rd.readAsText(f, 'utf-8')
  el.value = ''
}

async function loadDemo() {
  const ok = await ui.confirm(
    '载入示例数据',
    '会用示例数据（一个两孩家庭，含打卡、日程、技能挑战、关系网和成长记录）覆盖当前数据，保留你的 AI 设置。',
    '载入',
    true
  )
  if (!ok) return
  const ai = state.value.settings.ai
  const k = data.curKid
  const next = demoState(k ? k.stage : 'p1', k ? k.gender : 'F', state.value.settings.parent.gender)
  next.settings.ai = ai
  data.replaceAll(next)
  router.push('/home')
}

async function wipe() {
  const ok = await ui.confirm(
    '清空全部数据',
    '孩子、打卡、日程、技能挑战、关系网、成长记录、AI 对话都会被删除，无法恢复。确定吗？',
    '清空',
    true
  )
  if (!ok) return
  data.resetAll(true)
  state.value.settings.onboarded = true
  data.save(true)
  setSec('kids')
  ui.toast('已清空，先添加孩子')
}
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">设置</h1>
        <div class="page-desc">修改后自动保存</div>
      </div>
    </div>

    <div class="set-layout">
      <nav class="set-nav">
        <button v-for="s in SECS" :key="s[0]" :class="{ on: sec === s[0] }" @click="setSec(s[0])">{{ s[1] }}</button>
      </nav>

      <div class="set-body">
        <!-- 家庭 -->
        <template v-if="sec === 'family'">
          <div class="panel set-sec">
            <div class="panel-title" style="margin-bottom: 14px">我是</div>
            <div class="gender-pick">
              <button :class="{ on: st.parent.gender === 'F' }" @click="setParentGender('F')">
                <span class="kk" v-html="avaF"></span>妈妈
              </button>
              <button :class="{ on: st.parent.gender === 'M' }" @click="setParentGender('M')">
                <span class="kk" v-html="avaM"></span>爸爸
              </button>
            </div>
            <div class="row2 narrow">
              <div class="field">
                <label>称呼</label>
                <input v-model="st.parent.name" class="inp" placeholder="如：朵朵妈妈" />
                <div class="hint">AI 写信、写消息时会用这个称呼</div>
              </div>
              <div></div>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">家里的另一位家长</div>
            <div class="panel-sub">会一起出现在成长之家的客厅里</div>
            <label class="chk" style="margin-bottom: 14px">
              <input v-model="st.partner.show" type="checkbox" /> 在家里显示
            </label>
            <div class="row2 narrow">
              <div class="field">
                <label>称呼</label>
                <input v-model="st.partner.name" class="inp" placeholder="如：爸爸" />
              </div>
              <div class="field">
                <label>形象</label>
                <div class="seg light">
                  <button :class="{ on: st.partner.gender === 'F' }" @click="st.partner.gender = 'F'">妈妈</button>
                  <button :class="{ on: st.partner.gender === 'M' }" @click="st.partner.gender = 'M'">爸爸</button>
                </div>
              </div>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title" style="margin-bottom: 12px">成长之家</div>
            <label class="chk">
              <input v-model="st.anim" type="checkbox" /> 家里的小动画（孩子走来走去、挥手、跳一跳）
            </label>
            <br />
            <label class="chk" style="margin-top: 10px">
              <input v-model="st.cat" type="checkbox" /> 家里养了一只小猫
            </label>
          </div>
        </template>

        <!-- 孩子 -->
        <template v-else-if="sec === 'kids'">
          <div class="panel set-sec">
            <div class="sec-h">
              <div>
                <div class="panel-title">孩子</div>
                <div class="muted" style="font-size: 12px">
                  每个孩子单独记录打卡、日程、技能、关系网和成长档案
                </div>
              </div>
              <span class="grow"></span>
              <button class="btn btn-dark btn-sm" @click="dialogs.open({ k: 'kid' })">
                <Icon name="plus" :size="14" />添加孩子
              </button>
            </div>
            <table v-if="kidRows.length" class="tbl">
              <thead>
                <tr>
                  <th>孩子</th>
                  <th>阶段</th>
                  <th>年龄</th>
                  <th>学校 / 年级</th>
                  <th class="r">打卡项</th>
                  <th class="r">关系网</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in kidRows" :key="r.k.id">
                  <td>
                    <div class="nm"><span class="kk sm" v-html="kidAva(r.k, 30)"></span>{{ r.k.name }}</div>
                  </td>
                  <td>{{ r.stage }}</td>
                  <td class="sub">{{ r.age }}</td>
                  <td class="sub">{{ r.school }}</td>
                  <td class="r num">{{ r.habits }}</td>
                  <td class="r num">{{ r.people }} 人</td>
                  <td class="r">
                    <button class="btn btn-xs btn-light" @click="dialogs.open({ k: 'kid', kid: r.k })">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty" style="padding: 30px 0">还没有孩子，点右上角「添加孩子」</div>
          </div>
          <div class="panel set-sec">
            <div class="panel-title">孩子升学了</div>
            <div class="para">
              在孩子的「编辑」里换阶段即可。原来的打卡、技能和记录都会保留；新阶段推荐的打卡项可以在 五育打卡 → 从推荐里添加 里挑。
            </div>
          </div>
        </template>

        <!-- AI -->
        <template v-else-if="sec === 'ai'">
          <div class="panel set-sec">
            <div class="panel-title">AI 接口</div>
            <div class="panel-sub">
              填一个 API Key 就能在工作台里直接生成。不配置也能用：生成时会给你一段提示词，复制到豆包、DeepSeek 等网页版即可。
            </div>

            <div class="field">
              <label>服务商</label>
              <select class="sel" :value="a.provider" @change="setProvider(($event.target as HTMLSelectElement).value)">
                <option v-for="p in AI_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <div v-if="preset.site" class="hint">
                到 {{ preset.site }} 注册并创建 API Key<template v-if="preset.hint">；{{ preset.hint }}</template>
              </div>
              <div v-else-if="preset.hint" class="hint">{{ preset.hint }}</div>
            </div>

            <div class="field">
              <label>API Key</label>
              <div class="key-row">
                <input v-model="a.key" class="inp num" :type="keyShown ? 'text' : 'password'" placeholder="sk-..." autocomplete="off" />
                <button class="btn btn-light btn-icon" title="显示/隐藏" aria-label="显示或隐藏 Key" @click="keyShown = !keyShown">
                  <Icon name="eye" :size="15" />
                </button>
              </div>
            </div>

            <div class="row2">
              <div class="field">
                <label>接口地址（Base URL）</label>
                <input v-model="a.base" class="inp" placeholder="https://.../v1" />
              </div>
              <div class="field">
                <label>模型名称</label>
                <input v-model="a.model" class="inp" placeholder="如：deepseek-flash" />
              </div>
            </div>

            <div class="row2">
              <div class="field">
                <label>创造性（temperature）</label>
                <input v-model.number="a.temp" class="inp num" type="number" step="0.1" min="0" max="1.5" placeholder="0.7" />
                <div class="hint">写材料建议 0.6–0.8；出题、分析可以调低到 0.3–0.5</div>
              </div>
              <div class="field">
                <label>隐私</label>
                <label class="chk" style="height: 38px">
                  <input v-model="a.mask" type="checkbox" />发送前隐去名字
                </label>
                <div class="hint">孩子和朋友的名字替换成【孩子01】这样的编号，结果回来后自动换回</div>
              </div>
            </div>

            <div class="test-row">
              <button class="btn btn-dark" @click="testConn">测试连接</button>
              <span v-if="testRes" :class="testRes.cls" class="test-res">
                <Icon v-if="testRes.cls === 'up'" name="check" :size="13" />
                {{ testRes.text }}
              </span>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">连不上？</div>
            <div class="para">
              网页直接调用 AI 时，有些服务商会拦截（跨域限制）。DeepSeek、Kimi、OpenAI、Claude 一般可以直接用；如果提示「连不上」，可以：<br />
              ① 换一家服务商试试；② 用开源包里的 <span class="kbd">ai-proxy.js</span>：电脑装好 Node.js 后运行
              <span class="kbd">node ai-proxy.js</span>，再把接口地址改成 <span class="kbd">http://127.0.0.1:8787/</span>
              加原地址，例如 <span class="kbd">http://127.0.0.1:8787/https://api.deepseek.com</span>。<br />
              API Key 只保存在这台电脑的浏览器里，不会上传到任何地方。
            </div>
          </div>
        </template>

        <!-- 数据 -->
        <template v-else-if="sec === 'data'">
          <div class="panel set-sec">
            <div class="panel-title">数据与备份</div>
            <div class="panel-sub">
              所有数据只保存在这台电脑的浏览器里，不会上传。清理浏览器数据、换电脑前，请先导出备份。
            </div>
            <div class="info-grid data-grid">
              <div class="k">当前数据</div>
              <div>
                {{ state.kids.length }} 个孩子 · {{ nChecks }} 次打卡 · {{ state.events.length }} 个日程 ·
                {{ state.skills.length }} 个技能挑战 · {{ state.people.length }} 位关系网成员 ·
                {{ state.journal.length }} 条成长日记 · {{ state.chats.length }} 个 AI 对话
              </div>
              <div class="k">占用空间</div>
              <div class="num">{{ sizeKB }} KB</div>
              <div class="k">上次备份</div>
              <div>
                <template v-if="st.lastBackup">{{ fmtTime(st.lastBackup) }}</template>
                <span v-else class="dn">还没有备份过</span>
              </div>
              <div class="k">存储状态</div>
              <div>
                <template v-if="data.storageOk">正常</template>
                <span v-else class="dn">浏览器禁止了本地存储，关闭页面后数据会丢失，请及时导出备份</span>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn btn-dark" @click="exportBackup"><Icon name="down" :size="15" />导出备份</button>
              <label class="btn btn-light file-btn">
                <Icon name="up" :size="15" />从备份恢复<input type="file" accept=".json" hidden @change="onRestore" />
              </label>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">重新开始</div>
            <div class="panel-sub">以下操作会覆盖当前数据，建议先导出备份</div>
            <div class="btn-row">
              <button class="btn btn-light" @click="loadDemo">载入示例数据</button>
              <button class="btn btn-light danger" @click="wipe"><Icon name="trash" :size="15" />清空全部数据</button>
            </div>
          </div>
        </template>

        <!-- 关于 -->
        <template v-else>
          <div class="panel set-sec">
            <div class="about-head">
              <span class="brand-logo" v-html="brandMark"></span>
              <div>
                <div class="about-name">学生家长工作台</div>
                <div class="muted" style="font-size: 13px">个人工作台系列 · v{{ VERSION }}</div>
              </div>
            </div>
            <div class="para" style="margin-top: 14px">
              给家长用的孩子成长工作台：德智体美劳五育打卡、学习能力评估和学习计划、成长日历（兴趣班、出去玩、亲子时光）、技能挑战（学骑车、游泳……）、孩子的关系网和朋友生日提醒、身高体重和成长日记，外加可接入任意大模型的
              AI 助手。学校成绩只是其中一项。所有数据都留在你自己的电脑上。<br />开源版只做 PC
              端；手机端和多端同步在商用版里。
            </div>
            <div class="lic-box">
              <b>开源协议</b><br />个人可以免费使用、修改和二次开发，分享时请保留作者署名和协议；禁止任何形式的商业使用。完整条款见随软件附带的
              LICENSE 文件。
            </div>
            <div class="dev-info">
              <b>开发者</b>
              <div class="info-grid dev-grid">
                <div class="k">全网渠道</div>
                <div>@赛博老爸</div>
                <div class="k">商用版 / 合作开发</div>
                <div class="dev-mail">
                  <a :href="'mailto:' + DEV_MAIL">{{ DEV_MAIL }}</a>
                  <button class="btn btn-xs btn-light" @click="copyText(DEV_MAIL)">复制</button>
                </div>
              </div>
            </div>
            <div class="sign">Developed by @赛博老爸</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.set-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 24px;
  align-items: start;
  max-width: 1060px;
}
.set-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  button {
    text-align: left;
    height: 34px;
    padding: 0 12px;
    border-radius: 9px;
    font-size: 13.5px;
    color: var(--ink2);
    &:hover {
      background: var(--fill);
      color: var(--ink);
    }
    &.on {
      background: #ececea;
      color: var(--ink);
      font-weight: 600;
    }
  }
}
.set-sec {
  margin-bottom: 16px;
}
.set-body {
  min-width: 0;
}
.kk {
  display: block;
  line-height: 0;
  :deep(svg) {
    border-radius: 50%;
  }
  &.sm {
    display: inline-block;
    vertical-align: -8px;
    margin-right: 8px;
  }
}
.gender-pick {
  display: flex;
  gap: 14px;
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 10px;
    border-radius: 16px;
    font-size: 13px;
    color: var(--ink2);
    box-shadow: 0 0 0 1px var(--line);
    background: #fff;
    &.on {
      box-shadow: 0 0 0 2px var(--ink);
      color: var(--ink);
      font-weight: 600;
    }
  }
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
  &.narrow {
    margin-top: 18px;
    max-width: 520px;
  }
}
.para {
  font-size: 13px;
  line-height: 1.85;
  color: var(--ink2);
}
.key-row {
  display: flex;
  gap: 6px;
}
.test-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.test-res {
  font-size: 13px;
  white-space: pre-line;
  line-height: 1.6;
  :deep(svg) {
    display: inline-block;
    vertical-align: -2px;
  }
}
.dn {
  color: var(--red);
}
.up {
  color: var(--green);
}
.num {
  font-family: var(--num);
}
.kbd {
  display: inline-block;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--fill);
  box-shadow: inset 0 0 0 1px var(--line2);
  font-size: 12px;
  font-family: var(--num);
}
.data-grid {
  margin-bottom: 16px;
}
.btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.file-btn {
  cursor: pointer;
}
.danger {
  color: var(--red);
}
.about-head {
  display: flex;
  gap: 14px;
  align-items: center;
}
.brand-logo :deep(svg) {
  width: 52px;
  height: 52px;
}
.about-name {
  font-size: 18px;
  font-weight: 700;
}
.lic-box {
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink2);
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--fill);
  border-radius: 12px;
  b {
    color: var(--ink);
  }
}
.dev-info {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px var(--line);
  font-size: 13px;
  > b {
    display: block;
    margin-bottom: 8px;
  }
}
.dev-grid {
  grid-template-columns: 112px 1fr;
  font-size: 13px;
}
.dev-mail {
  display: flex;
  align-items: center;
  gap: 8px;
  a {
    color: var(--ink);
    font-family: var(--num);
  }
}
.sign {
  padding: 14px 0 0;
  font-size: 11px;
  color: var(--ink3);
  text-align: center;
}
@media (max-width: 1080px) {
  .set-layout {
    grid-template-columns: 1fr;
  }
  .set-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
