// User actions and timer workflows that mutate application state.

function readTimerSettings() {
  state.timerSettings.focus = Math.min(
    120,
    Math.max(1, Number(document.querySelector("#focus-minutes").value) || 25),
  );
  state.timerSettings.break = Math.min(
    30,
    Math.max(1, Number(document.querySelector("#break-minutes").value) || 5),
  );
  state.timerSettings.rounds = Math.min(
    12,
    Math.max(1, Number(document.querySelector("#total-rounds").value) || 4),
  );
  save();
}
function startOrPauseTimer() {
  readTimerSettings();
  if (timer.running) {
    clearInterval(timer.interval);
    timer.running = false;
    updateTimerDisplay();
    return;
  }
  timer.running = true;
  timer.interval = setInterval(() => {
    timer.secondsLeft -= 1;
    if (timer.secondsLeft <= 0) finishPhase();
    updateTimerDisplay();
  }, 1000);
  updateTimerDisplay();
}
function finishPhase() {
  if (timer.phase === "focus") {
    const minutes = state.timerSettings.focus;
    const title =
      document.querySelector("#custom-focus-title")?.value.trim() ||
      "自定义专注";
    const category =
      document.querySelector("#custom-focus-category")?.value || "其他";
    recordCompletion("focus", title, minutes, category);
    save();
    renderAll();
    toast(`已记录 ${minutes} 分钟专注`);
    timer.phase = "break";
    timer.secondsLeft = state.timerSettings.break * 60;
  } else {
    if (timer.round >= state.timerSettings.rounds) {
      clearInterval(timer.interval);
      timer.running = false;
      timer.phase = "focus";
      timer.round = 1;
      timer.secondsLeft = state.timerSettings.focus * 60;
      toast("本轮计划已完成，做得好！");
    } else {
      timer.round += 1;
      timer.phase = "focus";
      timer.secondsLeft = state.timerSettings.focus * 60;
      toast("休息结束，开始下一轮。");
    }
  }
}
function resetTimer() {
  clearInterval(timer.interval);
  timer = {
    phase: "focus",
    running: false,
    secondsLeft: state.timerSettings.focus * 60,
    round: 1,
    interval: null,
  };
  updateTimerDisplay();
}

function toggleMemo(id) {
  const memo = state.memos.find((item) => item.id === id);
  if (!memo) return;
  memo.done = !memo.done;
  memo.completedAt = memo.done ? dateKey() : undefined;
  if (memo.done) recordCompletion("memo", memo.title, memo.minutes, "备忘录");
  else removeCompletion("memo", memo.title);
  save();
  renderAll();
  toast(memo.done ? "备忘录已归档" : "已恢复到待办");
}
function toggleDaily(id, checked) {
  const task = state.dailyTasks.find((item) => item.id === id);
  if (!task) return;
  const today = dateKey();
  if (checked && !task.completedDates.includes(today)) {
    task.completedDates.push(today);
    recordCompletion("daily", task.title, 0, "每日任务");
  }
  if (!checked) {
    task.completedDates = task.completedDates.filter((item) => item !== today);
    removeCompletion("daily", task.title);
  }
  save();
  renderAll();
}
function addProject() {
  const project = {
    id: uid(),
    title: "未命名项目",
    description: "",
    start: dateKey(),
    end: "",
    groups: [],
  };
  state.projects.push(project);
  selectedProjectId = project.id;
  save();
  renderAll();
  document.querySelector("#project-name")?.focus();
  document.querySelector("#project-name")?.select();
  toast("项目已创建");
}

function addProjectItem(kind, parentId, title) {
  const project = projectById(selectedProjectId);
  if (!project || !title) return;
  const item = { id: uid(), title, done: false };
  if (kind === "group") {
    projectGroups(project).push({ ...item, tasks: [], sections: [] });
  } else if (kind === "section") {
    const group = projectNode(project, "group", parentId);
    if (!group) return;
    group.done = false;
    (group.sections ||= []).push({ ...item, tasks: [] });
  } else if (kind === "task") {
    const parent =
      projectNode(project, "section", parentId) ||
      projectNode(project, "group", parentId);
    if (!parent) return;
    parent.done = false;
    (parent.tasks ||= []).push(item);
  } else return;
  save();
  renderProjects();
}

function toggleProjectItem(kind, id, checked) {
  const project = projectById(selectedProjectId);
  const item = project && projectNode(project, kind, id);
  if (!item) return;
  if (kind === "task") setProjectTaskDone(item, checked);
  else setHeadingDone(item, checked);
  save();
  renderAll();
}

function deleteProjectItem(kind, id) {
  const project = projectById(selectedProjectId);
  if (!project) return;
  const prune = (list) => {
    const index = list.findIndex((item) => item.id === id);
    if (index >= 0) {
      list.splice(index, 1);
      return true;
    }
    return false;
  };
  if (kind === "group") prune(projectGroups(project));
  for (const group of projectGroups(project)) {
    if (kind === "section") prune(group.sections || []);
    if (kind === "task") {
      prune(group.tasks || []);
      for (const section of group.sections || []) prune(section.tasks || []);
    }
  }
  save();
  renderAll();
}
