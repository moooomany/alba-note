// 앱 시작점: 데이터 불러오기 → 페이지 만들기 → 메뉴/라우팅 연결
import { loadState } from "./storage.js?v=20261120131555";
import { $, toast } from "./utils.js?v=20261120131555";
import { icon } from "./icons.js?v=20261120131555";

import homePage from "./pages/home.js?v=20261120131555";
import calculatorPage from "./pages/calculator.js?v=20261120131555";
import comparePage from "./pages/compare.js?v=20261120131555";
import taskCheckPage from "./pages/task-check.js?v=20261120131555";
import taskManagePage from "./pages/task-manage.js?v=20261120131555";
import dataPage from "./pages/data.js?v=20261120131555";

// 메뉴에 표시되는 순서. 새 페이지를 만들면 여기에 추가하면 됩니다.
const pages = [homePage, calculatorPage, comparePage, taskCheckPage, taskManagePage, dataPage];
const DEFAULT_PAGE = pages[0].id;

const app = {
  pages,
  navigate(pageId) {
    if (location.hash === "#" + pageId) showPage(pageId);
    else location.hash = pageId; // hashchange 에서 showPage 호출
  }
};

function mountPages() {
  $("pages").innerHTML = pages
    .map(page => `<main class="page" id="page-${page.id}">${page.template()}</main>`)
    .join("");

  $("navList").innerHTML = pages
    .map(page => `<button class="nav-button" data-page="${page.id}">${icon(page.icon)}<span>${page.title}</span></button>`)
    .join("");

  pages.forEach(page => page.init?.(app));
}

function openDrawer() {
  $("drawer").classList.add("open");
  $("drawerBackdrop").classList.add("open");
}

function closeDrawer() {
  $("drawer").classList.remove("open");
  $("drawerBackdrop").classList.remove("open");
}

function showPage(pageId) {
  const page = pages.find(p => p.id === pageId) || pages[0];

  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === `page-${page.id}`);
  });
  document.querySelectorAll(".nav-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page.id);
  });
  $("pageTitle").textContent = page.id === "home" ? "알바노트" : page.title;

  closeDrawer();
  window.scrollTo(0, 0);
  page.render?.();
}

function currentHashPage() {
  return decodeURIComponent(location.hash.replace(/^#/, "")) || DEFAULT_PAGE;
}

function init() {
  const { migrated, migratedLogs } = loadState();

  mountPages();

  $("menuBtn").addEventListener("click", openDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  $("navList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (btn) app.navigate(btn.dataset.page);
  });

  // 어느 화면에서든 data-goto="페이지id" 버튼을 누르면 해당 페이지로 이동
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-goto]");
    if (link) app.navigate(link.dataset.goto);
  });

  window.addEventListener("hashchange", () => showPage(currentHashPage()));
  showPage(currentHashPage());

  if (migrated) {
    toast(`기존 데이터를 새 버전으로 옮겼습니다. (근무기록 ${migratedLogs}건)`);
  }
}

init();
