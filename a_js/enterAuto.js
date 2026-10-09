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
  const auth = requireAuth(true); // token + raceToken 必須（無ければ index.html へ）
  if (!auth) return null;

  try {
    const response = await fetch(
      `${API}/entries/init`,
      {
        method: "GET",
        headers: {
          "X-Race-Id": auth.raceToken,
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );
    const data = await response.json();

    // 状態ごとの分岐は common.js の handleApiError に任せる（2026-10-09変更）。
    // 以前はここで 400 / 401 / 500 だけを見ていたため、403（終了したレース・
    // トークン不正）のときに何も表示されず null を返していた。
    // 例外（通信断）は下の catch が受けて再試行する。
    if (handleApiError(response, data)) return null;
    return { carNumbers: data.carNum, driverData: data.driver };
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

// 選択した車のドライバー名ラベルと選択状態を復元する。
// 登録のあるドライバーだけ表示し、未登録分はボタンごと隠す（押せても情報が無いため）。
function driverReset(num) {
  // ラベルの埋め方は common.js と共通（enterHand と同じ）。
  // 以前はここで配列の並び順どおりに割り当てていたが、driver は登録のある枠だけが
  // 詰まった配列なので、B が未登録の車では「B のラベルに C の氏名」が出て、
  // 違う枠で送信されてしまっていた（2026-10-09修正）。
  renderDriverOptions(driverData[num]); // common.js

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
  const now = new Date();
  const date = now.toLocaleDateString("ja-JP");
  const time = now.toLocaleTimeString("ja-JP");

  const success = Object.entries(valid).map(([car, p]) => ({
    car,
    inTime: p.inTime,
    outTime: p.outTime,
  }));

  log.unshift({ date, time, success });
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
  renderLog();
}

// 前日以前のログを localStorage から削除する。
function cleanupOldLogs() {
  const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  if (log.length === 0) return;
  const today = new Date().toLocaleDateString("ja-JP");
  // 最新エントリが今日でなければ（date フィールド無しの古いログも含む）全削除
  if (!log[0].date || log[0].date !== today) {
    localStorage.removeItem(LOG_KEY);
  }
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
// 出時刻が入時刻より前の車番を返す（サーバーと同じ規則。autoCreate.mjs）。
// 送る前にここで弾く。サーバーに400で弾かれてから端末に残すと、その行が
// 以降の送信に毎回混ざって全部失敗するため（2026-10-09追加）。
function carsWithBadTimeOrder(rows) {
  return Object.entries(rows || {})
    .filter(
      ([, d]) =>
        d && d.inTime && d.outTime && new Date(d.outTime) < new Date(d.inTime),
    )
    .map(([car]) => car);
}

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

// 送信（POST /entries/auto）。
// 戻り値: { ok: true, data } / { ok: false, retryable: boolean }
//
// **retryable が肝心**（2026-10-09追加）。
//   true : 届かなかった（通信断・401・403・500）。端末に残して、後でもう一度送る
//   false: 届いたが内容を拒否された（400）。**端末に残してはいけない。**
//          残すと次回以降も同じデータを一緒に送り続け、毎回400で弾かれて、
//          直した内容すら一生送れなくなる（実際に起きた）
async function sendData(current, unsent) {
  const auth = requireAuth(true);
  if (!auth) return { ok: false, retryable: true };

  try {
    const response = await fetch(
      `${API}/entries/auto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Race-Id": auth.raceToken,
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ current, unsent }),
      },
    );
    const data = await response.json();
    if (handleApiError(response, data)) {
      // common.js が文言を出す。400 は内容の問題なので残さない
      return { ok: false, retryable: response.status !== 400 };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("送信エラー:", err);
    return { ok: false, retryable: true }; // 届いていないので残す
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
cleanupOldLogs(); // 前日以前のログを削除してから描画
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

  // 送信中フラグ：連打でリセット前に同じデータを二重送信するのを防ぐ
  let isSubmitting = false;
  const submitBtn = document.getElementById("submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // 送信処理中はクリックを無視
    isSubmitting = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const { valid } = collectCarData();
      const unsent = JSON.parse(localStorage.getItem("unsentData") || "{}");

      // 送れる車（valid）も前回未送信（unsent）も無い
      if (
        Object.keys(valid).length === 0 &&
        Object.keys(unsent).length === 0
      ) {
        alert("送信するデータがありません");
        return;
      }

      // ── 送る前に時刻の前後を確認する ──
      // 入力中のぶん。直せばよいので、端末には残さずその場で止める
      const badNow = carsWithBadTimeOrder(valid);
      if (badNow.length > 0) {
        alert(
          `車番 ${badNow.join(" / ")}: 出時刻は入時刻以降にしてください。\n` +
            `時刻を直してから、もう一度送信してください。`,
        );
        return;
      }

      // 未送信データのぶん。このままでは何を送っても失敗し続けるので、
      // 破棄するかを尋ねる（逃げ道が無いと詰まる）
      const badUnsent = carsWithBadTimeOrder(unsent);
      if (badUnsent.length > 0) {
        const discard = confirm(
          `未送信データに、出時刻が入時刻より前の行があります（車番 ${badUnsent.join(" / ")}）。\n` +
            `このままでは送信できません。\n\n` +
            `OK: この行を破棄して送信する\n` +
            `キャンセル: 送信しない`,
        );
        if (!discard) return;
        for (const car of badUnsent) delete unsent[car];
        localStorage.setItem("unsentData", JSON.stringify(unsent));
        if (Object.keys(valid).length === 0 && Object.keys(unsent).length === 0) {
          alert("未送信データを破棄しました。送信するデータがありません");
          return;
        }
      }

      const result = await sendData(valid, unsent);

      if (result.ok) {
        // 送信できた車だけクリア
        for (const car in valid) carData[car] = emptyCar();
        localStorage.removeItem("unsentData");
        cashTime = {};
        clearFormDisplay();
        appendLog(valid); // 成功をログ＆localStorage保持
        alert("送信成功");
      } else if (result.retryable) {
        // 届かなかった：未送信データとして端末に残す（既存 unsent にマージ）
        const merged = { ...unsent, ...valid };
        localStorage.setItem("unsentData", JSON.stringify(merged));
        alert(
          "送信に失敗しました。入力内容は端末に保存したので、\n" +
            "通信の状態を確認して、もう一度送信してください。",
        );
      } else {
        // 内容を拒否された（400）：残すと次回以降も必ず失敗するので保存しない。
        // 入力は画面に残っているので、直してから送り直せる
        alert(
          "入力内容に誤りがあるため送信できませんでした。\n" +
            "上のメッセージのとおり直してから、もう一度送信してください。",
        );
      }
    } finally {
      isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
