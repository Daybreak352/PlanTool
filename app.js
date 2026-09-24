const STORAGE_KEY = "plantool-v1";
const colors = ["#0d9b92", "#8270ef", "#f0a55a", "#4d9eea", "#ef7770"];

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const prettyDate = (date = new Date()) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date);
const minutesText = (minutes) => minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}` : `${minutes}m`;
const esc = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function defaultState() {
  const today = dateKey();
  return {
    version: "1.0",
    selectedTreeId: "tree-math",
    trees: [
      { id: "tree-math", title: "高等数学", subject: "数学", modules: [
        { id: "mod-func", title: "函数与极限", sections: [{ id: "sec-limit", title: "极限", points: [
          { id: "pt-limit", title: "函数极限", mastered: true, minutes: 80 },
          { id: "pt-continuity", title: "连续与间断点", mastered: false, minutes: 40 }
        ] }, { id: "sec-derivative", title: "导数与微分", points: [
          { id: "pt-derivative", title: "导数定义", mastered: true, minutes: 65 },
          { id: "pt-application", title: "导数应用", mastered: false, minutes: 0 }
        ] }] },
        { id: "mod-integral", title: "积分学", sections: [{ id: "sec-integral", title: "不定积分", points: [
          { id: "pt-integral", title: "换元积分法", mastered: false, minutes: 35 }
        ] }] }
      ] },
      { id: "tree-english", title: "英语语法", subject: "英语", modules: [
        { id: "mod-tense", title: "时态", sections: [{ id: "sec-present", title: "现在时", points: [
          { id: "pt-present", title: "一般现在时", mastered: true, minutes: 50 },
          { id: "pt-perfect", title: "现在完成时", mastered: false, minutes: 0 }
        ] }] }
      ] }
    ],
    memos: [
      { id: "memo-1", title: "整理线性代数笔记", minutes: 25, done: false, createdAt: today },
      { id: "memo-2", title: "预约本周运动时间", minutes: 0, done: false, createdAt: today }
    ],
    dailyTasks: [
      { id: "daily-1", title: "阅读 30 分钟", completedDates: [today] },
      { id: "daily-2", title: "拉伸或运动", completedDates: [] },
      { id: "daily-3", title: "复盘今日计划", completedDates: [] }
    ],
    projects: [
      { id: "project-1", title: "期末复习计划", description: "在考试前完成数学与英语重点章节复习。", start: today, end: "2026-11-30", stages: [
        { id: "stage-1", title: "整理复习清单", done: true, completedAt: today },
        { id: "stage-2", title: "完成第一轮知识梳理", done: false },
        { id: "stage-3", title: "模拟测试与错题回顾", done: false }
      ] }
    ],
    records: [
      { id: "record-1", type: "focus", category: "学习", title: "函数极限", minutes: 25, date: today, treeId: "tree-math" },
      { id: "record-2", type: "focus", category: "学习", title: "导数定义", minutes: 30, date: today, treeId: "tree-math" },
      { id: "record-3", type: "daily", category: "每日任务", title: "阅读 30 分钟", minutes: 30, date: today },
      { id: "record-4", type: "project", category: "项目", title: "整理复习清单", minutes: 0, date: today }
    ],
    timerSettings: { focus: 25, break: 5, rounds: 4 },
  };
}

function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.trees) && Array.isArray(saved.records)) return { ...defaultState(), ...saved };
  } catch { /* Start fresh when backup data is unavailable. */ }
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
let timer = { phase: "focus", running: false, secondsLeft: state.timerSettings.focus * 60, round: 1, interval: null };

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2300);
}
function getTree(id = state.selectedTreeId) { return state.trees.find((tree) => tree.id === id); }
function allPoints(tree) { return tree.modules.flatMap((module) => module.sections.flatMap((section) => section.points)); }
function allTreeMinutes(tree) { return allPoints(tree).reduce((sum, point) => sum + (point.minutes || 0), 0); }
function allFocusMinutes() { return state.records.filter((record) => record.type === "focus").reduce((sum, record) => sum + record.minutes, 0); }
function todayRecords() { const today = dateKey(); return state.records.filter((record) => record.date === today); }
function recordCompletion(type, title, minutes = 0, category = type, extras = {}) {
  state.records.push({ id: uid(), type, category, title, minutes: Number(minutes) || 0, date: dateKey(), ...extras });
}
function removeCompletion(type, title) {
  const today = dateKey();
  const index = state.records.findIndex((record) => record.type === type && record.title === title && record.date === today);
  if (index >= 0) state.records.splice(index, 1);
}

function renderAll() {
  renderHome(); renderTree(); renderFocus(); renderMemos(); renderDaily(); renderProjects(); renderStats(); renderLibrary();
}

function renderHome() {
  document.querySelector("#today-label").textContent = prettyDate().toUpperCase();
  const points = state.trees.flatMap(allPoints);
  const mastered = points.filter((point) => point.mastered).length;
  const todayDone = todayRecords().length;
  const focusMinutes = allFocusMinutes();
  const percentage = points.length ? Math.round((mastered / points.length) * 100) : 0;
  document.querySelector("#home-metrics").innerHTML = [
    ["累计专注", minutesText(focusMinutes), "每一次投入都算数"],
    ["今日完成", todayDone, "件已完成事项"],
    ["知识树", state.trees.length, "个正在生长的主题"],
    ["整体掌握", `${percentage}%`, `${mastered} / ${points.length} 个知识点`]
  ].map(([label, value, note]) => `<article class="panel metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`).join("");
  const dailyItems = state.dailyTasks.map((task) => ({ title: task.title, meta: "每日任务", done: task.completedDates.includes(dateKey()) }));
  const memoItems = state.memos.filter((memo) => !memo.done).map((memo) => ({ title: memo.title, meta: memo.minutes ? `${memo.minutes} 分钟估时` : "待安排", done: false }));
  const agenda = [...dailyItems, ...memoItems].slice(0, 5);
  document.querySelector("#today-agenda").innerHTML = agenda.length ? agenda.map((item) => `<div class="agenda-item"><i class="agenda-dot ${item.done ? "done" : ""}"></i><div class="agenda-copy"><strong>${esc(item.title)}</strong><small>${item.meta}</small></div><span class="agenda-status ${item.done ? "" : "pending"}">${item.done ? "已完成" : "待完成"}</span></div>`).join("") : `<p class="empty">今天没有待办，去安排一个小目标吧。</p>`;
  const openMemos = state.memos.filter((memo) => !memo.done).slice(0, 4);
  document.querySelector("#home-memos").innerHTML = openMemos.length ? openMemos.map((memo) => `<label class="memo-compact"><input class="check" type="checkbox" data-home-memo="${memo.id}" /><span>${esc(memo.title)}</span></label>`).join("") : `<p class="empty">备忘录已经清空，真不错。</p>`;
}

function renderTree() {
  if (!state.trees.some((tree) => tree.id === state.selectedTreeId)) state.selectedTreeId = state.trees[0]?.id;
  const all = state.trees.flatMap(allPoints);
  const mastered = all.filter((point) => point.mastered).length;
  const percent = all.length ? Math.round(mastered / all.length * 100) : 0;
  document.querySelector("#tree-progress").innerHTML = `<strong>全局掌握进度</strong><div class="progress-line"><i style="width:${percent}%"></i></div><small>${mastered} / ${all.length} · ${percent}%</small>`;
  document.querySelector("#tree-list").innerHTML = state.trees.map((tree) => `<button class="tree-list-item ${tree.id === state.selectedTreeId ? "active" : ""}" data-tree-select="${tree.id}"><span class="tree-list-icon">⌘</span><span>${esc(tree.title)}</span><small>${allPoints(tree).filter((point) => point.mastered).length}/${allPoints(tree).length}</small></button>`).join("");
  const tree = getTree();
  if (!tree) return;
  document.querySelector("#current-tree-title").textContent = tree.title;
  document.querySelector("#tree-nodes").innerHTML = tree.modules.map((module) => {
    const moduleMinutes = module.sections.flatMap((section) => section.points).reduce((sum, point) => sum + point.minutes, 0);
    return `<div class="knowledge-module">
      <div class="node-row level-1"><span>⌄</span><span>${esc(module.title)}</span><span class="node-time">${minutesText(moduleMinutes)}</span><span class="node-actions"><button class="mini-action" title="添加章节" data-node-action="add-section" data-module="${module.id}">+</button><button class="mini-action" title="重命名" data-node-action="rename-module" data-module="${module.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-module" data-module="${module.id}">×</button></span></div>
      ${module.sections.map((section) => `<div class="node-row level-2"><span>└</span><span>${esc(section.title)}</span><span class="node-time">${minutesText(section.points.reduce((sum, point) => sum + point.minutes, 0))}</span><span class="node-actions"><button class="mini-action" title="添加知识点" data-node-action="add-point" data-module="${module.id}" data-section="${section.id}">+</button><button class="mini-action" title="重命名" data-node-action="rename-section" data-module="${module.id}" data-section="${section.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-section" data-module="${module.id}" data-section="${section.id}">×</button></span></div>
        ${section.points.map((point) => `<div class="node-row level-3"><input class="check" type="checkbox" ${point.mastered ? "checked" : ""} data-node-action="toggle-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}" /><span>${esc(point.title)}</span>${point.mastered ? '<span class="mastered">已掌握</span>' : ""}<span class="node-time">${minutesText(point.minutes)}</span><span class="node-actions"><button class="mini-action" title="重命名" data-node-action="rename-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}">×</button></span></div>`).join("")}`).join("")}
    </div>`;
  }).join("") || `<p class="empty">还没有模块，先添加一个知识点吧。</p>`;
}

function selectedPoint() {
  const tree = getTree();
  if (!tree) return null;
  const point = allPoints(tree)[0];
  return point ? { tree, point } : null;
}
function renderFocus() {
  document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.focusMode === focusMode));
  const target = document.querySelector("#focus-target");
  if (focusMode === "tree") {
    const tree = getTree();
    const selected = selectedPoint();
    target.innerHTML = `<div class="target-fields"><select id="focus-tree">${state.trees.map((item) => `<option value="${item.id}" ${item.id === tree?.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select><select id="focus-section">${tree ? tree.modules.flatMap((module) => module.sections.map((section) => `<option value="${section.id}">${esc(section.title)}</option>`)).join("") : "<option>暂无章节</option>"}</select><select id="focus-point">${tree ? allPoints(tree).map((point) => `<option value="${point.id}" ${point.id === selected?.point.id ? "selected" : ""}>${esc(point.title)}</option>`).join("") : "<option>暂无知识点</option>"}</select></div>`;
  } else {
    target.innerHTML = `<div class="custom-target"><input id="custom-focus-title" maxlength="50" placeholder="例如：阅读、绘画、运动" /><select id="custom-focus-category"><option>学习</option><option>运动</option><option>绘画</option><option>阅读</option><option>其他</option></select></div>`;
  }
  document.querySelector("#focus-minutes").value = state.timerSettings.focus;
  document.querySelector("#break-minutes").value = state.timerSettings.break;
  document.querySelector("#total-rounds").value = state.timerSettings.rounds;
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const seconds = Math.max(timer.secondsLeft, 0);
  document.querySelector("#timer-display").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  document.querySelector("#timer-phase").textContent = timer.phase === "focus" ? (timer.running ? "正在专注" : "准备开始") : "休息一下";
  document.querySelector("#round-label").textContent = `第 ${timer.round} / ${state.timerSettings.rounds} 轮`;
  const start = document.querySelector("#timer-start");
  start.innerHTML = timer.running ? "暂停计时 <b>Ⅱ</b>" : (timer.secondsLeft < state.timerSettings.focus * 60 ? "继续专注 <b>→</b>" : "开始专注 <b>→</b>");
  document.title = timer.running ? `${document.querySelector("#timer-display").textContent} · PlanTool` : "PlanTool · 个人学习与任务规划";
}
function readTimerSettings() {
  state.timerSettings.focus = Math.min(120, Math.max(1, Number(document.querySelector("#focus-minutes").value) || 25));
  state.timerSettings.break = Math.min(30, Math.max(1, Number(document.querySelector("#break-minutes").value) || 5));
  state.timerSettings.rounds = Math.min(12, Math.max(1, Number(document.querySelector("#total-rounds").value) || 4));
  save();
}
function startOrPauseTimer() {
  readTimerSettings();
  if (timer.running) { clearInterval(timer.interval); timer.running = false; updateTimerDisplay(); return; }
  timer.running = true;
  timer.interval = setInterval(() => { timer.secondsLeft -= 1; if (timer.secondsLeft <= 0) finishPhase(); updateTimerDisplay(); }, 1000);
  updateTimerDisplay();
}
function finishPhase() {
  if (timer.phase === "focus") {
    const minutes = state.timerSettings.focus;
    let title = "自定义专注"; let category = "学习"; let treeId;
    if (focusMode === "tree") {
      const tree = getTree(document.querySelector("#focus-tree")?.value);
      const pointId = document.querySelector("#focus-point")?.value;
      const point = tree && allPoints(tree).find((item) => item.id === pointId);
      if (point) { title = point.title; treeId = tree.id; point.minutes += minutes; }
    } else {
      title = document.querySelector("#custom-focus-title")?.value.trim() || "自定义专注";
      category = document.querySelector("#custom-focus-category")?.value || "其他";
    }
    recordCompletion("focus", title, minutes, category, { treeId });
    state.selectedTreeId = treeId || state.selectedTreeId;
    save(); renderAll(); toast(`已记录 ${minutes} 分钟专注`);
    timer.phase = "break"; timer.secondsLeft = state.timerSettings.break * 60;
  } else {
    if (timer.round >= state.timerSettings.rounds) { clearInterval(timer.interval); timer.running = false; timer.phase = "focus"; timer.round = 1; timer.secondsLeft = state.timerSettings.focus * 60; toast("本轮计划已完成，做得好！"); }
    else { timer.round += 1; timer.phase = "focus"; timer.secondsLeft = state.timerSettings.focus * 60; toast("休息结束，开始下一轮。"); }
  }
}
function resetTimer() { clearInterval(timer.interval); timer = { phase: "focus", running: false, secondsLeft: state.timerSettings.focus * 60, round: 1, interval: null }; updateTimerDisplay(); }

function renderMemos() {
  const filtered = state.memos.filter((memo) => memoFilter === "open" ? !memo.done : memo.done);
  document.querySelector("#memo-count").textContent = `${state.memos.filter((memo) => !memo.done).length} 项待办`;
  document.querySelector("#memo-list").innerHTML = filtered.length ? filtered.map((memo) => `<div class="memo-item ${memo.done ? "done" : ""}"><input class="check" type="checkbox" ${memo.done ? "checked" : ""} data-memo-toggle="${memo.id}" /><span class="memo-name">${esc(memo.title)}</span>${memo.minutes ? `<span class="memo-time">${memo.minutes}m</span>` : ""}<button class="delete-icon" data-memo-delete="${memo.id}" aria-label="删除备忘录">×</button></div>`).join("") : `<p class="empty">${memoFilter === "open" ? "暂时没有未完成的备忘录。" : "还没有归档事项。"}</p>`;
  document.querySelectorAll("[data-memo-filter]").forEach((button) => button.classList.toggle("active", button.dataset.memoFilter === memoFilter));
}

function renderDaily() {
  const today = dateKey();
  const completed = state.dailyTasks.filter((task) => task.completedDates.includes(today)).length;
  document.querySelector("#daily-progress-text").textContent = `${completed} / ${state.dailyTasks.length} 已完成`;
  document.querySelector("#daily-task-list").innerHTML = state.dailyTasks.length ? state.dailyTasks.map((task) => { const done = task.completedDates.includes(today); return `<div class="daily-task-item ${done ? "done" : ""}"><input class="check" type="checkbox" ${done ? "checked" : ""} data-daily-toggle="${task.id}" /><strong>${esc(task.title)}</strong>${done ? "<small>已打卡</small>" : ""}<button class="delete-icon" data-daily-delete="${task.id}" aria-label="删除任务">×</button></div>`; }).join("") : `<p class="empty">添加一个每天都想坚持的小习惯。</p>`;
  document.querySelector("#daily-month-title").textContent = `${dailyCursor.getFullYear()} 年 ${dailyCursor.getMonth() + 1} 月`;
  document.querySelector("#daily-calendar").innerHTML = calendarMarkup(dailyCursor, (key) => {
    const count = state.dailyTasks.filter((task) => task.completedDates.includes(key)).length;
    const ratio = state.dailyTasks.length ? count / state.dailyTasks.length : 0;
    return { level: ratio === 0 ? 0 : ratio < .5 ? 1 : ratio < 1 ? 2 : 4, detail: count ? `${count}/${state.dailyTasks.length} 完成` : "" };
  }, false);
}

function renderProjects() {
  const cards = state.projects.map((project) => {
    const done = project.stages.filter((stage) => stage.done).length;
    const percent = project.stages.length ? Math.round(done / project.stages.length * 100) : 0;
    return `<article class="panel project-card"><div class="project-top"><div><h2 class="project-title">${esc(project.title)}</h2><p class="project-desc">${esc(project.description || "尚未添加项目说明。")}</p></div><button class="delete-icon" data-project-delete="${project.id}" aria-label="删除项目">×</button></div><div class="project-dates">${project.start || "待开始"} — ${project.end || "未设置截止"}</div><div class="project-progress"><div class="progress-line"><i style="width:${percent}%"></i></div><small>${percent}%</small></div><div class="stage-list">${project.stages.map((stage) => `<label class="stage ${stage.done ? "done" : ""}"><input class="check" type="checkbox" ${stage.done ? "checked" : ""} data-stage-toggle="${stage.id}" data-project="${project.id}" /><span>${esc(stage.title)}</span></label>`).join("")}<button class="text-button" data-stage-add="${project.id}">+ 添加阶段</button></div></article>`;
  }).join("");
  document.querySelector("#project-list").innerHTML = `${cards}<button class="panel new-project-card" id="new-project-card"><strong>+</strong><span>新建项目</span></button>`;
}

function recordsForDay(key) { return state.records.filter((record) => record.date === key); }
function categoryTotals(records = state.records) { return Object.entries(records.reduce((acc, record) => { if (record.minutes > 0) acc[record.category] = (acc[record.category] || 0) + record.minutes; return acc; }, {})).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes); }
function renderStats() {
  const records = todayRecords(); const totals = categoryTotals(records); const total = totals.reduce((sum, item) => sum + item.minutes, 0);
  document.querySelector("#today-total-label").textContent = `${total} 分钟投入`;
  document.querySelector("#donut-total").textContent = total;
  let degree = 0;
  const gradient = totals.length ? totals.map((item, index) => { const next = degree + item.minutes / total * 360; const segment = `${colors[index % colors.length]} ${degree}deg ${next}deg`; degree = next; return segment; }).join(", ") : "#e8eeee 0deg 360deg";
  document.querySelector("#donut-chart").style.background = `conic-gradient(${gradient})`;
  document.querySelector("#donut-legend").innerHTML = totals.length ? totals.map((item, index) => `<div class="legend-item"><i class="legend-dot" style="background:${colors[index % colors.length]}"></i><span>${esc(item.name)}</span><strong>${item.minutes}m</strong></div>`).join("") : `<p class="empty">完成一段有时长的事项后，数据会显示在这里。</p>`;
  const ranks = rankingMode === "category" ? categoryTotals() : state.trees.map((tree) => ({ name: tree.title, minutes: state.records.filter((record) => record.type === "focus" && record.treeId === tree.id).reduce((sum, record) => sum + record.minutes, 0) })).filter((item) => item.minutes).sort((a, b) => b.minutes - a.minutes);
  const max = ranks[0]?.minutes || 1;
  document.querySelector("#ranking-list").innerHTML = ranks.length ? ranks.slice(0, 6).map((item, index) => `<div class="ranking-row"><span class="rank-no">0${index + 1}</span><div><div class="rank-name"><span>${esc(item.name)}</span></div><div class="rank-bar"><i style="width:${item.minutes / max * 100}%"></i></div></div><span class="rank-value">${item.minutes}m</span></div>`).join("") : `<p class="empty">专注记录会沉淀为排行榜。</p>`;
  document.querySelectorAll("[data-ranking]").forEach((button) => button.classList.toggle("active", button.dataset.ranking === rankingMode));
  document.querySelector("#stats-month-title").textContent = `${statsCursor.getFullYear()} 年 ${statsCursor.getMonth() + 1} 月`;
  document.querySelector("#stats-calendar").innerHTML = calendarMarkup(statsCursor, (key) => {
    const dayRecords = recordsForDay(key); const mins = dayRecords.reduce((sum, record) => sum + record.minutes, 0);
    return { level: mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4, detail: mins ? `${mins} 分钟` : "" };
  }, true);
  const details = recordsForDay(selectedStatsDate);
  document.querySelector("#selected-day-details").innerHTML = `<strong class="detail-heading">${selectedStatsDate === dateKey() ? "今天" : selectedStatsDate} 的完成事项</strong>${details.length ? details.map((record) => `<span class="detail-chip">${esc(record.title)}${record.minutes ? ` · ${record.minutes}m` : ""} <button class="delete-icon" data-record-delete="${record.id}" aria-label="删除记录">×</button></span>`).join("") : `<span class="detail-chip">这一天还没有记录</span>`}`;
}

function calendarMarkup(cursor, getData, clickable) {
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1); const days = new Date(year, month + 1, 0).getDate(); const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const heads = ["一", "二", "三", "四", "五", "六", "日"].map((day) => `<div class="weekday">${day}</div>`).join("");
  const empty = Array.from({ length: offset }, () => '<div class="calendar-cell empty-cell"></div>').join("");
  const cells = Array.from({ length: days }, (_, index) => { const day = index + 1; const key = dateKey(new Date(year, month, day)); const { level, detail } = getData(key); return `<button class="calendar-cell ${level ? `level-${level}` : ""} ${key === dateKey() ? "today" : ""}" ${clickable ? `data-stats-day="${key}"` : ""}><span class="day-number">${day}</span>${detail ? `<span class="cell-detail">${detail}</span>` : ""}</button>`; }).join("");
  return heads + empty + cells;
}

const libraryItems = [
  { title: "高中数学", icon: "∑", description: "函数、数列、导数、概率与统计等核心知识体系。", subject: "数学", modules: ["函数", "数列", "立体几何"] },
  { title: "大学物理", icon: "◌", description: "力学、电磁学、热学与振动波动基础知识结构。", subject: "物理", modules: ["质点运动学", "牛顿定律", "电磁场"] },
  { title: "英语专项", icon: "Aa", description: "核心词汇、语法、阅读与写作的系统化学习路径。", subject: "英语", modules: ["时态语态", "从句", "核心词汇"] },
  { title: "线性代数", icon: "⊞", description: "行列式、矩阵、向量空间与线性方程组。", subject: "数学", modules: ["行列式", "矩阵", "向量组"] },
  { title: "概率论", icon: "π", description: "随机事件、随机变量、分布与数理统计。", subject: "数学", modules: ["随机事件", "随机变量", "大数定律"] },
  { title: "电路原理", icon: "⌁", description: "电路元件、基本定律与动态电路分析方法。", subject: "电子", modules: ["电路元件", "基尔霍夫定律", "动态电路"] }
];
function renderLibrary() { document.querySelector("#library-list").innerHTML = libraryItems.map((item, index) => `<article class="panel library-card"><span class="library-icon">${item.icon}</span><h3>${item.title}</h3><p>${item.description}</p><button class="ghost-button" data-library-import="${index}">导入知识树 →</button></article>`).join(""); }

function addTree() { const title = prompt("知识树名称", "新的学习主题"); if (!title?.trim()) return; const tree = { id: uid(), title: title.trim(), subject: "自定义", modules: [{ id: uid(), title: "基础模块", sections: [{ id: uid(), title: "第一章节", points: [{ id: uid(), title: "第一个知识点", mastered: false, minutes: 0 }] }] }] }; state.trees.push(tree); state.selectedTreeId = tree.id; save(); renderAll(); toast("知识树已创建"); }
function findModule(tree, moduleId) { return tree.modules.find((item) => item.id === moduleId); }
function findSection(tree, moduleId, sectionId) { return findModule(tree, moduleId)?.sections.find((item) => item.id === sectionId); }
function handleNodeAction(button) {
  const tree = getTree(); const action = button.dataset.nodeAction; const module = findModule(tree, button.dataset.module); const section = findSection(tree, button.dataset.module, button.dataset.section); const point = section?.points.find((item) => item.id === button.dataset.point);
  if (action === "toggle-point") point.mastered = button.checked;
  if (action === "add-section") { const title = prompt("章节名称"); if (title?.trim()) module.sections.push({ id: uid(), title: title.trim(), points: [] }); }
  if (action === "add-point") { const title = prompt("知识点名称"); if (title?.trim()) section.points.push({ id: uid(), title: title.trim(), mastered: false, minutes: 0 }); }
  if (action === "rename-module") { const title = prompt("模块名称", module.title); if (title?.trim()) module.title = title.trim(); }
  if (action === "rename-section") { const title = prompt("章节名称", section.title); if (title?.trim()) section.title = title.trim(); }
  if (action === "rename-point") { const title = prompt("知识点名称", point.title); if (title?.trim()) point.title = title.trim(); }
  if (action === "delete-module" && confirm(`删除模块“${module.title}”及其内容？`)) tree.modules = tree.modules.filter((item) => item.id !== module.id);
  if (action === "delete-section" && confirm(`删除章节“${section.title}”及其知识点？`)) module.sections = module.sections.filter((item) => item.id !== section.id);
  if (action === "delete-point" && confirm(`删除知识点“${point.title}”？`)) section.points = section.points.filter((item) => item.id !== point.id);
  save(); renderAll();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-home-memo], [data-memo-toggle], [data-daily-toggle], [data-stage-toggle], [data-node-action]");
  if (!target) return;
  if (target.dataset.nav) { activeView = target.dataset.nav; document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === activeView)); document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === activeView)); window.location.hash = activeView; return; }
  if (target.dataset.homeMemo) { toggleMemo(target.dataset.homeMemo); return; }
  if (target.dataset.treeSelect) { state.selectedTreeId = target.dataset.treeSelect; save(); renderTree(); renderFocus(); return; }
  if (target.dataset.nodeAction) { handleNodeAction(target); return; }
  if (target.dataset.memoToggle) { toggleMemo(target.dataset.memoToggle); return; }
  if (target.dataset.memoDelete) { state.memos = state.memos.filter((memo) => memo.id !== target.dataset.memoDelete); save(); renderAll(); return; }
  if (target.dataset.memoFilter) { memoFilter = target.dataset.memoFilter; renderMemos(); return; }
  if (target.dataset.dailyToggle) { toggleDaily(target.dataset.dailyToggle, target.checked); return; }
  if (target.dataset.dailyDelete) { state.dailyTasks = state.dailyTasks.filter((task) => task.id !== target.dataset.dailyDelete); save(); renderAll(); return; }
  if (target.dataset.stageToggle) { toggleStage(target.dataset.project, target.dataset.stageToggle, target.checked); return; }
  if (target.dataset.stageAdd) { addStage(target.dataset.stageAdd); return; }
  if (target.dataset.projectDelete) { if (confirm("删除这个项目？")) { state.projects = state.projects.filter((project) => project.id !== target.dataset.projectDelete); save(); renderAll(); } return; }
  if (target.dataset.ranking) { rankingMode = target.dataset.ranking; renderStats(); return; }
  if (target.dataset.statsDay) { selectedStatsDate = target.dataset.statsDay; renderStats(); return; }
  if (target.dataset.recordDelete) { state.records = state.records.filter((record) => record.id !== target.dataset.recordDelete); save(); renderAll(); toast("记录已删除"); return; }
  if (target.dataset.libraryImport) { importLibrary(Number(target.dataset.libraryImport)); return; }
  if (target.dataset.focusMode) { focusMode = target.dataset.focusMode; renderFocus(); return; }
  switch (target.id) {
    case "new-tree": case "new-tree-small": addTree(); break;
    case "add-knowledge-point": { const tree = getTree(); if (!tree.modules.length) tree.modules.push({ id: uid(), title: "基础模块", sections: [] }); const module = tree.modules[0]; if (!module.sections.length) module.sections.push({ id: uid(), title: "第一章节", points: [] }); const title = prompt("知识点名称"); if (title?.trim()) { module.sections[0].points.push({ id: uid(), title: title.trim(), mastered: false, minutes: 0 }); save(); renderAll(); } break; }
    case "rename-tree": { const tree = getTree(); const title = prompt("知识树名称", tree.title); if (title?.trim()) { tree.title = title.trim(); save(); renderAll(); } break; }
    case "delete-tree": { const tree = getTree(); if (state.trees.length === 1) { toast("至少保留一棵知识树"); break; } if (confirm(`删除知识树“${tree.title}”？`)) { state.trees = state.trees.filter((item) => item.id !== tree.id); state.selectedTreeId = state.trees[0].id; save(); renderAll(); } break; }
    case "timer-start": startOrPauseTimer(); break;
    case "timer-reset": readTimerSettings(); resetTimer(); break;
    case "daily-prev-month": dailyCursor = new Date(dailyCursor.getFullYear(), dailyCursor.getMonth() - 1, 1); renderDaily(); break;
    case "daily-next-month": dailyCursor = new Date(dailyCursor.getFullYear(), dailyCursor.getMonth() + 1, 1); renderDaily(); break;
    case "stats-prev-month": statsCursor = new Date(statsCursor.getFullYear(), statsCursor.getMonth() - 1, 1); renderStats(); break;
    case "stats-next-month": statsCursor = new Date(statsCursor.getFullYear(), statsCursor.getMonth() + 1, 1); renderStats(); break;
    case "new-project": case "new-project-card": addProject(); break;
  }
});

function toggleMemo(id) { const memo = state.memos.find((item) => item.id === id); if (!memo) return; memo.done = !memo.done; memo.completedAt = memo.done ? dateKey() : undefined; if (memo.done) recordCompletion("memo", memo.title, memo.minutes, "备忘录"); else removeCompletion("memo", memo.title); save(); renderAll(); toast(memo.done ? "备忘录已归档" : "已恢复到待办"); }
function toggleDaily(id, checked) { const task = state.dailyTasks.find((item) => item.id === id); if (!task) return; const today = dateKey(); if (checked && !task.completedDates.includes(today)) { task.completedDates.push(today); recordCompletion("daily", task.title, 0, "每日任务"); } if (!checked) { task.completedDates = task.completedDates.filter((item) => item !== today); removeCompletion("daily", task.title); } save(); renderAll(); }
function toggleStage(projectId, stageId, checked) { const stage = state.projects.find((project) => project.id === projectId)?.stages.find((item) => item.id === stageId); if (!stage) return; stage.done = checked; stage.completedAt = checked ? dateKey() : undefined; if (checked) recordCompletion("project", stage.title, 0, "项目"); else removeCompletion("project", stage.title); save(); renderAll(); }
function addStage(projectId) { const project = state.projects.find((item) => item.id === projectId); const title = prompt("阶段名称"); if (title?.trim()) { project.stages.push({ id: uid(), title: title.trim(), done: false }); save(); renderProjects(); } }
function addProject() { const title = prompt("项目名称", "新项目"); if (!title?.trim()) return; const description = prompt("项目说明（可选）", ""); const end = prompt("完成日期（YYYY-MM-DD，可留空）", ""); state.projects.push({ id: uid(), title: title.trim(), description: description?.trim() || "", start: dateKey(), end: end?.trim() || "", stages: [{ id: uid(), title: "定义第一步", done: false }] }); save(); renderProjects(); toast("项目已创建"); }
function importLibrary(index) { const item = libraryItems[index]; const tree = { id: uid(), title: item.title, subject: item.subject, modules: item.modules.map((moduleTitle) => ({ id: uid(), title: moduleTitle, sections: [{ id: uid(), title: "基础知识", points: [{ id: uid(), title: `${moduleTitle} 核心概念`, mastered: false, minutes: 0 }] }] })) }; state.trees.push(tree); state.selectedTreeId = tree.id; save(); renderAll(); activeView = "tree"; document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === "tree")); document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === "tree")); toast(`已导入「${item.title}」`); }

document.querySelector("#memo-form").addEventListener("submit", (event) => { event.preventDefault(); const title = document.querySelector("#memo-title").value.trim(); if (!title) return; state.memos.unshift({ id: uid(), title, minutes: Number(document.querySelector("#memo-minutes").value) || 0, done: false, createdAt: dateKey() }); event.target.reset(); save(); renderAll(); toast("备忘录已添加"); });
document.querySelector("#daily-form").addEventListener("submit", (event) => { event.preventDefault(); const input = document.querySelector("#daily-title"); if (!input.value.trim()) return; state.dailyTasks.push({ id: uid(), title: input.value.trim(), completedDates: [] }); input.value = ""; save(); renderAll(); toast("每日任务已添加"); });
document.querySelector("#focus-view").addEventListener("change", (event) => { if (event.target.id === "focus-tree") { state.selectedTreeId = event.target.value; save(); renderFocus(); } if (["focus-minutes", "break-minutes", "total-rounds"].includes(event.target.id) && !timer.running) { readTimerSettings(); resetTimer(); } });
document.querySelector("#export-data").addEventListener("click", () => { const file = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `PlanTool-backup-${dateKey()}.json`; link.click(); URL.revokeObjectURL(url); toast("备份文件已下载"); });
document.querySelector("#import-data").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!Array.isArray(data.trees) || !Array.isArray(data.records)) throw new Error("invalid"); if (!confirm("导入会替换当前本地数据，是否继续？")) return; state = { ...defaultState(), ...data }; save(); resetTimer(); renderAll(); toast("数据已导入"); } catch { toast("备份文件格式不正确"); } }; reader.readAsText(file); event.target.value = ""; });
document.querySelector("#clear-data").addEventListener("click", () => { if (!confirm("确定清除所有数据并恢复示例数据？")) return; if (!confirm("此操作无法撤销，确认继续？")) return; state = defaultState(); save(); resetTimer(); renderAll(); toast("已恢复初始数据"); });

const hash = window.location.hash.replace("#", "");
if (["home", "tree", "focus", "daily", "project", "stats", "library"].includes(hash)) { activeView = hash; document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === activeView)); document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === activeView)); }
renderAll();
