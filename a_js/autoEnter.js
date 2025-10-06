document.addEventListener("DOMContentLoaded", async () => {
  //車両の処理
  const carNumSection = document.getElementById("carNum");
  const carData = {};

  //ピットの時間設定
  const inTimeBtn = document.getElementById("inTime");
  const outTimeBtn = document.getElementById("outTime");
  const noneTimeBtn = document.getElementById("noneTime");
  const offsetTime = document.getElementById("offset");

  //ドライバーの入力処理
  const driver = document.getElementById("Driver");

  //ほかの作業の入力処理
  const tires = document.getElementById("tires");
  const oils = document.getElementById("oils");

  //formの処理
  const form = document.getElementById("myForm");

  try {
    // サーバから車両番号リストを取得（例：JSONで["1","2","3",...]）
    // const response = await fetch(""); // 適宜URLを変更
    // const carNumbers = await response.json();

    //テスト用データ
    const carNumbers = [5, 6, 15, 16, 0, 1, 20];

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
        notes: "",
        state: { inClicked: false, outClicked: false, noneClicked: false },
      };

      // ボタンクリックで選択／解除表示（CSSクラス付け外し）
      btn.addEventListener("click", () => {
        document.querySelectorAll(".carBtn").forEach((btn) => {
          btn.classList.remove("selected");
        });
        btn.classList.add("selected");

        //時間選択
        const time = document.querySelectorAll("#Time button[type ='button']");
        time.forEach((e) => {
          e.disabled = false; // 全て有効に戻す
          e.style.backgroundColor = ""; // 元の色に戻す（任意）
          e.style.color = "";
        });

        if (carData[num].inTime === "none" || carData[num].outTime === "none") {
          const noneT = document.getElementById("noneTime");
          noneT.disabled = true;
          noneT.style.backgroundColor = "#9e9b9b";
          noneT.style.color = "rgb(255,0,204)";
          console.log("noneを有効化");
        }
        if (carData[num].inTime && carData[num].inTime !== "none") {
          const inT = document.getElementById("inTime");
          inT.disabled = true;
          inT.style.backgroundColor = "#9e9b9b";
          inT.style.color = "rgb(255,0,204)";
          console.log("pitinを有効化");
        }
        if (carData[num].outTime && carData[num].outTime !== "none") {
          const outT = document.getElementById("outTime");
          outT.disabled = true;
          outT.style.backgroundColor = "#9e9b9b";
          outT.style.color = "rgb(255,0,204)";
          console.log("pitoutを有効化");
        }
        // ドライバー選択時の処理
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

        // 作業内容反映
        document.getElementById("tires").checked = !!carData[num].tire;
        document.getElementById("oils").checked = !!carData[num].oil;
        note.value = carData[num].notes || "";
      });

      // ボタンをセクションに追加
      carNumSection.appendChild(btn);
      console.log("ボタン制作完了");
    });

    console.log("車両オブジェクト初期化完了:", carData);
  } catch (err) {
    console.error("車両リスト取得エラー:", err);
    alert("車両の情報を取得できませんでした");
  }

  // ここから先で carData[num] に各種作業情報を上書きしていく

  //ピットの時間の処理
  function getCorrectedTime() {
    const offsetSec = parseFloat(offsetTime.value) || 0;
    return new Date(Date.now() + offsetSec * 1000);
  }

  //ピットイン時間の動き
  inTimeBtn.addEventListener("click", () => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].state.inClicked) return;
    if (Object.values(carData[car].state).filter((v) => v).length >= 2) return;

    //時間を取得して情報を入力
    const now = getCorrectedTime();
    carData[car].inTime = now.toISOString();
    carData[car].state.inClicked = true;

    // ボタン色を変更
    inTimeBtn.style.backgroundColor = "#9e9b9b";
    inTimeBtn.style.color = "rgb(255, 0, 204)";

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
    carData[car].outTime = now.toISOString();
    carData[car].state.outClicked = true;

    // ボタン色を変更
    outTimeBtn.style.backgroundColor = "#9e9b9b";
    outTimeBtn.style.color = "rgb(255, 0, 204)";

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
      carData[car].inTime = "none";
      carData[car].state.noneClicked = true;
    } else if (carData[car].state.inClicked && !carData[car].state.outClicked) {
      carData[car].outTime = "none";
      carData[car].state.noneClicked = true;
    } else {
      alert("無効の入力です。再入力してください");
    }

    // ボタン色を変更
    noneTimeBtn.style.backgroundColor = "#9e9b9b";
    noneTimeBtn.style.color = "rgb(255, 0, 204)";

    console.log("押した時刻：", now.toLocaleString());
    noneTimeBtn.disabled = true;
  });

  //ドライバーの入力処理
  driver.addEventListener("change", (e) => {
    const car = document.querySelector(".carBtn.selected").textContent;
    carData[car].driver = e.target.value;
  });

  //ほかの作業の入力処理
  tires.addEventListener("change", (e) => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].oil) {
      carData[car].oil = null;
    }
    carData[car].tire = e.target.value;
  });

  oils.addEventListener("change", (e) => {
    const car = document.querySelector(".carBtn.selected").textContent;
    if (carData[car].oil) {
      carData[car].oil = null;
    }
    carData[car].oil = e.target.value;
  });

  note.addEventListener("change", (e) => {
    const car = document.querySelector(".carBtn.selected").textContent;
    carData[car].notes = e.target.value;
  });

  //formの送信時の処理
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); //標準のform送信を停止

    // 既存の hidden は削除
    document.querySelectorAll(".dynamic-hidden").forEach((el) => el.remove());
    const send = {};

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
    for (const carContainer in carData) {
      const resultCar = carData[carContainer];
      if (
        resultCar.driver ||
        resultCar.inTime ||
        resultCar.outTime ||
        resultCar.tire ||
        resultCar.oil ||
        resultCar.notes
      ) {
        send[carContainer] = resultCar;
      }
    }

    //手動でformを送信（ページ遷移しない）
    const payload = JSON.stringify(carData);

    try {
      const response = await fetch("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (!response.ok) throw new Error("送信失敗");

      const result = await response.json();
      console.log("サーバからの応答:", result);

      showToast("送信成功しました！");
    } catch (err) {
      console.error("送信エラー:", err);
      showToast("送信に失敗しました。");
    }
  });
});
