// 공통 유틸 함수 모음 (날짜, 포맷, DOM 헬퍼)

export const $ = (id) => document.getElementById(id);

export const WEEKDAYS = [
  { day: 1, label: "월" },
  { day: 2, label: "화" },
  { day: 3, label: "수" },
  { day: 4, label: "목" },
  { day: 5, label: "금" },
  { day: 6, label: "토" },
  { day: 0, label: "일" }
];

export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function formatWon(value) {
  const n = Math.round(Number(value || 0));
  return n.toLocaleString("ko-KR") + "원";
}

export function formatHour(value) {
  const n = Number(value || 0);
  if (Number.isInteger(n)) return n + "시간";
  return n.toFixed(2).replace(/\.?0+$/, "") + "시간";
}

export function dateToStr(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

export function todayStr() {
  return dateToStr(new Date());
}

export function todayMonth() {
  return todayStr().slice(0, 7);
}

export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthRange(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return { year, month, first, last };
}

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let toastTimer = null;

export function toast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text, fallbackTextarea) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  fallbackTextarea.focus();
  fallbackTextarea.select();
  if (!document.execCommand("copy")) throw new Error("copy failed");
}
