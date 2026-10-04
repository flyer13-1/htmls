// 管理者画面: プレビュー（貯めた行の確認 → テーブルごとに順番に登録）。
// <article id="main"> と <article id="preview"> を出し分ける（conform.html の formArea/conform と同じ形）。
// 貯めた行は adminOther.js の stagingByTable、currentMethod は adminOther.js、selectedRace / authHeaders は adminRace.js を参照する。

// 登録順（依存関係: start_driver は entry、pit_assignment は entry の作業エリアに依存）
const SUBMIT_ORDER = ["entry", "startDriver", "pitAssignment"];

// 入力画面（main）を出し、プレビュー（preview）を隠す
function showInputArea() {
  document.getElementById("main").hidden = false;
  document.getElementById("preview").hidden = true;
  document.getElementById("edit").hidden = true;
  document.getElementById("manualArea").hidden = currentMethod !== "manual";
  document.getElementById("csvArea").hidden = currentMethod !== "csv";
}

function stagedTotal() {
  return SUBMIT_ORDER.reduce((sum, name) => sum + stagingByTable[name].length, 0);
}

// プレビュー（preview）を出し、入力画面（main）を隠す。貯めた全テーブルを表示する
function showPreview() {
  document.getElementById("main").hidden = true;
  document.getElementById("preview").hidden = false;
  document.getElementById("previewCount").textContent = stagedTotal();
  document.getElementById("previewRaceTitle").textContent = selectedRace?.title ?? "";

  const container = document.getElementById("previewTables");
  container.innerHTML = "";
  for (const name of SUBMIT_ORDER) {
    const rows = stagingByTable[name];
    if (rows.length === 0) continue;
    const schema = TABLE_SCHEMAS[name];

    const label = document.createElement("p");
    label.className = "staging-label";
    label.textContent = `${schema.label}（${rows.length}件）`;

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headTr = document.createElement("tr");
    schema.fields.forEach((f) => {
      const th = document.createElement("th");
      th.textContent = f.label;
      headTr.appendChild(th);
    });
    thead.appendChild(headTr);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      schema.fields.forEach((f) => {
        const td = document.createElement("td");
        td.textContent = row[f.key] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);

    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    wrap.appendChild(table);
    container.append(label, wrap);
  }
}

let isSubmitting = false;

// 貯めた行を SUBMIT_ORDER の順に送る。途中で失敗したら、そこで止めて残りをプレビューに残す
async function submitAllStaged() {
  if (isSubmitting) return;
  if (!selectedRace) {
    alert("レースを選択してください");
    return;
  }

  const submitRegBtn = document.getElementById("submitRegBtn");
  isSubmitting = true;
  submitRegBtn.disabled = true;

  const done = [];
  try {
    for (const name of SUBMIT_ORDER) {
      const rows = stagingByTable[name];
      if (rows.length === 0) continue;
      const schema = TABLE_SCHEMAS[name];

      const res = await fetch(schema.api, {
        method: "POST",
        headers: authHeaders(true, selectedRace.raceId),
        body: JSON.stringify({ [schema.bodyKey]: rows }),
      });
      const data = await res.json();
      if (handleApiError(res, data)) {
        if (done.length > 0) alert(`登録済み:\n${done.join("\n")}`);
        showPreview();
        return;
      }

      done.push(`${schema.label} ${rows.length}件`);
      stagingByTable[name] = [];
    }

    alert(`登録しました:\n${done.join("\n")}`);
    resetStaging();
    buildManualForm();
    buildStagingTable();
    showInputArea();
  } finally {
    isSubmitting = false;
    submitRegBtn.disabled = false;
  }
}

// プレビューの操作（戻る・登録する）を初期化する（adminRace.js の DOMContentLoaded から呼ぶ）
function initPreview() {
  document.getElementById("backToInputBtn").addEventListener("click", showInputArea);
  document.getElementById("submitRegBtn").addEventListener("click", submitAllStaged);
}
