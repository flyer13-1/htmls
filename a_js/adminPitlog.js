// 管理者画面: ピット記録のポップアップ（参照・CSV / PDF 出力）。
// 設計: doc/aws-sam/admin/v2/04_pitlog.md §3.3・§4.2・§5・§6
//
// 表示は showAllGimic.js の共通部品を使う（一般画面と同じ絞り込み・並べ替え・列・CSV）。
// 取得は GET /entries/show。leader は平文の raceId を X-Race-Id で送る（§3.3）。
// 終了済みのレースでも参照できるため、一覧の「ピット記録」ボタンは無効にしない（02章§5）。

let pitlogRace = null; // { raceId, title, ... }
let adminPitLogs = [];
const pitlogView = { className: "", search: "" };

// 今の絞り込み状態で絞った行。表示と出力で必ず同じものを使う（§5.2）
function pitlogVisibleRows() {
  return filterAndSortPitLogs(adminPitLogs, pitlogView); // showAllGimic.js
}

function renderPitlogRows() {
  document.getElementById("pitlogCount").textContent = pitlogVisibleRows().length;
  renderPitLogTable(document.getElementById("pitlogBody"), pitlogVisibleRows()); // showAllGimic.js
}

function renderPitlogFilters() {
  const classNames = Array.from(
    new Set(adminPitLogs.map((row) => row.className)),
  ).sort();
  renderClassButtons(
    document.getElementById("pitlogFilter"),
    classNames,
    pitlogView.className,
    (className) => {
      pitlogView.className = className;
      renderPitlogFilters(); // 選択の見た目を反映する
      renderPitlogRows();
    },
  ); // showAllGimic.js
}

// 一覧の「ピット記録」から呼ぶ
async function openPitlog(race) {
  pitlogRace = race;
  pitlogView.className = "";
  pitlogView.search = "";
  document.getElementById("pitlogSearch").value = "";
  document.getElementById("pitlogRaceTitle").textContent = race.title;
  document.getElementById("pitlogModal").hidden = false;

  // act=1: 取得した時点で OutpostLog に記録する（§6。管理者の操作も残す）
  const data = await adminFetch(`${API}/entries/show?act=1`, {
    headers: authHeaders(false, race.raceId), // adminRace.js（平文の raceId）
  });
  if (!data) {
    closePitlog();
    return;
  }

  adminPitLogs = data.logs || [];
  renderPitlogFilters();
  renderPitlogRows();
}

function closePitlog() {
  document.getElementById("pitlogModal").hidden = true;
  adminPitLogs = [];
  pitlogRace = null;
}

function exportPitlogCsv() {
  const rows = pitlogVisibleRows();
  if (rows.length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  downloadPitLogCsv(rows, pitlogRace?.title ?? ""); // showAllGimic.js
}

// PDF はブラウザの印刷に任せる（§5）。印刷用CSSがポップアップ以外を隠す
function exportPitlogPdf() {
  if (pitlogVisibleRows().length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  window.print();
}

function initPitlog() {
  renderPitLogHead(document.getElementById("pitlogHead")); // showAllGimic.js（列定義から作る）

  document.getElementById("pitlogSearch").addEventListener("input", (event) => {
    pitlogView.search = event.target.value.trim();
    renderPitlogRows();
  });
  document.getElementById("pitlogAllBtn").addEventListener("click", () => {
    pitlogView.className = "";
    pitlogView.search = "";
    document.getElementById("pitlogSearch").value = "";
    renderPitlogFilters();
    renderPitlogRows();
  });
  document.getElementById("pitlogCsvBtn").addEventListener("click", exportPitlogCsv);
  document.getElementById("pitlogPdfBtn").addEventListener("click", exportPitlogPdf);
  document.getElementById("pitlogCloseBtn").addEventListener("click", closePitlog);

  // 背景（オーバーレイ）のクリックでも閉じる。中身のクリックでは閉じない
  document.getElementById("pitlogModal").addEventListener("click", (event) => {
    if (event.target.id === "pitlogModal") closePitlog();
  });
}
