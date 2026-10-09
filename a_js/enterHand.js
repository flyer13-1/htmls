//車両の処理
const carNumSection = document.getElementById("carNum");

// 車番 → ドライバーの表示用リスト（"A<br>氏名"）。車を選んだときに #Driver を埋める
let driverData = {};

async function getCarNumber(cnt = 3) {
  const auth = requireAuth(true); // token + raceToken 必須
  if (!auth) return null;
  try {
    // サーバから車両番号リストを取得（担当エリアの車両）
    const response = await fetch(
      `${API}/entries/init`,
      {
        method: "GET",
        headers: { "X-Race-Id": auth.raceToken, Authorization: `Bearer ${auth.token}` },
      },
    );
    const data = await response.json();

    // 状態ごとの分岐は common.js の handleApiError に任せる（2026-10-09変更）。
    // 以前はここで 400 / 500 だけを見ていたため、401 と 403（終了したレース・
    // トークン不正）のときに何も表示されず null を返していた。
    // 例外（通信断）は下の catch が受けて再試行する。
    if (handleApiError(response, data)) return null;
    driverData = data.driver || {};
    return data.carNum || [];
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

// 選んだ車のドライバーだけを出す（enterAuto と同じ。登録の無い枠は隠す）
function driverReset(num) {
  document.querySelectorAll("#Driver input").forEach((r) => (r.checked = false));
  renderDriverOptions(driverData[num]); // common.js
}

async function initCarNumbers() {
  const carNumbers = await getCarNumber();
  if (!carNumbers) return; // 認証切れ/取得失敗時（requireAuth が遷移済み）

  // 車を選ぶまではドライバー欄を出さない（HTMLの「ドライバー名」のままにしない）
  renderDriverOptions([]); // common.js

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

  // 車を選んだら、その車のドライバー名に入れ替える
  input.addEventListener("change", () => driverReset(num));

  // ボタンをセクションに追加
  carNumSection.appendChild(input);
  carNumSection.appendChild(label);
  });
}

initCarNumbers();

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
    const data = await apiFetch(
      `${API}/entries/hand`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Race-Id": auth.raceToken,
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          [carNum]: { inTime, outTime, outDriver, tire, oil, note },
        }),
      },
    ); // common.js
    if (!data) return;

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
