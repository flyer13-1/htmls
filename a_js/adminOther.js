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
      { key: "username", label: "担当者名", type: "text", required: true, list: "usernameList" },
      { key: "maintenanceArea", label: "担当エリア(例 5-10)", type: "text", required: true },
    ],
  },
};

// テーブルごとに貯めた行（プレビュー前）。登録は SUBMIT_ORDER の順に送る
const stagingByTable = { entry: [], startDriver: [], pitAssignment: [] };
let currentMethod = "manual"; // "manual" | "csv"
let regUsers = []; // 対象レースの登録ユーザー（GET /admin/race/data の users）

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
  renderUsernameList();
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
    if (f.list) input.setAttribute("list", f.list);
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
function buildCircuitRadios() {
  const wrap = document.getElementById("circuitRadios");
  CIRCUIT_NAMES.forEach((name, id) => {
    if (!name) return;
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "userCircuit";
    radio.value = id;
    radio.checked = id === myCircuit;
    radio.addEventListener("change", renderUsernameList);
    label.append(radio, ` ${name}`);
    wrap.appendChild(label);
  });
}

function renderUsernameList() {
  const list = document.getElementById("usernameList");
  const circuit = Number(document.querySelector("input[name='userCircuit']:checked")?.value);
  list.innerHTML = "";
  for (const u of regUsers) {
    if (Number(u.organizationId) !== circuit) continue;
    const opt = document.createElement("option");
    opt.value = u.username;
    list.appendChild(opt);
  }
}

// 対象レースの登録ユーザーを取得する（GET /admin/race/data の users）
async function loadRegUsers() {
  const raceId = selectedRace.raceId;
  const res = await fetch(`${API}/admin/race/data`, { headers: authHeaders(false, raceId) });
  const data = await res.json();
  if (handleApiError(res, data)) return;
  if (selectedRace?.raceId !== raceId) return;
  regUsers = data.users || [];
  renderUsernameList();
}

function parseCSV(text) {
  const schema = getSchema();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    schema.fields.forEach((f, i) => {
      const val = (values[i] || "").trim();
      row[f.key] = f.type === "number" ? (val === "" ? null : Number(val)) : val || null;
    });
    return row;
  });
}

// 登録先テーブル・入力方法・手入力・CSV の操作を初期化する（adminRace.js の DOMContentLoaded から呼ぶ）
function initDataReg() {
  // テーブル選択変更: 貯めた行は残したまま、フォームと一覧だけ切り替える
  buildCircuitRadios();
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
      const rows = parseCSV(ev.target.result);
      if (rows.length === 0) {
        alert("データが見つかりません");
        return;
      }
      currentStaging().push(...rows);
      buildStagingTable();
      showPreview(); // adminPreview.js
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = ""; // 同じファイルを再選択できるようにリセット
  });

  buildManualForm();
}
