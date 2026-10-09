// ピット情報の出力画面（プレビュー → CSV / PDF）。表示は showAllGimic.js の共通部品を使う。
// 設計: doc/IF/output.md、doc/aws-sam/admin/v2/04_pitlog.md §4・§5
//
// この画面には絞り込みのUIが無いため、出力は「時刻順に並べた全件」になる。
// 出力する列は画面に出している列と同じ（PIT_LOG_COLUMNS。§5.2）。

let pitLogs = []; // GET /entries/show の logs
let raceTitle = "";

let thead;
let tbody;

// 画面に出ているものと、出力するものを必ず同じにするため、両方ここを通す（§5.2）
function visibleRows() {
  return filterAndSortPitLogs(pitLogs); // showAllGimic.js（絞り込み条件なし）
}

function render() {
  renderPitLogTable(tbody, visibleRows()); // showAllGimic.js
}

async function loadPitLogs() {
  const auth = requireAuth(true);
  if (!auth) return;

  try {
    const response = await fetch(`${API}/entries/show?act=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Race-Id": auth.raceToken,
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const data = await response.json();

    if (handleApiError(response, data)) return;

    pitLogs = data.logs || [];
    raceTitle = data.raceTitle || "";
    render();
  } catch (err) {
    console.error(err);
    alert("データの取得に失敗しました。サーバーまたはネットワークを確認してください。");
  }
}

// ── CSV 出力（04章§5）──
// 組み立てと保存は showAllGimic.js の共通部品（buildPitLogCsv / downloadPitLogCsv）。
// 管理者ポップアップと同じ実装を使うため、ここには持たない。
function exportCsv() {
  const rows = visibleRows();
  if (rows.length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  downloadPitLogCsv(rows, raceTitle); // showAllGimic.js
}

// ── PDF 出力（ブラウザ印刷）──
function exportPdf() {
  if (pitLogs.length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  thead = document.getElementById("thead");
  tbody = document.getElementById("tbody");

  renderPitLogHead(thead); // 見出しは列定義から作る（§4.3）

  document.getElementById("csv").addEventListener("click", exportCsv);
  document.getElementById("pdf").addEventListener("click", exportPdf);

  loadPitLogs();
});
