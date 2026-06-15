// DOM宣言
const carNumSection = document.getElementById("carNum"); // 車両欄
const carData = {}; // 車両データ

const inTimeBtn = document.getElementById("inTime"); // イン
const outTimeBtn = document.getElementById("outTime"); // アウト
const noneTimeBtn = document.getElementById("noneTime"); // なし
const offsetTime = document.getElementById("offset"); // 補正値

const shInTime = document.getElementById("inTimeMsg"); // イン表示
const shOutTime = document.getElementById("outTimeMsg"); // アウト表示
const shNoneTime = document.getElementById("noneTimeMsg"); // なし表示

const driver = document.getElementById("Driver"); // ドライバー
const tires = document.getElementById("tires"); // タイヤ
const oils = document.getElementById("oils"); // オイル
const note = document.getElementById("note"); // メモ

const form = document.getElementById("myForm"); // フォーム

let cashTime = {}; // 時間キャッシュ

// 関数
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

function timeReset(num) {
  const time = document.querySelectorAll("#Time button[type ='button']");
  time.forEach((e) => {
    e.style.backgroundColor = "";
    e.style.color = "";
  });

  const shTime = document.querySelectorAll("#Time input");
  shTime.forEach((e) => {
    e.value = "";
  });

  if (carData[num].noneTime) {
    if (carData[num].inTime === "none") {
      color(noneTimeBtn);
      shNoneTime.value = carData[num].inTime;
    } else if (carData[num].outTime === "none") {
      color(noneTimeBtn);
      shOutTime.value = carData[num].outTime;
    }
  }

  if (carData[num].inTime && carData[num].inTime !== "none") {
    color(inTimeBtn);
    shInTime.value = carData[num].inTime;
  }
  if (carData[num].outTime && carData[num].outTime !== "none") {
    color(outTimeBtn);
    shOutTime.value = carData[num].outTime;
  }
}

function driverReset(num) {
  const drivers = driverData[num];
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
  toast.textContent = message;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, duration);
}

function findCarData() {
  const sendCarData = {};
  for (const carContainer in carData) {
    const resultCar = carData[carContainer];
    if (
      resultCar.driver ||
      resultCar.inTime ||
      resultCar.outTime ||
      resultCar.tire ||
      resultCar.oil ||
      resultCar.note
    ) {
      sendCarData[carContainer] = resultCar;
    }
  }
  return sendCarData;
}

async function sendData(current, unsent, cnt = 3) {
  for (let i = 0; i < cnt; i++) {
    try {
      const token = sessionStorage.getItem("token");
      const raceId = sessionStorage.getItem("raceId");

      const response = await fetch(
        `${API}/entries/auto?race_id=${encodeURIComponent(raceId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ current, unsent }),
        },
      ).then((response) => {
        if (response.ok) {
          if (data.msg === "") {
          } else {
            throw new Error("送信失敗");
            alert(data.msg);
          }
        } else if (response.status === 400) {
          alert(data.msg || "error: 400 Bad Request");
        } else if (response.status === 500) {
          alert(data.msg || "error: 500 Internal Server Error");
        }
      });

      const result = await response.json();

      console.log("送信成功");
      showToast("送信成功");
      return result;
    } catch (err) {
      if (cnt > 0) {
        console.error("送信エラー:", err);
        return await sendData(current, unsent, cnt - 1);
      } else {
        return null;
      }
    }
  }
}

function getCorrectedTime() {
  const offsetSec = parseFloat(offsetTime.value) || 0;
  const time = new Date(Date.now() + offsetSec * 1000);

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// 実行コード
(async () => {
  const { carNumbers, driverData } = await getInitData();
  if (!carNumbers || !driverData) return;

  carNumbers.forEach((num) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = num;
  btn.classList.add("carBtn");

  carData[num] = {
    inTime: null,
    outTime: null,
    noneTime: null,
    driver: null,
    tire: null,
    oil: null,
    note: "",
    state: { inClicked: false, outClicked: false, noneClicked: false },
  };

  btn.addEventListener("click", () => {
    document.querySelectorAll(".carBtn").forEach((btn) => {
      btn.classList.remove("selected");
    });
    btn.classList.add("selected");

    timeReset(num);
    driverReset(num);

    document.getElementById("tires").checked = !!carData[num].tire;
    document.getElementById("oils").checked = !!carData[num].oil;
    note.value = carData[num].note || "";
  });

  carNumSection.appendChild(btn);
  console.log("ボタン制作完了");
});

console.log("車両オブジェクト初期化完了:", carData);

inTimeBtn.addEventListener("click", () => {
  const car = document.querySelector(".carBtn.selected").textContent;
  const state = carData[car].state;
  const pressedCount = Object.values(carData[car].state).filter(
    (v) => v,
  ).length;

  if (state.inClicked) {
    state.inClicked = false;
    inTimeBtn.style.backgroundColor = "";
    inTimeBtn.style.color = "";
    cashTime[car] = carData[car].inTime;
    shInTime.value = "";
    return;
  }

  if (pressedCount >= 2) {
    return;
  }

  if (cashTime[car]) {
    console.log("インに変更");
    carData[car].inTime = cashTime[car];
    shInTime.value = cashTime[car];

    state.inClicked = true;
    color(inTimeBtn);
    console.log("キャッシュから復元:", cashTime[car]);
    return;
  }

  const now = getCorrectedTime();
  shInTime.value = now;
  carData[car].inTime = now;
  carData[car].state.inClicked = true;

  color(inTimeBtn);
  console.log("押した時刻：", now);
});

outTimeBtn.addEventListener("click", () => {
  const car = document.querySelector(".carBtn.selected").textContent;
  const state = carData[car].state;
  const pressedCount = Object.values(carData[car].state).filter(
    (v) => v,
  ).length;

  if (state.outClicked) {
    state.outClicked = false;
    outTimeBtn.style.backgroundColor = "";
    outTimeBtn.style.color = "";
    cashTime[car] = carData[car].outTime;
    shOutTime.value = "";
    return;
  }

  if (pressedCount >= 2) {
    return;
  }

  if (cashTime[car]) {
    console.log("アウトに変更");
    carData[car].outTime = cashTime[car];
    shOutTime.value = cashTime[car];

    state.outClicked = true;
    color(outTimeBtn);
    console.log("キャッシュから復元:", cashTime[car]);
    return;
  }

  const now = getCorrectedTime();
  shOutTime.value = now;
  carData[car].outTime = now;
  carData[car].state.outClicked = true;

  color(outTimeBtn);
  console.log("押した時間；", now);
});

noneTimeBtn.addEventListener("click", () => {
  const car = document.querySelector(".carBtn.selected").textContent;
  const state = carData[car].state;
  const pressedCount = Object.values(carData[car].state).filter(
    (v) => v,
  ).length;

  if (state.noneClicked) {
    console.log("state.noneClicked");
    state.noneClicked = false;
    noneTimeBtn.style.backgroundColor = "";
    noneTimeBtn.style.color = "";

    cashTime[car] = carData[car].noneTime;
    shNoneTime.value = "";
    return;
  }

  if (pressedCount >= 2) {
    return;
  }

  if (cashTime[car]) {
    console.log("noneに変更");
    carData[car].noneTime = cashTime[car];
    shNoneTime.value = cashTime[car];

    state.noneClicked = true;
    color(noneTimeBtn);
    console.log("キャッシュから復元:", cashTime[car]);
    return;
  }

  const now = getCorrectedTime();
  carData[car].noneTime = now;
  shNoneTime.value = now;
  carData[car].state.noneClicked = true;

  color(noneTimeBtn);
  console.log("押した時刻：", now);
});

driver.addEventListener("change", (e) => {
  const car = document.querySelector(".carBtn.selected").textContent;
  carData[car].driver = e.target.value;
});

tires.addEventListener("change", (e) => {
  const car = document.querySelector(".carBtn.selected").textContent;
  if (carData[car].oil) {
    carData[car].oil = null;
  } else {
    carData[car].tire = e.target.value;
  }
});

oils.addEventListener("change", (e) => {
  const car = document.querySelector(".carBtn.selected").textContent;
  if (carData[car].oil) {
    carData[car].oil = null;
  } else {
    carData[car].oil = e.target.value;
  }
});

note.addEventListener("change", (e) => {
  const car = document.querySelector(".carBtn.selected").textContent;
  carData[car].note = e.target.value;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  document.querySelectorAll(".dynamic-hidden").forEach((el) => el.remove());

  const sendCarData = findCarData();

  const unsent = JSON.parse(localStorage.getItem("unsentData") || "{}");
  console.log("データの格納完了");

  if (await sendData(sendCarData, unsent)) {
    localStorage.removeItem("unsentData");
    cashTime = {};
  } else {
    alert("[重要]送信に失敗,データを保存。一度開発者に連絡を");
    localStorage.setItem("unsentData", payload);
  }
});
})();
