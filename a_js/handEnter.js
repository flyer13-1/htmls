document.addEventListener("DOMContentLoaded", async () => {
  //車両の処理
  const carNumSection = document.getElementById("carNum");

  async function getCarNumber(cnt = 3) {
    try {
      // サーバから車両番号リストを取得（例：JSONで["1","2","3",...]）
      // const response = await fetch(""); // 適宜URLを変更
      // const carNumbers = await response.json();
      return carNumbers;
    } catch (err) {
      if (cnt > 0) {
        console.error("データ取得失敗", err);
        getCarNumber(cnt - 1);
      } else {
        alert("データ取得失敗しました。管理者に一度報告してください。");
        return null;
      }
    }
  }

  // const carNumbers = await getCarNumber();
  // if(!carNumber)return;

  //テスト用データ
  const carNumbers = [5, 6, 15, 16, 0, 1, 20];

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
});
