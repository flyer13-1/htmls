// ピット情報の確認画面。表示は showAllGimic.js の共通部品を使う
// （filterAndSortPitLogs / renderPitLogHead / renderPitLogTable / renderClassButtons）。
// 設計: doc/IF/showAll.md、doc/aws-sam/admin/v2/04_pitlog.md §4
//
// 絞り込みの状態（クラス・検索語）と要素の紐付けは、この画面が持つ（§4.2）。

let pitLogs = []; // GET /entries/show の logs
const view = { className: "", search: "" };

let thead;
let tbody;
let searchInput;
let filterList;

// 今の絞り込み状態で描き直す。表示の決め方はここ1箇所だけ
function render() {
  renderPitLogTable(tbody, filterAndSortPitLogs(pitLogs, view)); // showAllGimic.js
}

// クラスボタンを作り直す（データ再取得でクラスが増減することがある）
function renderFilters() {
  const classNames = Array.from(
    new Set(pitLogs.map((row) => row.className)),
  ).sort();
  renderClassButtons(filterList, classNames, view.className, (className) => {
    view.className = className;
    renderFilters(); // 選択の見た目を反映する
    render();
  });
}

async function loadPitLogs() {
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

    pitLogs = data.logs || [];
    renderFilters();
    render();
  } catch (err) {
    console.error(err);
    alert(
      "データの取得に失敗しました。サーバーまたはネットワークを確認してください。",
    );
  }
}

// 絞り込みを解除する（「ピットイン順」＝全件を時刻順で見る）
function resetFilters() {
  view.className = "";
  view.search = "";
  searchInput.value = "";
  renderFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  thead = document.getElementById("thead");
  tbody = document.getElementById("tbody");
  searchInput = document.getElementById("search");
  filterList = document.getElementById("filter");

  renderPitLogHead(thead); // 見出しは列定義から作る（§4.3）

  document.getElementById("all").addEventListener("click", () => {
    resetFilters();
    render();
  });

  document.getElementById("reset").addEventListener("click", async () => {
    resetFilters();
    await loadPitLogs();
  });

  searchInput.addEventListener("input", (event) => {
    view.search = event.target.value.trim();
    render();
  });

  loadPitLogs();
});
