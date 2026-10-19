// Application entry point: event wiring and startup only.

function syncNavigation() {
  let current;
  document.querySelectorAll(".nav-item").forEach((item) => {
    const active = item.dataset.nav === activeView;
    item.classList.toggle("active", active);
    if (active) {
      item.setAttribute("aria-current", "page");
      current = item;
    } else item.removeAttribute("aria-current");
  });
  if (window.matchMedia("(max-width: 760px)").matches) {
    current?.scrollIntoView({ block: "nearest", inline: "center" });
  }
}

const viewNames = new Set(["home", "focus", "daily", "project", "stats"]);

function showView(viewName) {
  activeView = viewNames.has(viewName) ? viewName : "home";
  if (viewName && !viewNames.has(viewName))
    window.history.replaceState(null, "", "#home");
  document
    .querySelectorAll(".view")
    .forEach((view) =>
      view.classList.toggle("active", view.dataset.view === activeView),
    );
  syncNavigation();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "button, [data-nav], [data-home-memo], [data-memo-toggle]",
  );
  if (!target) return;
  if (target.dataset.nav) {
    if (target.tagName === "A") event.preventDefault();
    showView(target.dataset.nav);
    window.location.hash = activeView;
    return;
  }
  if (target.hasAttribute("data-period-new")) {
    periodEditorId = null;
    renderPeriods();
    document.querySelector("#period-title").focus();
    return;
  }
  if (target.dataset.periodEdit) {
    periodEditorId = target.dataset.periodEdit;
    renderPeriods();
    document.querySelector("#period-title").focus();
    return;
  }
  if (target.dataset.periodDelete) {
    const period = state.periods.find(
      (item) => item.id === target.dataset.periodDelete,
    );
    if (!period || !confirm(`删除时期「${period.title}」？`)) return;
    state.periods = state.periods.filter((item) => item.id !== period.id);
    if (periodEditorId === period.id) periodEditorId = undefined;
    save();
    renderPeriods();
    toast("时期已删除");
    return;
  }
  if (target.hasAttribute("data-period-cancel")) {
    periodEditorId = undefined;
    renderPeriods();
    return;
  }
  if (target.dataset.homeMemo) {
    toggleMemo(target.dataset.homeMemo);
    return;
  }
  if (target.dataset.memoToggle) {
    toggleMemo(target.dataset.memoToggle);
    return;
  }
  if (target.dataset.memoDelete) {
    state.memos = state.memos.filter(
      (memo) => memo.id !== target.dataset.memoDelete,
    );
    save();
    renderAll();
    return;
  }
  if (target.dataset.memoFilter) {
    memoFilter = target.dataset.memoFilter;
    renderMemos();
    return;
  }
  if (target.dataset.dailyDelete) {
    state.dailyTasks = state.dailyTasks.filter(
      (task) => task.id !== target.dataset.dailyDelete,
    );
    save();
    renderAll();
    toast("任务已移出清单，历史记录仍保留");
    return;
  }
  if (target.dataset.dailyDay) {
    selectedDailyDate = target.dataset.dailyDay;
    renderDaily();
    return;
  }
  if (target.dataset.dailyRecordDelete) {
    if (!confirm("删除这条每日任务记录？")) return;
    if (removeDailyRecord(target.dataset.dailyRecordDelete)) {
      save();
      renderAll();
      toast("历史记录已删除");
    }
    return;
  }
  if (target.dataset.projectSelect) {
    selectedProjectId = target.dataset.projectSelect;
    renderProjects();
    return;
  }
  if (target.dataset.projectRemove) {
    const kind = target.dataset.projectRemove;
    const label =
      kind === "task"
        ? "任务"
        : kind === "group"
          ? "一级标题及其全部内容"
          : "二级标题及其全部任务";
    if (confirm(`删除这个${label}？`))
      deleteProjectItem(kind, target.dataset.itemId);
    return;
  }
  if (target.dataset.projectDelete) {
    if (confirm("删除这个项目及其全部任务？此操作无法撤销。")) {
      state.projects = state.projects.filter(
        (project) => project.id !== target.dataset.projectDelete,
      );
      save();
      renderAll();
    }
    return;
  }
  if (target.dataset.statsDay) {
    selectedStatsDate = target.dataset.statsDay;
    renderStats();
    return;
  }
  if (target.dataset.recordDelete) {
    const record = state.records.find(
      (item) => item.id === target.dataset.recordDelete,
    );
    if (record?.type === "daily") removeDailyRecord(record.id);
    else
      state.records = state.records.filter(
        (item) => item.id !== target.dataset.recordDelete,
      );
    save();
    renderAll();
    toast("记录已删除");
    return;
  }
  switch (target.id) {
    case "timer-start":
      startOrPauseTimer();
      break;
    case "timer-reset":
      readTimerSettings();
      resetTimer();
      break;
    case "daily-prev-month":
      dailyCursor = new Date(
        dailyCursor.getFullYear(),
        dailyCursor.getMonth() - 1,
        1,
      );
      selectedDailyDate = dateKey(dailyCursor);
      renderDaily();
      break;
    case "daily-next-month":
      dailyCursor = new Date(
        dailyCursor.getFullYear(),
        dailyCursor.getMonth() + 1,
        1,
      );
      selectedDailyDate = dateKey(dailyCursor);
      renderDaily();
      break;
    case "stats-prev-month":
      statsCursor = new Date(
        statsCursor.getFullYear(),
        statsCursor.getMonth() - 1,
        1,
      );
      renderStats();
      break;
    case "stats-next-month":
      statsCursor = new Date(
        statsCursor.getFullYear(),
        statsCursor.getMonth() + 1,
        1,
      );
      renderStats();
      break;
    case "new-project":
      addProject();
      break;
  }
});

function validatePeriodDates(form) {
  const start = form.elements.start.value;
  const end = form.elements.end;
  const invalid = Boolean(start && end.value && end.value < start);
  end.setCustomValidity(invalid ? "结束月份不能早于开始月份" : "");
  form.querySelector(".period-error").hidden = !invalid;
  return !invalid;
}

document.querySelector("#home-view").addEventListener("input", (event) => {
  const form = event.target.closest("#period-form");
  if (!form) return;
  if (event.target.name === "title") event.target.setCustomValidity("");
  validatePeriodDates(form);
});

document.querySelector("#home-view").addEventListener("submit", (event) => {
  if (event.target.id !== "period-form") return;
  event.preventDefault();
  const form = event.target;
  const title = form.elements.title.value.trim();
  if (!title) {
    form.elements.title.setCustomValidity("请输入时期名称");
    form.elements.title.reportValidity();
    return;
  }
  if (!validatePeriodDates(form)) {
    form.elements.end.reportValidity();
    return;
  }
  const period = state.periods.find((item) => item.id === periodEditorId);
  if (period) {
    period.title = title;
    period.start = form.elements.start.value;
    period.end = form.elements.end.value;
  } else {
    state.periods.push({
      id: uid(),
      title,
      start: form.elements.start.value,
      end: form.elements.end.value,
    });
  }
  periodEditorId = undefined;
  save();
  renderPeriods();
  toast(period ? "时期已更新" : "时期已添加");
});

document.querySelector("#project-view").addEventListener("submit", (event) => {
  const form = event.target.closest("[data-project-add]");
  if (!form) return;
  event.preventDefault();
  const title = form.elements.title.value.trim();
  if (!title) return;
  addProjectItem(form.dataset.projectAdd, form.dataset.parent, title);
});

document.querySelector("#project-view").addEventListener("change", (event) => {
  const input = event.target;
  if (input.dataset.projectCheck) {
    toggleProjectItem(
      input.dataset.projectKind,
      input.dataset.projectCheck,
      input.checked,
    );
    return;
  }
  const project = projectById(selectedProjectId);
  if (!project) return;
  if (input.dataset.projectField) {
    const field = input.dataset.projectField;
    const value = input.value.trim();
    if (field === "title" && !value) {
      input.value = project.title;
      return;
    }
    project[field] = value;
    input.value = value;
  } else if (input.dataset.projectTitle) {
    const node = projectNode(
      project,
      input.dataset.projectTitle,
      input.dataset.itemId,
    );
    if (!node) return;
    const title = input.value.trim();
    if (!title) {
      input.value = node.title;
      return;
    }
    node.title = title;
    input.value = title;
  } else return;
  save();
  // Do not replace the editor on blur: the user's next click may target the sidebar.
  if (input.dataset.projectField === "title") {
    const label = document.querySelector(".project-switch.active span");
    if (label) label.textContent = project.title;
  }
  if (input.dataset.projectTitle) {
    const row = input.closest(
      ".project-group-head, .project-section-head, .project-task",
    );
    const check = row?.querySelector("[data-project-check]");
    const remove = row?.querySelector("[data-project-remove]");
    if (check)
      check.setAttribute(
        "aria-label",
        `${check.checked ? "取消完成" : "标记完成"}：${input.value.trim()}`,
      );
    if (remove)
      remove.setAttribute(
        "aria-label",
        `删除${input.dataset.projectTitle === "task" ? "任务" : input.dataset.projectTitle === "group" ? "一级标题" : "二级标题"}：${input.value.trim()}`,
      );
  }
});

document.querySelector("#memo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.querySelector("#memo-title").value.trim();
  if (!title) return;
  state.memos.unshift({
    id: uid(),
    title,
    minutes: Number(document.querySelector("#memo-minutes").value) || 0,
    done: false,
    createdAt: dateKey(),
  });
  event.target.reset();
  save();
  renderAll();
  toast("备忘录已添加");
});
document.querySelector("#daily-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#daily-title");
  const title = input.value.trim();
  if (!title) return;
  if (
    state.dailyTasks.some(
      (task) => dailyTitleKey(task.title) === dailyTitleKey(title),
    )
  ) {
    toast("任务已在清单中");
    return;
  }
  const completedDates = dailyDatesForTitle(title);
  state.dailyTasks.push({
    id: uid(),
    title,
    completedDates,
  });
  input.value = "";
  save();
  renderAll();
  toast(
    completedDates.length
      ? `每日任务已添加，继承 ${completedDates.length} 天记录`
      : "每日任务已添加",
  );
});
document.querySelector("#daily-view").addEventListener("change", (event) => {
  if (event.target.dataset.dailyToggle)
    toggleDaily(event.target.dataset.dailyToggle, event.target.checked);
});
document.querySelector("#daily-view").addEventListener("submit", (event) => {
  if (event.target.id !== "daily-history-form") return;
  event.preventDefault();
  const title = event.target.querySelector("#daily-history-title").value.trim();
  if (!title) return;
  const result = addDailyRecord(title, selectedDailyDate);
  if (result === "future") return toast("未来日期不能补录");
  if (result === "duplicate") return toast("这一天已有同名记录");
  save();
  renderAll();
  toast("历史记录已添加");
});
document.querySelector("#focus-view").addEventListener("change", (event) => {
  if (
    ["focus-minutes", "break-minutes", "total-rounds"].includes(
      event.target.id,
    ) &&
    !timer.running
  ) {
    readTimerSettings();
    resetTimer();
  }
});
document.querySelector("#export-data").addEventListener("click", () => {
  const file = new Blob(
    [
      JSON.stringify(
        { ...state, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PlanTool-backup-${dateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("备份文件已下载");
});
document.querySelector("#import-trigger").addEventListener("click", () => {
  document.querySelector("#import-data").click();
});
document.querySelector("#import-data").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.records)) throw new Error("invalid");
      if (!confirm("导入会替换当前本地数据，是否继续？")) return;
      state = {
        ...defaultState(),
        ...data,
        periods: Array.isArray(data.periods) ? data.periods : [],
      };
      periodEditorId = undefined;
      save();
      resetTimer();
      renderAll();
      toast("数据已导入");
    } catch {
      toast("备份文件格式不正确");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});
document.querySelector("#clear-data").addEventListener("click", () => {
  if (!confirm("确定清除所有数据并恢复空白初始状态？")) return;
  if (!confirm("此操作无法撤销，确认继续？")) return;
  state = defaultState();
  periodEditorId = undefined;
  save();
  resetTimer();
  renderAll();
  toast("已恢复初始数据");
});

const hash = window.location.hash.replace("#", "");
showView(hash || activeView);
renderAll();

window.addEventListener("hashchange", () =>
  showView(window.location.hash.slice(1)),
);
