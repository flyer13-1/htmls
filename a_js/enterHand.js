document.addEventListener("DOMContentLoaded", async () => {
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
});
