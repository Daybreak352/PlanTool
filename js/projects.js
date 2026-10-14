// Project tree helpers. Legacy stages are retained alongside the new structure.
let selectedProjectId = null;

function projectGroups(project) {
  if (!Array.isArray(project.groups)) {
    const stages = Array.isArray(project.stages) ? project.stages : [];
    project.groups = stages.length
      ? [
          {
            id: uid(),
            title: "项目阶段",
            done: false,
            tasks: stages.map((stage) => ({ ...stage })),
            sections: [],
          },
        ]
      : [];
  }
  return project.groups;
}

function projectById(id) {
  return state.projects.find((project) => project.id === id);
}

function projectNode(project, kind, id) {
  for (const group of projectGroups(project)) {
    if (kind === "group" && group.id === id) return group;
    if (kind === "task") {
      const direct = (group.tasks || []).find((task) => task.id === id);
      if (direct) return direct;
    }
    for (const section of group.sections || []) {
      if (kind === "section" && section.id === id) return section;
      if (kind === "task") {
        const task = (section.tasks || []).find((item) => item.id === id);
        if (task) return task;
      }
    }
  }
  return null;
}

function projectTasks(project) {
  return projectGroups(project).flatMap((group) => [
    ...(group.tasks || []),
    ...(group.sections || []).flatMap((section) => section.tasks || []),
  ]);
}

function projectProgress(project) {
  const tasks = projectTasks(project);
  return tasks.length
    ? Math.round(
        (tasks.filter((task) => task.done).length / tasks.length) * 100,
      )
    : 0;
}

function headingLeaves(node) {
  const children = [...(node.tasks || [])];
  for (const section of node.sections || []) {
    const leaves = headingLeaves(section);
    children.push(...(leaves.length ? leaves : [section]));
  }
  return children;
}

function headingState(node) {
  const leaves = headingLeaves(node);
  return {
    checked: leaves.length ? leaves.every((item) => item.done) : !!node.done,
    mixed:
      leaves.some((item) => item.done) && !leaves.every((item) => item.done),
  };
}

function setHeadingDone(node, done) {
  node.done = done;
  for (const task of node.tasks || []) setProjectTaskDone(task, done);
  for (const section of node.sections || []) setHeadingDone(section, done);
}

function setProjectTaskDone(task, done) {
  if (!!task.done === done) return;
  task.done = done;
  task.completedAt = done ? dateKey() : undefined;
  if (done) {
    recordCompletion("project", task.title, 0, "项目");
    state.records[state.records.length - 1].sourceId = task.id;
  } else {
    const index = state.records.findIndex(
      (record) => record.type === "project" && record.sourceId === task.id,
    );
    if (index >= 0) state.records.splice(index, 1);
    else removeCompletion("project", task.title); // Pre-migration records had no source ID.
  }
}
