// DOM rendering functions. No event listeners live in this file.

function renderAll() {
  renderHome();
  renderTree();
  renderFocus();
  renderMemos();
  renderDaily();
  renderProjects();
  renderStats();
  renderLibrary();
}

function renderHome() {
  document.querySelector("#today-label").textContent =
    prettyDate().toUpperCase();
  const points = state.trees.flatMap(allPoints);
  const mastered = points.filter((point) => point.mastered).length;
  const todayDone = todayRecords().length;
  const focusMinutes = allFocusMinutes();
  const percentage = points.length
    ? Math.round((mastered / points.length) * 100)
    : 0;
  document.querySelector("#home-metrics").innerHTML = [
    ["累计专注", minutesText(focusMinutes), "每一次投入都算数"],
    ["今日完成", todayDone, "件已完成事项"],
    ["知识树", state.trees.length, "个正在生长的主题"],
    ["整体掌握", `${percentage}%`, `${mastered} / ${points.length} 个知识点`],
  ]
    .map(
      ([label, value, note]) =>
        `<article class="panel metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`,
    )
    .join("");
  const dailyItems = state.dailyTasks.map((task) => ({
    title: task.title,
    meta: "每日任务",
    done: task.completedDates.includes(dateKey()),
  }));
  const memoItems = state.memos
    .filter((memo) => !memo.done)
    .map((memo) => ({
      title: memo.title,
      meta: memo.minutes ? `${memo.minutes} 分钟估时` : "待安排",
      done: false,
    }));
  const agenda = [...dailyItems, ...memoItems].slice(0, 5);
  document.querySelector("#today-agenda").innerHTML = agenda.length
    ? agenda
        .map(
          (item) =>
            `<div class="agenda-item"><i class="agenda-dot ${item.done ? "done" : ""}"></i><div class="agenda-copy"><strong>${esc(item.title)}</strong><small>${item.meta}</small></div><span class="agenda-status ${item.done ? "" : "pending"}">${item.done ? "已完成" : "待完成"}</span></div>`,
        )
        .join("")
    : `<p class="empty">今天没有待办，去安排一个小目标吧。</p>`;
  const openMemos = state.memos.filter((memo) => !memo.done).slice(0, 4);
  document.querySelector("#home-memos").innerHTML = openMemos.length
    ? openMemos
        .map(
          (memo) =>
            `<label class="memo-compact"><input class="check" type="checkbox" data-home-memo="${memo.id}" /><span>${esc(memo.title)}</span></label>`,
        )
        .join("")
    : `<p class="empty">备忘录已经清空，真不错。</p>`;
}

function renderTree() {
  if (!state.trees.some((tree) => tree.id === state.selectedTreeId))
    state.selectedTreeId = state.trees[0]?.id;
  const all = state.trees.flatMap(allPoints);
  const mastered = all.filter((point) => point.mastered).length;
  const percent = all.length ? Math.round((mastered / all.length) * 100) : 0;
  document.querySelector("#tree-progress").innerHTML =
    `<strong>全局掌握进度</strong><div class="progress-line"><i style="width:${percent}%"></i></div><small>${mastered} / ${all.length} · ${percent}%</small>`;
  document.querySelector("#tree-list").innerHTML = state.trees
    .map(
      (tree) =>
        `<button class="tree-list-item ${tree.id === state.selectedTreeId ? "active" : ""}" data-tree-select="${tree.id}"><span class="tree-list-icon">⌘</span><span>${esc(tree.title)}</span><small>${allPoints(tree).filter((point) => point.mastered).length}/${allPoints(tree).length}</small></button>`,
    )
    .join("");
  const tree = getTree();
  if (!tree) return;
  document.querySelector("#current-tree-title").textContent = tree.title;
  document.querySelector("#tree-nodes").innerHTML =
    tree.modules
      .map((module) => {
        const moduleMinutes = module.sections
          .flatMap((section) => section.points)
          .reduce((sum, point) => sum + point.minutes, 0);
        return `<div class="knowledge-module">
      <div class="node-row level-1"><span>⌄</span><span>${esc(module.title)}</span><span class="node-time">${minutesText(moduleMinutes)}</span><span class="node-actions"><button class="mini-action" title="添加章节" data-node-action="add-section" data-module="${module.id}">+</button><button class="mini-action" title="重命名" data-node-action="rename-module" data-module="${module.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-module" data-module="${module.id}">×</button></span></div>
      ${module.sections
        .map(
          (
            section,
          ) => `<div class="node-row level-2"><span>└</span><span>${esc(section.title)}</span><span class="node-time">${minutesText(section.points.reduce((sum, point) => sum + point.minutes, 0))}</span><span class="node-actions"><button class="mini-action" title="添加知识点" data-node-action="add-point" data-module="${module.id}" data-section="${section.id}">+</button><button class="mini-action" title="重命名" data-node-action="rename-section" data-module="${module.id}" data-section="${section.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-section" data-module="${module.id}" data-section="${section.id}">×</button></span></div>
        ${section.points.map((point) => `<div class="node-row level-3"><input class="check" type="checkbox" ${point.mastered ? "checked" : ""} data-node-action="toggle-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}" /><span>${esc(point.title)}</span>${point.mastered ? '<span class="mastered">已掌握</span>' : ""}<span class="node-time">${minutesText(point.minutes)}</span><span class="node-actions"><button class="mini-action" title="重命名" data-node-action="rename-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}">✎</button><button class="mini-action" title="删除" data-node-action="delete-point" data-module="${module.id}" data-section="${section.id}" data-point="${point.id}">×</button></span></div>`).join("")}`,
        )
        .join("")}
    </div>`;
      })
      .join("") || `<p class="empty">还没有模块，先添加一个知识点吧。</p>`;
}

function selectedPoint() {
  const tree = getTree();
  if (!tree) return null;
  const point = allPoints(tree)[0];
  return point ? { tree, point } : null;
}
function renderFocus() {
  document
    .querySelectorAll(".mode-button")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.focusMode === focusMode),
    );
  const target = document.querySelector("#focus-target");
  if (focusMode === "tree") {
    const tree = getTree();
    const selected = selectedPoint();
    target.innerHTML = `<div class="target-fields"><select id="focus-tree">${state.trees.map((item) => `<option value="${item.id}" ${item.id === tree?.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select><select id="focus-section">${tree ? tree.modules.flatMap((module) => module.sections.map((section) => `<option value="${section.id}">${esc(section.title)}</option>`)).join("") : "<option>暂无章节</option>"}</select><select id="focus-point">${
      tree
        ? allPoints(tree)
            .map(
              (point) =>
                `<option value="${point.id}" ${point.id === selected?.point.id ? "selected" : ""}>${esc(point.title)}</option>`,
            )
            .join("")
        : "<option>暂无知识点</option>"
    }</select></div>`;
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
  document.querySelector("#timer-display").textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  document.querySelector("#timer-phase").textContent =
    timer.phase === "focus"
      ? timer.running
        ? "正在专注"
        : "准备开始"
      : "休息一下";
  document.querySelector("#round-label").textContent =
    `第 ${timer.round} / ${state.timerSettings.rounds} 轮`;
  const start = document.querySelector("#timer-start");
  start.innerHTML = timer.running
    ? "暂停计时 <b>Ⅱ</b>"
    : timer.secondsLeft < state.timerSettings.focus * 60
      ? "继续专注 <b>→</b>"
      : "开始专注 <b>→</b>";
  document.title = timer.running
    ? `${document.querySelector("#timer-display").textContent} · PlanTool`
    : "PlanTool · 个人学习与任务规划";
}

function renderMemos() {
  const filtered = state.memos.filter((memo) =>
    memoFilter === "open" ? !memo.done : memo.done,
  );
  document.querySelector("#memo-count").textContent =
    `${state.memos.filter((memo) => !memo.done).length} 项待办`;
  document.querySelector("#memo-list").innerHTML = filtered.length
    ? filtered
        .map(
          (memo) =>
            `<div class="memo-item ${memo.done ? "done" : ""}"><input class="check" type="checkbox" ${memo.done ? "checked" : ""} data-memo-toggle="${memo.id}" /><span class="memo-name">${esc(memo.title)}</span>${memo.minutes ? `<span class="memo-time">${memo.minutes}m</span>` : ""}<button class="delete-icon" data-memo-delete="${memo.id}" aria-label="删除备忘录">×</button></div>`,
        )
        .join("")
    : `<p class="empty">${memoFilter === "open" ? "暂时没有未完成的备忘录。" : "还没有归档事项。"}</p>`;
  document
    .querySelectorAll("[data-memo-filter]")
    .forEach((button) =>
      button.classList.toggle(
        "active",
        button.dataset.memoFilter === memoFilter,
      ),
    );
}

function renderDaily() {
  const today = dateKey();
  const completed = state.dailyTasks.filter((task) =>
    task.completedDates.includes(today),
  ).length;
  document.querySelector("#daily-progress-text").textContent =
    `${completed} / ${state.dailyTasks.length} 已完成`;
  document.querySelector("#daily-task-list").innerHTML = state.dailyTasks.length
    ? state.dailyTasks
        .map((task) => {
          const done = task.completedDates.includes(today);
          return `<div class="daily-task-item ${done ? "done" : ""}"><input class="check" type="checkbox" ${done ? "checked" : ""} data-daily-toggle="${task.id}" /><strong>${esc(task.title)}</strong>${done ? "<small>已打卡</small>" : ""}<button class="delete-icon" data-daily-delete="${task.id}" aria-label="删除任务">×</button></div>`;
        })
        .join("")
    : `<p class="empty">添加一个每天都想坚持的小习惯。</p>`;
  document.querySelector("#daily-month-title").textContent =
    `${dailyCursor.getFullYear()} 年 ${dailyCursor.getMonth() + 1} 月`;
  document.querySelector("#daily-calendar").innerHTML = calendarMarkup(
    dailyCursor,
    (key) => {
      const count = state.dailyTasks.filter((task) =>
        task.completedDates.includes(key),
      ).length;
      const ratio = state.dailyTasks.length
        ? count / state.dailyTasks.length
        : 0;
      return {
        level: ratio === 0 ? 0 : ratio < 0.5 ? 1 : ratio < 1 ? 2 : 4,
        detail: count ? `${count}/${state.dailyTasks.length} 完成` : "",
      };
    },
    false,
  );
}

function renderProjects() {
  const cards = state.projects
    .map((project) => {
      const done = project.stages.filter((stage) => stage.done).length;
      const percent = project.stages.length
        ? Math.round((done / project.stages.length) * 100)
        : 0;
      return `<article class="panel project-card"><div class="project-top"><div><h2 class="project-title">${esc(project.title)}</h2><p class="project-desc">${esc(project.description || "尚未添加项目说明。")}</p></div><button class="delete-icon" data-project-delete="${project.id}" aria-label="删除项目">×</button></div><div class="project-dates">${project.start || "待开始"} — ${project.end || "未设置截止"}</div><div class="project-progress"><div class="progress-line"><i style="width:${percent}%"></i></div><small>${percent}%</small></div><div class="stage-list">${project.stages.map((stage) => `<label class="stage ${stage.done ? "done" : ""}"><input class="check" type="checkbox" ${stage.done ? "checked" : ""} data-stage-toggle="${stage.id}" data-project="${project.id}" /><span>${esc(stage.title)}</span></label>`).join("")}<button class="text-button" data-stage-add="${project.id}">+ 添加阶段</button></div></article>`;
    })
    .join("");
  document.querySelector("#project-list").innerHTML =
    `${cards}<button class="panel new-project-card" id="new-project-card"><strong>+</strong><span>新建项目</span></button>`;
}

function recordsForDay(key) {
  return state.records.filter((record) => record.date === key);
}
function categoryTotals(records = state.records) {
  return Object.entries(
    records.reduce((acc, record) => {
      if (record.minutes > 0)
        acc[record.category] = (acc[record.category] || 0) + record.minutes;
      return acc;
    }, {}),
  )
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}
function renderStats() {
  const records = todayRecords();
  const totals = categoryTotals(records);
  const total = totals.reduce((sum, item) => sum + item.minutes, 0);
  document.querySelector("#today-total-label").textContent =
    `${total} 分钟投入`;
  document.querySelector("#donut-total").textContent = total;
  let degree = 0;
  const gradient = totals.length
    ? totals
        .map((item, index) => {
          const next = degree + (item.minutes / total) * 360;
          const segment = `${colors[index % colors.length]} ${degree}deg ${next}deg`;
          degree = next;
          return segment;
        })
        .join(", ")
    : "#e8eeee 0deg 360deg";
  document.querySelector("#donut-chart").style.background =
    `conic-gradient(${gradient})`;
  document.querySelector("#donut-legend").innerHTML = totals.length
    ? totals
        .map(
          (item, index) =>
            `<div class="legend-item"><i class="legend-dot" style="background:${colors[index % colors.length]}"></i><span>${esc(item.name)}</span><strong>${item.minutes}m</strong></div>`,
        )
        .join("")
    : `<p class="empty">完成一段有时长的事项后，数据会显示在这里。</p>`;
  const ranks =
    rankingMode === "category"
      ? categoryTotals()
      : state.trees
          .map((tree) => ({
            name: tree.title,
            minutes: state.records
              .filter(
                (record) =>
                  record.type === "focus" && record.treeId === tree.id,
              )
              .reduce((sum, record) => sum + record.minutes, 0),
          }))
          .filter((item) => item.minutes)
          .sort((a, b) => b.minutes - a.minutes);
  const max = ranks[0]?.minutes || 1;
  document.querySelector("#ranking-list").innerHTML = ranks.length
    ? ranks
        .slice(0, 6)
        .map(
          (item, index) =>
            `<div class="ranking-row"><span class="rank-no">0${index + 1}</span><div><div class="rank-name"><span>${esc(item.name)}</span></div><div class="rank-bar"><i style="width:${(item.minutes / max) * 100}%"></i></div></div><span class="rank-value">${item.minutes}m</span></div>`,
        )
        .join("")
    : `<p class="empty">专注记录会沉淀为排行榜。</p>`;
  document
    .querySelectorAll("[data-ranking]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.ranking === rankingMode),
    );
  document.querySelector("#stats-month-title").textContent =
    `${statsCursor.getFullYear()} 年 ${statsCursor.getMonth() + 1} 月`;
  document.querySelector("#stats-calendar").innerHTML = calendarMarkup(
    statsCursor,
    (key) => {
      const dayRecords = recordsForDay(key);
      const mins = dayRecords.reduce((sum, record) => sum + record.minutes, 0);
      return {
        level:
          mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4,
        detail: mins ? `${mins} 分钟` : "",
      };
    },
    true,
  );
  const details = recordsForDay(selectedStatsDate);
  document.querySelector("#selected-day-details").innerHTML =
    `<strong class="detail-heading">${selectedStatsDate === dateKey() ? "今天" : selectedStatsDate} 的完成事项</strong>${details.length ? details.map((record) => `<span class="detail-chip">${esc(record.title)}${record.minutes ? ` · ${record.minutes}m` : ""} <button class="delete-icon" data-record-delete="${record.id}" aria-label="删除记录">×</button></span>`).join("") : `<span class="detail-chip">这一天还没有记录</span>`}`;
}

function calendarMarkup(cursor, getData, clickable) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const heads = ["一", "二", "三", "四", "五", "六", "日"]
    .map((day) => `<div class="weekday">${day}</div>`)
    .join("");
  const empty = Array.from(
    { length: offset },
    () => '<div class="calendar-cell empty-cell"></div>',
  ).join("");
  const cells = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const key = dateKey(new Date(year, month, day));
    const { level, detail } = getData(key);
    return `<button class="calendar-cell ${level ? `level-${level}` : ""} ${key === dateKey() ? "today" : ""}" ${clickable ? `data-stats-day="${key}"` : ""}><span class="day-number">${day}</span>${detail ? `<span class="cell-detail">${detail}</span>` : ""}</button>`;
  }).join("");
  return heads + empty + cells;
}

function renderLibrary() {
  document.querySelector("#library-list").innerHTML = libraryItems
    .map(
      (item, index) =>
        `<article class="panel library-card"><span class="library-icon">${item.icon}</span><h3>${item.title}</h3><p>${item.description}</p><button class="ghost-button" data-library-import="${index}">导入知识树 →</button></article>`,
    )
    .join("");
}
