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

  // サーキット名はヘッダーと登録フォームに出す（02章§2.1・§4.2）
  const circuitName = CIRCUIT_NAMES[Number(auth.circuit)] || "";
  document.getElementById("raceCreateCircuit").textContent = circuitName;
  document.getElementById("headerCircuit").textContent = circuitName;

  // 終了日は今日（JST）より前を選べないようにする（02章§2.1。判定はサーバー）
  document.getElementById("createFinishDate").min = todayJstStr();

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

  initSearch(); // adminSearch.js（変更画面の表示切替と検索）

  // レース一覧の絞り込みと検索。入力のたびに描き直す（02章§3）
  document
    .getElementById("raceStatusFilter")
    .addEventListener("change", renderRaces);
  document.getElementById("raceSearch").addEventListener("input", renderRaces);

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

// 今日（JST）を "YYYY-MM-DD" で返す。日付入力欄の min に使う。
// サーバーの raceStatus.js の todayJST と同じ計算（UTC+9 固定）。
function todayJstStr() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Authorization（＋必要なら X-Race-Id）ヘッダ生成（01章 R10: raceId は常にヘッダー）
function authHeaders(json = true, raceId = null) {
  const h = { Authorization: `Bearer ${authToken}` };
  if (json) h["Content-Type"] = "application/json";
  if (raceId) h["X-Race-Id"] = raceId;
  return h;
}

// 管理者画面のAPI呼び出し口（01章§7「画面の挙動」）。成功ならレスポンスのデータ、
// 失敗なら null を返す（呼び出し側は `if (!data) return;` で離脱する）。
//
// ・fetch が例外 → 認証情報を消してログイン画面へ。不正なトークンは API Gateway が
//   Authorizer の拒否として返し、そのレスポンスには CORS ヘッダーが付かないため
//   ブラウザでは例外になる。通信断も同じ扱いにする（レスポンスの形に依存しない）。
// ・403 で reason が not_admin / user_not_found → msg を出して conform.html へ。
// ・403 で reason が race_finished → msg を出すだけ（画面は移動しない。01章§7）。
//   一般画面は conform へ戻すようになったため、ここで止めて handleApiError に渡さない。
//
// reason の分岐を common.js の handleApiError に入れないのは、GET /user/me も
// user_not_found で403を返し、それを呼ぶのは conform.html 自身のため
// （共通処理に入れると conform が自分自身へ戻り続ける）。
async function adminFetch(url, options = {}) {
  let res;
  let data;
  try {
    res = await fetch(url, options);
    data = await res.json();
  } catch (err) {
    console.error("admin fetch error:", err);
    clearAuth(); // common.js
    alert("通信に失敗しました。再度ログインしてください。");
    window.location.replace("./index.html");
    return null;
  }

  if (res.status === 403) {
    if (data.reason === "not_admin" || data.reason === "user_not_found") {
      alert(data.msg);
      window.location.replace("./conform.html");
      return null;
    }
    // race_finished は msg を出すだけで画面は移動しない（01章§7）。
    // 一般画面は conform へ戻す（common.js の handleApiError）が、管理者は
    // 終了済みのレースも一覧で扱うため、ここで止めて handleApiError に渡さない。
    if (data.reason === "race_finished") {
      alert(data.msg);
      return null;
    }
  }

  return handleApiError(res, data) ? null : data; // common.js
}

// ── レース一覧（02章§3） ──
//レース情報を取得
async function loadRaces() {
  const data = await adminFetch(`${API}/admin/race`, { headers: authHeaders(false) });
  if (!data) return;
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

// 一覧の並び順（02章§3「表示」）。大会当日に使う画面なので、今まさに動いている
// レースを一番上に置く。グループの中はAPIが返した順（終了日の新しい順）のまま。
const STATUS_GROUP = {
  active: 0,
  lastDay: 0,
  upcoming: 1,
  finished: 2,
};

// 状態の絞り込み（プルダウンの value → 対象の status）。
// 並び順のグループと同じ区切りにする（開催中と最終日はまとめて扱う）。
const STATUS_FILTERS = {
  running: ["active", "lastDay"],
  upcoming: ["upcoming"],
  finished: ["finished"],
};

// 検索の対象: タイトルと終了日。終了日は "2026-10" のような部分でも当たる。
// 正規化と複数語の扱いは adminSearch.js と共通（02章§3）。
function raceSearchText(r) {
  return `${r.title} ${r.finishDate}`;
}

function filteredSortedRaces() {
  const filterValue = document.getElementById("raceStatusFilter").value;
  const allowed = STATUS_FILTERS[filterValue] || null;
  const terms = splitTerms(document.getElementById("raceSearch").value); // adminSearch.js

  const rows = races.filter((r) => {
    if (allowed && !allowed.includes(r.status)) return false;
    if (terms.length === 0) return true;
    const text = normalizeText(raceSearchText(r)); // adminSearch.js
    return terms.every((term) => text.includes(term));
  });

  // Array.prototype.sort は安定なので、同じグループ内はAPIの順（終了日の降順）が保たれる
  return rows.sort((a, b) => STATUS_GROUP[a.status] - STATUS_GROUP[b.status]);
}

function renderRaces() {
  const tbody = document.getElementById("raceTbody");
  const empty = document.getElementById("raceEmpty");
  const noHit = document.getElementById("raceNoHit");
  tbody.innerHTML = "";

  const rows = filteredSortedRaces();
  // 「1件も登録が無い」と「絞り込みの結果が0件」を区別して伝える
  empty.hidden = races.length > 0;
  noHit.hidden = races.length === 0 || rows.length > 0;

  for (const r of rows) {
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

  const data = await adminFetch(`${API}/admin/race`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title, finishDate }),
  });
  if (!data) return;

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

  if (
    !(await adminFetch(`${API}/admin/race`, {
      method: "DELETE",
      headers: authHeaders(false, r.raceId),
    }))
  ) {
    return;
  }

  if (selectedRace?.raceId === r.raceId) {
    selectedRace = null;
    document.getElementById("dataRegCard").hidden = true;
  }
  loadRaces();
}
