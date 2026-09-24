// Shared state, default data, and domain helpers.

const STORAGE_KEY = "plantool-v1";
const colors = ["#0d9b92", "#8270ef", "#f0a55a", "#4d9eea", "#ef7770"];

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const prettyDate = (date = new Date()) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
const minutesText = (minutes) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`
    : `${minutes}m`;
const esc = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

function defaultState() {
  const today = dateKey();
  return {
    version: "1.0",
    selectedTreeId: "tree-math",
    trees: [
      {
        id: "tree-math",
        title: "高等数学",
        subject: "数学",
        modules: [
          {
            id: "mod-func",
            title: "函数与极限",
            sections: [
              {
                id: "sec-limit",
                title: "极限",
                points: [
                  {
                    id: "pt-limit",
                    title: "函数极限",
                    mastered: true,
                    minutes: 80,
                  },
                  {
                    id: "pt-continuity",
                    title: "连续与间断点",
                    mastered: false,
                    minutes: 40,
                  },
                ],
              },
              {
                id: "sec-derivative",
                title: "导数与微分",
                points: [
                  {
                    id: "pt-derivative",
                    title: "导数定义",
                    mastered: true,
                    minutes: 65,
                  },
                  {
                    id: "pt-application",
                    title: "导数应用",
                    mastered: false,
                    minutes: 0,
                  },
                ],
              },
            ],
          },
          {
            id: "mod-integral",
            title: "积分学",
            sections: [
              {
                id: "sec-integral",
                title: "不定积分",
                points: [
                  {
                    id: "pt-integral",
                    title: "换元积分法",
                    mastered: false,
                    minutes: 35,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "tree-english",
        title: "英语语法",
        subject: "英语",
        modules: [
          {
            id: "mod-tense",
            title: "时态",
            sections: [
              {
                id: "sec-present",
                title: "现在时",
                points: [
                  {
                    id: "pt-present",
                    title: "一般现在时",
                    mastered: true,
                    minutes: 50,
                  },
                  {
                    id: "pt-perfect",
                    title: "现在完成时",
                    mastered: false,
                    minutes: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    memos: [
      {
        id: "memo-1",
        title: "整理线性代数笔记",
        minutes: 25,
        done: false,
        createdAt: today,
      },
      {
        id: "memo-2",
        title: "预约本周运动时间",
        minutes: 0,
        done: false,
        createdAt: today,
      },
    ],
    dailyTasks: [
      { id: "daily-1", title: "阅读 30 分钟", completedDates: [today] },
      { id: "daily-2", title: "拉伸或运动", completedDates: [] },
      { id: "daily-3", title: "复盘今日计划", completedDates: [] },
    ],
    projects: [
      {
        id: "project-1",
        title: "期末复习计划",
        description: "在考试前完成数学与英语重点章节复习。",
        start: today,
        end: "2026-11-30",
        stages: [
          {
            id: "stage-1",
            title: "整理复习清单",
            done: true,
            completedAt: today,
          },
          { id: "stage-2", title: "完成第一轮知识梳理", done: false },
          { id: "stage-3", title: "模拟测试与错题回顾", done: false },
        ],
      },
    ],
    records: [
      {
        id: "record-1",
        type: "focus",
        category: "学习",
        title: "函数极限",
        minutes: 25,
        date: today,
        treeId: "tree-math",
      },
      {
        id: "record-2",
        type: "focus",
        category: "学习",
        title: "导数定义",
        minutes: 30,
        date: today,
        treeId: "tree-math",
      },
      {
        id: "record-3",
        type: "daily",
        category: "每日任务",
        title: "阅读 30 分钟",
        minutes: 30,
        date: today,
      },
      {
        id: "record-4",
        type: "project",
        category: "项目",
        title: "整理复习清单",
        minutes: 0,
        date: today,
      },
    ],
    timerSettings: { focus: 25, break: 5, rounds: 4 },
  };
}

function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.trees) && Array.isArray(saved.records))
      return { ...defaultState(), ...saved };
  } catch {
    /* Start fresh when backup data is unavailable. */
  }
  return defaultState();
}

let state = hydrate();
let activeView = "home";
let memoFilter = "open";
let rankingMode = "category";
let dailyCursor = new Date();
let statsCursor = new Date();
let selectedStatsDate = dateKey();
let focusMode = "tree";
let timer = {
  phase: "focus",
  running: false,
  secondsLeft: state.timerSettings.focus * 60,
  round: 1,
  interval: null,
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2300);
}
function getTree(id = state.selectedTreeId) {
  return state.trees.find((tree) => tree.id === id);
}
function allPoints(tree) {
  return tree.modules.flatMap((module) =>
    module.sections.flatMap((section) => section.points),
  );
}
function allTreeMinutes(tree) {
  return allPoints(tree).reduce((sum, point) => sum + (point.minutes || 0), 0);
}
function allFocusMinutes() {
  return state.records
    .filter((record) => record.type === "focus")
    .reduce((sum, record) => sum + record.minutes, 0);
}
function todayRecords() {
  const today = dateKey();
  return state.records.filter((record) => record.date === today);
}
function recordCompletion(
  type,
  title,
  minutes = 0,
  category = type,
  extras = {},
) {
  state.records.push({
    id: uid(),
    type,
    category,
    title,
    minutes: Number(minutes) || 0,
    date: dateKey(),
    ...extras,
  });
}
function removeCompletion(type, title) {
  const today = dateKey();
  const index = state.records.findIndex(
    (record) =>
      record.type === type && record.title === title && record.date === today,
  );
  if (index >= 0) state.records.splice(index, 1);
}

const libraryItems = [
  {
    title: "高中数学",
    icon: "∑",
    description: "函数、数列、导数、概率与统计等核心知识体系。",
    subject: "数学",
    modules: ["函数", "数列", "立体几何"],
  },
  {
    title: "大学物理",
    icon: "◌",
    description: "力学、电磁学、热学与振动波动基础知识结构。",
    subject: "物理",
    modules: ["质点运动学", "牛顿定律", "电磁场"],
  },
  {
    title: "英语专项",
    icon: "Aa",
    description: "核心词汇、语法、阅读与写作的系统化学习路径。",
    subject: "英语",
    modules: ["时态语态", "从句", "核心词汇"],
  },
  {
    title: "线性代数",
    icon: "⊞",
    description: "行列式、矩阵、向量空间与线性方程组。",
    subject: "数学",
    modules: ["行列式", "矩阵", "向量组"],
  },
  {
    title: "概率论",
    icon: "π",
    description: "随机事件、随机变量、分布与数理统计。",
    subject: "数学",
    modules: ["随机事件", "随机变量", "大数定律"],
  },
  {
    title: "电路原理",
    icon: "⌁",
    description: "电路元件、基本定律与动态电路分析方法。",
    subject: "电子",
    modules: ["电路元件", "基尔霍夫定律", "动态电路"],
  },
];
