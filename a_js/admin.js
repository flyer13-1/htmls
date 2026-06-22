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
