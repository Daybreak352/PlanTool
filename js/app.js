// Application entry point: event wiring and startup only.

document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "button, [data-home-memo], [data-memo-toggle], [data-daily-toggle], [data-stage-toggle], [data-node-action]",
  );
  if (!target) return;
  if (target.dataset.nav) {
    activeView = target.dataset.nav;
    document
      .querySelectorAll(".view")
      .forEach((view) =>
        view.classList.toggle("active", view.dataset.view === activeView),
      );
    document
      .querySelectorAll(".nav-item")
      .forEach((item) =>
        item.classList.toggle("active", item.dataset.nav === activeView),
      );
    window.location.hash = activeView;
    return;
  }
  if (target.dataset.homeMemo) {
    toggleMemo(target.dataset.homeMemo);
    return;
  }
  if (target.dataset.treeSelect) {
    state.selectedTreeId = target.dataset.treeSelect;
    save();
    renderTree();
    renderFocus();
    return;
  }
  if (target.dataset.nodeAction) {
    handleNodeAction(target);
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
  if (target.dataset.dailyToggle) {
    toggleDaily(target.dataset.dailyToggle, target.checked);
    return;
  }
  if (target.dataset.dailyDelete) {
    state.dailyTasks = state.dailyTasks.filter(
      (task) => task.id !== target.dataset.dailyDelete,
    );
    save();
    renderAll();
    return;
  }
  if (target.dataset.stageToggle) {
    toggleStage(
      target.dataset.project,
      target.dataset.stageToggle,
      target.checked,
    );
    return;
  }
  if (target.dataset.stageAdd) {
    addStage(target.dataset.stageAdd);
    return;
  }
  if (target.dataset.projectDelete) {
    if (confirm("删除这个项目？")) {
      state.projects = state.projects.filter(
        (project) => project.id !== target.dataset.projectDelete,
      );
      save();
      renderAll();
    }
    return;
  }
  if (target.dataset.ranking) {
    rankingMode = target.dataset.ranking;
    renderStats();
    return;
  }
  if (target.dataset.statsDay) {
    selectedStatsDate = target.dataset.statsDay;
    renderStats();
    return;
  }
  if (target.dataset.recordDelete) {
    state.records = state.records.filter(
      (record) => record.id !== target.dataset.recordDelete,
    );
    save();
    renderAll();
    toast("记录已删除");
    return;
  }
  if (target.dataset.libraryImport) {
    importLibrary(Number(target.dataset.libraryImport));
    return;
  }
  if (target.dataset.focusMode) {
    focusMode = target.dataset.focusMode;
    renderFocus();
    return;
  }
  switch (target.id) {
    case "new-tree":
    case "new-tree-small":
      addTree();
      break;
    case "add-knowledge-point": {
      const tree = getTree();
      if (!tree.modules.length)
        tree.modules.push({ id: uid(), title: "基础模块", sections: [] });
      const module = tree.modules[0];
      if (!module.sections.length)
        module.sections.push({ id: uid(), title: "第一章节", points: [] });
      const title = prompt("知识点名称");
      if (title?.trim()) {
        module.sections[0].points.push({
          id: uid(),
          title: title.trim(),
          mastered: false,
          minutes: 0,
        });
        save();
        renderAll();
      }
      break;
    }
    case "rename-tree": {
      const tree = getTree();
      const title = prompt("知识树名称", tree.title);
      if (title?.trim()) {
        tree.title = title.trim();
        save();
        renderAll();
      }
      break;
    }
    case "delete-tree": {
      const tree = getTree();
      if (confirm(`删除知识树“${tree.title}”？`)) {
        state.trees = state.trees.filter((item) => item.id !== tree.id);
        state.selectedTreeId = state.trees[0]?.id ?? null;
        save();
        renderAll();
      }
      break;
    }
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
      renderDaily();
      break;
    case "daily-next-month":
      dailyCursor = new Date(
        dailyCursor.getFullYear(),
        dailyCursor.getMonth() + 1,
        1,
      );
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
    case "new-project-card":
      addProject();
      break;
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
  if (!input.value.trim()) return;
  state.dailyTasks.push({
    id: uid(),
    title: input.value.trim(),
    completedDates: [],
  });
  input.value = "";
  save();
  renderAll();
  toast("每日任务已添加");
});
document.querySelector("#focus-view").addEventListener("change", (event) => {
  if (event.target.id === "focus-tree") {
    state.selectedTreeId = event.target.value;
    save();
    renderFocus();
  }
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
document.querySelector("#import-data").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.trees) || !Array.isArray(data.records))
        throw new Error("invalid");
      if (!confirm("导入会替换当前本地数据，是否继续？")) return;
      state = { ...defaultState(), ...data };
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
  save();
  resetTimer();
  renderAll();
  toast("已恢复初始数据");
});

const hash = window.location.hash.replace("#", "");
if (
  ["home", "tree", "focus", "daily", "project", "stats", "library"].includes(
    hash,
  )
) {
  activeView = hash;
  document
    .querySelectorAll(".view")
    .forEach((view) =>
      view.classList.toggle("active", view.dataset.view === activeView),
    );
  document
    .querySelectorAll(".nav-item")
    .forEach((item) =>
      item.classList.toggle("active", item.dataset.nav === activeView),
    );
}
renderAll();
