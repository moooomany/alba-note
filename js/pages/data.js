// 데이터 관리 페이지 (백업 파일 저장/불러오기, v1 이관, 초기화)
import { state, normalizeData, applyData, exportJson, resetState, readLegacyRaw, hasLegacyData } from "../storage.js?v=20261120131555";
import { $, todayStr, toast, downloadText, copyText } from "../utils.js?v=20261120131555";

let app = null;

function describe(data) {
  return `근무기록 ${data.logs.filter(l => l.date).length}건 · 비교 ${data.comparisons.length}개월 · 업무 ${data.tasks.length}개`;
}

/** 텍스트(JSON)를 검사하고, 확인을 받은 뒤 현재 데이터로 바꾼다. */
function restoreFromText(text, sourceName) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    alert("JSON 형식이 아닙니다. 백업 파일 내용을 확인해 주세요.");
    return;
  }

  let data;
  try {
    data = normalizeData(parsed);
  } catch (e) {
    alert("백업 데이터 형식이 맞지 않습니다.\n" + e.message);
    return;
  }

  const fromV1 = !parsed.version || Number(parsed.version) < 2;
  const message =
    `${sourceName}${fromV1 ? " (예전 v1 형식)" : ""}으로 현재 데이터를 바꿀까요?\n\n` +
    `불러올 내용: ${describe(data)}\n` +
    `현재 내용: ${describe(state)}\n\n` +
    `현재 데이터는 덮어써집니다. 필요하면 먼저 백업 파일을 저장해 두세요.`;
  if (!confirm(message)) return;

  applyData(data);
  render();
  toast("복원되었습니다.");
}

function render() {
  $("dataSummary").textContent = describe(state);

  const legacyRaw = readLegacyRaw();
  $("legacyCard").hidden = !legacyRaw;
  if (legacyRaw) {
    try {
      $("legacySummary").textContent = describe(normalizeData(JSON.parse(legacyRaw)));
    } catch (e) {
      $("legacySummary").textContent = "읽을 수 없는 데이터";
    }
  }
}

export default {
  id: "data",
  title: "데이터 관리",
  icon: "database",
  desc: "백업 · 복원 · 이관",

  template() {
    return `
      <section class="card">
        <div class="section-title">
          <span>백업 파일</span>
        </div>
        <p class="small-note" style="margin-top:0;">현재 저장된 데이터: <b id="dataSummary"></b></p>
        <div class="row-actions">
          <button id="downloadBackupBtn">백업 파일 저장</button>
          <button class="secondary" id="uploadBackupBtn">백업 파일 불러오기</button>
          <input type="file" id="backupFileInput" accept=".json,application/json,text/plain" hidden />
        </div>
        <p class="small-note" style="margin-bottom:0;">
          예전 버전(v1)에서 복사해 둔 백업 데이터도 불러올 수 있습니다. 불러오면 새 형식으로 자동 변환됩니다.
          다른 기기로 옮길 때도 이 파일을 사용하세요.
        </p>
      </section>

      <section class="card" id="legacyCard" hidden>
        <div class="section-title">
          <span>예전 버전(v1) 데이터</span>
        </div>
        <p class="small-note" style="margin-top:0;">
          이 브라우저에 예전 버전 데이터가 남아 있습니다: <b id="legacySummary"></b><br />
          처음 새 버전을 열 때 자동으로 옮겨왔고, 혹시 몰라 원본은 지우지 않고 보관하고 있습니다.
        </p>
        <div class="row-actions">
          <button class="secondary" id="legacyDownloadBtn">v1 데이터 파일로 저장</button>
          <button class="secondary" id="legacyRestoreBtn">v1 데이터로 다시 가져오기</button>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>텍스트로 백업 / 복원</span>
        </div>
        <div class="backup-area">
          <div class="row-actions">
            <button class="secondary" id="exportBtn">백업 텍스트 만들기</button>
            <button class="secondary" id="copyBackupBtn">전체 복사</button>
            <button class="secondary" id="importBtn">붙여넣은 내용으로 복원</button>
          </div>
          <textarea id="backupText" placeholder="백업 데이터가 여기에 표시됩니다. 복원할 때는 여기에 붙여넣고 복원 버튼을 누르세요."></textarea>
        </div>
      </section>

      <section class="card">
        <div class="section-title">
          <span>초기화</span>
          <button class="danger" id="clearBtn">전체 초기화</button>
        </div>
        <p class="small-note" style="margin:0;">설정, 근무기록, 수령액 비교, 업무 목록이 모두 삭제됩니다.</p>
      </section>
    `;
  },

  init(appRef) {
    app = appRef;

    $("downloadBackupBtn").addEventListener("click", () => {
      downloadText(`alba-pay-backup-${todayStr()}.json`, exportJson());
      toast("백업 파일을 저장했습니다.");
    });

    $("uploadBackupBtn").addEventListener("click", () => $("backupFileInput").click());
    $("backupFileInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      restoreFromText(await file.text(), `'${file.name}' 파일`);
    });

    $("legacyDownloadBtn").addEventListener("click", () => {
      const raw = readLegacyRaw();
      if (!raw) return;
      let text = raw;
      try {
        text = JSON.stringify(JSON.parse(raw), null, 2);
      } catch (e) { /* 원문 그대로 저장 */ }
      downloadText(`alba-pay-v1-${todayStr()}.json`, text);
    });

    $("legacyRestoreBtn").addEventListener("click", () => {
      if (!hasLegacyData()) return;
      restoreFromText(readLegacyRaw(), "v1 데이터");
    });

    $("exportBtn").addEventListener("click", () => {
      $("backupText").value = exportJson();
    });

    $("copyBackupBtn").addEventListener("click", async () => {
      if (!$("backupText").value.trim()) $("backupText").value = exportJson();
      try {
        await copyText($("backupText").value, $("backupText"));
        toast("백업 데이터가 복사되었습니다.");
      } catch (e) {
        $("backupText").focus();
        $("backupText").select();
        alert("자동 복사가 막혔습니다. 선택된 내용을 직접 복사해 주세요.");
      }
    });

    $("importBtn").addEventListener("click", () => {
      const raw = $("backupText").value.trim();
      if (!raw) {
        alert("복원할 백업 데이터를 붙여넣어 주세요.");
        return;
      }
      restoreFromText(raw, "붙여넣은 데이터");
    });

    $("clearBtn").addEventListener("click", () => {
      if (!confirm("설정, 근무기록, 수령액 비교, 업무 목록을 모두 삭제할까요?\n삭제 전에 백업 파일을 저장해 두는 것을 권장합니다.")) return;
      resetState();
      render();
      toast("모든 데이터를 삭제했습니다.");
    });
  },

  render
};
