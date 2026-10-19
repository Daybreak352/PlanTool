// Shared state, default data, and domain helpers.

const STORAGE_KEY = "plantool-v1";
const colors = ["#f0efea", "#aaa9a2", "#b8a78e", "#787873", "#d3d2cc"];

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
  `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
const esc = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

function defaultState() {
  return {
    version: "1.0",
    memos: [],
    dailyTasks: [],
    periods: [],
    projects: [],
    records: [],
    timerSettings: { focus: 25, break: 5, rounds: 4 },
  };
}
function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Keep extra fields from older backups without exposing removed features.
    if (saved && Array.isArray(saved.records))
      return {
        ...defaultState(),
        ...saved,
        periods: Array.isArray(saved.periods) ? saved.periods : [],
      };
  } catch {
    /* Start fresh when backup data is unavailable. */
  }
  return defaultState();
}

let state = hydrate();
let activeView = "home";
let memoFilter = "open";
let periodEditorId;
let dailyCursor = new Date();
let statsCursor = new Date();
let selectedStatsDate = dateKey();
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
function allFocusMinutes() {
  return state.records
    .filter((record) => record.type === "focus")
    .reduce((sum, record) => sum + record.minutes, 0);
}
function todayRecords() {
  const today = dateKey();
  return state.records.filter((record) => record.date === today);
}
function recordCompletion(type, title, minutes = 0, category = type) {
  state.records.push({
    id: uid(),
    type,
    category,
    title,
    minutes: Number(minutes) || 0,
    date: dateKey(),
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
