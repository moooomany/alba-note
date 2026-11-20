// 업무 체크 페이지
import { state } from "../storage.js?v=20261120131555";
import { view } from "../view-state.js?v=20261120131555";
import { $, todayStr, parseLocalDate, dateToStr, DAY_NAMES } from "../utils.js?v=20261120131555";
import { tasksForDate, isTaskChecked, toggleTaskCheck, taskItemsHtml } from "../tasks.js?v=20261120131555";

function shiftDate(diff) {
  const d = parseLocalDate(view.taskDate);
  d.setDate(d.getDate() + diff);
  view.taskDate = dateToStr(d);
  render();
}

function render() {
  const dateStr = view.taskDate;
  const date = parseLocalDate(dateStr);
  const dayName = DAY_NAMES[date.getDay()];
  const { daily, repeat } = tasksForDate(dateStr);

  $("taskDate").value = dateStr;
  $("taskDateLabel").textContent =
    `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayName})${dateStr === todayStr() ? " · 오늘" : ""}`;

  if (!state.tasks.length) {
    $("dailyTaskList").innerHTML = `
      <div class="empty-box">
        아직 등록된 업무가 없습니다.<br />
        <button class="secondary" type="button" data-goto="task-manage">업무 등록하러 가기</button>
      </div>
    `;
  } else {
    $("dailyTaskList").innerHTML = taskItemsHtml(daily, dateStr, "활성화된 일일 업무가 없습니다.");
  }
  $("repeatTaskList").innerHTML = taskItemsHtml(repeat, dateStr, `${dayName}요일에 해당하는 반복 업무가 없습니다.`);

  const all = daily.concat(repeat);
  const doneCount = all.filter(task => isTaskChecked(dateStr, task.id)).length;
  const allDone = all.length > 0 && doneCount === all.length;
  $("taskProgressText").textContent = `${doneCount} / ${all.length} 완료${allDone ? " · 모두 끝!" : ""}`;
  $("taskProgressFill").style.width = all.length ? `${(doneCount / all.length) * 100}%` : "0";
}

export default {
  id: "tasks",
  title: "업무 체크",
  icon: "check",
  desc: "오늘 할 일 체크하기",

  template() {
    return `
      <section class="card">
        <div class="date-nav">
          <button class="secondary icon-btn" id="taskPrevDayBtn" aria-label="이전 날">‹</button>
          <input type="date" id="taskDate" />
          <button class="secondary icon-btn" id="taskNextDayBtn" aria-label="다음 날">›</button>
          <button class="secondary" id="taskTodayBtn">오늘</button>
        </div>
        <div class="task-progress">
          <div class="task-progress-top">
            <div class="task-date-label" id="taskDateLabel"></div>
            <div class="task-progress-text" id="taskProgressText">0 / 0 완료</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="taskProgressFill"></div></div>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>일일 업무</span>
          <button class="secondary small" data-goto="task-manage">편집</button>
        </div>
        <div class="task-list" id="dailyTaskList"></div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>반복 업무</span>
        </div>
        <div class="task-list" id="repeatTaskList"></div>
      </section>

      <p class="small-note" style="text-align:center;">
        업무를 누르면 완료 표시가 되고, 다시 누르면 취소됩니다. 체크 기록은 날짜별로 따로 저장됩니다.
      </p>
    `;
  },

  init() {
    ["dailyTaskList", "repeatTaskList"].forEach(id => {
      $(id).addEventListener("click", (e) => {
        const item = e.target.closest("[data-check-task]");
        if (!item) return;
        toggleTaskCheck(view.taskDate, item.dataset.checkTask);
        render();
      });
    });

    $("taskDate").addEventListener("change", () => {
      view.taskDate = $("taskDate").value || todayStr();
      render();
    });
    $("taskPrevDayBtn").addEventListener("click", () => shiftDate(-1));
    $("taskNextDayBtn").addEventListener("click", () => shiftDate(1));
    $("taskTodayBtn").addEventListener("click", () => {
      view.taskDate = todayStr();
      render();
    });
  },

  render
};
