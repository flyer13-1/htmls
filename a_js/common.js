// 全画面共通の定数・関数。
// import/export は使わない。各HTMLで他スクリプトより先に <script defer src="a_js/common.js">
// で読み込み、グローバル参照する前提。

// APIベースURL
const API = "https://9nvfvkd6f5.execute-api.ap-northeast-1.amazonaws.com/dev";

// Cognito User Pool 設定（ログイン/登録/パスワード再設定でのみ使用）
// cognitoPool を実際に使うのは Cognito SDK を読み込むページ（index / regist /
// forgetPass）だけ。SDK 未読み込みのページ（conform 等）でも common.js は
// 読み込まれるため、SDK がある時だけ生成する。無ければ null（それらのページは
// cognitoPool を参照しないので影響なし）。
const COGNITO_POOL_ID = "ap-northeast-1_tGblsfFgk";
const COGNITO_CLIENT_ID = "6lh05mp69vfns3cfpj6hls4e7i";
const cognitoPool =
  typeof AmazonCognitoIdentity !== "undefined"
    ? new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: COGNITO_POOL_ID,
        ClientId: COGNITO_CLIENT_ID,
      })
    : null;

// ログイン前に開いてよいページ（bfcache 復元チェックの対象外）
const PUBLIC_PAGES = ["index.html", "regist.html", "forgetPass.html"];

// サーキット番号(1〜7) → 名称。conform.js と admin.js で共用する
// （doc/aws-sam/admin/v2/02_race.md §6）。organizations.circuit の並びに合わせる。
const CIRCUIT_NAMES = [
  null,
  "富士",
  "茂木",
  "菅生",
  "鈴鹿",
  "岡山国際",
  "その他",
  "無所属",
];

// 認証情報を全部消す
function clearAuth() {
  // sessionStorage は全消し（token / raceToken / circuit ...）
  sessionStorage.clear();

  // Cognito SDK が localStorage に書いたセッションだけ消す。
  // localStorage.clear() は不可：enterAuto の unsentData / 送信ログまで消えるため。
  Object.keys(localStorage)
    .filter((k) =>
      k.startsWith(`CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}`),
    )
    .forEach((k) => localStorage.removeItem(k));
}

// ログアウト：履歴を置き換えて、戻るでこのページに来られないようにする
function logout() {
  clearAuth();
  window.location.replace("./index.html");
}

// ヘッダーの #logoutBtn（admin / main / conform 共通）。defer 読み込みなので DOM は構築済み。
// グローバルの const にすると各ページ JS の宣言と衝突するため、変数は作らない。
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// 戻る／進むでキャッシュ(bfcache)から復元された時、token が無ければログイン画面へ
window.addEventListener("pageshow", (e) => {
  const page = location.pathname.split("/").pop() || "index.html";
  if (PUBLIC_PAGES.includes(page)) return;
  if (e.persisted && !sessionStorage.getItem("token")) {
    window.location.replace("./index.html");
  }
});

// 認証ガード：sessionStorage から token / raceToken を取得して返す。
// 不足していればログイン画面へ遷移し null を返す。
// needRaceToken=true のときは raceToken も必須とする。
// raceToken は conform が発行した署名付きトークン（doc/IF/raceIdToken.md）。
// 以降のAPIには X-Race-Id ヘッダーでそのまま送る（01章 R10）。
function requireAuth(needRaceToken = false) {
  const token = sessionStorage.getItem("token");
  const raceToken = sessionStorage.getItem("raceToken");

  if (!token || (needRaceToken && !raceToken)) {
    alert("認証情報が不足しています。再度ログインしてください。");
    window.location.replace("./index.html");
    return null;
  }
  return { token, raceToken };
}

// 管理者画面用の認証ガード：token と circuit の両方が無ければ conform.html へ戻す
// （doc/aws-sam/admin/v2/01_permission.md §3「フロント: admin」）。
// leader かどうかの判定は各APIの403に任せる（ここでは見た目の出し分けだけ）。
function requireCircuitAuth() {
  const token = sessionStorage.getItem("token");
  const circuit = sessionStorage.getItem("circuit");

  if (!token || !circuit) {
    window.location.replace("./conform.html");
    return null;
  }
  return { token, circuit };
}

// ───────────────────────────────────────────────────────────────
// 画面の区画（article）の切り替えと、入力検証の判定表
// 設計: doc/IF/common.md §5〜§7
// ───────────────────────────────────────────────────────────────

// フォーム画面は <article> を区画として並べ、表示を切り替えて段階を進める。
// 区画名は画面ごとに違うため、存在するものだけを扱う。
//   index      : formArea / msgArea
//   regist     : formArea / codeArea / msgArea
//   forgetPass : formArea / codeArea / msgArea
//   conform    : formArea / conform  / msgArea   ← 2番目は codeArea ではない
const STEP_AREAS = ["formArea", "codeArea", "conform", "msgArea"];

// 今表示している区画。判定表と送信ボタンの対象を決めるのに使う。
let currentStep = null;

// 入力欄ごとの合否。検証スクリプト（passCheck / passConfirmCheck）が書き込み、
// refreshSubmit が読む。「通ったら足す」のではなく、区画を開いた時点で全欄を
// false で登録しておき、入力ごとに上書きする。足す方式だと、一度も触られて
// いない欄が表に載らず「問題なし」として扱われてしまう。
const formValidity = new Map();

// 今の区画の中にある送信ボタン。区画ごとにボタンが違うため毎回探す。
function currentSubmit() {
  const area = currentStep ? document.getElementById(currentStep) : null;
  return area ? area.querySelector("[data-submit]") : null;
}

// 送信ボタンの有効・無効を決める唯一の場所。
// 登録されている欄が1つでも false なら押させない。
// 各検証スクリプトはここを通してのみボタンに影響する（直接触らない）。
function refreshSubmit() {
  const btn = currentSubmit();
  if (!btn) return;
  btn.disabled = ![...formValidity.values()].every(Boolean);
}

// 検証スクリプトからの合否の書き込み口。
// 今の区画に属さない欄からの通知は無視する（別区画の入力欄が表を汚さないように）。
function setValidity(id, ok) {
  if (!formValidity.has(id)) return;
  formValidity.set(id, ok);
  refreshSubmit();
}

// 区画を開いたときに、その中の検証対象を false で登録し直す。
function registerStepFields(areaId) {
  formValidity.clear();
  const area = document.getElementById(areaId);
  if (area) {
    area
      .querySelectorAll("[data-passcheck], [data-confirms], [data-required]")
      .forEach((input) => formValidity.set(input.id, false));
  }
  refreshSubmit();
}

// 指定した区画だけを表示し、他は隠す。存在しない区画は無視する。
// 表示・非表示は hidden 属性に統一する（style.display と CSS の併用をやめた）。
function showStep(id) {
  currentStep = id;
  for (const name of STEP_AREAS) {
    const el = document.getElementById(name);
    if (el) el.hidden = name !== id;
  }
  registerStepFields(id);
}

// 成功メッセージを見せてから遷移する。
// 待たずに遷移すると描画される前に消えるため、500ms 置く。
// replace を使うのは、完了した画面に戻るボタンで帰れないようにするため（logout と同じ）。
function finishTo(page, delay = 500) {
  showStep("msgArea");
  setTimeout(() => window.location.replace(page), delay);
}

// 規則の無い必須欄（確認コードなど）。空でないことだけを見る。
document.querySelectorAll("[data-required]").forEach((input) => {
  const errEl = input.dataset.errmsg
    ? document.getElementById(input.dataset.errmsg)
    : null;

  input.addEventListener("input", () => {
    const ok = input.value.trim() !== "";
    if (errEl) {
      errEl.textContent = ok ? "" : "入力してください";
      errEl.style.color = "red";
    }
    setValidity(input.id, ok);
  });
});

// 初期表示の区画を判定表に反映する。HTML の hidden が初期状態の正。
(function initStep() {
  const visible = STEP_AREAS.find((name) => {
    const el = document.getElementById(name);
    return el && !el.hidden;
  });
  if (visible) showStep(visible);
})();

// 一般画面のAPI呼び出し口（設計: doc/IF/common.md §5）。
// 成功ならレスポンスのデータ、失敗なら null を返す（呼び出し側は `if (!data) return;`）。
//
// fetch が例外になる場合（Authorizer の拒否で CORS ヘッダーが付かない・通信が切れた）を
// 1箇所で扱う。これが無いと、画面によっては例外が誰にも拾われず「押しても何も起きない」
// 状態になっていた。
//
// **管理者画面の adminFetch とは例外時の扱いが違う。** admin は認証を消してログイン画面へ
// 戻すが（01章§7）、一般画面は**その画面に留まる**。サーキットは電波が悪いことがあり、
// 入力画面は未送信データを端末に持って再送する作りのため、通信が切れただけで
// ログイン画面へ飛ばすと入力中のものを失う。
//
// 403 の reason は見ない（管理者画面だけが adminFetch で分岐する）。
async function apiFetch(url, options = {}) {
  let res;
  let data;
  try {
    res = await fetch(url, options);
    data = await res.json();
  } catch (err) {
    console.error("api fetch error:", err);
    alert("通信に失敗しました。電波の状況を確認して、もう一度お試しください。");
    return null;
  }
  return handleApiError(res, data) ? null : data;
}

// レスポンス共通処理。
// エラー（非200 / msg が空文字でない）の場合は alert を出して true を返す。
// → 呼び出し側は `if (handleApiError(response, data)) return;` で早期離脱できる。
// 正常（ok かつ msg===""）の場合は false を返す。
function handleApiError(response, data) {
  if (response.ok) {
    if (data.msg === "") return false;
    alert(data.msg);
    return true;
  }

  if (response.status === 400) {
    alert(data.msg || "error: 400 Bad Request");
  } else if (response.status === 401) {
    // 認証情報を消してから戻す（01章§7）。残したままだと、ログイン画面に
    // 戻った後も期限切れのトークンが sessionStorage に残る。
    clearAuth();
    alert(data.msg || "セッションが切れました。再度ログインしてください。");
    window.location.replace("./index.html");
  } else if (response.status === 403 && data.reason === "race_finished") {
    // 終了したレース、または raceToken の期限切れ（01章§5.4）。
    // そのまま入力を続けても全て失敗するので、大会IDを入れ直せる conform へ戻す。
    // conform 自身がこれを受けることもある（終了したレースの大会IDを入れた場合）ので、
    // そのときは移動しない（同じ画面へ戻して入力内容とメッセージを消さないため）。
    alert(data.msg || "終了したレースです");
    const page = location.pathname.split("/").pop() || "index.html";
    if (page !== "conform.html") {
      window.location.replace("./conform.html");
    }
  } else if (response.status === 500) {
    alert(data.msg || "error: 500 Internal Server Error");
  } else {
    alert(data.msg || `error: ${response.status}`);
  }
  return true;
}
