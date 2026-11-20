// 알바비 계산기 페이지
import { state, saveState } from "../storage.js";
import { view } from "../view-state.js";
import { $, formatWon, formatHour, todayMonth, getMonthRange, dateToStr, escapeHtml } from "../utils.js";
import { calculateNetPayForMonth } from "../pay.js";

const SETTING_IDS = ["hourlyWage", "taxRate", "probationYn", "weeklyHolidayYn"];

function bindSettingsToUi() {
  $("hourlyWage").value = state.settings.hourlyWage || "";
  $("taxRate").value = state.settings.taxRate ?? 3.3;
  $("probationYn").value = state.settings.probationYn || "N";
  $("weeklyHolidayYn").value = state.settings.weeklyHolidayYn || "Y";
  $("fillWeekendYn").value = state.settings.fillWeekendYn === "N" ? "N" : "Y";
}

function readSettingsFromUi() {
  state.settings.hourlyWage = Number($("hourlyWage").value || 0);
  state.settings.taxRate = Number($("taxRate").value || 0);
  state.settings.probationYn = $("probationYn").value;
  state.settings.weeklyHolidayYn = $("weeklyHolidayYn").value;
  saveState();
  renderSummary();
}

function logsForSelectedMonth() {
  const month = view.targetMonth;
  return state.logs
    .filter(log => log.date && log.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function upsertLog(target, field, value) {
  target[field] = value;
  if (field === "hours") {
    target.hours = value === "" ? "" : Number(value);
  }

  state.logs = state.logs.filter(log => log.date || Number(log.hours || 0) > 0 || log.memo);
  saveState();
  renderSummary();
}

function deleteLogByDate(date) {
  state.logs = state.logs.filter(log => log.date !== date);
  saveState();
  renderWorkRows();
  renderSummary();
}

function addEmptyRow() {
  const { first, last } = getMonthRange(view.targetMonth);

  let newDate = dateToStr(first);
  const used = new Set(state.logs.map(x => x.date));

  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = dateToStr(d);
    if (!used.has(key)) {
      newDate = key;
      break;
    }
  }

  state.logs.push({ date: newDate, hours: "", memo: "" });
  saveState();
  renderWorkRows();
  renderSummary();
}

function fillSelectedMonth() {
  const { first, last } = getMonthRange(view.targetMonth);
  const exists = new Set(state.logs.map(log => log.date));
  const includeWeekend = state.settings.fillWeekendYn !== "N";

  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = dateToStr(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    if (!includeWeekend && isWeekend) continue;
    if (!exists.has(key)) {
      state.logs.push({ date: key, hours: "", memo: "" });
    }
  }

  saveState();
  renderWorkRows();
  renderSummary();
}

function renderWorkRows() {
  const body = $("workBody");
  const logs = logsForSelectedMonth();

  if (logs.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="empty-box">아직 입력된 근무시간이 없습니다.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = logs.map((log, index) => `
    <tr>
      <td>
        <input type="date" value="${log.date || ""}" data-index="${index}" data-field="date" />
      </td>
      <td>
        <input type="number" inputmode="decimal" step="0.1" min="0" value="${log.hours ?? ""}" data-index="${index}" data-field="hours" placeholder="0" />
      </td>
      <td class="memo-cell">
        <input type="text" value="${escapeHtml(log.memo || "")}" data-index="${index}" data-field="memo" placeholder="메모" />
      </td>
      <td class="delete-col">
        <button class="delete-btn" data-delete-date="${log.date}" aria-label="삭제">×</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const target = logs[Number(e.target.dataset.index)];
      const field = e.target.dataset.field;
      const value = e.target.value;
      if (!target) return;

      if (field === "date") {
        const duplicated = state.logs.some(log => log.date === value && log !== target);
        if (duplicated) {
          alert("이미 입력된 날짜입니다.");
          e.target.value = target.date;
          return;
        }
      }

      upsertLog(target, field, value);
      if (field === "date") renderWorkRows();
    });
  });

  body.querySelectorAll("[data-delete-date]").forEach(btn => {
    btn.addEventListener("click", () => deleteLogByDate(btn.dataset.deleteDate));
  });
}

function renderSummary() {
  const month = view.targetMonth;
  const calc = calculateNetPayForMonth(month, state.settings.probationYn);
  const deductionTotal = calc.probationDeduction + calc.taxDeduction;

  const [year, mon] = month.split("-");
  $("summaryTitle").textContent = `${year}년 ${Number(mon)}월 예상 실수령액`;
  $("netPay").textContent = formatWon(calc.netPay);
  $("totalHours").textContent = formatHour(calc.totalHours);
  $("basePay").textContent = formatWon(calc.basePay);
  $("weeklyPay").textContent = formatWon(calc.weeklyPay);
  $("deductionPay").textContent = "-" + formatWon(deductionTotal);

  renderWeeklyDetails(calc.weeklyDetails);
}

function renderWeeklyDetails(details) {
  const box = $("weeklyDetails");

  if (!details.length) {
    box.innerHTML = `<div class="small-note">근무시간을 입력하면 주별 주휴수당 계산 내역이 표시됩니다.</div>`;
    return;
  }

  box.innerHTML = details.map(week => `
    <div class="week-row">
      <div>
        <strong>${week.start.slice(5).replace("-", "/")} ~ ${week.end.slice(5).replace("-", "/")}</strong><br>
        <span>${week.eligible ? "주휴 발생" : "15시간 미만"} · ${week.end.slice(0, 7)} 귀속</span>
      </div>
      <div>
        <strong>${formatHour(week.hours)}</strong><br>
        <span>${week.workDays || 0}일 근무</span>
      </div>
      <div>
        <strong>${formatWon(week.pay)}</strong><br>
        <span>${week.holidayHours ? formatHour(week.holidayHours) : "0시간"} 주휴</span>
      </div>
    </div>
  `).join("");
}

export default {
  id: "calculator",
  title: "알바비 계산기",
  icon: "calculator",
  desc: "근무시간 입력 · 예상 급여",

  template() {
    return `
      <section class="card summary-card">
        <div class="summary-top">
          <div>
            <div class="headline" id="summaryTitle">이번달 예상 실수령액</div>
            <div class="net-pay" id="netPay">0원</div>
          </div>
          <div class="month-picker">
            <input type="month" id="targetMonth" />
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">근무시간</div>
            <div class="value" id="totalHours">0시간</div>
          </div>
          <div class="summary-item">
            <div class="label">기본급</div>
            <div class="value" id="basePay">0원</div>
          </div>
          <div class="summary-item">
            <div class="label">주휴수당</div>
            <div class="value" id="weeklyPay">0원</div>
          </div>
          <div class="summary-item">
            <div class="label">공제 합계</div>
            <div class="value" id="deductionPay">0원</div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>설정</span>
          <button class="secondary" id="saveSettingsBtn">설정 저장</button>
        </div>

        <div class="settings">
          <div>
            <label for="hourlyWage">시급</label>
            <input type="number" id="hourlyWage" inputmode="numeric" placeholder="예: 10000" />
          </div>
          <div>
            <label for="taxRate">세금 (%)</label>
            <input type="number" id="taxRate" inputmode="decimal" step="0.1" placeholder="예: 3.3" />
          </div>
          <div>
            <label for="probationYn">수습 10% 차감</label>
            <select id="probationYn">
              <option value="N">미적용</option>
              <option value="Y">적용</option>
            </select>
          </div>
          <div>
            <label for="weeklyHolidayYn">주휴수당</label>
            <select id="weeklyHolidayYn">
              <option value="Y">포함</option>
              <option value="N">미포함</option>
            </select>
          </div>
        </div>

        <p class="small-note" style="margin-bottom:0;">
          주휴수당은 월~일 기준으로 한 주를 완성해서 계산합니다.
          월을 넘어가는 주차는 <b>그 주의 일요일이 속한 월</b>에 주휴수당을 포함합니다.
          고정 소정근로일수가 없는 알바 기준으로 <b>주 총 근무시간 ÷ 실제 근무일수</b>로 주휴시간을 계산하며, 최대 8시간까지만 반영합니다.<br />
          시급에 주휴수당이 이미 포함된 경우(<b>주휴수당 포함 시급</b>)에는 중복으로 계산되지 않도록 주휴수당을 <b>미포함</b>으로 설정하세요.
        </p>
      </section>

      <section class="card">
        <div class="section-title">
          <span>근무시간 입력</span>
          <button id="addRowBtn">행 추가</button>
        </div>

        <div class="fill-row">
          <select id="fillWeekendYn" aria-label="월 전체 생성 옵션">
            <option value="Y">주말 포함</option>
            <option value="N">주말 미포함 (평일만)</option>
          </select>
          <button class="secondary" id="fillMonthBtn">월 전체 생성</button>
        </div>

        <table class="work-table">
          <thead>
            <tr>
              <th class="date-col">날짜</th>
              <th class="hour-col">시간</th>
              <th class="memo-col">메모</th>
              <th class="delete-col"></th>
            </tr>
          </thead>
          <tbody id="workBody"></tbody>
        </table>

        <p class="small-note">
          예: 8, 6.5, 7.25처럼 소수 근무시간도 입력할 수 있습니다. 입력 즉시 상단 예상금액이 다시 계산됩니다.
        </p>
      </section>

      <section class="card">
        <div class="section-title">
          <span>주휴수당 계산 내역</span>
        </div>
        <div class="weekly-box" id="weeklyDetails"></div>
      </section>
    `;
  },

  init() {
    $("targetMonth").value = view.targetMonth;
    $("targetMonth").addEventListener("change", () => {
      view.targetMonth = $("targetMonth").value || todayMonth();
      renderWorkRows();
      renderSummary();
    });

    $("saveSettingsBtn").addEventListener("click", readSettingsFromUi);
    SETTING_IDS.forEach(id => {
      $(id).addEventListener("input", readSettingsFromUi);
      $(id).addEventListener("change", readSettingsFromUi);
    });

    $("fillWeekendYn").addEventListener("change", () => {
      state.settings.fillWeekendYn = $("fillWeekendYn").value;
      saveState();
    });

    $("addRowBtn").addEventListener("click", addEmptyRow);
    $("fillMonthBtn").addEventListener("click", fillSelectedMonth);
  },

  render() {
    $("targetMonth").value = view.targetMonth;
    bindSettingsToUi();
    renderWorkRows();
    renderSummary();
  }
};
