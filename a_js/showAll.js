// DOM宣言
const resetButton = document.getElementById("reset"); // 更新

// グローバル変数
let entries = [];

// 関数
async function loadEntries() {
  const auth = requireAuth(true); // token + raceId が必須
  if (!auth) return;

  try {
    const response = await fetch(
      `${API}/entries/show?race_id=${encodeURIComponent(auth.raceId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );
    const data = await response.json();

    if (handleApiError(response, data)) return;

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
  currentSearchFilter = "";
  searchInput.value = "";
  await loadEntries();
});

loadEntries();
