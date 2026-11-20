// 업무 등록 페이지 (추가 / 이름·요일 수정 / 활성화 토글 / 삭제)
import { state } from "../storage.js?v=20261120132133";
import { $, WEEKDAYS, escapeHtml, toast } from "../utils.js?v=20261120132133";
import { findTask, addTask, updateTask, deleteTask } from "../tasks.js?v=20261120132133";

const newTaskDays = new Set();

function dayChipsHtml(selectedDays, taskId) {
  return WEEKDAYS.map(w => `
    <button type="button" class="day-chip ${selectedDays.includes(w.day) ? "on" : ""}"
      data-day="${w.day}" ${taskId ? `data-task-day="${taskId}"` : ""}>${w.label}</button>
  `).join("");
}

function renderNewTaskForm() {
  $("newTaskDaysWrap").hidden = $("newTaskType").value !== "repeat";
  $("newTaskDays").innerHTML = dayChipsHtml(Array.from(newTaskDays));
}

/** 업무 추가 입력칸(이름, 종류, 반복 요일)을 처음 상태로 되돌린다. */
function resetNewTaskForm() {
  $("newTaskTitle").value = "";
  $("newTaskType").value = "daily";
  newTaskDays.clear();
  renderNewTaskForm();
}

function submitNewTask() {
  const title = $("newTaskTitle").value.trim();
  const type = $("newTaskType").value;

  if (!title) {
    alert("업무 이름을 입력해 주세요.");
    $("newTaskTitle").focus();
    return;
  }

  if (type === "repeat" && newTaskDays.size === 0) {
    alert("반복할 요일을 하나 이상 선택해 주세요.");
    return;
  }

  addTask({ title, type, repeatDays: Array.from(newTaskDays) });
  resetNewTaskForm();
  $("newTaskTitle").focus();
  renderList();
  toast(`'${title}' 업무를 추가했습니다.`);
}

function manageRowHtml(task) {
  return `
    <div class="manage-row ${task.active ? "" : "inactive"}">
      <div class="manage-main">
        <input type="text" value="${escapeHtml(task.title)}" data-title-task="${task.id}" maxlength="60" aria-label="업무 이름" />
        ${task.type === "repeat" ? `<div class="day-chips">${dayChipsHtml(task.repeatDays, task.id)}</div>` : ""}
      </div>
      <label class="switch" title="${task.active ? "활성화됨" : "비활성화됨"}">
        <input type="checkbox" data-active-task="${task.id}" ${task.active ? "checked" : ""} aria-label="활성화" />
        <span class="slider"></span>
      </label>
      <button type="button" class="delete-btn" data-delete-task="${task.id}" aria-label="삭제">×</button>
    </div>
  `;
}

function renderList() {
  const box = $("taskManageList");

  if (!state.tasks.length) {
    box.innerHTML = `<div class="empty-box">아직 등록된 업무가 없습니다. 위에서 업무를 추가해 보세요.</div>`;
    return;
  }

  const groups = [
    ["daily", "일일 업무 · 매일"],
    ["repeat", "반복 업무 · 요일 지정"]
  ];

  box.innerHTML = groups.map(([type, title]) => {
    const list = state.tasks.filter(task => task.type === type);
    if (!list.length) return "";
    const activeCount = list.filter(task => task.active).length;
    return `<div class="manage-group-title">${title} (${activeCount}/${list.length} 사용 중)</div>`
      + list.map(manageRowHtml).join("");
  }).join("");
}

function onListClick(e) {
  const deleteBtn = e.target.closest("[data-delete-task]");
  if (deleteBtn) {
    const task = findTask(deleteBtn.dataset.deleteTask);
    if (!task) return;
    if (!confirm(`'${task.title}' 업무를 삭제할까요?\n잠시 안 쓰는 업무라면 스위치로 비활성화만 해도 됩니다.`)) return;
    deleteTask(task.id);
    renderList();
    return;
  }

  const chip = e.target.closest("[data-task-day]");
  if (chip) {
    const task = findTask(chip.dataset.taskDay);
    if (!task) return;
    const day = Number(chip.dataset.day);
    const days = new Set(task.repeatDays);
    if (days.has(day)) {
      if (days.size === 1) {
        alert("반복 요일은 최소 하나 이상이어야 합니다.");
        return;
      }
      days.delete(day);
    } else {
      days.add(day);
    }
    updateTask(task.id, { repeatDays: Array.from(days).sort() });
    renderList();
  }
}

function onListChange(e) {
  const activeId = e.target.dataset.activeTask;
  if (activeId) {
    updateTask(activeId, { active: e.target.checked });
    renderList();
    return;
  }

  const titleId = e.target.dataset.titleTask;
  if (titleId) {
    const task = findTask(titleId);
    if (!task) return;
    const title = e.target.value.trim();
    if (!title) {
      e.target.value = task.title;
      return;
    }
    updateTask(titleId, { title });
  }
}

export default {
  id: "task-manage",
  title: "업무 등록",
  icon: "list",
  desc: "업무 추가 · 켜기/끄기",

  template() {
    return `
      <section class="card">
        <div class="section-title">
          <span>업무 추가</span>
        </div>
        <div class="task-form">
          <div>
            <label for="newTaskTitle">업무 이름</label>
            <input type="text" id="newTaskTitle" placeholder="예: 오픈 전 매장 청소" maxlength="60" />
          </div>
          <div>
            <label for="newTaskType">종류</label>
            <select id="newTaskType">
              <option value="daily">일일 업무 (매일)</option>
              <option value="repeat">반복 업무 (요일 지정)</option>
            </select>
          </div>
          <div id="newTaskDaysWrap" hidden>
            <label>반복 요일</label>
            <div class="day-chips" id="newTaskDays"></div>
          </div>
          <button id="addTaskBtn">업무 추가</button>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>등록된 업무</span>
          <button class="secondary small" data-goto="tasks">체크하러 가기</button>
        </div>
        <div id="taskManageList"></div>
        <p class="small-note" style="margin-bottom:0;">
          스위치를 끄면 체크 화면에서 숨겨지고, 다시 켜면 바로 나타납니다. 이름과 요일은 여기서 바로 수정할 수 있습니다.
        </p>
      </section>
    `;
  },

  init() {
    $("newTaskType").addEventListener("change", renderNewTaskForm);
    $("newTaskDays").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-day]");
      if (!chip) return;
      const day = Number(chip.dataset.day);
      if (newTaskDays.has(day)) newTaskDays.delete(day);
      else newTaskDays.add(day);
      renderNewTaskForm();
    });
    $("addTaskBtn").addEventListener("click", submitNewTask);
    $("newTaskTitle").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) submitNewTask();
    });

    $("taskManageList").addEventListener("click", onListClick);
    $("taskManageList").addEventListener("change", onListChange);

    renderNewTaskForm();
  },

  render() {
    renderList();
  }
};
