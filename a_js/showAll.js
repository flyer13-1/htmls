/*
  showAll.js

  目的:
  - /entries/show API から全ピット情報を取得し、HTML の表に表示する。
  - ユーザーが「ゼッケン番号」や「クラス」で絞り込みできるようにする。
  - 「ピットイン順」「更新」ボタンで表示をリセット/再読込できるようにする。

  書き方:
  - 定数で API エンドポイントと DOM 要素をまとめ、処理を分かりやすく分割。
  - 表示用のヘルパー関数で値の整形を統一。
  - データ取得 -> パース -> フィルタ / ソート -> テーブル描画 という流れにする。
*/

const BASE_URL =
  "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev";
const ENDPOINT = "/entries/show";

// HTML から操作に必要な要素を取得しています。
const allButton = document.getElementById("all");
const resetButton = document.getElementById("reset");
const carFilterInput = document.getElementById("car");
const filterList = document.getElementById("filter");
const tableBody = document.querySelector("tbody");

// 全件データと現在の絞り込み条件を保持する変数。
let entries = [];
let currentClassFilter = "";
let currentCarFilter = "";

// true/false を日本語表示に変換するためのヘルパー。
function formatBoolean(value) {
  return value ? "はい" : "いいえ";
}

// 日時が null なら "-" を表示し、それ以外はそのまま返す。
function formatDatetime(value) {
  return value === null || value === undefined ? "-" : value;
}

// pitGap を秒付きで表示するためのヘルパー。
function formatGap(value) {
  if (value === null || value === undefined) return "-";
  return `${value} 秒`;
}

/*
  クラス名ごとの絞り込みボタンを動的に生成します。
  API の結果から得たクラス一覧を元にボタンを作るため、
  クラス追加時に HTML を手動更新する必要がありません。
*/
function createClassButtons(classNames) {
  // まず既存のボタンを消してから再生成する。
  const existingButtons = Array.from(
    filterList.querySelectorAll("button[data-class]"),
  );
  existingButtons.forEach((button) => button.remove());

  classNames.forEach((className) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = className;
    button.dataset.class = className;

    // ボタンを押すと絞り込み条件が切り替わり、テーブル再描画。
    button.addEventListener("click", () => {
      if (currentClassFilter === className) {
        currentClassFilter = "";
        button.classList.remove("active");
      } else {
        currentClassFilter = className;
        filterList
          .querySelectorAll("button[data-class]")
          .forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      }
      renderTable();
    });

    li.appendChild(button);
    filterList.appendChild(li);
  });
}

/*
  entries 配列に対して、現在のフィルター条件を適用し、
  昇順ソートした結果を返す関数です。
*/
function filterAndSortEntries() {
  let filtered = Array.from(entries);

  if (currentCarFilter) {
    const carNumber = Number(currentCarFilter);
    if (!Number.isNaN(carNumber)) {
      filtered = filtered.filter((entry) => entry.carNum === carNumber);
    }
  }

  if (currentClassFilter) {
    filtered = filtered.filter(
      (entry) => entry.className === currentClassFilter,
    );
  }

  filtered.sort((a, b) => {
    if (a.pitNum !== b.pitNum) return a.pitNum - b.pitNum;
    if (a.inTime === b.inTime) return a.managerId - b.managerId;
    if (a.inTime === null) return 1;
    if (b.inTime === null) return -1;
    return a.inTime.localeCompare(b.inTime);
  });

  return filtered;
}

/*
  テーブル本体を描画する関数。
  取得したデータを DOM に反映させます。
*/
function renderTable() {
  const rows = filterAndSortEntries();
  tableBody.innerHTML = "";

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 12;
    td.textContent = "該当するデータがありません。";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  rows.forEach((entry) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${entry.managerId}</td>
      <td>${entry.manager}</td>
      <td>${entry.pitNum}</td>
      <td>${entry.carNum}</td>
      <td>${entry.className}</td>
      <td>${entry.teamName}</td>
      <td>${formatBoolean(entry.retire)}</td>
      <td>${entry.inDriver || "-"}</td>
      <td>${entry.outDriver || "-"}</td>
      <td>${formatDatetime(entry.inTime)}</td>
      <td>${formatDatetime(entry.outTime)}</td>
      <td>${formatGap(entry.pitGap)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// エラー時にユーザーへ通知するための共通関数。
function showError(message) {
  alert(message);
}

/*
  API からデータを取得し、entries 変数に格納する関数。
  取得できたらクラスボタンを作成し、テーブルを描画します。
*/
async function loadEntries() {
  try {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);
    const data = await response.json();

    if (!response.ok) {
      showError(data.msg || `エラー: ${response.status}`);
      return;
    }

    if (data.msg && data.msg !== "") {
      showError(data.msg);
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
    showError(
      "データの取得に失敗しました。サーバーまたはネットワークを確認してください。",
    );
  }
}

// 「ピットイン順」ボタンは絞り込みを解除し、テーブルを再描画するだけ。
allButton.addEventListener("click", () => {
  currentClassFilter = "";
  currentCarFilter = "";
  carFilterInput.value = "";
  filterList
    .querySelectorAll("button[data-class]")
    .forEach((btn) => btn.classList.remove("active"));
  renderTable();
});

// 「更新」ボタンは API を再度呼び出して最新データを取得する。
resetButton.addEventListener("click", async () => {
  currentClassFilter = "";
  currentCarFilter = "";
  carFilterInput.value = "";
  await loadEntries();
});

// 「ゼッケン番号」入力フォームに文字を入力したら、即時に絞り込みを反映する。
carFilterInput.addEventListener("input", (event) => {
  currentCarFilter = event.target.value.trim();
  renderTable();
});

// ページ読み込み時に最初のデータ取得を実行。
loadEntries();
