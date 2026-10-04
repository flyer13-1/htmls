// 管理者画面: レース変更（レース情報と entry / start_driver / pit_assignment の一覧・変更・削除）。
// adminRace.js の authHeaders / loadRaces / handleApiError、adminPreview.js の表示切替を参照する。
// 設計: doc/aws-sam/admin/v2/02_race.md §4.2、03_race_data.md §1.2・§2.4・§3.4・§4.4

let editRace = null; // 変更対象のレース（{ raceId, title, finishDate, ... }）
let editData = null; // GET /admin/race/data の結果
const editingRows = {}; // テーブル名 → 変更中の行
const editingHolders = {}; // テーブル名 → 編集フォームを載せている行（tr）
const editorHomes = {}; // テーブル名 → 編集フォームの元の置き場所

const DRIVER_KEYS = ["driverA", "driverB", "driverC", "driverD", "driverE", "driverF"];

const EDIT_TABLES = {
  entry: {
    label: "エントリー",
    listKey: "entries",
    columns: [
      { label: "車番", text: (r) => r.carNum },
      { label: "クラス", text: (r) => r.className },
      { label: "エントラント名", text: (r) => r.entrantName },
      { label: "車両名", text: (r) => r.vehicleName },
      { label: "作業エリア", text: (r) => r.maintenanceArea },
      { label: "ピットガレージ", text: (r) => r.pitGarage },
      { label: "ドライバー", text: (r) => DRIVER_KEYS.map((k) => r[k]).filter(Boolean).join(" / ") },
    ],
    fields: [
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
    rowTitle: (r) => `車番 ${r.carNum}`,
    update: (r, values) => ({ method: "PUT", url: `${API}/admin/entry`, body: { carNum: r.carNum, ...values } }),
    remove: (r) => ({ method: "DELETE", url: `${API}/admin/entry/${r.carNum}` }),
  },
  startDriver: {
    label: "スタートドライバー",
    listKey: "startDrivers",
    columns: [
      { label: "車番", text: (r) => r.carNum },
      { label: "ドライバー枠", text: (r) => r.driver },
    ],
    fields: [{ key: "driver", label: "ドライバー枠(A〜F)", type: "text", required: true }],
    rowTitle: (r) => `車番 ${r.carNum}`,
    update: (r, values) => ({ method: "PUT", url: `${API}/admin/start-driver`, body: { carNum: r.carNum, driver: values.driver } }),
    remove: (r) => ({ method: "DELETE", url: `${API}/admin/start-driver/${r.carNum}` }),
  },
  pitAssignment: {
    label: "担当ピット",
    listKey: "pitAssignments",
    columns: [
      { label: "担当者名", text: (r) => r.username },
      { label: "担当エリア", text: (r) => r.maintenanceArea },
    ],
    fields: [
      { key: "username", label: "担当者名", type: "text", required: true },
      { key: "maintenanceArea", label: "担当エリア(例 5-10)", type: "text", required: true },
    ],
    rowTitle: (r) => `${r.username}（${r.maintenanceArea}）`,
    update: (r, values) => ({
      method: "PUT",
      url: `${API}/admin/pit-assignment`,
      body: {
        oldUsername: r.username,
        oldMaintenanceArea: r.maintenanceArea,
        username: values.username,
        maintenanceArea: values.maintenanceArea,
      },
    }),
    remove: (r) => ({
      method: "DELETE",
      url: `${API}/admin/pit-assignment?username=${encodeURIComponent(r.username)}&maintenanceArea=${encodeURIComponent(r.maintenanceArea)}`,
    }),
  },
};

// 成功なら true。失敗時は handleApiError がメッセージを出す
async function editRequest({ method, url, body }) {
  const res = await fetch(url, {
    method,
    headers: authHeaders(body !== undefined, editRace.raceId),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return !handleApiError(res, data);
}

function makeCell(tag, text) {
  const cell = document.createElement(tag);
  cell.textContent = text ?? "";
  return cell;
}

// 変更articleを開く（一覧の「変更」から呼ぶ）
async function openEdit(r) {
  editRace = r;
  document.getElementById("editRaceTitle").textContent = r.title;
  document.getElementById("editTitle").value = r.title;
  document.getElementById("editFinishDate").value = r.finishDate;

  document.getElementById("main").hidden = true;
  document.getElementById("preview").hidden = true;
  document.getElementById("edit").hidden = false;
  window.scrollTo(0, 0);

  await loadEditData();
}

function closeEdit() {
  document.getElementById("edit").hidden = true;
  document.getElementById("main").hidden = false;
  loadRaces();
}

async function loadEditData() {
  const res = await fetch(`${API}/admin/race/data`, {
    headers: authHeaders(false, editRace.raceId),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  editData = data;
  renderUsernameList("userList", "editUserCircuit", "pitAssignmentFields");
  for (const name of Object.keys(EDIT_TABLES)) {
    closeRowEditor(name);
    renderEditTable(name);
  }
}

function renderEditTable(name) {
  const def = EDIT_TABLES[name];
  const rows = editData[def.listKey] || [];
  document.getElementById(`${name}Count`).textContent = rows.length;

  const head = document.getElementById(`${name}Head`);
  head.innerHTML = "";
  const headTr = document.createElement("tr");
  def.columns.forEach((c) => headTr.appendChild(makeCell("th", c.label)));
  headTr.appendChild(makeCell("th", "操作"));
  head.appendChild(headTr);

  const body = document.getElementById(`${name}Body`);
  body.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    def.columns.forEach((c) => tr.appendChild(makeCell("td", c.text(row))));

    const ops = makeCell("td", "");
    ops.className = "ops";
    const editBtn = document.createElement("button");
    editBtn.textContent = "変更";
    editBtn.addEventListener("click", () => openRowEditor(name, row, tr));
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "danger";
    delBtn.addEventListener("click", () => removeRow(name, row));
    ops.append(editBtn, delBtn);

    tr.appendChild(ops);
    body.appendChild(tr);
  }
}

function openRowEditor(name, row, tr) {
  closeRowEditor(name);
  const def = EDIT_TABLES[name];
  editingRows[name] = row;
  document.getElementById(`${name}EditorTitle`).textContent = `${def.label}を変更: ${def.rowTitle(row)}`;

  const fields = document.getElementById(`${name}Fields`);
  fields.innerHTML = "";
  for (const f of def.fields) {
    const wrap = document.createElement("div");
    wrap.className = "manual-field";
    const label = document.createElement("label");
    label.textContent = f.label + (f.required ? " *" : "");
    const input = document.createElement("input");
    input.type = f.type === "number" ? "number" : "text";
    input.dataset.key = f.key;
    input.value = row[f.key] ?? "";
    wrap.append(label, input);
    fields.appendChild(wrap);
  }

  const editor = document.getElementById(`${name}Editor`);
  const holder = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = def.columns.length + 1;
  cell.appendChild(editor);
  holder.appendChild(cell);
  tr.after(holder);
  editingHolders[name] = holder;
  editor.hidden = false;
}

function closeRowEditor(name) {
  editingRows[name] = null;
  const editor = document.getElementById(`${name}Editor`);
  editor.hidden = true;
  editorHomes[name].appendChild(editor);
  editingHolders[name]?.remove();
  editingHolders[name] = null;
}

async function saveRow(name, form) {
  const def = EDIT_TABLES[name];
  const row = editingRows[name];
  if (!row) return;

  const values = {};
  let valid = true;
  form.querySelectorAll("input").forEach((input) => {
    const field = def.fields.find((f) => f.key === input.dataset.key);
    const val = input.value.trim();
    input.classList.toggle("err", field.required && !val);
    if (field.required && !val) {
      valid = false;
      return;
    }
    values[field.key] = field.type === "number" ? (val === "" ? null : Number(val)) : val || null;
  });
  if (!valid) {
    alert("必須項目を入力してください");
    return;
  }

  if (!(await editRequest(def.update(row, values)))) return;
  await loadEditData();
}

async function removeRow(name, row) {
  const def = EDIT_TABLES[name];
  if (!confirm(`${def.label}「${def.rowTitle(row)}」を削除しますか？`)) return;
  if (!(await editRequest(def.remove(row)))) return;
  await loadEditData();
}

// レース情報（タイトル・終了日）の変更（02章§4.2。変更した項目だけ確認に出す）
async function onSaveRaceEdit(event) {
  event.preventDefault();
  const title = document.getElementById("editTitle").value.trim();
  const finishDate = document.getElementById("editFinishDate").value;

  const changes = [];
  if (title !== editRace.title) {
    changes.push(`タイトル: 「${editRace.title}」→「${title}」`);
  }
  if (finishDate !== editRace.finishDate) {
    changes.push(`終了日: ${editRace.finishDate} → ${finishDate}`);
  }
  if (changes.length === 0) {
    alert("変更がありません");
    return;
  }
  if (!confirm(`以下を変更します。よろしいですか？\n\n${changes.join("\n")}`)) return;

  const ok = await editRequest({
    method: "PUT",
    url: `${API}/admin/race`,
    body: { title, finishDate },
  });
  if (!ok) return;

  editRace = { ...editRace, title, finishDate };
  document.getElementById("editRaceTitle").textContent = title;
  if (selectedRace?.raceId === editRace.raceId) {
    selectedRace = { ...selectedRace, title, finishDate };
    document.getElementById("selectedRaceTitle").textContent = title;
  }
}

function initEdit() {
  document.getElementById("raceEditForm").addEventListener("submit", onSaveRaceEdit);
  document.getElementById("backToListBtn").addEventListener("click", closeEdit);
  buildCircuitRadios("editCircuitRadios", "editUserCircuit", () => renderUsernameList("userList", "editUserCircuit", "pitAssignmentFields"));

  for (const name of Object.keys(EDIT_TABLES)) {
    editorHomes[name] = document.getElementById(`${name}Editor`).parentElement;
    document.getElementById(`${name}EditorForm`).addEventListener("submit", (e) => {
      e.preventDefault();
      saveRow(name, e.target);
    });
    document
      .getElementById(`${name}CancelBtn`)
      .addEventListener("click", () => closeRowEditor(name));
  }
}
