// リタイア登録画面。
// 設計: doc/IF/enterRetire.md（画面・GET /entries/retire）、enterRetire2.md（POST）

const carNumber = document.getElementById("carNumber");
const notes = document.getElementById("notes");
const reason = document.getElementById("reason");
const submitBtn = document.getElementById("submit");
const toast = document.getElementById("toast");

// リタイア済みの一覧
const retiredCount = document.getElementById("retiredCount");
const retiredEmpty = document.getElementById("retiredEmpty");
const retiredWrap = document.getElementById("retiredWrap");
const retiredBody = document.getElementById("retiredBody");

const RETIRED_EMPTY_MESSAGE = "リタイアしている車両はいません。";

// 今リタイア登録されている車番。二重登録を送る前に止めるのに使う
let retiredCarNums = new Set();

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

let isSubmitting = false;

document.getElementById("retireForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const auth = requireAuth(true);
  if (!auth) return;

  const carNum = parseInt(carNumber.value);
  if (!carNum) {
    alert("車番を入力してください");
    return;
  }

  const reasonVal = reason.value.trim();
  if (!reasonVal) {
    alert("リタイア理由を入力してください");
    return;
  }

  // 既にリタイア登録されている車両は送らない（サーバーも409で弾く）。
  // 以前は条件なしで上書きしていたため、先に入れた理由が黙って消えていた
  if (retiredCarNums.has(carNum)) {
    alert(
      `車番 ${carNum} は既にリタイア登録されています。
` +
        `理由の変更や取り消しは「更新モード」で行ってください。`,
    );
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;

  try {
    const data = await apiFetch(`${API}/entries/retire`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Race-Id": auth.raceToken,
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ carNum, reason: reasonVal }),
    }); // common.js
    if (!data) return;

    showToast("送信完了");
    carNumber.value = "";
    reason.value = "";
    await loadRetired(); // 今登録した車両を一覧に反映する
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
  }
});

// ── リタイア済みの車両の一覧（GET /entries/retire）──
// APIは全エントリーを作業エリア順で返すので、isRetired の行だけを出す。
// 並び替えはサーバー側（作業エリア昇順 → 車番昇順）のままにする。
function renderRetired(rows) {
  retiredCount.textContent = rows.length;
  retiredEmpty.textContent = RETIRED_EMPTY_MESSAGE;
  retiredEmpty.hidden = rows.length > 0;
  retiredWrap.hidden = rows.length === 0;

  retiredBody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const text of [row.carNum, row.maintenanceArea, row.reason || "-"]) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    retiredBody.appendChild(tr);
  }
}

async function loadRetired() {
  const auth = requireAuth(true); // token + raceToken が必須
  if (!auth) return;

  try {
    const res = await fetch(`${API}/entries/retire`, {
      method: "GET",
      headers: {
        "X-Race-Id":   auth.raceToken,
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const data = await res.json();
    if (handleApiError(res, data)) return;

    const retired = (data.entries || []).filter((entry) => entry.isRetired);
    retiredCarNums = new Set(retired.map((entry) => Number(entry.carNum)));
    renderRetired(retired);
  } catch (err) {
    console.error(err);
    // 一覧は登録の補助なので、取れなくても画面は使えるようにする（登録は別のAPI）
    retiredEmpty.textContent = "リタイア済みの一覧を取得できませんでした。";
    retiredEmpty.hidden = false;
    retiredWrap.hidden = true;
  }
}

loadRetired();
