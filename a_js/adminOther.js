// 管理者画面: データ登録（entry / start_driver / pit_assignment の手入力・CSV）。
// adminRace.js の selectedRace を参照する。
// 設計: doc/aws-sam/admin/v2/03_race_data.md §1.1〜§4

// 登録先テーブルごとの定義（API・本文のキー・入力項目）
const TABLE_SCHEMAS = {
  entry: {
    label: "エントリー",
    api: `${API}/admin/entry/bulk`,
    bodyKey: "entries",
    fields: [
      { key: "carNum", label: "車番", type: "number", required: true },
      { key: "className", label: "クラス", type: "text", required: true },
      { key: "entrantName", label: "エントラント名", type: "text", required: true },
      { key: "vehicleName", label: "車両名", type: "text", required: true },
      { key: "maintenanceArea", label: "作業エリア", type: "number", required: true },
      { key: "pitGarage", label: "ピットガレージ", type: "text", required: true },
      { key: "driverA", label: "ドライバーA", type: "text", required: true },
      { key: "driverB", label: "ドライバーB", type: "text", required: false },
      { key: "driverC", label: "ドライバーC", type: "text", required: false },
      { key: "driverD", label: "ドライバーD", type: "text", required: false },
      { key: "driverE", label: "ドライバーE", type: "text", required: false },
      { key: "driverF", label: "ドライバーF", type: "text", required: false },
    ],
  },
  startDriver: {
    label: "スタートドライバー",
    api: `${API}/admin/start-driver/bulk`,
    bodyKey: "startDrivers",
    fields: [
      { key: "carNum", label: "車番", type: "number", required: true },
      { key: "driver", label: "ドライバー枠(A〜F)", type: "text", required: true },
    ],
  },
  pitAssignment: {
    label: "担当ピット",
    api: `${API}/admin/pit-assignment/bulk`,
    bodyKey: "assignments",
    fields: [
      { key: "username", label: "担当者名", type: "text", required: true },
      { key: "maintenanceArea", label: "担当エリア(例 5-10)", type: "text", required: true },
    ],
  },
};

// テーブルごとに貯めた行（プレビュー前）。登録は SUBMIT_ORDER の順に送る
const stagingByTable = { entry: [], startDriver: [], pitAssignment: [] };
let currentMethod = "manual"; // "manual" | "csv"
let regUsers = []; // 登録ユーザー（GET /admin/race の users）

function currentTableName() {
  return document.querySelector("input[name='tableTarget']:checked")?.value || "entry";
}

function getSchema() {
  return TABLE_SCHEMAS[currentTableName()];
}

function currentStaging() {
  return stagingByTable[currentTableName()];
}

function resetStaging() {
  for (const name of Object.keys(stagingByTable)) {
    stagingByTable[name] = [];
  }
}

function buildManualForm() {
  const schema = getSchema();
  document.getElementById("circuitSelect").hidden = currentTableName() !== "pitAssignment";
  renderUsernameList("usernameList", "userCircuit", "manualForm");
  const form = document.getElementById("manualForm");
  form.innerHTML = "";
  schema.fields.forEach((f) => {
    const wrap = document.createElement("div");
    wrap.className = "manual-field";
    const label = document.createElement("label");
    label.textContent = f.label + (f.required ? " *" : "");
    const input = document.createElement("input");
    input.type = f.type === "number" ? "number" : "text";
    input.dataset.key = f.key;
    input.placeholder = f.label;
    wrap.append(label, input);
    form.appendChild(wrap);
  });
}

// 現在のテーブルの貯めた行だけを表示する
function buildStagingTable() {
  const schema = getSchema();
  const rows = currentStaging();
  document.getElementById("stagingCount").textContent = rows.length;
  document.getElementById("stagingWrap").hidden = rows.length === 0;

  document.getElementById("stagingHead").innerHTML =
    `<tr>${schema.fields.map((f) => `<th>${f.label}</th>`).join("")}<th></th></tr>`;

  const body = document.getElementById("stagingBody");
  body.innerHTML = "";
  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    schema.fields.forEach((f) => {
      const td = document.createElement("td");
      td.textContent = row[f.key] ?? "";
      tr.appendChild(td);
    });
    const btn = document.createElement("button");
    btn.textContent = "削除";
    btn.className = "danger";
    btn.addEventListener("click", () => {
      rows.splice(i, 1);
      buildStagingTable();
    });
    const td = document.createElement("td");
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  });
}

// 担当者のサーキット選択。サーキットの数だけラジオを作る（CIRCUIT_NAMES の先頭 null は除く）
function buildCircuitRadios(containerId, groupName, onChange) {
  const wrap = document.getElementById(containerId);
  CIRCUIT_NAMES.forEach((name, id) => {
    if (!name) return;
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = id;
    radio.checked = id === myCircuit;
    radio.addEventListener("change", onChange);
    label.append(radio, ` ${name}`);
    wrap.appendChild(label);
  });
}

// 選んだサーキットの登録者を表にする。行をクリックすると fieldsId 内の担当者名欄に入る
function renderUsernameList(listId, groupName, fieldsId) {
  const wrap = document.getElementById(listId);
  const circuit = Number(document.querySelector(`input[name='${groupName}']:checked`)?.value);
  wrap.innerHTML = "";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headTr = document.createElement("tr");
  const th = document.createElement("th");
  th.textContent = "担当者名（クリックで入力）";
  headTr.appendChild(th);
  thead.appendChild(headTr);

  const tbody = document.createElement("tbody");
  for (const u of regUsers) {
    if (Number(u.organizationId) !== circuit) continue;
    const tr = document.createElement("tr");
    tr.className = "user-row";
    const td = document.createElement("td");
    td.textContent = u.username;
    tr.appendChild(td);
    tr.addEventListener("click", () => {
      const input = document.querySelector(`#${fieldsId} input[data-key='username']`);
      if (input) input.value = u.username;
    });
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  wrap.appendChild(table);
}

// CSVを行×セルに分解する。引用符の中のカンマ・改行・"" に対応する。
// 出力側（04章§5.1）が `"` で囲んで `""` にエスケープするため、
// 自分が出したCSVをそのまま読み込めるようにしている。
function parseCsvCells(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  // 先頭のBOMを取り除く（出力側はBOM付きで書き出す。04章§5.1）
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'; // "" は1つの " として扱う
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r") {
      // \r\n の \r は読み飛ばす（単独の \r も改行として扱う）
      if (src[i + 1] !== "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      }
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  row.push(cell);
  rows.push(row);

  // 空行（全セルが空）は捨てる
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/**
 * CSVを現在のテーブルの行に変換する。
 * 1行目は見出しとして読み、**列名で対応付ける**（2026-10-08変更）。
 * 以前は1行目を読み飛ばして列順の決め打ちで読んでいたため、
 * 順序が違うファイルが黙って別の列に入っていた。
 *
 * @returns {{ rows: object[] } | { error: string }}
 */
function parseCSV(text) {
  const schema = getSchema();
  const cells = parseCsvCells(text);
  if (cells.length < 2) {
    return { error: "見出し行とデータ行が必要です（1行目は見出し）" };
  }

  const header = cells[0].map((h) => h.trim());
  const indexes = schema.fields.map((f) => header.indexOf(f.label));
  const missing = schema.fields.filter((_, i) => indexes[i] === -1);

  if (missing.length > 0) {
    return {
      error:
        `1行目の見出しが合いません。\n\n` +
        `見つからない列: ${missing.map((f) => f.label).join("、")}\n\n` +
        `1行目をこの通りにしてください:\n${schema.fields.map((f) => f.label).join(",")}`,
    };
  }

  const rows = cells.slice(1).map((values) => {
    const row = {};
    schema.fields.forEach((f, i) => {
      const val = (values[indexes[i]] ?? "").trim();
      row[f.key] = f.type === "number" ? (val === "" ? null : Number(val)) : val || null;
    });
    return row;
  });

  return { rows };
}

// 登録先テーブル・入力方法・手入力・CSV の操作を初期化する（adminRace.js の DOMContentLoaded から呼ぶ）
function initDataReg() {
  // テーブル選択変更: 貯めた行は残したまま、フォームと一覧だけ切り替える
  buildCircuitRadios("circuitRadios", "userCircuit", () => renderUsernameList("usernameList", "userCircuit", "manualForm"));
  document.querySelectorAll("input[name='tableTarget']").forEach((radio) => {
    radio.addEventListener("change", () => {
      buildManualForm();
      buildStagingTable();
      showInputArea();
    });
  });

  // 入力方法タブ切り替え（PDFは作らない。03章§1.1）
  document.querySelectorAll(".method-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".method-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMethod = btn.dataset.method;
      showInputArea();
    });
  });

  // 手入力: 行追加（現在のテーブルへ）
  document.getElementById("addRowBtn").addEventListener("click", () => {
    const schema = getSchema();
    const inputs = document.querySelectorAll("#manualForm input");
    const row = {};
    let valid = true;
    inputs.forEach((input) => {
      const field = schema.fields.find((f) => f.key === input.dataset.key);
      const val = input.value.trim();
      if (field.required && !val) {
        input.classList.add("err");
        valid = false;
      } else {
        input.classList.remove("err");
        row[field.key] = field.type === "number" ? (val === "" ? null : Number(val)) : val || null;
      }
    });
    if (!valid) {
      alert("必須項目を入力してください");
      return;
    }
    currentStaging().push(row);
    inputs.forEach((input) => {
      input.value = "";
    });
    buildStagingTable();
  });

  // 手入力: プレビュー確認（全テーブルの貯めた行をまとめて見せる）
  document.getElementById("manualPreviewBtn").addEventListener("click", () => {
    if (stagedTotal() === 0) {
      alert("行が追加されていません");
      return;
    }
    showPreview(); // adminPreview.js
  });

  // CSV: ファイル選択トリガー
  document.getElementById("csvSelectBtn").addEventListener("click", () => {
    document.getElementById("csvFile").click();
  });

  // CSV: ファイル読み込み → 現在のテーブルに追加して自動プレビュー（03章§1.1）
  document.getElementById("csvFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCSV(ev.target.result);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.rows.length === 0) {
        alert("データが見つかりません");
        return;
      }
      stagingByTable[currentTableName()] = result.rows;
      buildStagingTable();
      showPreview(); // adminPreview.js
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = ""; // 同じファイルを再選択できるようにリセット
  });

  buildManualForm();
}
