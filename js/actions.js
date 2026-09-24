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
    let title = "自定义专注";
    let category = "学习";
    let treeId;
    if (focusMode === "tree") {
      const tree = getTree(document.querySelector("#focus-tree")?.value);
      const pointId = document.querySelector("#focus-point")?.value;
      const point = tree && allPoints(tree).find((item) => item.id === pointId);
      if (point) {
        title = point.title;
        treeId = tree.id;
        point.minutes += minutes;
      }
    } else {
      title =
        document.querySelector("#custom-focus-title")?.value.trim() ||
        "自定义专注";
      category =
        document.querySelector("#custom-focus-category")?.value || "其他";
    }
    recordCompletion("focus", title, minutes, category, { treeId });
    state.selectedTreeId = treeId || state.selectedTreeId;
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

function addTree() {
  const title = prompt("知识树名称", "新的学习主题");
  if (!title?.trim()) return;
  const tree = {
    id: uid(),
    title: title.trim(),
    subject: "自定义",
    modules: [
      {
        id: uid(),
        title: "基础模块",
        sections: [
          {
            id: uid(),
            title: "第一章节",
            points: [
              { id: uid(), title: "第一个知识点", mastered: false, minutes: 0 },
            ],
          },
        ],
      },
    ],
  };
  state.trees.push(tree);
  state.selectedTreeId = tree.id;
  save();
  renderAll();
  toast("知识树已创建");
}
function findModule(tree, moduleId) {
  return tree.modules.find((item) => item.id === moduleId);
}
function findSection(tree, moduleId, sectionId) {
  return findModule(tree, moduleId)?.sections.find(
    (item) => item.id === sectionId,
  );
}
function handleNodeAction(button) {
  const tree = getTree();
  const action = button.dataset.nodeAction;
  const module = findModule(tree, button.dataset.module);
  const section = findSection(
    tree,
    button.dataset.module,
    button.dataset.section,
  );
  const point = section?.points.find(
    (item) => item.id === button.dataset.point,
  );
  if (action === "toggle-point") point.mastered = button.checked;
  if (action === "add-section") {
    const title = prompt("章节名称");
    if (title?.trim())
      module.sections.push({ id: uid(), title: title.trim(), points: [] });
  }
  if (action === "add-point") {
    const title = prompt("知识点名称");
    if (title?.trim())
      section.points.push({
        id: uid(),
        title: title.trim(),
        mastered: false,
        minutes: 0,
      });
  }
  if (action === "rename-module") {
    const title = prompt("模块名称", module.title);
    if (title?.trim()) module.title = title.trim();
  }
  if (action === "rename-section") {
    const title = prompt("章节名称", section.title);
    if (title?.trim()) section.title = title.trim();
  }
  if (action === "rename-point") {
    const title = prompt("知识点名称", point.title);
    if (title?.trim()) point.title = title.trim();
  }
  if (
    action === "delete-module" &&
    confirm(`删除模块“${module.title}”及其内容？`)
  )
    tree.modules = tree.modules.filter((item) => item.id !== module.id);
  if (
    action === "delete-section" &&
    confirm(`删除章节“${section.title}”及其知识点？`)
  )
    module.sections = module.sections.filter((item) => item.id !== section.id);
  if (action === "delete-point" && confirm(`删除知识点“${point.title}”？`))
    section.points = section.points.filter((item) => item.id !== point.id);
  save();
  renderAll();
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
function importLibrary(index) {
  const item = libraryItems[index];
  const tree = {
    id: uid(),
    title: item.title,
    subject: item.subject,
    modules: item.modules.map((moduleTitle) => ({
      id: uid(),
      title: moduleTitle,
      sections: [
        {
          id: uid(),
          title: "基础知识",
          points: [
            {
              id: uid(),
              title: `${moduleTitle} 核心概念`,
              mastered: false,
              minutes: 0,
            },
          ],
        },
      ],
    })),
  };
  state.trees.push(tree);
  state.selectedTreeId = tree.id;
  save();
  renderAll();
  activeView = "tree";
  document
    .querySelectorAll(".view")
    .forEach((view) =>
      view.classList.toggle("active", view.dataset.view === "tree"),
    );
  document
    .querySelectorAll(".nav-item")
    .forEach((item) =>
      item.classList.toggle("active", item.dataset.nav === "tree"),
    );
  toast(`已导入「${item.title}」`);
}
