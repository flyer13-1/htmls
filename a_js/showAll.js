// DOM宣言
const resetButton = document.getElementById("reset"); // 更新

// グローバル変数
let entries = [];

// 定数
const BASE_URL =
  "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev";
const ENDPOINT = "/entries/show";

// 関数
async function loadEntries() {
  try {
    const token = localStorage.getItem("token");
    const raceId = localStorage.getItem("raceId");

    if (!token || !raceId) {
      alert("ユーザー情報が見つかりません。再度ログインしてください。");
      window.location.href = "./login.html";
      return;
    }

    const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (response.ok) {
      if (data.msg !== "") {
        // エラーメッセージ表示
        alert(data.msg);
        return;
      }
    } else if (response.status === 400) {
      alert(data.msg || "error: 400 Bad Request");
      return;
    } else if (response.status === 500) {
      alert(data.msg || "error: 500 Internal Server Error");
      return;
    }

    entries = Object.keys(data)
      .filter((key) => key !== "msg")
      .map((key) => {
        const value = data[key];
        return {
          managerId: value.managerId,
          manager: value.manager,
          pitNum: value.pitNum,
          carNum: value.carNum,
          className: value.className,
          teamName: value.teamName,
          retire: value.retire,
          inDriver: value.inDriver,
          outDriver: value.outDriver,
          inTime: value.inTime,
          outTime: value.outTime,
          garageInTime: value.garageInTime,
          pitGap: value.pitGap,
          tire: value.tire,
          oil: value.oil,
          note: value.note,
        };
      });

    const classes = Array.from(
      new Set(entries.map((entry) => entry.className)),
    ).sort();
    createClassButtons(classes);
    renderTable();
  } catch (err) {
    console.error(err);
    alert(
      "データの取得に失敗しました。サーバーまたはネットワークを確認してください。",
    );
  }
}

// 実行コード
resetButton.addEventListener("click", async () => {
  currentClassFilter = "";
  currentCarFilter = "";
  carFilterInput.value = "";
  await loadEntries();
});

loadEntries();
