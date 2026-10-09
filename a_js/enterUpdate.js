// DOM（静的要素のみ）
const showCarDiv = document.getElementById("showCarData");
const tbody      = document.getElementById("tbody");
const form       = document.getElementById("myForm");

// ページロード時はテーブルを隠す
showCarDiv.style.display = "none";

// 取得したピット記録。キー = pitNum
let pitRecords    = {};
let changedRecords = {};
// リタイアの状態（車両ごとに1つ。GET /entries/update が logs とは別に返す）
let retireReason  = "";
let isRetired     = false;
let currentCarNum = null; // 今表示している車番（リタイア欄の送信に使う）

// ── ユーティリティ ──

function isoToTimeVal(iso) {
  if (!iso) return "";
  const m = String(iso).match(/T(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function timeValToIso(timeVal, refIso) {
  if (!timeVal) return null;
  const base = refIso || new Date().toISOString();
  const dm   = String(base).match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(.*)$/);
  if (!dm) return null;
  const ss = timeVal.length === 5 ? `${timeVal}:00` : timeVal;
  return `${dm[1]}T${ss}${dm[2]}`;
}

function formatTime(iso) {
  if (!iso) return "-";
  const m = String(iso).match(/T(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : "-";
}

// ── データ取得 ──

async function fetchCarData(carNumVal) {
  const auth = requireAuth(true);
  if (!auth) return;

  // 調べ直すたびに前の車の内容を消してから取得する
  clearRetireArea();
  tbody.innerHTML = "<tr><td colspan='10'>取得中...</td></tr>";
  showCarDiv.style.display = "block";

  const data = await apiFetch(
    `${API}/entries/update?carNum=${encodeURIComponent(carNumVal)}`,
    { headers: { "X-Race-Id": auth.raceToken, Authorization: `Bearer ${auth.token}` } },
  ); // common.js
  if (!data) { showCarDiv.style.display = "none"; clearRetireArea(); return; }

  // レスポンスは logs（配列）＋ isRetired / reason。画面は pitNum で引くので対応表にする
  pitRecords    = {};
  changedRecords = {};
  retireReason  = data.reason || "";
  isRetired     = data.isRetired === true;
  currentCarNum = Number(carNumVal);
  for (const row of data.logs || []) {
    pitRecords[row.pitNum] = row;
  }

  renderRetireArea();
  renderTable();
}

// ── テーブル描画 ──

function renderTable() {
  tbody.innerHTML = "";
  const records = Object.values(pitRecords).sort((a, b) => a.pitNum - b.pitNum);

  if (records.length === 0) {
    tbody.innerHTML = "<tr><td colspan='10'>記録が見つかりません</td></tr>";
    return;
  }

  records.forEach((rec) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td></td>
      <td>${rec.pitNum}</td>
      <td>${rec.carNum}</td>
      <td>${rec.manager}</td>
      <td>${rec.retire ? "はい" : "いいえ"}</td>
      <td>${rec.inDriver  || "-"}</td>
      <td>${rec.outDriver || "-"}</td>
      <td>${formatTime(rec.inTime)}</td>
      <td>${formatTime(rec.outTime)}</td>
      <td>${rec.note || ""}</td>
    `;

    const btn = document.createElement("button");
    btn.type        = "button";
    btn.textContent = "変更";
    btn.addEventListener("click", () => openEditForm(rec));
    tr.cells[0].appendChild(btn);

    tbody.appendChild(tr);
  });
}

// ── ドライバーラジオボタン生成（A〜F のみ） ──

function buildDriverRadios(currentDriver) {
  return ["A", "B", "C", "D", "E", "F"].map((d) => {
    const checked = currentDriver === d ? "checked" : "";
    return `
      <input type="radio" name="driver" id="driver${d}" value="${d}" ${checked} />
      <label for="driver${d}">${d}ドラ</label>`;
  }).join("");
}

// ── リタイア欄（ピット記録とは独立。記録が無い車でも取り消せる） ──

// 調べた車の状態をそのまま出す。2行（見出し＋内容）で、
//   リタイアしていない → 「リタイアなし」
//   リタイア中         → 理由の入力欄 ＋ 変更/取り消しのボタン
function renderRetireArea() {
  document.getElementById("retireArea").hidden = false;
  document.getElementById("retireNone").hidden = isRetired;
  document.getElementById("retireEdit").hidden = !isRetired;
  document.getElementById("retireReason").value = isRetired ? retireReason : "";
}

// 車番を消した・取得に失敗したときは欄ごと隠し、前の車の内容を残さない。
// 以前はここが無く、別の車を調べて失敗すると前の車のリタイアが出たままだった
function clearRetireArea() {
  isRetired = false;
  retireReason = "";
  currentCarNum = null;
  document.getElementById("retireArea").hidden = true;
  document.getElementById("retireReason").value = "";
}

// 理由の変更（selection=2）
async function onChangeRetireReason() {
  const reason = document.getElementById("retireReason").value.trim();
  if (!reason) {
    alert("理由を入力してください");
    return;
  }
  if (reason === retireReason) {
    alert("理由が変わっていません");
    return;
  }
  if (!(await sendRetire({ selection: "2", carNum: currentCarNum, reason }))) return;
  alert("リタイア理由を変更しました");
  await fetchCarData(currentCarNum);
}

// 取り消し（selection=3）
async function onCancelRetire() {
  if (!confirm(`車番 ${currentCarNum} のリタイアを取り消します。よろしいですか？`)) return;
  if (!(await sendRetire({ selection: "3", carNum: currentCarNum }))) return;
  alert("リタイアを取り消しました");
  await fetchCarData(currentCarNum);
}

async function sendRetire(body) {
  const auth = requireAuth(true);
  if (!auth) return false;

  const data = await apiFetch(`${API}/entries/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Race-Id": auth.raceToken,
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(body),
  }); // common.js
  return !!data;
}

document
  .getElementById("retireReasonBtn")
  .addEventListener("click", onChangeRetireReason);
document.getElementById("retireCancelBtn").addEventListener("click", onCancelRetire);

// ── 変更フォームを全項目 JS 側で生成 ──

function openEditForm(rec) {
  const safeNote   = (rec.note   || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  // リタイアの取り消し・理由変更は、この行のフォームではなく画面上部の
  // 「リタイア」欄で行う（2026-10-09変更）。ピット記録が1件も無い車でも
  // 取り消せるようにするため、記録ごとのフォームから切り離した。

  form.innerHTML = `
    <input type="hidden" id="hiddenCarNum" value="${rec.carNum}" />
    <input type="hidden" id="when"         value="${rec.pitNum}" />

    <article id="change">
      <h2>ピット時間</h2>
      <section id="Time">
        <label for="inTime">イン</label>
        <input type="time" id="inTime"  step="1" value="${isoToTimeVal(rec.inTime)}" />
        <label for="outTime">アウト</label>
        <input type="time" id="outTime" step="1" value="${isoToTimeVal(rec.outTime)}" />
      </section>

      <h2>交代したドライバー</h2>
      <section id="Driver">
        ${buildDriverRadios(rec.outDriver)}
      </section>

      <h2>作業内容</h2>
      <section id="task">
        <input type="checkbox" id="tires" value="tire" ${rec.tire ? "checked" : ""} />
        <label for="tires">タイヤ交換</label>
        <input type="checkbox" id="oils"  value="oil"  ${rec.oil  ? "checked" : ""} />
        <label for="oils">給油</label>
      </section>

      <h2>備考欄</h2>
      <section id="notes">
        <input type="text" id="note" maxlength="200" value="${safeNote}" />
      </section>

    </article>

    <section id="submits">
      <input type="submit" id="submit" value="送信" />
    </section>
  `;

  document.getElementById("change").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── 車番入力 → データ取得 ──

document.getElementById("carNum").addEventListener("change", () => {
  const val = document.getElementById("carNum").value.trim();
  form.innerHTML = "";
  if (val) {
    fetchCarData(val);
  } else {
    showCarDiv.style.display = "none";
    pitRecords = {};
    tbody.innerHTML = "";
    clearRetireArea();
  }
});

// ── 送信（form は常に同じ要素なのでリスナーは1度だけ） ──

let isSubmitting = false;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const auth = requireAuth(true);
  if (!auth) return;

  const carNumVal = parseInt(document.getElementById("hiddenCarNum")?.value);
  const pitNum    = parseInt(document.getElementById("when")?.value);
  if (!carNumVal || !pitNum) return;

  const orig   = pitRecords[pitNum];
  const refIso = orig?.inTime || orig?.outTime || new Date().toISOString();

  // このフォームはピット記録の変更だけを扱う（selection=1）。
  // リタイアの取り消し・理由変更は画面上部の「リタイア」欄。
  let body;

  {
    // 取得値と現在値の差分だけ body に含める
    const changes = { selection: "1", carNum: carNumVal, when: String(pitNum) };

    const newInTime  = timeValToIso(document.getElementById("inTime")?.value,  refIso);
    const newOutTime = timeValToIso(document.getElementById("outTime")?.value, refIso);
    const newDriver  = document.querySelector("#Driver input:checked")?.value || null;
    const newTire    = document.getElementById("tires")?.checked || false;
    const newOil     = document.getElementById("oils")?.checked  || false;
    const newNote    = document.getElementById("note")?.value    || "";

    if (newInTime  !== (orig?.inTime    || null))  changes.inTime    = newInTime;
    if (newOutTime !== (orig?.outTime   || null))  changes.outTime   = newOutTime;
    if (newDriver  !== (orig?.outDriver || null))  changes.outDriver = newDriver;
    if (newTire    !== !!orig?.tire)               changes.tire      = newTire;
    if (newOil     !== !!orig?.oil)                changes.oil       = newOil;
    if (newNote    !== (orig?.note || ""))         changes.note      = newNote;

    // selection/carNum/when だけなら変更なし
    if (Object.keys(changes).length === 3) { alert("変更がありません"); return; }

    body = changes;
  }

  if (!body) return;

  isSubmitting = true;
  const submitBtn = document.getElementById("submit");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = await apiFetch(
      `${API}/entries/update`,
      {
        method:  "PUT",
        headers: { "Content-Type": "application/json", "X-Race-Id": auth.raceToken, Authorization: `Bearer ${auth.token}` },
        body:    JSON.stringify(body),
      },
    ); // common.js
    if (!data) return;

    alert("送信成功");
    await fetchCarData(carNumVal);
    form.innerHTML = "";
  } finally {
    isSubmitting = false;
    const btn = document.getElementById("submit");
    if (btn) btn.disabled = false;
  }
});
