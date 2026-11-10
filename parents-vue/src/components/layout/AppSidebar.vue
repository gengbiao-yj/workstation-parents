<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import Icon from "@/components/ui/Icon.vue";
  import { brandMark, kidAva, personAva } from "@/lib/avatar";
  import { adultAvatar } from "@/art/home";
  import { useData } from "@/stores/data";
  import { useUi } from "@/stores/ui";
  import { EVT, REL } from "@/data/constants";
  import { fmtMD, parseDate, WEEK } from "@/lib/date";
  import { stageOf } from "@/lib/query";
  import type { IconName } from "@/data/icons";

  const data = useData();
  const ui = useUi();
  const router = useRouter();
  const q = ref("");
  const focusedFirst = ref(true);

  const NAV: { page: string; icon: IconName; label: string }[] = [
    { page: "/home", icon: "home", label: "成长之家" },
    { page: "/calendar", icon: "cal", label: "成长日历" },
    { page: "/wuyu", icon: "star", label: "五育打卡" },
    { page: "/study", icon: "bulb", label: "学习力" },
    { page: "/skills", icon: "flag", label: "技能挑战" },
    { page: "/people", icon: "users", label: "关系网" },
    { page: "/profile", icon: "ruler", label: "成长档案" },
    { page: "/ai", icon: "spark", label: "AI 助手" },
  ];

  const brandSub = computed(() => {
    const k = data.curKid;
    return k ? k.name + " · " + (k.grade || stageOf(k).name) : "记录孩子的成长";
  });
  const meSub = computed(() =>
    data.state.kids.length
      ? data.state.kids.map((k) => k.name).join("、") + "的家长"
      : "还没有添加孩子",
  );
  const parent = computed(() => data.state.settings.parent);
  const recentChats = computed(() => data.state.chats.slice(0, 6));

  interface SearchItem {
    key: string;
    html: string;
    label: string;
    right: string;
    go: () => void;
  }
  const results = computed<SearchItem[]>(() => {
    const s = q.value.trim();
    if (!s) return [];
    const out: SearchItem[] = [];
    data.state.kids.forEach((k) => {
      if (k.name.indexOf(s) >= 0)
        out.push({
          key: "k" + k.id,
          html: kidAva(k, 24),
          label: k.name,
          right: "孩子",
          go: () => {
            data.setCur(k.id);
            close();
            router.push("/profile");
          },
        });
    });
    data.state.people.forEach((p) => {
      if (p.name.indexOf(s) >= 0 || (p.likes || "").indexOf(s) >= 0) {
        const k = data.state.kids.find((x) => x.id === p.kid);
        out.push({
          key: "p" + p.id,
          html: personAva(p, 24),
          label: p.name,
          right: (k ? k.name + "的" : "") + (p.label || REL[p.rel].t),
          go: () => {
            close();
            router.push({ path: "/people", query: { person: p.id } });
          },
        });
      }
    });
    data.state.events.forEach((e) => {
      if (e.title.indexOf(s) >= 0)
        out.push({
          key: "e" + e.id,
          html: `<i class="cdot" style="background:${EVT[e.type].color};margin:0 8px"></i>`,
          label: e.title,
          right:
            e.repeat === "weekly"
              ? "每周" + WEEK[(parseDate(e.date) as Date).getDay()]
              : fmtMD(e.date),
          go: () => {
            close();
            router.push({ path: "/calendar", query: { ds: e.date, ev: e.id } });
          },
        });
    });
    data.state.books.forEach((b) => {
      if (b.title.indexOf(s) >= 0)
        out.push({
          key: "b" + b.id,
          html: `<i class="cdot" style="background:${b.color || "#2f7ff0"};margin:0 8px;border-radius:2px"></i>`,
          label: "《" + b.title + "》",
          right: "书架",
          go: () => {
            close();
            router.push({ path: "/study", query: { tab: "books" } });
          },
        });
    });
    return out.slice(0, 9);
  });

  function close() {
    (document.activeElement as HTMLElement | null)?.blur();
    q.value = "";
  }
  function onEnter() {
    if (results.value.length) results.value[0].go();
  }

  async function clearDemo() {
    const ok = await ui.confirm(
      "开始记录我的孩子",
      "会清空现在看到的示例家庭（打卡、日程、技能、关系网、日记），换成你自己孩子的真实记录。<br>家庭设置和 AI 接口配置会保留。",
      "清空示例",
      true,
    );
    if (!ok) return;
    data.resetAll(true);
    data.state.settings.onboarded = false;
    data.save(true);
    ui.toast("已清空示例，跟着欢迎页添加自己的孩子");
  }
</script>

<template>
  <aside class="side">
    <div class="brand">
      <span v-html="brandMark"></span>
      <div>
        <div class="brand-name">学生家长工作台</div>
        <div class="brand-sub">{{ brandSub }}</div>
      </div>
    </div>

    <div class="search">
      <Icon name="search" :size="14" style="color: #9a9a97" />
      <input
        v-model="q"
        placeholder="搜索朋友、日程、书"
        autocomplete="off"
        @keydown.enter.prevent="onEnter"
      />
      <div v-if="q.trim()" class="search-pop">
        <template v-if="results.length">
          <button
            v-for="(r, i) in results"
            :key="r.key"
            :class="{ on: i === 0 && focusedFirst }"
            @mousedown.prevent="r.go()"
          >
            <span class="ava-wrap" v-html="r.html"></span>
            <span>{{ r.label }}</span>
            <span class="muted">{{ r.right }}</span>
          </button>
        </template>
        <div v-else class="muted" style="padding: 8px 10px; font-size: 12.5px">
          没有找到「{{ q.trim() }}」
        </div>
      </div>
    </div>

    <nav class="nav">
      <router-link v-for="n in NAV" :key="n.page" :to="n.page">
        <span class="ico"><Icon :name="n.icon" :size="17" /></span
        ><span class="t">{{ n.label }}</span>
      </router-link>
    </nav>

    <div class="nav-label">最近对话</div>
    <div class="recent">
      <template v-if="recentChats.length">
        <button
          v-for="c in recentChats"
          :key="c.id"
          :title="c.title"
          @click="router.push({ path: '/ai', query: { chat: c.id } })"
        >
          {{ c.title }}
        </button>
      </template>
      <div v-else class="muted" style="font-size: 12px; padding: 2px 10px">
        还没有对话
      </div>
    </div>

    <div class="side-foot">
      <div v-if="data.state.demo" class="side-demo">
        <b>正在查看示例数据</b>一个虚拟的两孩家庭。看明白了就换成自己的孩子
        <button class="btn btn-xs btn-dark" @click="clearDemo">
          开始记录我的孩子
        </button>
      </div>
      <nav class="nav">
        <router-link to="/settings"
          ><span class="ico"><Icon name="gear" :size="17" /></span
          ><span class="t">设置</span></router-link
        >
      </nav>
      <button
        class="me"
        @click="router.push({ path: '/settings', query: { sec: 'family' } })"
      >
        <span
          class="ava-wrap"
          v-html="adultAvatar({ gender: parent.gender }, 32)"
        ></span>
        <div>
          <div class="me-name">{{ parent.name }}</div>
          <div class="me-sub">{{ meSub }}</div>
        </div>
      </button>
      <div class="sign">Developed by @沐沐宝贝</div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
  .side {
    background: var(--side);
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    padding: 18px 12px 12px;
    min-height: 0;
    overflow: hidden;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 2px 8px 14px;

    :deep(.brand-mark) {
      width: 30px;
      height: 30px;
      flex: none;
    }
    :deep(.brand-name) {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.2px;
      line-height: 1.15;
    }
    :deep(.brand-sub) {
      font-size: 11px;
      color: var(--ink3);
      line-height: 1.3;
    }
  }

  .search {
    position: relative;
    margin: 0 2px 12px;

    input {
      width: 100%;
      height: 32px;
      border: 0;
      background: var(--fill);
      border-radius: 9px;
      padding: 0 10px 0 30px;
      font-size: 13px;
      outline: none;
      &:focus {
        background: #fff;
        box-shadow: 0 0 0 1.5px var(--ink) inset;
      }
    }
    > svg {
      position: absolute;
      left: 10px;
      top: 9px;
    }
  }
  .search-pop {
    position: absolute;
    left: 0;
    right: 0;
    top: 36px;
    background: #fff;
    border-radius: 12px;
    box-shadow: var(--sh-pop);
    padding: 6px;
    z-index: 40;
    max-height: 320px;
    overflow: auto;

    button {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      text-align: left;
      font-size: 13px;
      &:hover,
      &.on {
        background: var(--fill);
      }
      .ava-wrap {
        flex: none;
        display: inline-flex;
      }
      span:not(.muted) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .muted {
      white-space: nowrap;
      margin-left: auto;
      font-size: 12px;
    }
  }

  .nav-label {
    font-size: 12px;
    color: var(--ink3);
    padding: 14px 10px 6px;
  }
  .nav {
    a {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 34px;
      padding: 0 10px;
      border-radius: 9px;
      color: var(--ink);
      font-size: 13.5px;
      width: 100%;
      text-align: left;
      &:hover {
        background: #f1f1ef;
      }
      &.router-link-active {
        background: #ececea;
        font-weight: 600;
      }
      .ico {
        width: 18px;
        height: 18px;
        flex: none;
        display: grid;
        place-items: center;
      }
    }
  }
  .recent {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-height: 0;
    overflow: hidden;
    flex: 0 1 auto;

    button {
      font-size: 12.5px;
      color: var(--ink2);
      height: 30px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      display: block;
      line-height: 30px;
    }
  }
  .side-foot {
    margin-top: auto;
    padding-top: 10px;
  }
  .side-demo {
    margin: 0 2px 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 0 0 1px var(--line);
    font-size: 12px;
    color: var(--ink2);
    line-height: 1.5;

    b {
      display: block;
      color: var(--ink);
      font-size: 12.5px;
      margin-bottom: 2px;
    }
    .btn {
      margin-top: 8px;
      width: 100%;
    }
  }
  .me {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px;
    border-radius: 10px;
    width: 100%;
    text-align: left;
    &:hover {
      background: #f1f1ef;
    }
    .ava-wrap {
      flex: none;
      display: inline-flex;
    }
    .me-name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
    }
    .me-sub {
      font-size: 11.5px;
      color: var(--ink3);
      line-height: 1.2;
    }
  }
  .sign {
    font-size: 10.5px;
    letter-spacing: 0.3px;
    color: #c2c2bf;
    padding: 8px 10px 0;
    font-family: var(--num);
    white-space: nowrap;
  }

  @media (max-width: 1080px) {
    .brand :deep(.brand-name),
    .brand :deep(.brand-sub),
    .nav a span.t,
    .nav-label,
    .recent,
    .me-name,
    .me-sub,
    .sign,
    .search,
    .side-demo {
      display: none;
    }
    .nav a {
      justify-content: center;
      padding: 0;
    }
    .brand {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
    }
  }
</style>
