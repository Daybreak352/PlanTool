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
  return {
    version: "1.0",
    selectedTreeId: null,
    trees: [],
    memos: [],
    dailyTasks: [],
    projects: [],
    records: [],
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
