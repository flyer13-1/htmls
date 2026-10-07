// 管理者画面: レース処理（登録・一覧・変更・削除・選択）。
// common.js → adminRace.js → adminOther.js → adminPreview.js の順で読み込む前提。
// 設計: doc/aws-sam/admin/v2/02_race.md（レース）・03_race_data.md §1.1（選択→データ登録）

let authToken = null;
let myCircuit = null; // 自分の所属サーキット（担当者候補の初期選択に使う）
let races = []; // GET /admin/race の結果をキャッシュ（選択状態の再描画に使う）
let selectedRace = null; // { raceId, title, finishDate, status, todayId }
const revealedTodayIds = new Set(); // 大会IDを「表示」中のレース（「隠す」を押すまで保持）

document.addEventListener("DOMContentLoaded", () => {
  const auth = requireCircuitAuth();
  if (!auth) return;
  authToken = auth.token;
  myCircuit = Number(auth.circuit);

  // 登録フォームのサーキット名を表示（02章§2.2）
  document.getElementById("raceCreateCircuit").textContent =
    CIRCUIT_NAMES[Number(auth.circuit)] || "";

  //登録時
  document
    .getElementById("raceCreateForm")
    .addEventListener("submit", onCreateRace);

  //大会IDのコピー
  document
    .getElementById("copyTodayIdBtn")
    .addEventListener("click", onCopyTodayId);

  //確認画面へ戻る（ヘッダー）
  document
    .getElementById("backToConformBtn")
    .addEventListener("click", () => {
      window.location.href = "./conform.html";
    });

  initSearch(); // adminSearch.js（表示切替と検索）

  //大会作成後の閉じるボタン
  document.getElementById("closeCreatedBtn").addEventListener("click", () => {
    document.getElementById("raceCreatedCard").hidden = true;
    document.getElementById("createdTodayId").textContent = null;
  });

  loadRaces();
  initDataReg(); // adminOther.js
  initPreview(); // adminPreview.js
  initEdit(); // adminEdit.js
});

// Authorization（＋必要なら X-Race-Id）ヘッダ生成（01章 R10: raceId は常にヘッダー）
function authHeaders(json = true, raceId = null) {
  const h = { Authorization: `Bearer ${authToken}` };
  if (json) h["Content-Type"] = "application/json";
  if (raceId) h["X-Race-Id"] = raceId;
  return h;
}

// ── レース一覧（02章§3） ──
//レース情報を取得
async function loadRaces() {
  const res = await fetch(`${API}/admin/race`, { headers: authHeaders(false) });
  const data = await res.json();
  if (handleApiError(res, data)) return;
  races = data.races || [];
  regUsers = data.users || [];
  renderUsernameList("usernameList", "userCircuit", "manualForm"); // adminOther.js
  renderRaces();
}

const STATUS_LABEL = {
  upcoming: "開催前",
  active: "開催中",
  lastDay: "最終日",
  finished: "終了済み",
};

function renderRaces() {
  const tbody = document.getElementById("raceTbody");
  const empty = document.getElementById("raceEmpty");
  tbody.innerHTML = "";
  empty.hidden = races.length > 0;

  for (const r of races) {
    const finished = r.status === "finished";
    const tr = document.createElement("tr");
    tr.className = [
      finished ? "finished" : "",
      selectedRace?.raceId === r.raceId ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    tr.dataset.raceId = r.raceId;
    tr.appendChild(tdText(r.title));
    tr.appendChild(todayIdCell(r, finished));
    tr.appendChild(tdText(r.finishDate));

    const statusTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `pill ${r.status}`;
    pill.textContent = STATUS_LABEL[r.status];
    statusTd.appendChild(pill);
    tr.appendChild(statusTd);

    tr.appendChild(opsCell(r, finished));

    tr.addEventListener("click", () => selectRace(r));
    tbody.appendChild(tr);
  }
}

function tdText(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

// 大会IDは普段は伏せておき、「表示」で見られるようにする（02章§3「表示」）
function todayIdCell(r, finished) {
  const td = document.createElement("td");
  if (finished) {
    td.textContent = "—";
    return td;
  }
  const span = document.createElement("span");
  span.textContent = "••••••••";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost-btn";
  btn.textContent = "表示";
  let shown = revealedTodayIds.has(r.raceId);
  span.textContent = shown ? r.todayId : "••••••••";
  btn.textContent = shown ? "隠す" : "表示";
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // 行クリック（選択）に伝播させない
    shown = !shown;
    if (shown) revealedTodayIds.add(r.raceId);
    else revealedTodayIds.delete(r.raceId);
    span.textContent = shown ? r.todayId : "••••••••";
    btn.textContent = shown ? "隠す" : "表示";
  });
  td.append(span, document.createTextNode(" "), btn);
  return td;
}

function opsCell(r, finished) {
  const td = document.createElement("td");
  td.className = "ops";

  const editBtn = document.createElement("button");
  editBtn.textContent = "変更";
  editBtn.disabled = finished;
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEdit(r); // adminEdit.js
  });

  const delBtn = document.createElement("button");
  delBtn.textContent = "削除";
  delBtn.className = "danger";
  delBtn.disabled = finished;
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onDeleteRace(r);
  });

  td.append(editBtn, delBtn);
  return td;
}

// レース選択 → データ登録カードを出す（03章§1.1 ステップ1）
// 行を作り直さず選択の見た目だけ切り替える（表示中の大会IDや文字の選択を消さないため）
function markSelectedRace() {
  document.querySelectorAll("#raceTbody tr").forEach((tr) => {
    tr.classList.toggle("selected", tr.dataset.raceId === selectedRace?.raceId);
  });
}

function selectRace(r) {
  selectedRace = r;
  markSelectedRace();
  showDataRegCard();
}

function showDataRegCard() {
  document.getElementById("dataRegCard").hidden = false;
  document.getElementById("selectedRaceTitle").textContent = selectedRace.title;

  const finished = selectedRace.status === "finished";
  document.getElementById("dataRegFinishedNotice").hidden = !finished;
  document.getElementById("dataRegBody").hidden = finished;

  if (!finished) {
    resetStaging(); // adminOther.js
    buildManualForm();
    buildStagingTable();
    showInputArea(); // adminPreview.js
  }
}

// ── 新規登録（02章§2.2） ──
async function onCreateRace(event) {
  event.preventDefault();
  const title = document.getElementById("createTitle").value.trim();
  const finishDate = document.getElementById("createFinishDate").value;

  const res = await fetch(`${API}/admin/race`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title, finishDate }),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  event.target.reset();
  document.getElementById("createdTodayId").textContent = data.todayId;
  document.getElementById("raceCreatedCard").hidden = false;
  loadRaces();
}

function onCopyTodayId() {
  const text = document.getElementById("createdTodayId").textContent;
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ── 削除（03章§5） ──
// raceId は X-Race-Id ヘッダーで送る（01章 R10）。entry が1件でも残っていれば 409 が返る。
async function onDeleteRace(r) {
  if (!confirm(`レース「${r.title}」を削除しますか？`)) return;

  const res = await fetch(`${API}/admin/race`, {
    method: "DELETE",
    headers: authHeaders(false, r.raceId),
  });
  const data = await res.json();
  if (handleApiError(res, data)) return;

  if (selectedRace?.raceId === r.raceId) {
    selectedRace = null;
    document.getElementById("dataRegCard").hidden = true;
  }
  loadRaces();
}
