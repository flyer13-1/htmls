document.addEventListener("DOMContentLoaded", async () => {
  //    定数の宣言
  //車両
  const carNumSection = document.getElementById("carNum");
  const carData = {};

  //ピットの時間
  const inTimeBtn = document.getElementById("inTime");
  const outTimeBtn = document.getElementById("outTime");
  const noneTimeBtn = document.getElementById("noneTime");
  const offsetTime = document.getElementById("offset");

  //時間の表示・書き換え
  const shInTime = document.getElementById("inTimeMsg");
  const shOutTime = document.getElementById("outTimeMsg");
  const shNoneTime = document.getElementById("noneTimeMsg");

  //ドライバーなどの作業
  const driver = document.getElementById("Driver");
  const tires = document.getElementById("tires");
  const oils = document.getElementById("oils");
  const note = document.getElementById("note");

  //formの処理
  const form = document.getElementById("myForm");

  //     共通関数の宣言
  //車両のデータの取得
  async function getCarData(cnt = 3) {
    try {
      // サーバから車両番号リストを取得（例：JSONで["1","2","3",...]）
      // const response = await fetch(""); // 適宜URLを変更
      // const carNumbers = await response.json();

      const carNumbers = [5, 6, 15, 16, 0, 1, 20];
      return carNumbers;
    } catch (err) {
      if (cnt > 0) {
        console.error("データ取得失敗", err);
        return await getCarNumber(cnt - 1);
      } else {
        alert("車両情報の取得に失敗しました。管理者に一度報告してください。");
        return null;
      }
    }
  }

  //ドライバーのデータの取得
  async function getDriverData(cnt = 3) {
    try {
      // サーバから車両番号リストを取得（例：JSONで["1","2","3",...]）
      // const response = await fetch(""); // 適宜URLを変更
      // const Driver = await response.json();

      return driverData;
    } catch (err) {
      if (cnt > 0) {
        console.error("データ取得失敗", err);
        return await getCarNumber(cnt - 1);
      } else {
        alert(
          "ドライバー情報の取得失敗しました。管理者に一度報告してください。"
        );
        return null;
      }
    }
  }

  //色変更
  function color(name) {
    name.style.backgroundColor = "#0066CC";
    name.style.color = "#fff";
  }

  //時間ボタンの入力履歴を代入
  function timeSet(does) {
    does.disabled = true;
    color(does);
  }

  //時間ボタンの入力履歴を復元を実行
  function timeReset(num) {
    const time = document.querySelectorAll("#Time button[type ='button']");
    time.forEach((e) => {
      e.disabled = false; // 全て有効に戻す
      e.style.backgroundColor = ""; // 元の色に戻す（任意）
      e.style.color = "";
    });

    const shTime = document.querySelectorAll("#Time p");
    shTime.forEach((e) => {
      e.textContent = "";
    });

    if (carData[num].inTime === "none" || carData[num].outTime === "none") {
      timeSet(noneTimeBtn);
      shNoneTime.textContent = "";
    }
    if (carData[num].inTime && carData[num].inTime !== "none") {
      timeSet(inTimeBtn);
      shInTime.textContent = carData[num].inTime;
    }
    if (carData[num].outTime && carData[num].outTime !== "none") {
      timeSet(outTimeBtn);
      shOutTime.textContent = carData[num].outTime;
    }
  }

  //ドライバーの入力履歴を復元
  function driverReset(num) {
    const drivers = driverData[num];
    const labels = document.querySelectorAll(
      '#Driver label:not([for="driverNone"])'
    );

    labels.forEach((e, index) => {
      if (drivers[index]) {
        e.innerHTML = drivers[index];
      }
    });

    if (carData[num].driver) {
      const driverRadio = document.querySelector(
        `#Driver input[value="${carData[num].driver}"]`
      );
      if (driverRadio) driverRadio.checked = true; // true でチェック
    } else {
      document
        .querySelectorAll("#Driver input")
        .forEach((r) => (r.checked = false));
    }
  }

  // トースト表示用関数
  function showToast(message, duration = 2000) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, duration);
  }

  // 選択されている車両だけ挿入
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

  //データを送信
  async function sendData(payload, cnt = 3) {
    for (let i = 0; i < cnt; i++) {
      try {
        const response = await fetch("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });

        if (!response.ok) throw new Error("送信失敗");

        const result = await response.json();

        console.log("送信成功");
        showToast("送信成功");
        return result;
      } catch (err) {
        if (cnt > 0) {
          console.error("送信エラー:", err);
          return await sendData(payload, cnt - 1);
        } else {
          return null;
        }
      }
    }
  }

  //       処理を実行
  //車両データを取得
  // const carNumbers = getCarData();

  //テスト用データ
  const carNumbers = [5, 6, 15, 16, 0, 1, 20];

  const driverData = {
    5: ["A<br>せきりょうた", "B<br>かんざきあおい", "C<br>きみずかんた"],
    6: ["A<br>かんじゃに", "B<br>ぶいしっくす", "C<br>すのーまん"],
    15: ["A<br>koko", "B<br>kesha", "C<br>putbll"],
    16: ["A<br>かず", "B<br>けんた", "C<br>かんた"],
    0: ["A<br>noziri", "B<br>mirei", "C<br>JUJU"],
    1: ["A<br>1gou", "B<br>2gou", "C<br>3gou"],
    20: ["A<br>灯台", "B<br>強大", "C<br>寛大"],
  };

  carNumbers.forEach((num) => {
    // ボタンを作成
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = num;
    btn.classList.add("carBtn");

    // 作業内容を格納する箱を作成
    carData[num] = {
      inTime: null,
      outTime: null,
      driver: null,
      tire: null,
      oil: null,
      note: "",
      state: { inClicked: false, outClicked: false, noneClicked: false },
    };

    // ボタンクリックで選択／解除表示（CSSクラス付け外し）
    btn.addEventListener("click", () => {
      // 車両ボタンの選択切り替え
      document.querySelectorAll(".carBtn").forEach((btn) => {
        btn.classList.remove("selected");
      });
      btn.classList.add("selected");

      //時間選択の選択切り替え
      timeReset(num);

      // ドライバー選択時の処理
      driverReset(num);

      // 作業内容反映
      document.getElementById("tires").checked = !!carData[num].tire;
      document.getElementById("oils").checked = !!carData[num].oil;
      note.value = carData[num].note || "";
    });

    // ボタンをセクションに追加
    carNumSection.appendChild(btn);
    console.log("ボタン制作完了");
  });

  console.log("車両オブジェクト初期化完了:", carData);

  // ここから先で carData[num] に各種作業情報を上書きしていく

  //ピットの時間の処理
  function getCorrectedTime() {
    const offsetSec = parseFloat(offsetTime.value) || 0;
    return new Date(Date.now() + offsetSec * 1000);
  }

  function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  //ピットイン時間の動き
  inTimeBtn.addEventListener("click", () => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].state.inClicked) return;
    if (Object.values(carData[car].state).filter((v) => v).length >= 2) return;

    //時間を取得して情報を入力
    const now = getCorrectedTime();
  const formattedTime = formatTime(now);
  shInTime.textContent = formattedTime;
  carData[car].inTime = formattedTime;
    carData[car].state.inClicked = true;

    // ボタン色を変更
    color(inTimeBtn);

    console.log("押した時刻：", now.toLocaleString());
    inTimeBtn.disabled = true;
  });

  //ピットアウト時間の動き
  outTimeBtn.addEventListener("click", () => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].state.outClicked) return;
    if (!carData[car].state.inClicked && !carData[car].state.noneClicked)
      return;
    if (Object.values(carData[car].state).filter((v) => v).length >= 2) return;

    const now = getCorrectedTime();
  const formattedTime = formatTime(now);
  shOutTime.textContent = formattedTime;
  carData[car].outTime = formattedTime;
    carData[car].state.outClicked = true;

    // ボタン色を変更
    color(outTimeBtn);

    console.log("押した時間；", now.toLocaleString());
    outTimeBtn.disabled = true;
  });

  //ピットアウトしない時
  noneTimeBtn.addEventListener("click", () => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].state.noneClicked) return;
    if (Object.values(carData[car].state).filter((v) => v).length >= 2) return;

    const now = getCorrectedTime();

    if (!carData[car].state.inClicked) {
      const formattedTime = formatTime(now);
      shNoneTime.textContent = formattedTime;
      carData[car].inTime = "none";
      carData[car].state.noneClicked = true;
    } else if (carData[car].state.inClicked && !carData[car].state.outClicked) {
      const formattedTime = formatTime(now);
      shNoneTime.textContent = formattedTime;
      carData[car].outTime = "none";
      carData[car].state.noneClicked = true;
    } else {
      alert("無効の入力です。再入力してください");
    }

    // ボタン色を変更
    color(noneTimeBtn);

    console.log("押した時刻：", now.toLocaleString());
    noneTimeBtn.disabled = true;
  });

  //ドライバーなどの作業入力処理
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

  //formの送信時の処理
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); //標準のform送信を停止

    // 既存の hidden は削除
    document.querySelectorAll(".dynamic-hidden").forEach((el) => el.remove());

    //送信データ用を格納
    const sendCarData = findCarData();

    // 未送信データを確認してデータを格納
    const payload = JSON.stringify({
      current: sendCarData,
      unsent: JSON.parse(localStorage.getItem("unsentData") || "{}"),
    });
    console.log("データの格納完了");

    //データを送信
    if (await sendData(payload)) {
      // 送信成功ならローカルストレージの未送信データは削除
      localStorage.removeItem("unsentData");
    } else {
      alert("[重要]送信に失敗,データを保存。一度開発者に連絡を");
      localStorage.setItem("unsentData", payload);
    }
  });
});
