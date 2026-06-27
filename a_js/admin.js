// 管理者画面（レース管理）。
// common.js を先に読み込む前提（API / requireAuth / handleApiError をグローバル参照）。

let authToken = null;

document.addEventListener("DOMContentLoaded", () => {
  // token のみ必須（大会ID認証は管理者画面では不要）
  const auth = requireAuth(false);
  if (!auth) return;
  authToken = auth.token;

  document.getElementById("raceForm").addEventListener("submit", onCreateRace);
  loadRaces();
  initReg();
});

// Authorization ヘッダ生成
function authHeaders(json = true) {
  const h = { Authorization: `Bearer ${authToken}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ── 一覧取得 ──
async function loadRaces() {
  const res = await fetch(`${API}/race`, { headers: authHeaders(false) });
  const data = await res.json();
  if (handleApiError(res, data)) return;
  renderRaces(data.races || []);
}

function renderRaces(races) {
  const tbody = document.getElementById("raceTbody");
  const empty = document.getElementById("raceEmpty");
  tbody.innerHTML = "";

  if (races.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for (const r of races) {
    const tr = document.createElement("tr");

    tr.appendChild(tdText(r.raceId));
    tr.appendChild(tdText(r.title));
    tr.appendChild(tdText(r.todayId || ""));

    const ops = document.createElement("td");
    ops.className = "ops";

    const editBtn = document.createElement("button");
    editBtn.textContent = "変更";
    editBtn.addEventListener("click", () => onEditRace(r));

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "danger";
    delBtn.addEventListener("click", () => onDeleteRace(r));

    ops.append(editBtn, delBtn);
    tr.appendChild(ops);
    tbody.appendChild(tr);
  }
}

function tdText(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

// ── 新規登録 ──
async function onCreateRace(event) {
  event.preventDefault();
  const raceId = document.getElementById("raceId").value.trim();
  const title  = document.getElementById("title").value.trim();

  const res = await fetch(`${API}/race`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ raceId, title }),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  event.target.reset();
  loadRaces();
}

// ── 変更（タイトル）──
async function onEditRace(r) {
  const input = prompt("新しいレースタイトル", r.title);
  if (input === null) return; // キャンセル
  const title = input.trim();
  if (!title) {
    alert("レースタイトルを入力してください");
    return;
  }

  const res = await fetch(`${API}/race`, {
    method:  "PUT",
    headers: authHeaders(),
    body:    JSON.stringify({ raceId: r.raceId, title }),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  loadRaces();
}

// ── 削除 ──
async function onDeleteRace(r) {
  if (!confirm(`レース「${r.title}」(${r.raceId}) を削除しますか？`)) return;

  const res = await fetch(`${API}/race/${encodeURIComponent(r.raceId)}`, {
    method:  "DELETE",
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  loadRaces();
}

// ── データ登録 ──

const TABLE_SCHEMAS = {
  entry: {
    label: "エントリー",
    api: `${API}/entry/bulk`,
    fields: [
      { key: "carNum",          label: "車番",           type: "number", required: true  },
      { key: "className",       label: "クラス",         type: "text",   required: true  },
      { key: "entrantName",     label: "エントラント名", type: "text",   required: true  },
      { key: "vehicleName",     label: "車両名",         type: "text",   required: true  },
      { key: "maintenanceArea", label: "担当エリア",     type: "text",   required: true  },
      { key: "pitGarage",       label: "ピットガレージ", type: "number", required: true  },
      { key: "driverA",         label: "ドライバーA",    type: "text",   required: true  },
      { key: "driverB",         label: "ドライバーB",    type: "text",   required: false },
      { key: "driverC",         label: "ドライバーC",    type: "text",   required: false },
      { key: "driverD",         label: "ドライバーD",    type: "text",   required: false },
      { key: "driverE",         label: "ドライバーE",    type: "text",   required: false },
      { key: "driverF",         label: "ドライバーF",    type: "text",   required: false },
    ],
  },
  startDriver: {
    label: "スタートドライバー",
    api: `${API}/entry/start-driver/bulk`,
    fields: [
      { key: "carNum", label: "車番",               type: "number", required: true },
      { key: "driver", label: "スタートドライバー", type: "text",   required: true },
    ],
  },
  pitAssignment: {
    label: "担当ピット",
    api: null, // E-05: API未定義
    fields: [
      { key: "username",        label: "ユーザー名",   type: "text", required: true },
      { key: "maintenanceArea", label: "担当エリア",   type: "text", required: true },
    ],
  },
};

let stagingRows = [];
let currentMethod = "manual";

function getSchema() {
  const val = document.querySelector("input[name='tableTarget']:checked")?.value;
  return TABLE_SCHEMAS[val] || TABLE_SCHEMAS.entry;
}

function buildManualForm() {
  const schema = getSchema();
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

function buildStagingTable() {
  const schema = getSchema();
  document.getElementById("stagingCount").textContent = stagingRows.length;
  document.getElementById("stagingWrap").style.display = stagingRows.length > 0 ? "" : "none";

  document.getElementById("stagingHead").innerHTML =
    `<tr>${schema.fields.map((f) => `<th>${f.label}</th>`).join("")}<th></th></tr>`;

  const body = document.getElementById("stagingBody");
  body.innerHTML = "";
  stagingRows.forEach((row, i) => {
    const tr = document.createElement("tr");
    schema.fields.forEach((f) => {
      const td = document.createElement("td");
      td.textContent = row[f.key] ?? "";
      tr.appendChild(td);
    });
    const btn = document.createElement("button");
    btn.textContent = "削除";
    btn.className = "danger";
    btn.addEventListener("click", () => { stagingRows.splice(i, 1); buildStagingTable(); });
    const td = document.createElement("td");
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  });
}

function showInputArea() {
  document.getElementById("manualArea").style.display = currentMethod === "manual" ? "" : "none";
  document.getElementById("csvArea").style.display   = currentMethod === "csv"    ? "" : "none";
  document.getElementById("previewSection").style.display = "none";
}

function showPreview(rows) {
  const schema = getSchema();
  document.getElementById("manualArea").style.display = "none";
  document.getElementById("csvArea").style.display   = "none";

  const section = document.getElementById("previewSection");
  section.style.display = "";
  document.getElementById("previewCount").textContent = rows.length;

  document.getElementById("previewHead").innerHTML =
    `<tr>${schema.fields.map((f) => `<th>${f.label}</th>`).join("")}</tr>`;

  const body = document.getElementById("previewBody");
  body.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    schema.fields.forEach((f) => {
      const td = document.createElement("td");
      td.textContent = row[f.key] ?? "";
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function parseCSV(text) {
  const schema = getSchema();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    schema.fields.forEach((f, i) => {
      const val = (values[i] || "").trim();
      row[f.key] = f.type === "number" ? (val === "" ? null : Number(val)) : (val || null);
    });
    return row;
  });
}

function initReg() {
  // テーブル選択変更
  document.querySelectorAll("input[name='tableTarget']").forEach((radio) => {
    radio.addEventListener("change", () => {
      stagingRows = [];
      buildManualForm();
      buildStagingTable();
      showInputArea();
    });
  });

  // 入力方法タブ切り替え
  document.querySelectorAll(".method-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      document.querySelectorAll(".method-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMethod = btn.dataset.method;
      showInputArea();
    });
  });

  // 手入力: 行追加
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
        row[field.key] = field.type === "number" ? (val === "" ? null : Number(val)) : (val || null);
      }
    });
    if (!valid) { alert("必須項目を入力してください"); return; }
    stagingRows.push(row);
    inputs.forEach((input) => { input.value = ""; });
    buildStagingTable();
  });

  // 手入力: プレビュー確認
  document.getElementById("manualPreviewBtn").addEventListener("click", () => {
    if (stagingRows.length === 0) { alert("行が追加されていません"); return; }
    showPreview(stagingRows);
  });

  // CSV: ファイル選択トリガー
  document.getElementById("csvSelectBtn").addEventListener("click", () => {
    document.getElementById("csvFile").click();
  });

  // CSV: ファイル読み込み → 自動プレビュー
  document.getElementById("csvFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      if (rows.length === 0) { alert("データが見つかりません"); return; }
      showPreview(rows);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = ""; // 同じファイルを再選択できるようにリセット
  });

  // プレビュー: 戻る
  document.getElementById("backToInputBtn").addEventListener("click", () => {
    showInputArea();
  });

  // プレビュー: 登録
  let isSubmitting = false;
  const submitRegBtn = document.getElementById("submitRegBtn");
  submitRegBtn.addEventListener("click", async () => {
    if (isSubmitting) return;

    const raceId = document.getElementById("regRaceId").value.trim();
    if (!raceId) { alert("レースIDを入力してください"); return; }

    const schema = getSchema();
    if (!schema.api) { alert(`${schema.label}テーブルのAPIは未実装です`); return; }

    isSubmitting = true;
    submitRegBtn.disabled = true;

    const rows = [];
    document.querySelectorAll("#previewBody tr").forEach((tr) => {
      const row = {};
      schema.fields.forEach((f, i) => {
        const val = tr.cells[i]?.textContent ?? "";
        row[f.key] = f.type === "number" ? (val === "" ? null : Number(val)) : (val || null);
      });
      rows.push(row);
    });

    try {
      const res = await fetch(schema.api, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ raceId, entries: rows }),
      });
      const data = await res.json();
      if (handleApiError(res, data)) return;

      alert(`${rows.length}件を登録しました`);
      stagingRows = [];
      document.getElementById("regRaceId").value = "";
      buildManualForm();
      buildStagingTable();
      showInputArea();
    } finally {
      isSubmitting = false;
      submitRegBtn.disabled = false;
    }
  });

  buildManualForm();
}
