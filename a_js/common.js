// 全画面共通の定数・関数。
// import/export は使わない。各HTMLで他スクリプトより先に <script defer src="a_js/common.js">
// で読み込み、グローバル参照する前提。

// APIベースURL
const API = "https://9nvfvkd6f5.execute-api.ap-northeast-1.amazonaws.com/dev";

// Cognito User Pool 設定（ログイン/登録/パスワード再設定の全ページで共通）
const COGNITO_POOL_ID = "ap-northeast-1_CieJXqC9H";
const COGNITO_CLIENT_ID = "404fhgre43fnt3pbb7bfv2c33v";
const cognitoPool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: COGNITO_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
});

// 認証ガード：sessionStorage から token / raceId を取得して返す。
// 不足していればログイン画面へ遷移し null を返す。
// needRaceId=true のときは raceId も必須とする。
function requireAuth(needRaceId = false) {
  const token = sessionStorage.getItem("token");
  const raceId = sessionStorage.getItem("raceId");

  if (!token || (needRaceId && !raceId)) {
    alert("認証情報が不足しています。再度ログインしてください。");
    window.location.href = "./index.html";
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
    window.location.href = "./index.html";
  } else if (response.status === 500) {
    alert(data.msg || "error: 500 Internal Server Error");
  } else {
    alert(data.msg || `error: ${response.status}`);
  }
  return true;
}
