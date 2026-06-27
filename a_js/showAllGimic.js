// DOM宣言
const allButton = document.getElementById("all");         // 全表示
const searchInput = document.getElementById("search");    // 統合検索入力（数字→ゼッケン / 文字→担当者）
const filterList = document.getElementById("filter");     // フィルター欄
const tableBody = document.querySelector("tbody");        // テーブル本体

// 変数
let currentClassFilter = "";
let currentSearchFilter = "";

// 関数
function formatBoolean(value) {
  return value ? "はい" : "いいえ";
}

function formatDatetime(value) {
  return value === null || value === undefined ? "-" : value;
}

function formatGap(value) {
  if (value === null || value === undefined) return "-";
  return `${value} 秒`;
}

function createClassButtons(classNames) {
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

function filterAndSortEntries() {
  let filtered = Array.from(entries);

  if (currentSearchFilter) {
    const asNum = Number(currentSearchFilter);
    if (!Number.isNaN(asNum) && /^\d+$/.test(currentSearchFilter)) {
      // 数字のみ → ゼッケン番号で絞り込み
      filtered = filtered.filter((entry) => entry.carNum === asNum);
    } else {
      // 文字列 → 担当者名で部分一致
      filtered = filtered.filter((entry) =>
        (entry.manager || "").includes(currentSearchFilter),
      );
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

// 実行コード
allButton.addEventListener("click", () => {
  currentClassFilter = "";
  currentSearchFilter = "";
  searchInput.value = "";
  filterList
    .querySelectorAll("button[data-class]")
    .forEach((btn) => btn.classList.remove("active"));
  renderTable();
});

searchInput.addEventListener("input", (event) => {
  currentSearchFilter = event.target.value.trim();
  renderTable();
});
