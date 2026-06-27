// DOM（静的要素のみ）
const showCarDiv = document.getElementById("showCarData");
const tbody      = document.getElementById("tbody");
const form       = document.getElementById("myForm");

// ページロード時はテーブルを隠す
showCarDiv.style.display = "none";

// 取得したピット記録。キー = pitNum
let pitRecords    = {};
let changedRecords = {};

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

  tbody.innerHTML = "<tr><td colspan='10'>取得中...</td></tr>";
  showCarDiv.style.display = "block";

  const res  = await fetch(
    `${API}/entries/update?carNum=${encodeURIComponent(carNumVal)}&race_id=${encodeURIComponent(auth.raceId)}`,
    { headers: { Authorization: `Bearer ${auth.token}` } },
  );
  const data = await res.json();
  if (handleApiError(res, data)) { showCarDiv.style.display = "none"; return; }

  pitRecords    = {};
  changedRecords = {};
  Object.entries(data).forEach(([key, val]) => {
    if (key !== "msg") pitRecords[val.pitNum] = val;
  });

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

// ── 変更フォームを全項目 JS 側で生成 ──

function openEditForm(rec) {
  const safeNote   = (rec.note   || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeReason = (rec.reason || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  // リタイア欄：retire=true のときのみ表示（取り消し or 理由変更）
  const retireSection = rec.retire ? `
      <h2>リタイア対応</h2>
      <section id="retireAction">
        <input type="checkbox" id="retireCancel" />
        <label for="retireCancel">リタイア取り消し</label>
        <label for="reason" style="flex: 1 1 100%; margin-top: 8px">理由変更</label>
        <input type="text" id="reason" maxlength="200" value="${safeReason}" />
      </section>` : "";

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

      ${retireSection}
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

  const retireCancelEl = document.getElementById("retireCancel");
  const reasonEl       = document.getElementById("reason");

  let body;

  if (retireCancelEl?.checked) {
    // リタイア取り消し（差分不要）
    body = { selection: "3", carNum: carNumVal };

  } else if (reasonEl?.value.trim() && reasonEl.value.trim() !== (orig?.reason || "")) {
    // リタイア理由が実際に変わっている場合のみ
    body = { selection: "2", carNum: carNumVal, reason: reasonEl.value.trim() };

  } else {
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
    const res  = await fetch(
      `${API}/entries/update?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body:    JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (handleApiError(res, data)) return;

    alert("送信成功");
    await fetchCarData(carNumVal);
    form.innerHTML = "";
  } finally {
    isSubmitting = false;
    const btn = document.getElementById("submit");
    if (btn) btn.disabled = false;
  }
});
