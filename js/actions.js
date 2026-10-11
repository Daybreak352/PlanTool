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
function toggleStage(projectId, stageId, checked) {
  const stage = state.projects
    .find((project) => project.id === projectId)
    ?.stages.find((item) => item.id === stageId);
  if (!stage) return;
  stage.done = checked;
  stage.completedAt = checked ? dateKey() : undefined;
  if (checked) recordCompletion("project", stage.title, 0, "项目");
  else removeCompletion("project", stage.title);
  save();
  renderAll();
}
function addStage(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  const title = prompt("阶段名称");
  if (title?.trim()) {
    project.stages.push({ id: uid(), title: title.trim(), done: false });
    save();
    renderProjects();
  }
}
function addProject() {
  const title = prompt("项目名称", "新项目");
  if (!title?.trim()) return;
  const description = prompt("项目说明（可选）", "");
  const end = prompt("完成日期（YYYY-MM-DD，可留空）", "");
  state.projects.push({
    id: uid(),
    title: title.trim(),
    description: description?.trim() || "",
    start: dateKey(),
    end: end?.trim() || "",
    stages: [{ id: uid(), title: "定义第一步", done: false }],
  });
  save();
  renderProjects();
  toast("项目已创建");
}
