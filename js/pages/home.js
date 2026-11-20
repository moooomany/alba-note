// 메인(홈) 화면
import { state } from "../storage.js?v=20261120132133";
import { $, formatWon, formatHour, todayStr, todayMonth, parseLocalDate, getMonday, dateToStr, DAY_NAMES } from "../utils.js?v=20261120132133";
import { calculateNetPayForMonth, sumHoursBetween } from "../pay.js?v=20261120132133";
import { tasksForDate, isTaskChecked, toggleTaskCheck, taskItemsHtml } from "../tasks.js?v=20261120132133";
import { icon } from "../icons.js?v=20261120132133";

let quickPages = [];

function renderPay(today, date) {
  const calc = calculateNetPayForMonth(todayMonth(), state.settings.probationYn);

  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const todayHours = sumHoursBetween(today, today);
  const weekHours = sumHoursBetween(dateToStr(monday), dateToStr(sunday));

  $("homePayTitle").textContent = `${date.getMonth() + 1}월 예상 실수령액`;
  $("homeNetPay").textContent = formatWon(calc.netPay);
  $("homeTodayHours").textContent = formatHour(todayHours);
  $("homeWeekHours").textContent = formatHour(weekHours);
  $("homeMonthHours").textContent = formatHour(calc.totalHours);
  $("homeWeeklyPay").textContent = formatWon(calc.weeklyPay);
}

function renderTasks(today, date) {
  const { daily, repeat } = tasksForDate(today);
  const all = daily.concat(repeat);
  const doneCount = all.filter(task => isTaskChecked(today, task.id)).length;

  $("homeTaskProgress").textContent = all.length ? `${doneCount} / ${all.length} 완료` : "";
  $("homeTaskFill").style.width = all.length ? `${(doneCount / all.length) * 100}%` : "0";
  $("homeTaskBar").hidden = all.length === 0;

  if (!state.tasks.length) {
    $("homeTaskList").innerHTML = `
      <div class="empty-box">
        자주 하는 업무를 등록해 두면 매일 여기서 체크할 수 있어요.<br />
        <button class="secondary" type="button" data-goto="task-manage">업무 등록하기</button>
      </div>
    `;
    return;
  }

  $("homeTaskList").innerHTML = taskItemsHtml(all, today, `${DAY_NAMES[date.getDay()]}요일에 할 업무가 없습니다.`);
}

function render() {
  const today = todayStr();
  const date = parseLocalDate(today);
  $("homeDate").textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 ${DAY_NAMES[date.getDay()]}요일`;
  renderPay(today, date);
  renderTasks(today, date);
}

export default {
  id: "home",
  title: "홈",
  icon: "home",
  desc: "",

  template() {
    return `
      <section class="card summary-card">
        <div class="home-date" id="homeDate"></div>
        <div class="headline" id="homePayTitle">이번 달 예상 실수령액</div>
        <div class="net-pay" id="homeNetPay">0원</div>

        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">오늘 근무</div>
            <div class="value" id="homeTodayHours">0시간</div>
          </div>
          <div class="summary-item">
            <div class="label">이번 주 근무</div>
            <div class="value" id="homeWeekHours">0시간</div>
          </div>
          <div class="summary-item">
            <div class="label">이번 달 근무</div>
            <div class="value" id="homeMonthHours">0시간</div>
          </div>
          <div class="summary-item">
            <div class="label">이번 달 주휴수당</div>
            <div class="value" id="homeWeeklyPay">0원</div>
          </div>
        </div>

        <button class="hero-link" data-goto="calculator">근무시간 입력하기 →</button>
      </section>

      <section class="card">
        <div class="section-title">
          <span>오늘 할 일</span>
          <span class="task-progress-text" id="homeTaskProgress"></span>
        </div>
        <div class="progress-bar" id="homeTaskBar"><div class="progress-fill" id="homeTaskFill"></div></div>
        <div class="task-list" id="homeTaskList" style="margin-top:12px;"></div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>바로가기</span>
        </div>
        <div class="quick-grid" id="homeQuickGrid"></div>
      </section>
    `;
  },

  init(app) {
    quickPages = app.pages.filter(page => page.id !== "home");
    $("homeQuickGrid").innerHTML = quickPages.map(page => `
      <button type="button" class="quick-item" data-goto="${page.id}">
        <span class="q-icon">${icon(page.icon)}</span>
        <span class="q-title">${page.title}</span>
        <span class="q-desc">${page.desc}</span>
      </button>
    `).join("");

    $("homeTaskList").addEventListener("click", (e) => {
      const item = e.target.closest("[data-check-task]");
      if (!item) return;
      toggleTaskCheck(todayStr(), item.dataset.checkTask);
      render();
    });
  },

  render
};
