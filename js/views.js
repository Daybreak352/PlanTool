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
          return `<div class="daily-task-item ${done ? "done" : ""}"><input class="check" type="checkbox" aria-label="${done ? "取消完成" : "完成任务"}：${esc(task.title)}" ${done ? "checked" : ""} data-daily-toggle="${task.id}" /><strong>${esc(task.title)}</strong><small>${done ? "今日完成 · " : ""}累计 ${task.completedDates.length} 天</small><button class="delete-icon" data-daily-delete="${task.id}" aria-label="移除任务：${esc(task.title)}">×</button></div>`;
        })
        .join("")
    : `<p class="empty">添加一个每天都想坚持的小习惯。</p>`;
  document.querySelector("#daily-month-title").textContent =
    `${dailyCursor.getFullYear()} 年 ${dailyCursor.getMonth() + 1} 月`;
  document.querySelector("#daily-calendar").innerHTML = calendarMarkup(
    dailyCursor,
    (key) => {
      const count = dailyRecordsForDate(key).length;
      return {
        level: count === 0 ? 0 : count === 1 ? 1 : count < 4 ? 2 : 4,
        detail: count ? `${count} 项记录` : "",
      };
    },
    "daily",
  );
  renderDailyHistory();
}

function renderDailyHistory() {
  const records = dailyRecordsForDate(selectedDailyDate);
  const future = selectedDailyDate > dateKey();
  const suggestions = [
    ...new Set([
      ...state.dailyTasks.map((task) => task.title),
      ...state.records
        .filter((record) => record.type === "daily")
        .map((record) => record.title),
    ]),
  ];
  document.querySelector("#daily-history").innerHTML = `
    <div class="daily-history-heading">
      <div><p class="eyebrow">历史记录 / LOG</p><h3>${selectedDailyDate === dateKey() ? "今天 · " : ""}${selectedDailyDate}</h3></div>
      <span>${records.length} 项完成</span>
    </div>
    <div class="daily-history-list">${
      records.length
        ? records
            .map(
              (record) =>
                `<div class="daily-history-item"><span>${esc(record.title)}</span><button type="button" data-daily-record-delete="${record.id}" aria-label="删除 ${selectedDailyDate} 的记录：${esc(record.title)}">删除</button></div>`,
            )
            .join("")
        : `<p class="daily-history-empty">这一天还没有每日任务记录。</p>`
    }</div>
    <form id="daily-history-form" class="daily-history-form">
      <label for="daily-history-title">补录已完成任务</label>
      <div><input id="daily-history-title" list="daily-history-suggestions" maxlength="50" required placeholder="输入任务名称" ${future ? "disabled" : ""} /><button type="submit" ${future ? "disabled" : ""}>添加记录</button></div>
      <datalist id="daily-history-suggestions">${suggestions.map((title) => `<option value="${esc(title)}"></option>`).join("")}</datalist>
      <p>${future ? "未来日期不能补录。" : "任务移出清单后，这里的历史记录仍会保留。"}</p>
    </form>`;
}

function renderProjects() {
  if (!state.projects.some((project) => project.id === selectedProjectId))
    selectedProjectId = state.projects[0]?.id || null;
  const selected = projectById(selectedProjectId);
  document.querySelector("#project-list").innerHTML = state.projects.length
    ? state.projects
        .map((project) => {
          const percent = projectProgress(project);
          return `<button type="button" class="project-switch ${project.id === selectedProjectId ? "active" : ""}" data-project-select="${project.id}" ${project.id === selectedProjectId ? 'aria-current="true"' : ""}><span>${esc(project.title)}</span><strong>${percent}%</strong></button>`;
        })
        .join("")
    : `<p class="project-sidebar-empty">尚无项目档案。</p>`;
  document.querySelector("#project-detail").innerHTML = selected
    ? projectDetailMarkup(selected)
    : `<div class="project-empty"><span class="project-empty-orbit" aria-hidden="true"></span><p>MISSION 00 / STANDBY</p><h2>从一个项目开始</h2><span>在左侧新建项目，设定航程并拆解任务。</span></div>`;
  document.querySelectorAll("[data-project-check]").forEach((input) => {
    const project = projectById(selectedProjectId);
    const node =
      project &&
      projectNode(
        project,
        input.dataset.projectKind,
        input.dataset.projectCheck,
      );
    if (node && input.dataset.projectKind !== "task")
      input.indeterminate = headingState(node).mixed;
  });
}

function projectAddForm(kind, parentId, placeholder, label) {
  return `<form class="project-add-form" data-project-add="${kind}" data-parent="${parentId || ""}"><input name="title" aria-label="${label}" maxlength="120" placeholder="${placeholder}" required /><button type="submit" aria-label="${label}">＋ <span>${label}</span></button></form>`;
}

function projectCheckMarkup(kind, item) {
  const done = kind === "task" ? !!item.done : headingState(item).checked;
  return `<input class="check" type="checkbox" data-project-check="${item.id}" data-project-kind="${kind}" aria-label="${done ? "取消完成" : "标记完成"}：${esc(item.title)}" ${done ? "checked" : ""} />`;
}

function projectTaskMarkup(task, index) {
  return `<div class="project-task ${task.done ? "is-done" : ""}"><span class="project-task-index">${String(index + 1).padStart(2, "0")}</span>${projectCheckMarkup("task", task)}<input class="project-item-name" data-project-title="task" data-item-id="${task.id}" aria-label="任务名称" value="${esc(task.title)}" maxlength="120" /><button class="project-remove" type="button" data-project-remove="task" data-item-id="${task.id}" aria-label="删除任务：${esc(task.title)}">×</button></div>`;
}

function projectSectionMarkup(section, index) {
  return `<section class="project-section"><div class="project-section-head"><span class="project-order">${String(index + 1).padStart(2, "0")}</span>${projectCheckMarkup("section", section)}<h3><input class="project-item-name" data-project-title="section" data-item-id="${section.id}" aria-label="二级标题" value="${esc(section.title)}" maxlength="120" /></h3><button class="project-remove" type="button" data-project-remove="section" data-item-id="${section.id}" aria-label="删除二级标题：${esc(section.title)}">×</button></div><div class="project-task-list">${(section.tasks || []).map(projectTaskMarkup).join("")}${projectAddForm("task", section.id, "输入任务，回车添加", "添加任务")}</div></section>`;
}

function projectGroupMarkup(group, index) {
  return `<section class="project-group"><div class="project-group-head"><span class="project-order">${String(index + 1).padStart(2, "0")}</span>${projectCheckMarkup("group", group)}<h2><input class="project-item-name" data-project-title="group" data-item-id="${group.id}" aria-label="一级标题" value="${esc(group.title)}" maxlength="120" /></h2><button class="project-remove" type="button" data-project-remove="group" data-item-id="${group.id}" aria-label="删除一级标题：${esc(group.title)}">×</button></div><div class="project-group-body">${(group.tasks || []).map(projectTaskMarkup).join("")}${projectAddForm("task", group.id, "输入直属任务", "添加任务")}${(group.sections || []).map(projectSectionMarkup).join("")}${projectAddForm("section", group.id, "添加二级标题", "添加二级标题")}</div></section>`;
}

function projectDetailMarkup(project) {
  const percent = projectProgress(project);
  const tasks = projectTasks(project);
  const done = tasks.filter((task) => task.done).length;
  return `<article class="project-sheet"><div class="project-sheet-top"><span>MISSION FILE / ${esc(project.id.slice(-5).toUpperCase())}</span><button type="button" class="project-delete" data-project-delete="${project.id}">删除项目</button></div><div class="project-meta"><label class="project-field project-name-field"><span>项目名称</span><input id="project-name" data-project-field="title" value="${esc(project.title)}" maxlength="120" required /></label><label class="project-field project-description-field"><span>项目简介</span><textarea data-project-field="description" rows="2" placeholder="写下项目的目标与背景…">${esc(project.description || "")}</textarea></label><div class="project-date-row"><label class="project-field"><span>开始时间</span><input type="date" data-project-field="start" value="${esc(project.start || "")}" /></label><span class="project-date-line" aria-hidden="true"></span><label class="project-field"><span>结束时间</span><input type="date" data-project-field="end" value="${esc(project.end || "")}" /></label></div></div><div class="project-summary"><div><span>总进度 / OVERALL PROGRESS</span><strong>${percent}<small>%</small></strong></div><div class="project-summary-track" role="progressbar" aria-label="项目总进度" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><p>${done} / ${tasks.length} 项任务已完成 · 勾选标题可完成或撤销其下全部任务</p></div><div class="project-structure"><div class="project-structure-head"><div><p class="eyebrow">任务结构 / TASK STRUCTURE</p><h2>执行清单</h2></div><span>${String(projectGroups(project).length).padStart(2, "0")} 个一级标题</span></div>${projectGroups(project).length ? projectGroups(project).map(projectGroupMarkup).join("") : `<p class="project-structure-empty">暂无分类。从一个一级标题开始，为项目搭建清晰的任务结构。</p>`}${projectAddForm("group", "", "新增一级标题", "添加一级标题")}</div></article>`;
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
    "stats",
  );
  const details = recordsForDay(selectedStatsDate);
  document.querySelector("#selected-day-details").innerHTML =
    `<strong class="detail-heading">${selectedStatsDate === dateKey() ? "今天" : selectedStatsDate} 的完成事项</strong>${details.length ? details.map((record) => `<span class="detail-chip">${esc(record.title)}${record.minutes ? ` · ${record.minutes}m` : ""} <button class="delete-icon" data-record-delete="${record.id}" aria-label="删除记录">×</button></span>`).join("") : `<span class="detail-chip">这一天还没有记录</span>`}`;
}

function calendarMarkup(cursor, getData, clickAction = "") {
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
    const selected =
      key === (clickAction === "daily" ? selectedDailyDate : selectedStatsDate);
    const disabled = clickAction === "daily" && key > dateKey();
    return `<button type="button" class="calendar-cell ${level ? `level-${level}` : ""} ${key === dateKey() ? "today" : ""} ${selected ? "selected" : ""}" ${clickAction ? `data-${clickAction}-day="${key}"` : ""} aria-label="${key}，${detail || "无记录"}" ${clickAction ? `aria-pressed="${selected}"` : ""} ${disabled ? "disabled" : ""}><span class="day-number">${day}</span>${detail ? `<span class="cell-detail">${detail}</span>` : ""}</button>`;
  }).join("");
  return heads + empty + cells;
}
