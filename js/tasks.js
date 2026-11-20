// 업무(일일/반복) 데이터 처리
import { state, saveState } from "./storage.js?v=20261120131555";
import { parseLocalDate, WEEKDAYS, makeId, escapeHtml } from "./utils.js?v=20261120131555";

export function findTask(id) {
  return state.tasks.find(task => task.id === id);
}

export function repeatDaysLabel(days) {
  const list = WEEKDAYS.filter(w => (days || []).includes(w.day)).map(w => w.label);
  if (list.length === 7) return "매일";
  return list.join("·");
}

/** 해당 날짜에 보여줄 활성 업무 */
export function tasksForDate(dateStr) {
  const day = parseLocalDate(dateStr).getDay();
  const active = state.tasks.filter(task => task.active);
  return {
    daily: active.filter(task => task.type === "daily"),
    repeat: active.filter(task => task.type === "repeat" && task.repeatDays.includes(day))
  };
}

export function isTaskChecked(dateStr, id) {
  return (state.taskChecks[dateStr] || []).includes(id);
}

export function toggleTaskCheck(dateStr, id) {
  const checked = new Set(state.taskChecks[dateStr] || []);
  if (checked.has(id)) checked.delete(id);
  else checked.add(id);

  if (checked.size) state.taskChecks[dateStr] = Array.from(checked);
  else delete state.taskChecks[dateStr];

  saveState();
}

export function addTask({ title, type, repeatDays }) {
  state.tasks.push({
    id: makeId(),
    title,
    type,
    active: true,
    repeatDays: type === "repeat" ? [...repeatDays].sort() : [],
    createdAt: new Date().toISOString()
  });
  saveState();
}

export function updateTask(id, patch) {
  const task = findTask(id);
  if (!task) return;
  Object.assign(task, patch);
  saveState();
}

export function deleteTask(id) {
  state.tasks = state.tasks.filter(task => task.id !== id);
  Object.keys(state.taskChecks).forEach(date => {
    state.taskChecks[date] = state.taskChecks[date].filter(taskId => taskId !== id);
    if (!state.taskChecks[date].length) delete state.taskChecks[date];
  });
  saveState();
}

/** 체크 가능한 업무 목록 HTML (업무 체크 화면, 홈 화면에서 같이 사용) */
export function taskItemsHtml(tasks, dateStr, emptyText) {
  if (!tasks.length) return `<div class="empty-box">${emptyText}</div>`;

  return tasks.map(task => {
    const done = isTaskChecked(dateStr, task.id);
    const sub = task.type === "repeat"
      ? `<span class="task-sub">${repeatDaysLabel(task.repeatDays)} 반복</span>`
      : "";
    return `
      <button type="button" class="task-item ${done ? "done" : ""}" data-check-task="${task.id}" aria-pressed="${done}">
        <span class="check" aria-hidden="true"></span>
        <span class="task-text"><span class="task-title">${escapeHtml(task.title)}</span>${sub}</span>
      </button>
    `;
  }).join("");
}
