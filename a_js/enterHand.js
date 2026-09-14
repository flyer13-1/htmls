//車両の処理
const carNumSection = document.getElementById("carNum");

async function getCarNumber(cnt = 3) {
  const auth = requireAuth(true); // token + raceId 必須
  if (!auth) return null;
  try {
    // サーバから車両番号リストを取得（race_id 内の担当車両）
    const response = await fetch(
      `${API}/entries/init?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    );
    const data = await response.json();

    if (response.ok) {
      if (data.msg === "") {
        return data.carNum || [];
      } else {
        alert(data.msg);
        return null;
      }
    } else if (response.status === 400) {
      alert(data.msg || "error: 400 Bad Request");
    } else if (response.status === 500) {
      alert(data.msg || "error: 500 Internal Server Error");
    }
    return null;
  } catch (err) {
    if (cnt > 0) {
      console.error("データ取得失敗", err);
      return await getCarNumber(cnt - 1);
    } else {
      alert("データ取得失敗しました。管理者に一度報告してください。");
      return null;
    }
  }
}

let carNumbers = await getCarNumber();
if (!carNumbers) return; // 認証切れ/取得失敗時（requireAuth が遷移済み）

carNumbers.forEach((num) => {
  //ラベルを作成
  const label = document.createElement("label");
  label.textContent = num;
  label.setAttribute("for", `car` + num);
  // inputを作成
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "carBtn";
  input.id = "car" + num;
  input.value = num;

  // ボタンをセクションに追加
  carNumSection.appendChild(input);
  carNumSection.appendChild(label);

  console.log("車両オブジェクト初期化完了:");
});

const car = document.getElementById("carNum");
car.addEventListener("click", () => {});

// ── 時刻 "HH:MM" / "HH:MM:SS" → ISO 8601 変換（今日の日付＋端末タイムゾーン） ──
function timeToIso(timeVal) {
  if (!timeVal) return null;
  const now  = new Date();
  const pad  = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tzMin = -now.getTimezoneOffset();
  const sign  = tzMin >= 0 ? "+" : "-";
  const tz    = `${sign}${pad(Math.floor(Math.abs(tzMin) / 60))}:${pad(Math.abs(tzMin) % 60)}`;
  const ss    = timeVal.length === 5 ? `${timeVal}:00` : timeVal;
  return `${date}T${ss}${tz}`;
}

// ── 送信処理 ──
const handForm = document.querySelector("form[name='handEnter']");
let goToMain   = false;
let isSubmitting = false;

// どちらのボタンが押されたか記録（submit イベントより先に click が来る）
handForm.addEventListener("click", (e) => {
  const btn = e.target.closest("button[type='submit']");
  if (btn) goToMain = !!btn.getAttribute("formaction");
});

handForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const auth = requireAuth(true);
  if (!auth) return;

  const carRadio = document.querySelector("#carNum input[type='radio']:checked");
  if (!carRadio) {
    alert("車番を選択してください");
    return;
  }
  const carNum = carRadio.value;

  const inTimeVal  = document.getElementById("inTime").value;
  const outTimeVal = document.getElementById("outTime").value;
  if (!inTimeVal && !outTimeVal) {
    alert("ピットインまたはピットアウト時刻を入力してください");
    return;
  }

  const inTime    = timeToIso(inTimeVal);
  const outTime   = timeToIso(outTimeVal);
  const outDriver = document.querySelector("#Driver input:checked")?.value || null;
  const tire      = document.getElementById("tires").checked;
  const oil       = document.getElementById("oils").checked;
  const note      = document.getElementById("note").value.trim();

  isSubmitting = true;
  const btns = handForm.querySelectorAll("button[type='submit']");
  btns.forEach((b) => (b.disabled = true));

  try {
    const res = await fetch(
      `${API}/entries/hand?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          [carNum]: { inTime, outTime, garageInTime: null, outDriver, tire, oil, note },
        }),
      },
    );
    const data = await res.json();
    if (handleApiError(res, data)) return;

    if (goToMain) {
      window.location.href = "./main.html";
    } else {
      document.getElementById("inTime").value  = "";
      document.getElementById("outTime").value = "";
      document.querySelectorAll("#Driver input").forEach((r) => (r.checked = false));
      document.getElementById("tires").checked = false;
      document.getElementById("oils").checked  = false;
      document.getElementById("note").value    = "";
      alert("送信しました");
    }
  } finally {
    isSubmitting = false;
    btns.forEach((b) => (b.disabled = false));
  }
});
