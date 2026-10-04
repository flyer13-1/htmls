// DOM宣言
const allButton = document.getElementById("all");         // 全表示
const searchInput = document.getElementById("search");    // 統合検索入力（数字→ゼッケン / 文字→担当者）
const filterList = document.getElementById("filter");     // フィルター欄
const tableBody = document.querySelector("tbody");        // テーブル本体

// 変数
let currentClassFilter = "";
let currentSearchFilter = "";

// 関数
// 並べ替えの時刻: その記録の時刻（inTime 無ければ outTime）。両方無ければ末尾（設計 04章§2.4）
function sortTimeOf(row) {
  const time = row.inTime ?? row.outTime;
  return time ? Date.parse(time) : Infinity;
}

// 枠（A〜F）と氏名を "A:あそう太郎" の形にする（設計 04章§4.3）
function formatDriver(slot, name) {
  if (!slot) return "-";
  if (!name) return slot;
  return `${slot}:${name}`;
}

function formatBoolean(value) {
  return value ? "はい" : "いいえ";
}

// ISO 8601 → HH:MM:SS 表示
function formatDatetime(value) {
  if (value === null || value === undefined) return "-";
  const m = String(value).match(/T(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : value;
}

// 秒 → DD:HH:MM:SS 表示（1日未満なら HH:MM:SS）
function formatGap(value) {
  if (value === null || value === undefined) return "-";
  const p  = (n) => String(n).padStart(2, "0");
  const d  = Math.floor(value / 86400);
  const h  = Math.floor((value % 86400) / 3600);
  const m  = Math.floor((value % 3600) / 60);
  const s  = value % 60;
  return d > 0 ? `${p(d)}:${p(h)}:${p(m)}:${p(s)}` : `${p(h)}:${p(m)}:${p(s)}`;
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
    const ta = sortTimeOf(a);
    const tb = sortTimeOf(b);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.carNum - b.carNum;
  });

  return filtered;
}

// 表示とCSV出力で共通の列定義（設計 04章§4.3）。順序を変えるとどちらにも反映される
const PIT_LOG_COLUMNS = [
  { label: "作業エリア",       value: (r) => r.maintenanceArea ?? "" },
  { label: "ゼッケン番号",     value: (r) => r.carNum },
  { label: "担当者",           value: (r) => r.manager },
  { label: "リタイア",         value: (r) => formatBoolean(r.retire) },
  { label: "インドライバー",   value: (r) => formatDriver(r.inDriver, r.inDriverName) },
  { label: "アウトドライバー", value: (r) => formatDriver(r.outDriver, r.outDriverName) },
  { label: "ピットイン",       value: (r) => formatDatetime(r.inTime) },
  { label: "ピットアウト",     value: (r) => formatDatetime(r.outTime) },
  { label: "ピットGAP",        value: (r) => formatGap(r.pitGap) },
  { label: "給油",             value: (r) => formatBoolean(r.oil) },
  { label: "タイヤ交換",       value: (r) => formatBoolean(r.tire) },
  { label: "クラス名",         value: (r) => r.className },
  { label: "チーム名",         value: (r) => r.teamName },
  { label: "備考",             value: (r) => r.note || "" },
];

function renderTable() {
  const rows = filterAndSortEntries();
  tableBody.innerHTML = "";

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = PIT_LOG_COLUMNS.length;
    td.textContent = "該当するデータがありません。";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    for (const col of PIT_LOG_COLUMNS) {
      const td = document.createElement("td");
      td.textContent = col.value(entry);
      tr.appendChild(td);
    }
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
