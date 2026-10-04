// DOM宣言
const csvButton = document.getElementById("csv");
const pdfButton = document.getElementById("pdf");

// グローバル変数（showAllGimic.js の renderTable / filterAndSortEntries が参照する）
let entries = [];
let raceTitle = "";

// ── API取得 ──
async function loadEntries() {
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

    entries = data.logs || [];
    raceTitle = data.raceTitle || "";

    renderTable(); // showAllGimic.js が提供
  } catch (err) {
    console.error(err);
    alert("データの取得に失敗しました。サーバーまたはネットワークを確認してください。");
  }
}

// ── CSV 出力（設計 04章§5）。画面で絞り込み・並べ替えた状態をそのまま出す ──
function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFileName(text) {
  return text.replace(/[\\/:*?"<>|]/g, "_");
}

function exportCsv() {
  const rows = filterAndSortEntries(); // showAllGimic.js が提供
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
  if (entries.length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  window.print();
}

// ── イベント ──
csvButton.addEventListener("click", exportCsv);
pdfButton.addEventListener("click", exportPdf);

loadEntries();
