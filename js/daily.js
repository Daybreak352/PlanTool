// Daily completions live in records, independently of the active task list.
let selectedDailyDate = dateKey();

const dailyTitleKey = (title) => title.trim().toLocaleLowerCase();

function dailyRecordsForDate(key) {
  return state.records.filter(
    (record) => record.type === "daily" && record.date === key,
  );
}

function dailyDatesForTitle(title) {
  const key = dailyTitleKey(title);
  return [
    ...new Set(
      state.records
        .filter(
          (record) =>
            record.type === "daily" && dailyTitleKey(record.title) === key,
        )
        .map((record) => record.date),
    ),
  ].sort();
}

function syncDailyTaskDates(title) {
  const key = dailyTitleKey(title);
  const dates = dailyDatesForTitle(title);
  state.dailyTasks
    .filter((task) => dailyTitleKey(task.title) === key)
    .forEach((task) => {
      task.completedDates = [...dates];
    });
}

function addDailyRecord(title, key) {
  if (key > dateKey()) return "future";
  if (
    dailyRecordsForDate(key).some(
      (record) => dailyTitleKey(record.title) === dailyTitleKey(title),
    )
  )
    return "duplicate";
  state.records.push({
    id: uid(),
    type: "daily",
    category: "每日任务",
    title,
    minutes: 0,
    date: key,
  });
  syncDailyTaskDates(title);
  return "added";
}

function removeDailyRecord(id) {
  const record = state.records.find(
    (item) => item.id === id && item.type === "daily",
  );
  if (!record) return false;
  state.records = state.records.filter((item) => item.id !== id);
  syncDailyTaskDates(record.title);
  return true;
}

function removeDailyRecordsForTitleOnDate(title, key) {
  const name = dailyTitleKey(title);
  state.records = state.records.filter(
    (record) =>
      record.type !== "daily" ||
      record.date !== key ||
      dailyTitleKey(record.title) !== name,
  );
  syncDailyTaskDates(title);
}
