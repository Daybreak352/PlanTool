// DOM rendering functions. No event listeners live in this file.

function renderAll() {
  renderHome();
  renderFocus();
  renderMemos();
  renderDaily();
  renderProjects();
  renderStats();
}

function renderHome() {
  document.querySelector("#today-label").textContent =
    prettyDate().toUpperCase();
  const todayDone = todayRecords().length;
  const focusMinutes = allFocusMinutes();
  const pending =
    state.dailyTasks.filter((task) => !task.completedDates.includes(dateKey()))
      .length + state.memos.filter((memo) => !memo.done).length;
  document.querySelector("#home-metrics").innerHTML = [
    ["累计专注", "Total Focus", minutesText(focusMinutes), "已记录的专注时间"],
    ["今日完成", "Completed Today", todayDone, "今日完成事项"],
    ["待办事项", "Pending", pending, "任务与备忘录"],
    ["项目", "Projects", state.projects.length, "正在规划的目标"],
  ]
    .map(
      ([label, translation, value, note]) =>
        `<article class="metric-card"><div class="metric-label"><strong>${label}</strong><small>${translation}</small></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`,
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
    : `<p class="empty">今天还没有任务。去「每日任务」添加第一项。</p>`;
  const openMemos = state.memos.filter((memo) => !memo.done).slice(0, 4);
  document.querySelector("#home-memos").innerHTML = openMemos.length
    ? openMemos
        .map(
          (memo) =>
            `<label class="memo-compact"><input class="check" type="checkbox" data-home-memo="${memo.id}" /><span>${esc(memo.title)}</span></label>`,
        )
        .join("")
    : `<p class="empty">暂无未完成备忘录。</p>`;
}

function renderFocus() {
  const target = document.querySelector("#focus-target");
  if (!target.firstElementChild)
    target.innerHTML = `<div class="custom-target"><input id="custom-focus-title" aria-label="专注名称" maxlength="50" placeholder="例如：阅读、绘画、运动" /><select id="custom-focus-category" aria-label="专注类别"><option>学习</option><option>运动</option><option>绘画</option><option>阅读</option><option>其他</option></select></div>`;
  document.querySelector("#focus-minutes").value = state.timerSettings.focus;
  document.querySelector("#break-minutes").value = state.timerSettings.break;
  document.querySelector("#total-rounds").value = state.timerSettings.rounds;
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const seconds = Math.max(timer.secondsLeft, 0);
  document
    .querySelector(".timer-stage")
    .classList.toggle("is-running", timer.running);
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
    ? `${document.querySelector("#timer-display").textContent} · UEG 专注`
    : "地球发动机控制中心 · UEG";
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
          return `<div class="daily-task-item ${done ? "done" : ""}"><input class="check" type="checkbox" aria-label="完成任务：${esc(task.title)}" ${done ? "checked" : ""} data-daily-toggle="${task.id}" /><strong>${esc(task.title)}</strong>${done ? "<small>已打卡</small>" : ""}<button class="delete-icon" data-daily-delete="${task.id}" aria-label="删除任务">×</button></div>`;
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
    : "var(--surface-muted) 0deg 360deg";
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
  const ranks = categoryTotals();
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
