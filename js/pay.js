// 급여 계산 로직
import { state } from "./storage.js?v=20261120132133";
import { parseLocalDate, getMonday, dateToStr } from "./utils.js?v=20261120132133";

export function calculateWeeklyHolidayPayForMonth(targetMonth, hourlyWage, includeYn) {
  if (includeYn !== "Y") return { total: 0, details: [] };

  const weekMap = new Map();

  state.logs.forEach(log => {
    const hours = Number(log.hours || 0);
    if (!log.date || hours <= 0) return;

    const date = parseLocalDate(log.date);
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const weekKey = dateToStr(monday);
    const weekPayMonth = dateToStr(sunday).slice(0, 7);

    // 주휴수당은 주차가 끝나는 일요일이 속한 월에 귀속한다.
    // 예: 6월 말~7월 초에 걸친 주차는 일요일이 7월이면 7월 급여에 포함.
    if (weekPayMonth !== targetMonth) return;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        start: dateToStr(monday),
        end: dateToStr(sunday),
        payMonth: weekPayMonth,
        hours: 0,
        workDays: new Set()
      });
    }

    const week = weekMap.get(weekKey);
    week.hours += hours;
    week.workDays.add(log.date);
  });

  const details = Array.from(weekMap.values())
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(week => {
      const workDays = week.workDays.size;
      const eligible = week.hours >= 15 && workDays > 0;
      const rawHolidayHours = eligible ? week.hours / workDays : 0;
      const holidayHours = eligible ? Math.min(rawHolidayHours, 8) : 0;
      const pay = holidayHours * hourlyWage;

      return { ...week, workDays, eligible, rawHolidayHours, holidayHours, pay };
    });

  const total = details.reduce((sum, week) => sum + week.pay, 0);
  return { total, details };
}

export function calculateNetPayForMonth(month, probationOverrideYn) {
  const logs = state.logs.filter(log => log.date && log.date.startsWith(month));
  const settings = state.settings;
  const hourlyWage = Number(settings.hourlyWage || 0);
  const taxRate = Number(settings.taxRate || 0);
  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const basePay = totalHours * hourlyWage;
  const weekly = calculateWeeklyHolidayPayForMonth(month, hourlyWage, settings.weeklyHolidayYn);
  const grossPay = basePay + weekly.total;
  const probationYn = probationOverrideYn || settings.probationYn;
  const probationDeduction = probationYn === "Y" ? grossPay * 0.1 : 0;
  const taxablePay = grossPay - probationDeduction;
  const taxDeduction = taxablePay * (taxRate / 100);
  const netPay = taxablePay - taxDeduction;

  return {
    totalHours,
    basePay,
    weeklyPay: weekly.total,
    weeklyDetails: weekly.details,
    grossPay,
    probationDeduction,
    taxDeduction,
    netPay
  };
}

/** start~end(포함) 기간의 근무시간 합계 */
export function sumHoursBetween(startStr, endStr) {
  return state.logs
    .filter(log => log.date && log.date >= startStr && log.date <= endStr)
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);
}
