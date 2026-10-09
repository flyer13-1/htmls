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

// ── CSV 出力（§5.1） ──
// 値に , " 改行 が入る場合は " で囲み、中の " は "" にする（備考欄で実際に起こり得る）
function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFileName(text) {
  return text.replace(/[\\/:*?"<>|]/g, "_");
}

function exportCsv() {
  const rows = visibleRows();
  if (rows.length === 0) {
    alert("出力するデータがありません。");
    return;
  }

  const lines = [PIT_LOG_COLUMNS.map((col) => csvEscape(col.label)).join(",")];
  for (const row of rows) {
    lines.push(PIT_LOG_COLUMNS.map((col) => csvEscape(col.value(row))).join(","));
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM: Excel で日本語が文字化けしないように

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pit-log-${safeFileName(raceTitle)}-${ymd}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
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
