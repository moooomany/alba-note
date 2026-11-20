// 데이터 저장소
// - 브라우저 localStorage 에 저장합니다. (나중에 서버/DB로 바꾸려면 이 파일만 수정하면 됩니다.)
// - v1(예전 버전) 데이터가 있으면 처음 실행할 때 v2로 자동 이관합니다. v1 원본은 지우지 않습니다.

export const STORAGE_KEY = "albaPayCalculator.v2";
export const LEGACY_KEY = "albaPayCalculator.v1";
export const DATA_VERSION = 2;

export function defaultSettings() {
  return {
    hourlyWage: 10000,
    taxRate: 3.3,
    probationYn: "N",
    weeklyHolidayYn: "Y"
  };
}

function createEmptyState() {
  return {
    version: DATA_VERSION,
    settings: defaultSettings(),
    // 근무기록: { date: "YYYY-MM-DD", hours: number | "", memo }
    logs: [],
    // 수령액 비교: { month: "YYYY-MM", probationYn, actualPay }
    comparisons: [],
    // 업무 목록: { id, title, type: "daily" | "repeat", active, repeatDays: [0~6, 0=일], createdAt }
    tasks: [],
    // 날짜별 완료한 업무 id: { "YYYY-MM-DD": ["taskId", ...] }
    taskChecks: {}
  };
}

// 앱 전체가 공유하는 상태 객체. 다른 모듈은 이 객체를 import 해서 읽고 고친 뒤 saveState()를 호출합니다.
export const state = createEmptyState();

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn("저장 실패", e);
    return false;
  }
}

/**
 * v1 또는 v2 형식의 데이터를 받아 깨끗한 v2 데이터로 바꿉니다.
 * 형식이 맞지 않으면 Error 를 던집니다.
 */
export function normalizeData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("데이터가 객체 형식이 아닙니다.");
  }
  if (!raw.settings || typeof raw.settings !== "object" || !Array.isArray(raw.logs)) {
    throw new Error("필수 항목(settings, logs)이 없습니다.");
  }

  const version = Number(raw.version || 1);
  if (version > DATA_VERSION) {
    throw new Error("이 앱보다 더 최신 버전에서 만든 백업입니다.");
  }

  const logs = raw.logs
    .filter(log => log && typeof log === "object")
    .map(log => ({
      date: typeof log.date === "string" ? log.date : "",
      hours: log.hours === "" || log.hours === null || log.hours === undefined ? "" : Number(log.hours),
      memo: String(log.memo ?? "")
    }));

  const comparisons = Array.isArray(raw.comparisons)
    ? raw.comparisons
      .filter(row => row && typeof row.month === "string")
      .map(row => ({
        month: row.month,
        probationYn: row.probationYn === "Y" ? "Y" : "N",
        actualPay: row.actualPay ?? ""
      }))
    : [];

  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks
      .filter(task => task && task.id && task.title)
      .map(task => ({
        id: String(task.id),
        title: String(task.title),
        type: task.type === "repeat" ? "repeat" : "daily",
        active: task.active !== false,
        repeatDays: Array.isArray(task.repeatDays)
          ? task.repeatDays.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
          : [],
        createdAt: task.createdAt || new Date().toISOString()
      }))
    : [];

  const taskChecks = {};
  if (raw.taskChecks && typeof raw.taskChecks === "object" && !Array.isArray(raw.taskChecks)) {
    Object.entries(raw.taskChecks).forEach(([date, ids]) => {
      if (Array.isArray(ids) && ids.length) taskChecks[date] = ids.map(String);
    });
  }

  return {
    version: DATA_VERSION,
    settings: { ...defaultSettings(), ...raw.settings },
    logs,
    comparisons,
    tasks,
    taskChecks
  };
}

function replaceState(data) {
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, data);
}

export function saveState() {
  storageSet(STORAGE_KEY, JSON.stringify(state));
}

/** 정상화된 데이터로 현재 상태를 통째로 바꾸고 저장합니다. */
export function applyData(data) {
  replaceState(normalizeData(data));
  saveState();
}

/**
 * 저장된 데이터를 불러옵니다.
 * v2 데이터가 없고 v1 데이터가 있으면 자동으로 이관합니다.
 * @returns {{ migrated: boolean, migratedLogs?: number }}
 */
export function loadState() {
  const raw = storageGet(STORAGE_KEY);

  if (raw) {
    try {
      replaceState(normalizeData(JSON.parse(raw)));
    } catch (e) {
      // 깨진 데이터가 덮어써져 사라지지 않도록 따로 보관해 둔다.
      console.warn("저장 데이터 로드 실패", e);
      storageSet(STORAGE_KEY + ".broken", raw);
    }
    return { migrated: false };
  }

  const legacy = readLegacyRaw();
  if (legacy) {
    try {
      applyData(JSON.parse(legacy));
      return { migrated: true, migratedLogs: state.logs.length };
    } catch (e) {
      console.warn("v1 데이터 이관 실패", e);
    }
  }

  return { migrated: false };
}

export function readLegacyRaw() {
  return storageGet(LEGACY_KEY);
}

export function hasLegacyData() {
  return !!readLegacyRaw();
}

/** 백업 파일로 내보낼 JSON 문자열 */
export function exportJson() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

/** 전체 초기화. (빈 v2 데이터를 저장해 두어야 다음 실행 때 v1이 다시 이관되지 않습니다.) */
export function resetState() {
  replaceState(createEmptyState());
  saveState();
}
