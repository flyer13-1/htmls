// DOM宣言
const resetButton = document.getElementById("reset"); // 更新

// グローバル変数
let entries = [];

// 関数
async function loadEntries() {
  const auth = requireAuth(true); // token + raceToken が必須
  if (!auth) return;

  try {
    const response = await fetch(`${API}/entries/show`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Race-Id": auth.raceToken,
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const data = await response.json();

    if (handleApiError(response, data)) return;

    entries = data.logs || [];

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
