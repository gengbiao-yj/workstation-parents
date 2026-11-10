import type { DimId, EvTypeId, RelId, RoomId, StageId } from '@/types'

export const VERSION = '1.0.0'
/** 与原始单文件版本共用同一个存储键：老数据开箱即用 */
export const STORE_KEY = 'jz-workbench-v1'

export const KID_COLORS = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#3ea35c', '#e2569a', '#f08a24']
export const BOOK_COLORS = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#3ea35c', '#e2569a', '#f08a24']

export interface DimDef {
  id: DimId
  t: string
  name: string
  short: string
  color: string
  soft: string
  ink: string
  room: RoomId
  icon: string
  desc: string
}

export const DIMS: DimDef[] = [
  { id: 'de', t: '德', name: '品德习惯', short: '品德', color: '#e5483b', soft: '#fdecea', ink: '#c23a2e', room: 'living', icon: 'heart', desc: '礼貌、诚实、守时、责任心、同理心' },
  { id: 'zhi', t: '智', name: '学习能力', short: '学习', color: '#2f7ff0', soft: '#e8f1fe', ink: '#1f63c7', room: 'study', icon: 'bulb', desc: '阅读、专注、思考、表达、自主规划、好奇心' },
  { id: 'ti', t: '体', name: '运动健康', short: '运动', color: '#1d9a57', soft: '#e6f5ec', ink: '#167a45', room: 'sport', icon: 'run', desc: '户外活动、体育锻炼、睡眠、视力、身体发育' },
  { id: 'mei', t: '美', name: '审美艺术', short: '艺术', color: '#7a5af5', soft: '#efebfe', ink: '#5b3fd0', room: 'art', icon: 'palette', desc: '音乐、美术、手工，欣赏自然和好作品' },
  { id: 'lao', t: '劳', name: '劳动生活', short: '劳动', color: '#e89a0c', soft: '#fdf3df', ink: '#a86c00', room: 'kitchen', icon: 'broom', desc: '生活自理、家务、做饭、整理、垃圾分类' }
]
export const DIM: Record<string, DimDef> = Object.fromEntries(DIMS.map((d) => [d.id, d]))
export const ROOM_DIM: Record<RoomId, string> = {
  living: 'de',
  study: 'zhi',
  sport: 'ti',
  art: 'mei',
  kitchen: 'lao',
  bedroom: 'grow'
}

export interface StageDef {
  id: StageId
  name: string
  sub: string
  grades: string[]
  sleep: string
  bed: string
  sleepH: number
  focus: string
  school: string
}

export const STAGES: StageDef[] = [
  { id: 'k', name: '幼儿园', sub: '3–6 岁', grades: ['小班', '中班', '大班'], sleep: '10–13 小时', bed: '21:00', sleepH: 10, focus: '玩中学：生活自理、语言表达、好奇心和运动能力', school: '幼儿园' },
  { id: 'p1', name: '小学低年级', sub: '1–3 年级', grades: ['一年级', '二年级', '三年级'], sleep: '10 小时', bed: '21:20', sleepH: 10, focus: '养习惯：阅读兴趣、专注力、自己的事自己做', school: '小学' },
  { id: 'p2', name: '小学高年级', sub: '4–6 年级', grades: ['四年级', '五年级', '六年级'], sleep: '10 小时', bed: '21:20', sleepH: 10, focus: '学方法：自主规划、整本书阅读、一项长期坚持的爱好', school: '小学' },
  { id: 'm', name: '初中', sub: '7–9 年级', grades: ['初一', '初二', '初三'], sleep: '9 小时', bed: '22:00', sleepH: 9, focus: '找节奏：自我管理、情绪与沟通、体育锻炼和兴趣专长', school: '中学' },
  { id: 'h', name: '高中', sub: '10–12 年级', grades: ['高一', '高二', '高三'], sleep: '8 小时', bed: '23:00', sleepH: 8, focus: '定方向：自律、生涯探索、独立生活能力和身心健康', school: '高中' }
]
export const STAGE: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]))
export const STAGE_AGE: Record<StageId, number> = { k: 5, p1: 7, p2: 10, m: 13, h: 16 }
export const SIBLING: Record<StageId, StageId> = { k: 'p2', p1: 'm', p2: 'k', m: 'p1', h: 'p2' }
export const BASE_H: Record<StageId, number[]> = { k: [110, 109], p1: [124, 123], p2: [140, 141], m: [160, 156], h: [172, 161] }
export const BASE_W: Record<StageId, number[]> = { k: [18.5, 18], p1: [24, 23], p2: [33, 32], m: [48, 45], h: [62, 52] }

export const D_ALL = [1, 2, 3, 4, 5, 6, 7]
export const D_WD = [1, 2, 3, 4, 5]
export const D_WE = [6, 7]

/** [五育, 名称, 单位(空=做到就算), 目标, 哪几天, 默认开启, 特殊类型] */
export type HabitPreset = [DimId, string, string, number, number[], 0 | 1, string?]

export const HABIT_PRESETS: Record<StageId, HabitPreset[]> = {
  k: [
    ['de', '主动打招呼、说谢谢', '', 1, D_ALL, 1], ['de', '玩完玩具自己收好', '', 1, D_ALL, 1], ['de', '排队等待不插队', '', 1, D_ALL, 0], ['de', '说一件今天开心的事', '', 1, D_ALL, 0],
    ['zhi', '亲子共读', '分钟', 15, D_ALL, 1, 'read'], ['zhi', '问一个「为什么」', '', 1, D_ALL, 1], ['zhi', '拼图 / 积木', '分钟', 20, D_ALL, 0], ['zhi', '数数和认形状游戏', '', 1, D_WD, 0],
    ['ti', '户外活动', '分钟', 120, D_ALL, 1], ['ti', '跑跑跳跳', '分钟', 30, D_ALL, 0], ['ti', '21:00 前睡觉', '', 1, D_ALL, 1],
    ['mei', '画画 / 手工', '分钟', 20, D_ALL, 1], ['mei', '听音乐跳跳舞', '', 1, D_ALL, 0], ['mei', '观察大自然（云、树叶、小虫）', '', 1, D_WE, 0],
    ['lao', '自己穿衣穿鞋', '', 1, D_ALL, 1], ['lao', '饭后把碗送进厨房', '', 1, D_ALL, 1], ['lao', '浇花 / 喂宠物', '', 1, [1, 3, 5, 7], 0]
  ],
  p1: [
    ['de', '主动问好、说谢谢', '', 1, D_ALL, 1], ['de', '按时起床不赖床', '', 1, D_WD, 1], ['de', '做错事主动说「对不起」', '', 1, D_ALL, 0], ['de', '每天说一件开心事', '', 1, D_ALL, 0],
    ['zhi', '阅读', '分钟', 20, D_ALL, 1, 'read'], ['zhi', '口算练习', '分钟', 10, D_WD, 1], ['zhi', '自己整理书包', '', 1, D_WD, 1], ['zhi', '讲讲今天学了什么', '', 1, D_WD, 0],
    ['ti', '户外活动', '分钟', 120, D_ALL, 1], ['ti', '跳绳', '下', 300, D_ALL, 1], ['ti', '21:20 前睡觉', '', 1, D_ALL, 1], ['ti', '远眺 / 眼保健操', '', 1, D_ALL, 0],
    ['mei', '兴趣练习（琴 / 画 / 舞）', '分钟', 20, [1, 3, 5, 6], 1], ['mei', '欣赏一首曲子或一幅画', '', 1, D_WE, 0],
    ['lao', '整理自己的书桌和玩具', '', 1, D_ALL, 1], ['lao', '帮忙摆碗筷、擦桌子', '', 1, D_ALL, 1], ['lao', '叠自己的衣服', '', 1, [2, 4, 6], 0]
  ],
  p2: [
    ['de', '守时、不拖延', '', 1, D_WD, 1], ['de', '每天帮助一个人', '', 1, D_ALL, 0], ['de', '和家人聊 10 分钟', '', 1, D_ALL, 1], ['de', '记好零花钱的账', '', 1, D_WE, 0],
    ['zhi', '阅读', '分钟', 30, D_ALL, 1, 'read'], ['zhi', '自己做当天学习计划', '', 1, D_WD, 1], ['zhi', '错题整理', '', 1, D_WD, 1], ['zhi', '写几句日记', '', 1, D_ALL, 0],
    ['ti', '运动 1 小时', '分钟', 60, D_ALL, 1], ['ti', '1 分钟跳绳', '下', 150, [1, 3, 5], 0], ['ti', '21:20 前睡觉', '', 1, D_ALL, 1], ['ti', '远眺 / 眼保健操', '', 1, D_ALL, 1],
    ['mei', '兴趣练习', '分钟', 30, [1, 3, 5, 6], 1], ['mei', '拍一张好照片或画一张速写', '', 1, D_WE, 0],
    ['lao', '洗碗', '', 1, [2, 4, 6], 1], ['lao', '整理自己的房间', '', 1, D_WE, 1], ['lao', '垃圾分类、倒垃圾', '', 1, D_ALL, 0], ['lao', '做一道简单的菜', '', 1, [7], 0]
  ],
  m: [
    ['de', '遵守手机使用约定', '', 1, D_ALL, 1], ['de', '和家人聊聊今天', '', 1, D_ALL, 1], ['de', '自己安排周末', '', 1, D_WE, 0], ['de', '做一件帮助别人的事', '', 1, [6], 0],
    ['zhi', '课外阅读', '分钟', 30, D_ALL, 1, 'read'], ['zhi', '当天错题当天清', '', 1, D_WD, 1], ['zhi', '预习明天的课', '', 1, D_WD, 0], ['zhi', '自主学习一个感兴趣的专题', '分钟', 40, [6], 0],
    ['ti', '运动 1 小时', '分钟', 60, D_ALL, 1], ['ti', '体育中考项目练习', '', 1, [1, 3, 5], 1], ['ti', '22:00 前睡觉', '', 1, D_ALL, 1], ['ti', '娱乐屏幕时间不超过 1 小时', '', 1, D_ALL, 0],
    ['mei', '兴趣练习', '分钟', 30, [2, 4, 6], 1], ['mei', '听一张专辑 / 看一部好电影', '', 1, [6], 0],
    ['lao', '洗自己的衣服', '', 1, [6], 1], ['lao', '打扫自己的房间', '', 1, [7], 1], ['lao', '为家人做一顿饭', '', 1, [7], 0]
  ],
  h: [
    ['de', '按自己定的作息执行', '', 1, D_ALL, 1], ['de', '和父母聊聊近况', '', 1, [3, 6], 1], ['de', '关注一条时事并讨论', '', 1, [7], 0],
    ['zhi', '课外阅读', '分钟', 30, D_ALL, 1, 'read'], ['zhi', '错题本复盘', '', 1, D_WD, 1], ['zhi', '每日学习计划', '', 1, D_ALL, 1], ['zhi', '每周复盘一次', '', 1, [7], 0],
    ['ti', '运动', '分钟', 40, D_ALL, 1], ['ti', '23:00 前睡觉', '', 1, D_ALL, 1], ['ti', '一次球类或跑步', '', 1, [6], 0],
    ['mei', '艺术放松（乐器 / 绘画 / 摄影）', '分钟', 30, [3, 6], 1], ['mei', '看一场展览或演出', '', 1, [7], 0],
    ['lao', '自己洗衣整理', '', 1, [6], 1], ['lao', '为家人做一顿饭', '', 1, [7], 0], ['lao', '负责一项家务（采购 / 记账）', '', 1, [6], 1]
  ]
}

export interface SkillPresetDef {
  id: string
  t: string
  dim: DimId
  icon: string
  stages: StageId[]
  tip: string
  steps: string[]
}

export const SKILL_PRESETS: SkillPresetDef[] = [
  { id: 'bike', t: '学骑自行车', dim: 'ti', icon: 'bike', stages: ['k', 'p1', 'p2'], tip: '先拆掉脚踏板练滑行，平衡找到了，踩踏板就很快。全程戴头盔，选平整、人少的场地。', steps: ['戴好头盔，认识刹车', '推着车走直线', '坐在车上用脚滑行', '抬起脚滑行，保持平衡 3 秒', '踩踏板起步', '独立骑行 20 米', '会转弯、会刹车', '在公园骑满 1 公里'] },
  { id: 'swim', t: '学游泳', dim: 'ti', icon: 'swim', stages: ['k', 'p1', 'p2', 'm'], tip: '找正规泳池和教练；先让孩子喜欢上水，再学动作。', steps: ['不怕水，脸能埋进水里', '憋气、在水里吐泡泡', '借助浮板漂浮', '学会蛙泳腿', '手脚配合', '学会换气', '独立游 25 米', '游满 50 米'] },
  { id: 'rope', t: '跳绳', dim: 'ti', icon: 'rope', stages: ['k', 'p1', 'p2'], tip: '先不拿绳练并脚跳，再练摇绳节奏，最后合在一起。', steps: ['原地并脚连续跳', '单手摇绳找节奏', '连续跳 10 个', '连续跳 50 个', '1 分钟 100 个', '1 分钟 150 个'] },
  { id: 'shoe', t: '自己系鞋带', dim: 'lao', icon: 'shoe', stages: ['k', 'p1'], tip: '用两种颜色的鞋带练，更容易分清左右。', steps: ['分清左右脚', '打第一个结', '做出两个「兔耳朵」', '独立系好一只', '两只都能系好'] },
  { id: 'clock', t: '学会看钟表', dim: 'zhi', icon: 'clock', stages: ['k', 'p1'], tip: '和作息结合：「长针走到 6 我们就出门」。', steps: ['认识整点', '认识半点', '认识几点几分', '会算「还有多久」', '自己按时间做事'] },
  { id: 'poem', t: '背会 30 首古诗', dim: 'zhi', icon: 'poem', stages: ['p1', 'p2'], tip: '每周一首，先讲故事和画面，再背。', steps: ['背会 5 首', '背会 10 首', '背会 15 首', '背会 20 首', '背会 25 首', '背会 30 首'] },
  { id: 'clock2', t: '自己按时起床', dim: 'de', icon: 'clock', stages: ['p1', 'p2', 'm'], tip: '给孩子一个自己的闹钟，起床后的事情排成固定顺序。', steps: ['自己定好闹钟', '闹钟响了 5 分钟内起床', '连续 7 天自己起床', '连续 21 天自己起床'] },
  { id: 'breakfast', t: '独立做一顿早餐', dim: 'lao', icon: 'egg', stages: ['p2', 'm', 'h'], tip: '先讲清楚燃气、刀具和热油的安全，家长在旁边看着。', steps: ['认识厨具，知道哪些危险', '煎一个鸡蛋', '热牛奶、烤面包', '搭配一份营养早餐', '给全家做一次早餐'] },
  { id: 'bus', t: '自己坐公交 / 地铁', dim: 'de', icon: 'bus', stages: ['p2', 'm'], tip: '提前约好走丢或坐过站怎么办，手机里存好家长电话。', steps: ['认识线路和站名', '和家长一起坐，自己认路', '自己刷卡、看站牌', '家长远远跟着独立乘坐', '独立往返一次'] },
  { id: 'money', t: '管理零花钱', dim: 'de', icon: 'coin', stages: ['p1', 'p2', 'm'], tip: '固定日期给零花钱，花完不额外补，让孩子自己做取舍。', steps: ['认识钱币和面值', '有自己的存钱罐', '记一周的账', '为一样想要的东西存钱', '自己做一个月的预算'] },
  { id: 'song', t: '完整弹奏一首曲子', dim: 'mei', icon: 'piano', stages: ['p1', 'p2', 'm', 'h'], tip: '选孩子自己喜欢的曲子，分段练，最后办个家庭小音乐会。', steps: ['选好曲子', '右手旋律', '左手伴奏', '双手合奏（慢速）', '原速完整弹奏', '给家人表演一次'] },
  { id: 'speech', t: '当众讲 3 分钟', dim: 'zhi', icon: 'mic', stages: ['p2', 'm', 'h'], tip: '从给家人讲开始，录下来一起看，只说优点和一个改进点。', steps: ['选一个感兴趣的题目', '写好提纲', '对着镜子练', '给家人讲一次', '在班上或活动上讲'] },
  { id: 'dish', t: '学会一道拿手菜', dim: 'lao', icon: 'pot', stages: ['p2', 'm', 'h'], tip: '从买菜开始，让孩子决定做什么、买多少。', steps: ['选菜、列清单、去买菜', '备菜（洗、切）', '在家长陪同下做第一次', '调整口味再做一次', '独立给全家做一次'] },
  { id: 'code', t: '编程入门', dim: 'zhi', icon: 'code', stages: ['p2', 'm', 'h'], tip: '从图形化编程做小游戏开始，比背语法有意思。', steps: ['用图形化编程让角色动起来', '做出第一个小游戏', '给游戏加计分和关卡', '学一门文字编程语言入门', '做一个解决身边问题的小程序'] },
  { id: 'run', t: '跑完 3 公里', dim: 'ti', icon: 'run', stages: ['m', 'h'], tip: '走跑结合，每周 3 次，每次比上次多一点点。', steps: ['连续跑 5 分钟', '连续跑 1 公里', '连续跑 2 公里', '连续跑 3 公里', '3 公里跑进 20 分钟'] },
  { id: 'camp', t: '自己做一次出游攻略', dim: 'zhi', icon: 'tent', stages: ['p2', 'm', 'h'], tip: '给一个预算和时间，路线、吃住、天气都让孩子来查。', steps: ['定目的地和预算', '查交通和路线', '列出行清单', '做时间表', '出发并按攻略执行', '回来做一次复盘'] }
]
export function skillPreset(id: string): SkillPresetDef | null {
  return SKILL_PRESETS.find((p) => p.id === id) || null
}

/** [名称, 说明, 五育, 时长] */
export type IdeaTuple = [string, string, DimId, string]
export const OUTING_IDEAS: Record<StageId, IdeaTuple[]> = {
  k: [['动物园', '认识动物，回家画一画最喜欢的那个', 'mei', '半天'], ['公园野餐', '带上垫子和小零食，玩泡泡、放风筝', 'ti', '半天'], ['农场采摘', '亲手摘果子，知道食物从哪里来', 'lao', '半天'], ['海洋馆', '看鱼群和水母，回家讲给家人听', 'zhi', '半天'], ['雨后踩水坑', '穿上雨靴，找蜗牛和蚯蚓', 'ti', '1 小时'], ['儿童图书馆', '自己挑 3 本书借回家', 'zhi', '2 小时'], ['亲子手工坊', '做陶泥、扎染或拼贴画', 'mei', '2 小时']],
  p1: [['科技馆', '挑 3 个展项动手玩，回来讲讲原理', 'zhi', '半天'], ['自然博物馆', '找恐龙、矿石和标本，拍照做小手账', 'zhi', '半天'], ['郊外爬山', '比赛找 5 种不同的树叶', 'ti', '半天'], ['骑行绿道', '把学会的骑车本领用上', 'ti', '半天'], ['植物园认植物', '用识花软件认 10 种植物', 'mei', '半天'], ['露营一晚', '一起搭帐篷、看星星', 'ti', '1 天'], ['做一天小记者', '采访一位工作中的人，写几句话', 'de', '2 小时']],
  p2: [['历史博物馆', '提前查一件镇馆之宝，到现场当讲解员', 'zhi', '半天'], ['徒步一条山路', '自己背包，自己看路线', 'ti', '1 天'], ['城市骑行探索', '规划一条 10 公里的骑行路线', 'ti', '半天'], ['看一场话剧 / 音乐会', '回来聊聊最打动自己的地方', 'mei', '半天'], ['露营观星', '认识北斗七星和夏季大三角', 'zhi', '1 天'], ['做一次志愿者', '社区服务、图书馆整理书架', 'de', '半天'], ['参观一所大学', '在校园里走走，去食堂吃顿饭', 'zhi', '半天']],
  m: [['参观大学和实验室', '聊聊以后想学什么', 'zhi', '1 天'], ['长距离徒步', '一起走完 15 公里', 'ti', '1 天'], ['看一场专业演出', '音乐剧、交响乐或话剧', 'mei', '半天'], ['职业体验日', '到亲戚朋友的单位看看一天的工作', 'de', '1 天'], ['孩子做攻略的短途旅行', '预算、路线、住宿都交给孩子', 'zhi', '2 天'], ['做公益', '参加一次社区或公益机构的活动', 'de', '半天']],
  h: [['大学校园探访', '目标院校的开放日或实地走走', 'zhi', '1 天'], ['城市徒步 / 骑行', '边走边聊，不谈成绩', 'ti', '半天'], ['看展', '美术馆、设计展、科技展', 'mei', '半天'], ['孩子主导的家庭旅行', '让孩子当一次「家长」', 'de', '2 天'], ['志愿服务', '持续参与一个自己认可的项目', 'de', '半天'], ['职业访谈', '约一位从事感兴趣职业的人聊一聊', 'zhi', '2 小时']]
}
export const FAMILY_IDEAS: Record<StageId, string[]> = {
  k: ['一起搭一座积木城堡', '玩「我说你做」', '睡前讲一个自编故事', '一起做水果沙拉', '家庭小音乐会：敲锅碗瓢盆', '用纸箱做一个小房子', '一起给植物浇水、量叶子', '玩捉迷藏', '一起画全家福', '吹泡泡比赛', '玩超市购物游戏', '给玩具洗个澡'],
  p1: ['一起包饺子', '家庭桌游夜', '一起读一本书，各自讲最喜欢的一页', '做一个科学小实验（火山爆发）', '玩「你画我猜」', '一起整理旧照片做相册', '晚饭后散步 20 分钟', '一起种一盆豆芽', '羽毛球对打', '搭一个乐高作品', '用废旧材料做手工', '家庭电影夜'],
  p2: ['一起做一顿晚饭，孩子主厨', '下一盘棋', '一起看纪录片并讨论', '家庭辩论：周末去哪儿', '一起拼 500 片拼图', '学一道新菜', '夜跑或快走 30 分钟', '一起写一封给一年后自己的信', '做一次家庭预算会议', '一起拍一组创意照片', '共读一本书', '打一场乒乓球'],
  m: ['一起做顿饭，边做边聊', '散步聊天：只听不评价', '一起看一场球赛', '陪孩子打一局 TA 喜欢的游戏', '一起听歌，互相推荐', '去吃一家新店', '一起健身或跑步', '聊一部电影', '让孩子教你一个新技能', '一起整理房间', '下一盘棋', '周末一起骑行'],
  h: ['夜宵时间聊聊天', '一起跑步', '一起看一部电影', '让孩子推荐一本书', '一起做饭', '聊聊未来想做什么', '一起逛书店', '一起整理旅行照片', '陪孩子去一次想去的地方', '一起听一场播客并讨论', '散步不谈成绩', '一起打一场球']
}

export interface AbilityDef {
  id: string
  t: string
  d: string
  tip: string
}
export const ABILITIES: AbilityDef[] = [
  { id: 'read', t: '阅读理解', d: '愿意读、读得懂、能复述，会说出自己的看法', tip: '固定的共读时间 + 读完聊三个问题：讲了什么？最喜欢哪里？你会怎么做？' },
  { id: 'focus', t: '专注力', d: '能安静做完一件事，不被小事打断', tip: '从短时间开始，用计时器，桌面只放当前要用的东西。' },
  { id: 'think', t: '思考提问', d: '爱问为什么，遇到问题会自己想办法', tip: '少给答案，多反问：「你觉得呢？还有别的办法吗？」' },
  { id: 'express', t: '表达沟通', d: '说得清楚、写得明白，敢在别人面前讲', tip: '饭桌上请孩子讲一件事，家长认真听、追问细节。' },
  { id: 'plan', t: '自主规划', d: '会自己安排时间，知道先做什么后做什么', tip: '让孩子自己排当天的计划，做完自己打勾，家长只看结果。' },
  { id: 'curious', t: '好奇探索', d: '对新事物有兴趣，愿意动手试一试', tip: '每周留一段「什么都不安排」的时间，让孩子自己找事做。' }
]
export const LEVELS = ['刚刚起步', '偶尔做到', '经常做到', '稳定做到', '能带动别人']

export interface EvTypeDef {
  id: EvTypeId
  t: string
  short: string
  color: string
  dim: string
}
export const EV_TYPES: EvTypeDef[] = [
  { id: 'study', t: '学习计划', short: '学习', color: '#2f7ff0', dim: 'zhi' },
  { id: 'sport', t: '运动', short: '运动', color: '#1d9a57', dim: 'ti' },
  { id: 'class', t: '兴趣班', short: '兴趣班', color: '#7a5af5', dim: 'mei' },
  { id: 'outing', t: '出去玩', short: '出游', color: '#f08a24', dim: '' },
  { id: 'family', t: '亲子时光', short: '亲子', color: '#e5483b', dim: 'de' },
  { id: 'school', t: '学校事务', short: '学校', color: '#5c5c5a', dim: '' },
  { id: 'health', t: '健康（体检 / 牙医 / 疫苗）', short: '健康', color: '#14b0a6', dim: 'ti' },
  { id: 'other', t: '其他', short: '其他', color: '#9a9a97', dim: '' }
]
export const EVT: Record<string, EvTypeDef> = Object.fromEntries(EV_TYPES.map((t) => [t.id, t]))
export const BDAY_COLOR = '#e2569a'
export const OUT_LIST = ['水杯', '防晒 / 帽子', '小零食', '湿巾纸巾', '换洗衣服', '充电宝', '证件 / 学生证', '常用药']

export const RELS: { id: RelId; t: string; color: string }[] = [
  { id: 'family', t: '家人', color: '#e5483b' },
  { id: 'friend', t: '好朋友', color: '#f2a71b' },
  { id: 'classmate', t: '同学', color: '#2f7ff0' },
  { id: 'teacher', t: '老师', color: '#14b0a6' },
  { id: 'coach', t: '教练 / 兴趣班', color: '#7a5af5' },
  { id: 'neighbor', t: '邻居 / 其他', color: '#8b9099' }
]
export const REL: Record<string, { id: string; t: string; color: string }> = Object.fromEntries(RELS.map((r) => [r.id, r]))
export const CLOSE: Record<number, string> = { 3: '最亲近', 2: '常在一起', 1: '认识' }

export const MOODS = [
  { id: 'happy', t: '开心', c: '#f2b01e' },
  { id: 'excited', t: '兴奋', c: '#f08a24' },
  { id: 'calm', t: '平静', c: '#14b0a6' },
  { id: 'tired', t: '有点累', c: '#9a9a97' },
  { id: 'worried', t: '担心', c: '#7a5af5' },
  { id: 'sad', t: '难过', c: '#2f7ff0' },
  { id: 'angry', t: '生气', c: '#e5483b' }
]
export const MOOD: Record<string, { id: string; t: string; c: string }> = Object.fromEntries(MOODS.map((m) => [m.id, m]))

export const SUBJECT_PRESETS: Record<StageId, string[]> = {
  k: [],
  p1: ['语文', '数学', '英语'],
  p2: ['语文', '数学', '英语', '科学'],
  m: ['语文', '数学', '英语', '物理', '道法', '历史', '地理', '生物'],
  h: ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理']
}

export const DEMO_BOOKS: Record<StageId, [string, string][]> = {
  k: [['猜猜我有多爱你', '山姆·麦克布雷尼'], ['好饿的毛毛虫', '艾瑞·卡尔'], ['大卫，不可以', '大卫·香农'], ['小熊和最好的爸爸', '阿兰德·丹姆'], ['我爸爸', '安东尼·布朗'], ['蚯蚓的日记', '朵琳·克罗宁']],
  p1: [['小猪唏哩呼噜', '孙幼军'], ['没头脑和不高兴', '任溶溶'], ['神奇校车', '乔安娜·柯尔'], ['青蛙和蟾蜍', '艾诺·洛贝尔'], ['安徒生童话', '安徒生'], ['小狐狸买手套', '新美南吉']],
  p2: [['夏洛的网', 'E.B.怀特'], ['草房子', '曹文轩'], ['小王子', '圣埃克苏佩里'], ['西游记（青少版）', '吴承恩'], ['人类简史（少儿版）', '尤瓦尔·赫拉利'], ['城南旧事', '林海音']],
  m: [['朝花夕拾', '鲁迅'], ['骆驼祥子', '老舍'], ['昆虫记', '法布尔'], ['红星照耀中国', '埃德加·斯诺'], ['海底两万里', '儒勒·凡尔纳'], ['三体', '刘慈欣']],
  h: [['乡土中国', '费孝通'], ['平凡的世界', '路遥'], ['人类简史', '尤瓦尔·赫拉利'], ['红楼梦', '曹雪芹'], ['万历十五年', '黄仁宇'], ['苏菲的世界', '乔斯坦·贾德']]
}

/** AI 服务商预设 */
export interface AiPreset {
  id: string
  name: string
  base: string
  model: string
  site: string
  hint?: string
}
export const AI_PRESETS: AiPreset[] = [
  { id: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat', site: 'platform.deepseek.com', hint: '需要更强的推理可以把模型改成 deepseek-reasoner' },
  { id: 'qwen', name: '通义千问（阿里云百炼）', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', site: 'bailian.console.aliyun.com' },
  { id: 'kimi', name: 'Kimi（月之暗面）', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', site: 'platform.moonshot.cn' },
  { id: 'glm', name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', site: 'open.bigmodel.cn', hint: 'glm-4-flash 是免费模型，也可以换成控制台里的其他模型' },
  { id: 'doubao', name: '豆包（火山方舟）', base: 'https://ark.cn-beijing.volces.com/api/v3', model: '', site: 'console.volcengine.com/ark', hint: '模型名填方舟控制台里的模型 ID 或推理接入点 ID' },
  { id: 'silicon', name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct', site: 'cloud.siliconflow.cn' },
  { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', site: 'platform.openai.com' },
  { id: 'claude', name: 'Claude（Anthropic）', base: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-5', site: 'console.anthropic.com' },
  { id: 'ollama', name: 'Ollama 本地模型', base: 'http://localhost:11434/v1', model: 'qwen2.5:7b', site: 'ollama.com', hint: '本地运行无需 Key；需设置环境变量 OLLAMA_ORIGINS=* 允许网页访问' },
  { id: 'custom', name: '自定义（OpenAI 兼容接口）', base: '', model: '', site: '', hint: '任何兼容 /chat/completions 的服务都可以，比如 one-api、new-api 中转' }
]
