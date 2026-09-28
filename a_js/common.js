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

// 認証情報を全部消す
function clearAuth() {
  // sessionStorage は全消し（token / raceId / circuit ...）
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

// 戻る／進むでキャッシュ(bfcache)から復元された時、token が無ければログイン画面へ
window.addEventListener("pageshow", (e) => {
  const page = location.pathname.split("/").pop() || "index.html";
  if (PUBLIC_PAGES.includes(page)) return;
  if (e.persisted && !sessionStorage.getItem("token")) {
    window.location.replace("./index.html");
  }
});

// 認証ガード：sessionStorage から token / raceId を取得して返す。
// 不足していればログイン画面へ遷移し null を返す。
// needRaceId=true のときは raceId も必須とする。
function requireAuth(needRaceId = false) {
  const token = sessionStorage.getItem("token");
  const raceId = sessionStorage.getItem("raceId");

  if (!token || (needRaceId && !raceId)) {
    alert("認証情報が不足しています。再度ログインしてください。");
    window.location.replace("./index.html");
    return null;
  }
  return { token, raceId };
}

//成功時のメッセ表示
function sucsessMsg() {
  const formArea = document.getElementById("formArea");
  const msg = document.getElementById("msgArea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
  }, 500);
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
    alert(data.msg || "セッションが切れました。再度ログインしてください。");
    window.location.replace("./index.html");
  } else if (response.status === 500) {
    alert(data.msg || "error: 500 Internal Server Error");
  } else {
    alert(data.msg || `error: ${response.status}`);
  }
  return true;
}
