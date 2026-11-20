// 수령액 비교 페이지
import { state, saveState } from "../storage.js";
import { view } from "../view-state.js";
import { $, formatWon, dateToStr } from "../utils.js";
import { calculateNetPayForMonth } from "../pay.js";

function ensureCompareRowsUpToCurrentMonth() {
  const months = new Set(state.logs.filter(x => x.date).map(x => x.date.slice(0, 7)));
  months.add(view.targetMonth);

  months.forEach(month => {
    if (!state.comparisons.some(row => row.month === month)) {
      state.comparisons.push({
        month,
        probationYn: state.settings.probationYn || "N",
        actualPay: ""
      });
    }
  });

  state.comparisons.sort((a, b) => a.month.localeCompare(b.month));
}

function addCompareRow() {
  let target = view.targetMonth;

  if (state.comparisons.some(row => row.month === target)) {
    const latest = state.comparisons.map(x => x.month).sort().at(-1) || target;
    const [y, m] = latest.split("-").map(Number);
    target = dateToStr(new Date(y, m, 1)).slice(0, 7);
  }

  state.comparisons.push({
    month: target,
    probationYn: state.settings.probationYn || "N",
    actualPay: ""
  });

  saveState();
  renderCompareRows();
}

function updateCompareRow(index, field, value) {
  const row = state.comparisons[index];
  if (!row) return;

  if (field === "month") {
    const duplicated = state.comparisons.some((x, i) => i !== index && x.month === value);
    if (duplicated) {
      alert("이미 비교표에 있는 월입니다.");
      renderCompareRows();
      return;
    }
  }

  row[field] = field === "actualPay" ? value.replace(/[^\d.-]/g, "") : value;
  state.comparisons.sort((a, b) => a.month.localeCompare(b.month));
  saveState();
  renderCompareRows();
}

function deleteCompareRow(index) {
  state.comparisons.splice(index, 1);
  saveState();
  renderCompareRows();
}

function hasActualPay(row) {
  return row.actualPay !== "" && row.actualPay !== null && row.actualPay !== undefined;
}

function diffClass(diff, hasActual = true) {
  if (!hasActual || diff === 0) return "diff-zero";
  return diff > 0 ? "diff-plus" : "diff-minus";
}

function renderTotals() {
  let expectedTotal = 0;
  let actualTotal = 0;
  let diffTotal = 0;

  state.comparisons.forEach(row => {
    const expected = Math.round(calculateNetPayForMonth(row.month, row.probationYn).netPay);
    expectedTotal += expected;
    if (hasActualPay(row)) {
      const actual = Number(row.actualPay || 0);
      actualTotal += actual;
      diffTotal += actual - expected;
    }
  });

  $("compareExpectedTotal").textContent = formatWon(expectedTotal);
  $("compareActualTotal").textContent = formatWon(actualTotal);
  $("compareDiffTotal").innerHTML =
    `<span class="${diffClass(diffTotal)}">${diffTotal > 0 ? "+" : ""}${formatWon(diffTotal)}</span>`;
}

function renderCompareRows() {
  ensureCompareRowsUpToCurrentMonth();

  const body = $("compareBody");

  if (!state.comparisons.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty-box">비교할 월이 없습니다.</td>
      </tr>
    `;
    renderTotals();
    return;
  }

  body.innerHTML = state.comparisons.map((row, index) => {
    const expected = Math.round(calculateNetPayForMonth(row.month, row.probationYn).netPay);
    const hasActual = hasActualPay(row);
    const diff = hasActual ? Number(row.actualPay || 0) - expected : 0;
    const diffText = hasActual ? (diff > 0 ? "+" : "") + formatWon(diff) : "-";

    return `
      <tr>
        <td>
          <input type="month" value="${row.month}" data-compare-index="${index}" data-compare-field="month" />
        </td>
        <td>
          <select data-compare-index="${index}" data-compare-field="probationYn">
            <option value="N" ${row.probationYn === "N" ? "selected" : ""}>미적용</option>
            <option value="Y" ${row.probationYn === "Y" ? "selected" : ""}>적용</option>
          </select>
        </td>
        <td><strong>${formatWon(expected)}</strong></td>
        <td>
          <input type="number" inputmode="numeric" value="${row.actualPay ?? ""}" data-compare-index="${index}" data-compare-field="actualPay" placeholder="실제 금액" />
        </td>
        <td>
          <span class="${diffClass(diff, hasActual)}">${diffText}</span>
          <button class="delete-btn" style="margin-left:6px;" data-compare-delete="${index}" aria-label="삭제">×</button>
        </td>
      </tr>
    `;
  }).join("");

  renderTotals();

  body.querySelectorAll("[data-compare-index]").forEach(el => {
    const field = el.dataset.compareField;

    if (field === "actualPay") {
      // 금액 입력 중에는 표 전체를 다시 그리지 않는다.
      // 재렌더링하면 모바일에서 포커스가 빠져 숫자를 연속 입력할 수 없다.
      el.addEventListener("input", (e) => {
        const row = state.comparisons[Number(e.target.dataset.compareIndex)];
        if (!row) return;
        row.actualPay = e.target.value.replace(/[^\d.-]/g, "");
        saveState();
        renderTotals();
      });

      el.addEventListener("change", renderCompareRows);
      return;
    }

    el.addEventListener("change", (e) => {
      updateCompareRow(Number(e.target.dataset.compareIndex), field, e.target.value);
    });
  });

  body.querySelectorAll("[data-compare-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteCompareRow(Number(btn.dataset.compareDelete)));
  });
}

export default {
  id: "compare",
  title: "수령액 비교",
  icon: "chart",
  desc: "예상 금액 vs 실제 수령액",

  template() {
    return `
      <section class="card">
        <div class="section-title">
          <span>수령액 비교</span>
          <button class="secondary" id="addCompareRowBtn">비교 월 추가</button>
        </div>

        <div class="compare-summary">
          <div class="box">
            <div class="label">예상 합계</div>
            <div class="value" id="compareExpectedTotal">0원</div>
          </div>
          <div class="box">
            <div class="label">실수령 합계</div>
            <div class="value" id="compareActualTotal">0원</div>
          </div>
          <div class="box">
            <div class="label">차액 합계</div>
            <div class="value" id="compareDiffTotal">0원</div>
          </div>
        </div>

        <div class="compare-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th style="width: 20%;">월</th>
                <th style="width: 16%;">수습</th>
                <th style="width: 21%;">예상금액</th>
                <th style="width: 21%;">실수령액</th>
                <th style="width: 22%;">차액</th>
              </tr>
            </thead>
            <tbody id="compareBody"></tbody>
          </table>
        </div>

        <p class="small-note">
          예상금액은 해당 월의 근무기록과 설정값으로 자동 계산됩니다.
          단, 수습 적용 여부는 비교표의 각 월별 선택값을 우선 적용합니다.
        </p>
      </section>
    `;
  },

  init() {
    $("addCompareRowBtn").addEventListener("click", addCompareRow);
  },

  render() {
    renderCompareRows();
  }
};
