// DOM宣言
const carNumSection = document.getElementById("carNum"); // 車両欄
const carData = {}; // 車両データ
let driverData = {}; // ドライバーデータ（getInitDataで設定／driverResetで参照）

const inTimeBtn = document.getElementById("inTime"); // イン
const outTimeBtn = document.getElementById("outTime"); // アウト
const garageInBtn = document.getElementById("garageInTime"); // ガレージイン
const offsetTime = document.getElementById("offset"); // 補正値

const shInTime = document.getElementById("inTimeMsg"); // イン表示
const shOutTime = document.getElementById("outTimeMsg"); // アウト表示
const shGarageIn = document.getElementById("garageInTimeMsg"); // ガレージイン表示

const driver = document.getElementById("Driver"); // ドライバー
const tires = document.getElementById("tires"); // タイヤ
const oils = document.getElementById("oils"); // オイル
const note = document.getElementById("note"); // メモ

const form = document.getElementById("myForm"); // フォーム

let cashTime = {}; // 時間キャッシュ（ボタン付け替え用）

// 選択中の車番を返す（未選択なら通知して null）
function getSelectedCar() {
  const el = document.querySelector(".carBtn.selected");
  if (!el) {
    showToast("先に車番を選択してください");
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

function color(name) {
  name.style.backgroundColor = "#0066CC";
  name.style.color = "#fff";
}

// 選択した車の時刻表示・ボタン色を carData から復元する
function timeReset(num) {
  document.querySelectorAll("#Time button[type='button']").forEach((e) => {
    e.style.backgroundColor = "";
    e.style.color = "";
  });
  document.querySelectorAll("#Time input").forEach((e) => (e.value = ""));

  const d = carData[num];
  if (d.inTime) {
    color(inTimeBtn);
    shInTime.value = d.inTime;
  }
  if (d.outTime) {
    color(outTimeBtn);
    shOutTime.value = d.outTime;
  }
  if (d.garageInTime) {
    color(garageInBtn);
    shGarageIn.value = d.garageInTime;
  }
}

// 選択した車のドライバー名ラベルと選択状態を復元する
function driverReset(num) {
  const drivers = driverData[num] || [];
  const labels = document.querySelectorAll(
    '#Driver label:not([for="driverNone"])',
  );

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

function showToast(message, duration = 2000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, duration);
}

// 送信ログ欄(#logContent)に1件追記する
function appendLog(sentData) {
  const logContent = document.getElementById("logContent");
  if (!logContent) return;
  // 初回はプレースホルダ文言を消す
  if (logContent.dataset.init !== "1") {
    logContent.textContent = "";
    logContent.dataset.init = "1";
  }
  const time = new Date().toLocaleTimeString("ja-JP");
  const cars = Object.keys(sentData).join(", ") || "(なし)";
  const line = document.createElement("div");
  line.textContent = `[${time}] 送信: 車番 ${cars}`;
  logContent.prepend(line);
}

// carData をバックエンド(autoCreate)が期待する形へ変換する。
// 何か入力のある車だけを { 車番: { inTime, outTime, garageInTime, outDriver, tire, oil, note } } で返す。
function findCarData() {
  const sendCarData = {};
  for (const car in carData) {
    const d = carData[car];
    const hasDriver = d.driver && d.driver !== "none";
    const hasData =
      d.inTime || d.outTime || d.garageInTime || hasDriver || d.tire || d.oil || d.note;
    if (!hasData) continue;

    sendCarData[car] = {
      inTime: d.inTime || null,
      outTime: d.outTime || null,
      garageInTime: d.garageInTime || null,
      outDriver: hasDriver ? d.driver : null,
      tire: !!d.tire,
      oil: !!d.oil,
      note: d.note || "",
    };
  }
  return sendCarData;
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
  document.querySelectorAll("#Time button[type='button']").forEach((e) => {
    e.style.backgroundColor = "";
    e.style.color = "";
  });
  document.querySelectorAll("#Time input").forEach((e) => (e.value = ""));
  document
    .querySelectorAll("#Driver input, #task input")
    .forEach((r) => (r.checked = false));
  note.value = "";
}

// 補正値（秒）を反映した現在時刻を HH:MM:SS で返す
function getCorrectedTime() {
  const offsetSec = parseFloat(offsetTime.value) || 0;
  const time = new Date(Date.now() + offsetSec * 1000);

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// 空の車両データを生成
function emptyCar() {
  return {
    inTime: null,
    outTime: null,
    garageInTime: null,
    driver: null,
    tire: null,
    oil: null,
    note: "",
    state: { inClicked: false, outClicked: false, garageClicked: false },
  };
}

// 実行コード
(async () => {
  const init = await getInitData();
  if (!init) return;
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

  // イン/アウト/ガレージイン 共通の時刻ボタンハンドラを生成する。
  //   btn: ボタン要素 / shInput: 表示input / field: carDataのキー / stateKey: stateのキー
  function makeTimeHandler(btn, shInput, field, stateKey) {
    return () => {
      const car = getSelectedCar();
      if (!car) return;
      const d = carData[car];
      const state = d.state;

      // すでに押されている → 解除（時刻はキャッシュして付け替えに使えるようにする）
      if (state[stateKey]) {
        state[stateKey] = false;
        btn.style.backgroundColor = "";
        btn.style.color = "";
        cashTime[car] = d[field];
        d[field] = null;
        shInput.value = "";
        return;
      }

      // 時刻は最大2つ（イン/アウト/ガレージのうち2つ）
      const pressedCount = Object.values(state).filter(Boolean).length;
      if (pressedCount >= 2) {
        showToast("時刻は2つまでです");
        return;
      }

      // キャッシュがあれば付け替え、無ければ現在時刻
      if (cashTime[car]) {
        d[field] = cashTime[car];
        shInput.value = cashTime[car];
        cashTime[car] = null;
      } else {
        const now = getCorrectedTime();
        d[field] = now;
        shInput.value = now;
      }
      state[stateKey] = true;
      color(btn);
    };
  }

  inTimeBtn.addEventListener(
    "click",
    makeTimeHandler(inTimeBtn, shInTime, "inTime", "inClicked"),
  );
  outTimeBtn.addEventListener(
    "click",
    makeTimeHandler(outTimeBtn, shOutTime, "outTime", "outClicked"),
  );
  garageInBtn.addEventListener(
    "click",
    makeTimeHandler(garageInBtn, shGarageIn, "garageInTime", "garageClicked"),
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

    const sendCarData = findCarData();
    const unsent = JSON.parse(localStorage.getItem("unsentData") || "{}");

    if (
      Object.keys(sendCarData).length === 0 &&
      Object.keys(unsent).length === 0
    ) {
      showToast("送信するデータがありません");
      return;
    }

    const result = await sendData(sendCarData, unsent);

    if (result) {
      // 送信済みの車はデータをクリア（再送信防止）
      for (const car in sendCarData) carData[car] = emptyCar();
      localStorage.removeItem("unsentData");
      cashTime = {};
      clearFormDisplay();
      appendLog(sendCarData);
      showToast("送信成功");
    } else {
      // 失敗：未送信データを保存（既存 unsent にマージ）
      const merged = { ...unsent, ...sendCarData };
      localStorage.setItem("unsentData", JSON.stringify(merged));
      alert(
        "[重要]送信に失敗しました。データを保存しました。一度開発者に連絡してください。",
      );
    }
  });
})();
