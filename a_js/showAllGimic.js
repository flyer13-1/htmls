// ピット情報の表示部品。showAll / outPosts / 管理者ポップアップから共通で使う。
// 設計: doc/aws-sam/admin/v2/04_pitlog.md §4.2・§4.3
//
// ここでは DOM を探さず、グローバル変数も読まない（§4.1 の #1〜#3）。
// 描画先の要素と対象データは、呼ぶ側が引数で渡す。検索欄・クラスボタン・
// 全表示ボタンの紐付けも各画面の側で行う（showAll.js / outPosts.js / 管理者画面）。
// そのため、どの画面から呼ばれても同じように動く。

// ── 表示用の整形 ──

// 並べ替えの時刻: その記録の時刻（inTime 無ければ outTime）。両方無ければ末尾（§2.4）
function sortTimeOf(row) {
  const time = row.inTime ?? row.outTime;
  return time ? Date.parse(time) : Infinity;
}

// 枠（A〜F）と氏名を "A:あそう太郎" の形にする（§4.3）
function formatDriver(slot, name) {
  if (!slot) return "-"; // start_driver 未登録など、枠そのものが無い
  if (!name) return slot; // 枠はあるが entry に氏名が無い（データ不整合）
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
  const p = (n) => String(n).padStart(2, "0");
  const d = Math.floor(value / 86400);
  const h = Math.floor((value % 86400) / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  return d > 0 ? `${p(d)}:${p(h)}:${p(m)}:${p(s)}` : `${p(h)}:${p(m)}:${p(s)}`;
}

// 表示とCSV出力で共通の列定義（§4.3）。ここに1行足すと、画面の見出し・画面の行・
// CSVの見出し・CSVの行のすべてに反映される（「画面に無いのにファイルには入っている」を作らない）
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

// ── 絞り込みと並べ替え（§4.2） ──

/**
 * 絞り込みと並べ替えをして、新しい配列を返す（元の配列は変えない）。
 * @param {object[]} logs 対象データ（GET /entries/show の logs）
 * @param {{ className?: string, search?: string }} conditions
 *   className: クラス名の完全一致。空なら絞り込まない
 *   search:    数字だけならゼッケン番号の完全一致、それ以外は担当者名の部分一致
 */
function filterAndSortPitLogs(logs, { className = "", search = "" } = {}) {
  let filtered = Array.from(logs);

  if (search) {
    if (/^\d+$/.test(search)) {
      // 数字のみ → ゼッケン番号で絞り込み
      const carNum = Number(search);
      filtered = filtered.filter((row) => row.carNum === carNum);
    } else {
      // 文字列 → 担当者名で部分一致
      filtered = filtered.filter((row) => (row.manager || "").includes(search));
    }
  }

  if (className) {
    filtered = filtered.filter((row) => row.className === className);
  }

  // 時刻順 → 同時刻はゼッケン番号順（§2.4）。pitNum では並べ替えない
  filtered.sort((a, b) => {
    const ta = sortTimeOf(a);
    const tb = sortTimeOf(b);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.carNum - b.carNum;
  });

  return filtered;
}

// ── 描画（§4.2・§4.3） ──

/** 見出し行を列定義から作る。HTMLに直書きしないので、列を足しても崩れない（§4.3） */
function renderPitLogHead(thead) {
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  for (const col of PIT_LOG_COLUMNS) {
    const th = document.createElement("th");
    th.textContent = col.label;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
}

/** 渡された tbody に行を描く。列数は列定義から取る（colSpan の決め打ちを無くす） */
function renderPitLogTable(tbody, logs) {
  tbody.innerHTML = "";

  if (logs.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = PIT_LOG_COLUMNS.length;
    td.textContent = "該当するデータがありません。";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const row of logs) {
    const tr = document.createElement("tr");
    for (const col of PIT_LOG_COLUMNS) {
      const td = document.createElement("td");
      td.textContent = col.value(row);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

/**
 * クラス絞り込みのボタンを作る。選択状態は持たず、押されたら onSelect に渡す
 * （同じものをもう一度押したら "" ＝ 絞り込み解除）。
 * @param {HTMLElement} filterList ボタンを入れる要素（showAll では <ul id="filter">）
 * @param {string[]} classNames 表示するクラス名
 * @param {string} selected 今選ばれているクラス名（"" なら無選択）
 * @param {(className: string) => void} onSelect 押されたときに呼ぶ
 */
function renderClassButtons(filterList, classNames, selected, onSelect) {
  // 作り直すたびに増えないよう、前回のボタンを <li> ごと消す
  filterList
    .querySelectorAll("li[data-class-item]")
    .forEach((li) => li.remove());

  for (const className of classNames) {
    const li = document.createElement("li");
    li.dataset.classItem = "";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = className;
    button.dataset.class = className;
    if (className === selected) button.classList.add("active");
    button.addEventListener("click", () => {
      onSelect(className === selected ? "" : className);
    });
    li.appendChild(button);
    filterList.appendChild(li);
  }
}

// ── ダウンロード（04章§5） ──
// 出力画面（outPosts）と管理者ポップアップで同じものを使う。列は PIT_LOG_COLUMNS
// なので「画面に出ている列＝ファイルの列」が常に一致する（§5.2）。

// 値に , " 改行 が入る場合は " で囲み、中の " は "" にする（備考欄で実際に起こり得る）
function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// ファイル名に使えない文字を置き換える
function safeFileName(text) {
  return String(text ?? "").replace(/[\/:*?"<>|]/g, "_");
}

/** 表示中の行から CSV の中身を作る。先頭にBOMを付ける（Excel での文字化け対策。§5.1） */
function buildPitLogCsv(rows) {
  const lines = [PIT_LOG_COLUMNS.map((col) => csvEscape(col.label)).join(",")];
  for (const row of rows) {
    lines.push(PIT_LOG_COLUMNS.map((col) => csvEscape(col.value(row))).join(","));
  }
  return "﻿" + lines.join("\r\n"); // 改行は CRLF（Excel の標準）
}

/** `pit-log-<レースタイトル>-<YYYYMMDD>.csv` として保存させる */
function downloadPitLogCsv(rows, raceTitle) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

  const blob = new Blob([buildPitLogCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pit-log-${safeFileName(raceTitle)}-${ymd}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
