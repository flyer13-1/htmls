// DOM宣言
const carNumSection = document.getElementById("carNum"); // 車両欄
const carData = {}; // 車両データ
let driverData = {}; // ドライバーデータ（getInitDataで設定／driverResetで参照）

const inTimeBtn = document.getElementById("inTime"); // イン
const outTimeBtn = document.getElementById("outTime"); // アウト
const offsetTime = document.getElementById("offset"); // 補正値

const shInTime = document.getElementById("inTimeMsg"); // イン表示／手入力
const shOutTime = document.getElementById("outTimeMsg"); // アウト表示／手入力

const driver = document.getElementById("Driver"); // ドライバー
const tires = document.getElementById("tires"); // タイヤ
const oils = document.getElementById("oils"); // オイル
const note = document.getElementById("note"); // メモ

const form = document.getElementById("myForm"); // フォーム

// 解除→再押下で同じ時刻を戻すためのキャッシュ（field単位）
let cashTime = {};

// 選択中の車番を返す（未選択なら通知して null）
function getSelectedCar() {
  const el = document.querySelector(".carBtn.selected");
  if (!el) {
    alert("先に車番を選択してください");
    return null;
  }
  return el.textContent;
}

// 初期データ取得（担当エリアの車両・ドライバー）
async function getInitData(cnt = 3) {
  const auth = requireAuth(true); // token + raceId 必須（無ければ index.html へ）
  if (!auth) return null;

  try {
    const response = await fetch(
      `${API}/entries/init?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );
    const data = await response.json();

    if (response.ok) {
      if (data.msg === "") {
        return { carNumbers: data.carNum, driverData: data.driver };
      } else {
        alert(data.msg);
        return null;
      }
    } else if (response.status === 400) {
      alert(data.msg || "error: 400 Bad Request");
    } else if (response.status === 401) {
      alert(data.msg || "セッションが切れました。再度ログインしてください。");
      window.location.href = "./index.html";
    } else if (response.status === 500) {
      alert(data.msg || "error: 500 Internal Server Error");
    }
    return null;
  } catch (err) {
    if (cnt > 0) {
      console.error("データ取得失敗", err);
      return await getInitData(cnt - 1);
    } else {
      alert("初期データの取得に失敗しました。管理者に一度報告してください。");
      return null;
    }
  }
}

// 選択した車のボタン色・時刻表示を carData から復元する。
// 時刻が入っている＝そのボタンが押された、で一意（別フラグは持たない）。
function timeReset(num) {
  const d = carData[num];
  inTimeBtn.classList.toggle("active", !!d.inTime);
  outTimeBtn.classList.toggle("active", !!d.outTime);
  shInTime.value = formatTimeDisplay(d.inTime);
  shOutTime.value = formatTimeDisplay(d.outTime);
}

// 選択した車のドライバー名ラベルと選択状態を復元する
function driverReset(num) {
  const drivers = driverData[num] || [];
  const labels = document.querySelectorAll("#Driver label");

  labels.forEach((e, index) => {
    if (drivers[index]) {
      e.innerHTML = drivers[index];
    }
  });

  if (carData[num].driver) {
    const driverRadio = document.querySelector(
      `#Driver input[value="${carData[num].driver}"]`,
    );
    if (driverRadio) driverRadio.checked = true;
  } else {
    document
      .querySelectorAll("#Driver input")
      .forEach((r) => (r.checked = false));
  }
}

// 送信ログの localStorage キー。
// 未送信データ(unsentData)と同様に端末へ保持し、セッション切れ・リロードでも残す。
const LOG_KEY = "sendLog";

// 送信結果（成功した車）をログに1件追記し、localStorage に保持してから再描画する。
function appendLog(valid) {
  const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  const time = new Date().toLocaleTimeString("ja-JP");

  const success = Object.entries(valid).map(([car, p]) => ({
    car,
    inTime: p.inTime,
    outTime: p.outTime,
  }));

  log.unshift({ time, success });
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
  renderLog();
}

// localStorage のログを #logContent に描画する（リロード・再ログイン後も復元）。
function renderLog() {
  const logContent = document.getElementById("logContent");
  if (!logContent) return;

  const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  if (log.length === 0) {
    logContent.textContent = "ここに送信した内容を表示します。";
    return;
  }

  logContent.innerHTML = "";
  log.forEach((entry) => {
    entry.success.forEach((s) => {
      const times = [s.inTime, s.outTime]
        .filter(Boolean)
        .map(formatTimeDisplay)
        .join(" / ");
      const line = document.createElement("div");
      line.textContent = `✅ [${entry.time}] 送信 車番 ${s.car}：${times}`;
      logContent.appendChild(line);
    });
  });
}

// carData を送信対象に仕分ける。バリデーション（2個必須）は廃止。
// inTime / outTime のどちらかがあれば送る。押された時刻だけが入る。
//   valid: { 車番: { inTime, outTime, outDriver, tire, oil, note } }
function collectCarData() {
  const valid = {};
  for (const car in carData) {
    const d = carData[car];
    if (!d.inTime && !d.outTime) continue; // ピット時刻が無い車は対象外

    valid[car] = {
      inTime: d.inTime || null,
      outTime: d.outTime || null,
      outDriver: d.driver || null,
      tire: !!d.tire,
      oil: !!d.oil,
      note: d.note || "",
    };
  }
  return { valid };
}

// 送信（POST /entries/auto）。成功時はレスポンス、失敗時は null を返す。
async function sendData(current, unsent) {
  const auth = requireAuth(true);
  if (!auth) return null;

  try {
    const response = await fetch(
      `${API}/entries/auto?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ current, unsent }),
      },
    );
    const data = await response.json();
    if (handleApiError(response, data)) return null; // common.js（エラー時 alert）
    return data;
  } catch (err) {
    console.error("送信エラー:", err);
    return null;
  }
}

// 入力フォームの表示を初期状態に戻す
function clearFormDisplay() {
  document
    .querySelectorAll(".carBtn")
    .forEach((b) => b.classList.remove("selected"));
  inTimeBtn.classList.remove("active");
  outTimeBtn.classList.remove("active");
  shInTime.value = "";
  shOutTime.value = "";
  document
    .querySelectorAll("#Driver input, #task input")
    .forEach((r) => (r.checked = false));
  note.value = "";
}

// 補正値（秒）を反映した現在時刻を ISO 8601（端末のタイムゾーンオフセット付き）で返す。
// 例: "2026-05-06T10:00:00+09:00"（IF: enterAuto2.md）。サーバ送信用の値。
function getCorrectedTime() {
  const offsetSec = parseFloat(offsetTime.value) || 0;
  const t = new Date(Date.now() + offsetSec * 1000);
  const p = (n) => String(n).padStart(2, "0");

  // 端末のローカル時刻の各要素 ＋ 端末のタイムゾーンオフセット（日本運用なら +09:00）
  const tzMin = -t.getTimezoneOffset(); // 例: JST = +540
  const sign = tzMin >= 0 ? "+" : "-";
  const tzAbs = Math.abs(tzMin);
  const tz = `${sign}${p(Math.floor(tzAbs / 60))}:${p(tzAbs % 60)}`;

  return (
    `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}` +
    `T${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}${tz}`
  );
}

// ISO 8601 の時刻を画面表示用に HH:MM:SS へ整形する（送信値はISOのまま保持）
function formatTimeDisplay(iso) {
  if (!iso) return "";
  const m = String(iso).match(/T(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : iso;
}

// 手入力の "HH:MM" / "HH:MM:SS" を、元ISOの日付・タイムゾーンを保ったまま
// ISO文字列へ合成する。形式不正なら null を返す。
function mergeTime(baseIso, text) {
  const m = String(text)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(m[1]).padStart(2, "0");
  const mm = m[2];
  const ss = m[3] ? m[3] : "00";
  if (+hh > 23 || +mm > 59 || +ss > 59) return null;

  // 日付・tz の土台は既存ISO（無ければ補正後の現在時刻）から流用する
  const base = baseIso || getCorrectedTime();
  const dm = String(base).match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(.*)$/);
  if (!dm) return null;
  return `${dm[1]}T${hh}:${mm}:${ss}${dm[2]}`;
}

// 空の車両データを生成
function emptyCar() {
  return {
    inTime: null,
    outTime: null,
    driver: null,
    tire: null,
    oil: null,
    note: "",
  };
}

// 実行コード
renderLog(); // 起動時に保持済みの送信ログを復元（init の成否に依存させない）

(async () => {
  const init = await getInitData();
  if (!init) {
    console.log("車両データ読み取り不可");
    return;
  }
  const { carNumbers } = init;
  driverData = init.driverData; // トップレベル変数へ代入（driverReset が参照）
  if (!carNumbers || !driverData) return;

  carNumbers.forEach((num) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = num;
    btn.classList.add("carBtn");

    carData[num] = emptyCar();

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".carBtn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      timeReset(num);
      driverReset(num);

      tires.checked = !!carData[num].tire;
      oils.checked = !!carData[num].oil;
      note.value = carData[num].note || "";
    });

    carNumSection.appendChild(btn);
  });

  // イン/アウト共通の時刻ボタンハンドラを生成する。
  //   btn: ボタン要素 / shInput: 表示input / field: carDataのキー(inTime/outTime)
  function makeTimeHandler(btn, shInput, field) {
    return () => {
      const car = getSelectedCar();
      if (!car) return;
      const d = carData[car];

      // すでに時刻がある → 2度押し = 解除（キャッシュへ退避、carDataはnull）
      if (d[field]) {
        if (!cashTime[car]) cashTime[car] = {};
        cashTime[car][field] = d[field];
        d[field] = null;
        btn.classList.remove("active");
        shInput.value = "";
        return;
      }

      // 同じボタンのキャッシュがあれば同じ時刻を復元、無ければ現在時刻
      const cached = cashTime[car] && cashTime[car][field];
      const time = cached || getCorrectedTime();
      if (cached) cashTime[car][field] = null;

      d[field] = time;
      btn.classList.add("active");
      shInput.value = formatTimeDisplay(time);
    };
  }

  inTimeBtn.addEventListener(
    "click",
    makeTimeHandler(inTimeBtn, shInTime, "inTime"),
  );
  outTimeBtn.addEventListener(
    "click",
    makeTimeHandler(outTimeBtn, shOutTime, "outTime"),
  );

  // 時刻欄の手入力を carData に書き戻す。
  //   空にすれば解除、HH:MM(:SS) を入れればその時刻をセット（ボタンも連動）。
  function makeManualEdit(shInput, field, btn) {
    return () => {
      const car = getSelectedCar();
      if (!car) return;
      const text = shInput.value.trim();

      if (text === "") {
        carData[car][field] = null;
        btn.classList.remove("active");
        return;
      }
      const merged = mergeTime(carData[car][field], text);
      if (!merged) {
        alert("時刻は HH:MM または HH:MM:SS の形式で入力してください");
        shInput.value = formatTimeDisplay(carData[car][field]); // 元に戻す
        return;
      }
      carData[car][field] = merged;
      shInput.value = formatTimeDisplay(merged);
      btn.classList.add("active");
    };
  }

  shInTime.addEventListener("change", makeManualEdit(shInTime, "inTime", inTimeBtn));
  shOutTime.addEventListener(
    "change",
    makeManualEdit(shOutTime, "outTime", outTimeBtn),
  );

  driver.addEventListener("change", (e) => {
    const car = getSelectedCar();
    if (!car) return;
    carData[car].driver = e.target.value;
  });

  tires.addEventListener("change", (e) => {
    const car = getSelectedCar();
    if (!car) return;
    carData[car].tire = e.target.checked; // 真偽値
  });

  oils.addEventListener("change", (e) => {
    const car = getSelectedCar();
    if (!car) return;
    carData[car].oil = e.target.checked; // 真偽値
  });

  note.addEventListener("change", (e) => {
    const car = getSelectedCar();
    if (!car) return;
    carData[car].note = e.target.value;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { valid } = collectCarData();
    const unsent = JSON.parse(localStorage.getItem("unsentData") || "{}");

    // 送れる車（valid）も前回未送信（unsent）も無い
    if (Object.keys(valid).length === 0 && Object.keys(unsent).length === 0) {
      alert("送信するデータがありません");
      return;
    }

    const result = await sendData(valid, unsent);

    if (result) {
      // 送信できた車だけクリア
      for (const car in valid) carData[car] = emptyCar();
      localStorage.removeItem("unsentData");
      cashTime = {};
      clearFormDisplay();
      appendLog(valid); // 成功をログ＆localStorage保持
      alert("送信成功");
    } else {
      // 失敗：未送信データを保存（既存 unsent にマージ）
      const merged = { ...unsent, ...valid };
      localStorage.setItem("unsentData", JSON.stringify(merged));
      alert(
        "[重要]送信に失敗しました。データを保存しました。一度開発者に連絡してください。",
      );
    }
  });
})();
