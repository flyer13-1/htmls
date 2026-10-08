// 管理者画面: 「表示と検索」。表示中（チェックON）の表を横断して部分一致で絞り込む。
// 決定事項: memory の project_admin_search_decisions を参照。
// 読み込み順: common.js → adminRace.js → adminOther.js → adminPreview.js → adminEdit.js → adminSearch.js

// 対象の表（adminEdit.js の EDIT_TABLES のキー）。カードIDは `${name}Card`、tbody は `${name}Body`
const SEARCH_TABLES = ["entry", "startDriver", "pitAssignment"];

// 比較用の正規化。全角・半角、大文字小文字、ひらがな・カタカナの差を無くす。
// レース一覧の検索（adminRace.js の filteredSortedRaces）でも使う。
// adminRace.js より後に読み込まれるが、呼ばれるのは DOMContentLoaded 後なので問題ない。
function normalizeText(text) {
  return String(text)
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .toLowerCase();
}

// 検索語を空白（半角・全角）で分ける。空の語は捨てる（複数語はAND）
function splitTerms(query) {
  return normalizeText(query).split(/[\s　]+/).filter(Boolean);
}

// 行の検索対象テキスト。操作列（.ops）は除外する（「削除」などの文字で誤ヒットしないように）
function rowText(tr) {
  return [...tr.cells]
    .filter((td) => !td.classList.contains("ops"))
    .map((td) => td.textContent)
    .join(" ");
}

function rowMatches(tr, terms) {
  const text = normalizeText(rowText(tr));
  return terms.every((term) => text.includes(term));
}

function isTableChecked(name) {
  return document.querySelector(`.view-toggle[value="${name}Card"]`)?.checked;
}

// 表示の唯一の決め方。チェック・検索語・一致件数から、各カードと各行の表示を決める。
// 一致ゼロなら対象の表を全部隠し「該当なし」を出す。一部の表だけゼロならその表のカードを隠す。
//
// 編集中の行（.editing）と、その編集フォームを載せた行（.editor-holder）は隠さない。
// 検索語を入れた瞬間に編集中のフォームが消えると、入力中の内容を失うため（§1.3）。
function applyView() {
  const terms = splitTerms(document.getElementById("editSearch").value);
  const searching = terms.length > 0;

  const counts = {};
  let total = 0;
  for (const name of SEARCH_TABLES) {
    let count = 0;
    // 編集フォームの行（.editor-holder）は検索の対象にしない。
    // 中身はラベルとボタンの文字だけで、入力値は textContent に出ないため、
    // 対象にすると「行は残るのにフォームだけ消える」状態になる。
    document
      .querySelectorAll(`#${name}Body > tr:not(.editor-holder)`)
      .forEach((tr) => {
        const ok =
          tr.classList.contains("editing") || !searching || rowMatches(tr, terms);
        tr.hidden = !ok;
        if (ok) count++;
      });
    counts[name] = count;
    if (isTableChecked(name)) total += count;
  }

  const noHit = searching && total === 0;
  document.getElementById("searchEmpty").hidden = !noHit;

  for (const name of SEARCH_TABLES) {
    const card = document.getElementById(`${name}Card`);
    card.hidden =
      !isTableChecked(name) || noHit || (searching && counts[name] === 0);
  }
}

// 変更画面を開いたとき用。検索語は保持しない（開き直すと空に戻す）
function resetSearch() {
  document.getElementById("editSearch").value = "";
  applyView();
}

function initSearch() {
  document.getElementById("editSearch").addEventListener("input", applyView);
  document
    .querySelectorAll(".view-toggle")
    .forEach((cb) => cb.addEventListener("change", applyView));
  applyView();
}
