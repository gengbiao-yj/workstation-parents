import { SKILL_PRESETS } from '@/data/constants'
import { personById, skillById, stageOf } from '@/lib/query'
import { kidContext, personContext } from '@/lib/aiCtx'
import type { AppState, Kid } from '@/types'

export type TplFieldType = 'text' | 'textarea' | 'select' | 'check' | 'kid' | 'person' | 'skill'

export interface TplField {
  key: string
  type: TplFieldType
  label: string
  /** select 的选项 */
  opts?: string[]
  /** 默认值：文本 / 勾选状态 */
  def?: string | boolean
  ph?: string
  req?: boolean
}

/** 一次生成任务（模板产出或直接提问） */
export interface TplJob {
  title: string
  /** 气泡里显示的简短版本 */
  show: string
  prompt: string
  ctx: string[]
  kid: string
  tpl?: string
}

export interface TplDef {
  id: string
  cat: string
  rec?: boolean
  color: string
  ico: string
  title: string
  desc: string
  fields: TplField[]
  build: (v: Record<string, any>, k: Kid, s: AppState) => TplJob
}

export const TPL_CATS: [string, string][] = [
  ['rec', '推荐'],
  ['learn', '学习成长'],
  ['play', '亲子陪伴'],
  ['heart', '品格与情绪'],
  ['school', '家校沟通'],
  ['life', '生活健康']
]

export const TPLS: TplDef[] = [
  {
    id: 'outing',
    cat: 'play',
    rec: true,
    color: '#f08a24',
    ico: '游',
    title: '周末出游计划',
    desc: '按孩子年龄排好时间表、出行清单和安全提醒，还有边玩边学的小任务',
    fields: [
      { key: 'kid', type: 'kid', label: '带谁去' },
      { key: 'where', type: 'text', label: '想去哪 / 什么类型', ph: '如：科技馆、郊外爬山；不填就让 AI 推荐' },
      { key: 'len', type: 'select', label: '时长', opts: ['半天', '一天', '两天一夜'] },
      { key: 'budget', type: 'select', label: '预算', opts: ['200 元以内', '500 元以内', '1000 元以内', '不限'] },
      { key: 'go', type: 'select', label: '交通', opts: ['公共交通', '自驾', '骑行 / 步行'] },
      { key: 'extra', type: 'textarea', label: '其他要求', ph: '选填，比如下雨的备选、老人同行' }
    ],
    build: (v, k, s) => ({
      title: (v.where || '周末') + ' · 出游计划',
      show: '帮我规划一次' + v.len + '的出游' + (v.where ? '：' + v.where : '') + '，预算' + v.budget + '，' + v.go,
      prompt:
        '请为我们家规划一次' +
        v.len +
        '的亲子出游。' +
        (v.where ? '想去：' + v.where + '。' : '请先推荐 3 个适合这个年龄的去处，再选一个最合适的详细规划。') +
        '预算' +
        v.budget +
        '，交通方式：' +
        v.go +
        '。' +
        (v.extra ? '其他要求：' + v.extra + '。' : '') +
        '\n内容：一、时间表（用表格）；二、出行清单；三、安全提醒；四、边玩边学的小任务（按德智体美劳各设计一个，适合孩子年龄）；五、回来后和孩子聊的 3 个问题。',
      ctx: [kidContext(s, k, { cal: true })],
      kid: k.id
    })
  },
  {
    id: 'family',
    cat: 'play',
    rec: true,
    color: '#e5483b',
    ico: '玩',
    title: '亲子活动点子',
    desc: '在家或户外、有多少时间都能玩，每个点子标注锻炼的是哪一育',
    fields: [
      { key: 'kid', type: 'kid', label: '和谁玩' },
      { key: 'where', type: 'select', label: '在哪', opts: ['在家', '小区 / 公园', '都可以'] },
      { key: 'time', type: 'select', label: '有多少时间', opts: ['30 分钟', '1 小时', '半天'] },
      { key: 'need', type: 'select', label: '想侧重', opts: ['不限', '德 · 品德', '智 · 学习', '体 · 运动', '美 · 艺术', '劳 · 劳动'] }
    ],
    build: (v, k, s) => ({
      title: '亲子活动点子',
      show: '给我 10 个' + v.where + '、' + v.time + '的亲子活动' + (v.need !== '不限' ? '，侧重' + v.need : ''),
      prompt:
        '请给 10 个适合这个孩子的亲子活动点子，场地：' +
        v.where +
        '，时长：' +
        v.time +
        (v.need !== '不限' ? '，侧重' + v.need : '') +
        '。每个写：名称、准备什么、怎么玩（3 步以内）、锻炼的是德智体美劳哪一育、家长可以怎么引导。用表格或列表都可以，尽量不用花钱、不用屏幕。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'story',
    cat: 'play',
    rec: true,
    color: '#7a5af5',
    ico: '故',
    title: '睡前故事',
    desc: '用孩子当主角，讲一个关于勇敢、分享、坚持的小故事',
    fields: [
      { key: 'kid', type: 'kid', label: '讲给谁听' },
      {
        key: 'theme',
        type: 'select',
        label: '想传递的',
        opts: ['勇敢', '分享', '坚持', '诚实', '友谊', '好奇心', '接纳不完美', '自己的事自己做']
      },
      { key: 'len', type: 'select', label: '长度', opts: ['5 分钟', '10 分钟', '3 分钟'] },
      { key: 'hero', type: 'check', label: '用孩子的名字当主角', def: true },
      { key: 'about', type: 'text', label: '最近发生的事（选填）', ph: '如：这周不敢上台表演' }
    ],
    build: (v, k, s) => ({
      title: '睡前故事 · ' + v.theme,
      show: '给' + k.name + '讲一个关于「' + v.theme + '」的睡前故事（' + v.len + '）',
      prompt:
        '请写一个' +
        v.len +
        '能讲完的睡前故事（按每分钟 180 字估算），主题：' +
        v.theme +
        '。' +
        (v.hero ? '主角就是这个孩子本人。' : '主角是一只小动物。') +
        (v.about ? '可以自然地联系到最近的事：' + v.about + '。' : '') +
        '要求：适合孩子的年龄，语言温暖有画面感，不说教，结尾留一个可以和孩子聊的问题。只输出故事本身。',
      ctx: [kidContext(s, k, { journal: 3 })],
      kid: k.id
    })
  },
  {
    id: 'studyplan',
    cat: 'learn',
    rec: true,
    color: '#2f7ff0',
    ico: '计',
    title: '学习计划',
    desc: '结合年龄、作息和薄弱点，排一份孩子能自己执行的一周计划',
    fields: [
      { key: 'kid', type: 'kid', label: '给谁定' },
      { key: 'goal', type: 'textarea', label: '想改善什么', ph: '如：阅读兴趣不高、计算容易粗心', req: true },
      { key: 'time', type: 'select', label: '每天能用的时间', opts: ['20 分钟', '30 分钟', '45 分钟', '1 小时'] },
      { key: 'span', type: 'select', label: '周期', opts: ['一周', '一个月', '一个假期'] }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 学习计划',
      show: '帮' + k.name + '定一份' + v.span + '的学习计划，每天 ' + v.time + '：' + v.goal,
      prompt:
        '请为这个孩子定一份' +
        v.span +
        '的学习计划，每天可用时间 ' +
        v.time +
        '，想改善：' +
        v.goal +
        '。\n要求：符合「双减」和孩子年龄（不要超前学），以培养学习能力和习惯为主；用表格列出每天做什么、多长时间、怎样算完成；写清楚怎么让孩子自己参与制定和打勾；最后给家长 3 条陪伴建议（少盯、多鼓励）。',
      ctx: [kidContext(s, k, { cal: true })],
      kid: k.id
    })
  },
  {
    id: 'ability',
    cat: 'learn',
    rec: true,
    color: '#2f7ff0',
    ico: '能',
    title: '学习能力提升建议',
    desc: '根据每月的学习能力评估，给出最该先练的一项和具体方法',
    fields: [{ key: 'kid', type: 'kid', label: '孩子' }],
    build: (v, k, s) => ({
      title: k.name + ' · 学习能力建议',
      show: '根据' + k.name + '的学习能力评估给我一些提升建议',
      prompt:
        '请根据学习能力自评和最近情况，分析这个孩子的学习能力：先说 2 个优势，再挑 1–2 项最值得先练的能力，每项给出：在家可以做的 3 个小练习（具体到每天几分钟、怎么做）、家长要避免的做法、一个月后怎么看有没有进步。不要提分数和排名。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'books',
    cat: 'learn',
    color: '#3ea35c',
    ico: '书',
    title: '阅读书单',
    desc: '按孩子的年龄和兴趣推荐书，说明为什么适合、怎么共读',
    fields: [
      { key: 'kid', type: 'kid', label: '给谁读' },
      { key: 'like', type: 'text', label: '最近喜欢什么', ph: '如：恐龙、太空、侦探故事' },
      { key: 'n', type: 'select', label: '推荐几本', opts: ['8 本', '5 本', '12 本'] },
      { key: 'type', type: 'select', label: '类型', opts: ['都可以', '绘本 / 桥梁书', '文学故事', '科普', '历史人文'] }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 推荐书单',
      show: '给' + k.name + '推荐 ' + v.n + '书' + (v.like ? '，最近喜欢' + v.like : ''),
      prompt:
        '请给这个孩子推荐 ' +
        v.n +
        '书，类型：' +
        v.type +
        (v.like ? '，最近喜欢：' + v.like : '') +
        '。只推荐确定存在的经典或知名书，每本写：书名、作者、适合的原因（一句话）、读完可以和孩子聊的一个问题。避开孩子已经读过的书。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'skill',
    cat: 'learn',
    color: '#1d9a57',
    ico: '技',
    title: '技能怎么教',
    desc: '学骑车、游泳、系鞋带……卡在哪一步，给分步方法和鼓励的话',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'skill', type: 'skill', label: '哪个技能' },
      { key: 'stuck', type: 'textarea', label: '现在卡在哪', ph: '如：一抬脚就害怕，总想用脚撑地' }
    ],
    build: (v, k, s) => {
      const sk = skillById(s, v.skill)
      const name = sk ? sk.name : v.skill
      return {
        title: name + ' · 怎么教',
        show: '怎么教' + k.name + name + (v.stuck ? '？现在：' + v.stuck : ''),
        prompt:
          '请教我怎么带这个孩子学会「' +
          name +
          '」。' +
          (sk ? '我们拆的步骤是：' + sk.steps.map((x, i) => i + 1 + '. ' + x.t + (x.done ? '（已做到）' : '')).join('；') + '。' : '') +
          (v.stuck ? '现在卡在：' + v.stuck + '。' : '') +
          '\n内容：卡住的常见原因、接下来一周的练习方法（每次 15–20 分钟，像游戏一样）、安全注意、孩子害怕或想放弃时家长可以说的 5 句话。',
        ctx: [kidContext(s, k, { journal: 3 })],
        kid: k.id
      }
    }
  },
  {
    id: 'report',
    cat: 'learn',
    rec: true,
    color: '#14b0a6',
    ico: '报',
    title: '五育成长月报',
    desc: '把这个月的打卡、技能、阅读、日记整理成一份成长小结',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'for', type: 'select', label: '写给谁看', opts: ['家长自己', '孩子（用孩子听得懂的话）', '全家（发家庭群）'] }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · ' + (new Date().getMonth() + 1) + '月成长小结',
      show: '把' + k.name + '这个月的成长整理成一份小结（写给' + v.for + '）',
      prompt:
        '请根据资料写一份本月五育成长小结，写给：' +
        v.for +
        '。结构：这个月最值得夸的 3 件事（具体）、德智体美劳各一句话的观察、一个小遗憾或需要调整的地方、下个月的 3 个小目标。语气温暖真诚，不比较、不说教。' +
        (String(v.for).indexOf('孩子') === 0 ? '用孩子能听懂的话，像写给 TA 的一封信。' : ''),
      ctx: [kidContext(s, k, { journal: 8 })],
      kid: k.id
    })
  },
  {
    id: 'emotion',
    cat: 'heart',
    rec: true,
    color: '#7a5af5',
    ico: '心',
    title: '情绪引导 · 谈心',
    desc: '孩子哭闹、发脾气、闷闷不乐时，先共情再沟通的话术和聊天提纲',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'what', type: 'textarea', label: '发生了什么', ph: '如：和同学闹别扭，回家一句话不说', req: true },
      { key: 'react', type: 'select', label: '孩子现在的状态', opts: ['很生气', '在哭', '不说话', '有点低落', '已经平静了'] }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 谈心提纲',
      show: '孩子' + v.react + '：' + v.what + '。我该怎么跟 TA 聊？',
      prompt:
        '孩子现在' +
        v.react +
        '，发生的事：' +
        v.what +
        '。请帮我准备怎么和孩子聊：一、现在先别做的 3 件事；二、先共情的 3 句话（贴合孩子年龄）；三、等孩子平静后的聊天提纲（开放式问题）；四、帮孩子想办法而不是替 TA 解决；五、之后几天怎么观察。',
      ctx: [kidContext(s, k, { journal: 5 })],
      kid: k.id
    })
  },
  {
    id: 'social',
    cat: 'heart',
    color: '#f2a71b',
    ico: '友',
    title: '交朋友的问题',
    desc: '被孤立、闹矛盾、不会拒绝……帮孩子处理和朋友的关系',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'person', type: 'person', label: '和谁有关（选填）' },
      { key: 'what', type: 'textarea', label: '情况', ph: '如：好朋友最近不和 TA 玩了', req: true }
    ],
    build: (v, k, s) => {
      const p = personById(s, v.person)
      return {
        title: k.name + ' · 朋友之间',
        show: '关于' + k.name + (p ? '和' + p.name : '') + '：' + v.what,
        prompt:
          '孩子遇到了朋友之间的问题：' +
          v.what +
          '。请帮我：分析孩子可能的感受和对方可能的想法；给孩子 2–3 个可以自己尝试的办法（附上可以直接说的话）；家长什么时候需要介入、怎么介入；以后怎么帮孩子提升交朋友的能力。',
        ctx: [kidContext(s, k, { people: true, journal: 3 })].concat(p ? [personContext(p)] : []),
        kid: k.id
      }
    }
  },
  {
    id: 'greet',
    cat: 'heart',
    color: '#e2569a',
    ico: '贺',
    title: '生日祝福',
    desc: '用孩子的口吻写给朋友或家人的生日祝福，附手工贺卡点子',
    fields: [
      { key: 'kid', type: 'kid', label: '谁来祝福' },
      { key: 'person', type: 'person', label: '给谁过生日' },
      { key: 'style', type: 'select', label: '风格', opts: ['真诚温暖', '有趣好玩', '简短一句'] }
    ],
    build: (v, k, s) => {
      const p = personById(s, v.person)
      return {
        title: (p ? p.name : '') + ' · 生日祝福',
        show: '帮' + k.name + '给' + (p ? p.name : '朋友') + '写生日祝福（' + v.style + '）',
        prompt:
          '请用这个孩子自己的口吻，给对方写 3 段生日祝福（' +
          v.style +
          '），要贴合孩子的年龄和两人的关系，可以提到对方喜欢的东西。再给 1 个孩子能自己做的手工贺卡点子和 3 个不贵的小礼物建议。',
        ctx: [kidContext(s, k, { journal: 2 })].concat(p ? [personContext(p)] : []),
        kid: k.id
      }
    }
  },
  {
    id: 'habit',
    cat: 'heart',
    color: '#e5483b',
    ico: '惯',
    title: '习惯养成 21 天',
    desc: '想让孩子改掉拖拉、养成整理的习惯？给一份 21 天小计划',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'habit', type: 'text', label: '想养成 / 改掉的习惯', ph: '如：写作业拖拉、睡前玩手机', req: true },
      { key: 'now', type: 'textarea', label: '现在的情况', ph: '选填' }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 21 天习惯计划',
      show: '帮' + k.name + '做一个「' + v.habit + '」的 21 天计划',
      prompt:
        '请为这个孩子设计一个 21 天习惯计划，目标：' +
        v.habit +
        '。' +
        (v.now ? '现在的情况：' + v.now + '。' : '') +
        '分三周：每周的目标（从很小的一步开始）、每天具体怎么做、怎么记录（可以用五育打卡）、怎么奖励（以精神鼓励为主）、中途做不到怎么办。最后写一份可以贴在墙上的「我的约定」，用孩子的口吻。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'letter',
    cat: 'heart',
    color: '#e2569a',
    ico: '信',
    title: '写给孩子的一封信',
    desc: '生日、开学、毕业，或者想说一声对不起的时候',
    fields: [
      { key: 'kid', type: 'kid', label: '写给谁' },
      {
        key: 'when',
        type: 'select',
        label: '什么时候',
        opts: ['生日', '开学', '毕业 / 升学', '想鼓励 TA', '想说声对不起', '没有特别原因']
      },
      { key: 'say', type: 'textarea', label: '最想说的话（选填）' }
    ],
    build: (v, k, s) => ({
      title: '写给' + k.name + '的信',
      show: '帮我写一封给' + k.name + '的信（' + v.when + '）',
      prompt:
        '请以' +
        s.settings.parent.name +
        '的口吻，写一封给孩子的信，场合：' +
        v.when +
        '。' +
        (v.say ? '最想说的话：' + v.say + '。' : '') +
        '要求：真诚具体，提到孩子最近的 1–2 件小事，不说教，不提成绩排名，长度 400 字左右，适合孩子的年龄读。',
      ctx: [kidContext(s, k, { journal: 6 })],
      kid: k.id
    })
  },
  {
    id: 'teacher',
    cat: 'school',
    rec: true,
    color: '#5c5c5a',
    ico: '师',
    title: '给老师发消息',
    desc: '请假、反映问题、感谢老师、了解在校情况，礼貌又说清楚',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'why', type: 'select', label: '事由', opts: ['了解在校情况', '反映一个问题', '请假', '感谢老师', '其他'] },
      { key: 'detail', type: 'textarea', label: '具体情况', ph: '如：孩子说最近上课听不懂，想问问老师', req: true }
    ],
    build: (v, k, s) => ({
      title: '给老师的消息',
      show: '帮我给' + k.name + '的老师发消息：' + v.why + '，' + v.detail,
      prompt:
        '请帮我写一条发给孩子老师的微信消息，事由：' +
        v.why +
        '，具体情况：' +
        v.detail +
        '。写两个版本：一个简短（80 字以内），一个稍详细（150 字左右）。要求礼貌、尊重老师的时间、把事情说清楚，必要时提出家长可以配合的地方。称呼用「' +
        (k.teacher || '老师') +
        '」。',
      ctx: [kidContext(s, k, { journal: 2 })],
      kid: k.id
    })
  },
  {
    id: 'pmeet',
    cat: 'school',
    color: '#5c5c5a',
    ico: '会',
    title: '家长会准备',
    desc: '想问老师的问题清单，和一张会上记录的小表',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'care', type: 'textarea', label: '最关心的', ph: '如：上课专注度、和同学相处' }
    ],
    build: (v, k, s) => ({
      title: '家长会准备',
      show: '帮我准备' + k.name + '的家长会' + (v.care ? '，最关心：' + v.care : ''),
      prompt:
        '请帮我准备家长会：列出 6–8 个想问老师的问题（覆盖学习习惯、课堂表现、同学相处、需要家长配合的事），按重要程度排序；再给一张会上记录用的小表格；最后提醒回家后怎么和孩子聊家长会（先说老师夸的）。' +
        (v.care ? '我最关心：' + v.care + '。' : ''),
      ctx: [kidContext(s, k, { exam: true })],
      kid: k.id
    })
  },
  {
    id: 'exam-talk',
    cat: 'school',
    color: '#2f7ff0',
    ico: '考',
    title: '考试后怎么聊',
    desc: '考好了怎么夸、没考好怎么说，不给孩子压力又能帮到 TA',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'how', type: 'select', label: '这次', opts: ['考得不错', '和平时差不多', '没考好'] },
      { key: 'mood', type: 'select', label: '孩子的状态', opts: ['挺开心', '无所谓', '很沮丧', '很紧张'] }
    ],
    build: (v, k, s) => ({
      title: '考试后的聊天',
      show: k.name + '这次' + v.how + '，状态' + v.mood + '，我该怎么聊？',
      prompt:
        '孩子这次考试' +
        v.how +
        '，现在' +
        v.mood +
        '。请告诉我：开口第一句可以怎么说（3 种）；怎么和孩子一起看试卷、分清粗心和没懂；夸奖时夸什么（努力和方法，而不是聪明）；不要说的话；接下来一周怎么帮 TA。',
      ctx: [kidContext(s, k, { exam: true })],
      kid: k.id
    })
  },
  {
    id: 'screen',
    cat: 'life',
    color: '#14b0a6',
    ico: '屏',
    title: '手机 / 平板约定',
    desc: '和孩子一起商量一份屏幕时间约定，孩子愿意遵守的那种',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      {
        key: 'now',
        type: 'select',
        label: '现在每天大约用多久',
        opts: ['不到半小时', '半小时到 1 小时', '1–2 小时', '2 小时以上']
      },
      { key: 'use', type: 'text', label: '主要用来做什么', ph: '如：看动画、打游戏、和同学聊天' }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 屏幕时间约定',
      show: '帮我和' + k.name + '定一份屏幕时间约定，现在每天' + v.now,
      prompt:
        '孩子现在每天用屏幕' +
        v.now +
        (v.use ? '，主要用来' + v.use : '') +
        '。请帮我：一、按孩子年龄说说多少时间比较合适；二、怎么和孩子商量（让 TA 参与定规则）；三、一份「家庭屏幕约定」草稿（用孩子能看懂的话，包括时间、地点、内容、超时怎么办、家长也要遵守的）；四、可以替代屏幕的 5 个活动。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'sleep',
    cat: 'life',
    color: '#14b0a6',
    ico: '睡',
    title: '作息和睡眠',
    desc: '睡得晚、起不来？给一份孩子能坚持的作息和睡前流程',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'bed', type: 'select', label: '现在一般几点睡', opts: ['21:00 前', '21:00–22:00', '22:00–23:00', '23:00 以后'] },
      { key: 'issue', type: 'text', label: '主要问题', ph: '如：睡前磨蹭、早上起不来' }
    ],
    build: (v, k, s) => {
      const st = stageOf(k)
      return {
        title: k.name + ' · 作息计划',
        show: k.name + '现在' + v.bed + '睡，' + (v.issue || '想调整作息'),
        prompt:
          '孩子现在一般' +
          v.bed +
          '睡' +
          (v.issue ? '，主要问题：' + v.issue : '') +
          '。这个阶段建议睡眠 ' +
          st.sleep +
          '、' +
          st.bed +
          ' 前上床。请给：一份工作日作息表；20–30 分钟的睡前流程；用一两周把作息调过来的办法（每次提前 15 分钟）；周末怎么安排不打乱节奏。',
        ctx: [kidContext(s, k)],
        kid: k.id
      }
    }
  },
  {
    id: 'chores',
    cat: 'life',
    color: '#e89a0c',
    ico: '劳',
    title: '家务分工表',
    desc: '按年龄给孩子分配家务，做成一张全家都参与的分工表',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'who', type: 'text', label: '家里有谁', def: '爸爸、妈妈、孩子' }
    ],
    build: (v, k, s) => ({
      title: '家务分工表',
      show: '帮我们家做一张家务分工表（' + v.who + '）',
      prompt:
        '家里有：' +
        v.who +
        '。请先列出这个年龄孩子能做的家务（每天的、每周的各几项），再做一张全家一周家务分工表（表格），孩子的任务从简单开始，大人也要有分工。最后说说怎么让孩子愿意做：示范、一起做、不要求完美、做完说谢谢。',
      ctx: [kidContext(s, k)],
      kid: k.id
    })
  },
  {
    id: 'teen',
    cat: 'heart',
    color: '#7a5af5',
    ico: '聊',
    title: '和青春期孩子沟通',
    desc: '孩子不爱说话、顶嘴、关上房门时，家长可以怎么做',
    fields: [
      { key: 'kid', type: 'kid', label: '孩子' },
      { key: 'what', type: 'textarea', label: '最近的情况', ph: '如：回家就进房间，问什么都说「没事」', req: true }
    ],
    build: (v, k, s) => ({
      title: k.name + ' · 青春期沟通',
      show: '关于和' + k.name + '的沟通：' + v.what,
      prompt:
        '孩子最近：' +
        v.what +
        '。请帮我理解这个年龄孩子的心理（简短），然后给：家长先调整的 3 件事；能打开话匣子的 5 个场景或话题（不谈成绩）；孩子愿意说的时候怎么听；需要立规矩时怎么说才不变成吵架；什么情况下需要找学校心理老师或专业帮助。',
      ctx: [kidContext(s, k, { journal: 5 })],
      kid: k.id
    })
  }
]

export function tplById(id: string): TplDef | null {
  return TPLS.find((t) => t.id === id) || null
}

/** 某分类下要展示的模板 */
export function tplList(s: AppState, tab: string, k: Kid | null): TplDef[] {
  return TPLS.filter(
    (x) => x.cat !== 'hidden' && (tab === 'rec' ? x.rec : x.cat === tab) && (x.id !== 'teen' || !k || k.stage === 'm' || k.stage === 'h' || tab === 'heart')
  )
}

/** 技能下拉：已有技能 + 该阶段还没开始的预设 */
export function skillOptions(s: AppState, k: Kid): { id: string; name: string }[] {
  const sk = s.skills.filter((x) => x.kid === k.id)
  const out = sk.map((x) => ({ id: x.id, name: x.name }))
  SKILL_PRESETS.filter((p) => p.stages.indexOf(k.stage) >= 0 && !sk.some((x) => x.pre === p.id)).forEach((p) => {
    out.push({ id: p.t, name: p.t + '（还没开始）' })
  })
  return out
}
