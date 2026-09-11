//宣言
const formRegist = document.getElementById("form");
let tmp = {};

const pool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: "us-east-1_P6B4NaQPe",
  ClientId: "7i8g9mqjr6a932isnp7nkl1csj",
});

//成功時のメッセ表示
function sucsessMsg() {
  const formArea = document.getElementById("formArea");
  const msg = document.getElementById("msgArea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "./index.html";
  }, 1000);
}

// 確認コード入力画面に切り替え
function checkCode() {
  const formArea = document.getElementById("formArea");
  const codeArea = document.getElementById("codeArea");
  formArea.style.display = "none";
  codeArea.style.display = "block";
}

// 確認コードの検証
async function doConfirm() {
  const code = document.getElementById("code").value; // 入力された確認コード

  // 対象ユーザーのCognitoUserオブジェクトを作る(showConfirmBoxで保持したユーザー名を使う)
  const OjUser = new AmazonCognitoIdentity.CognitoUser({
    Username: tmp.username,
    Pool: pool,
  });

  // confirmRegistrationでコードを検証する
  OjUser.confirmRegistration(code, true, async (err, res) => {
    if (err) {
      alert("確認コードが正しくありません" + err.message);
      return;
    }
  });

  // 正常終了：APIにユーザー情報を登録
  const response = await fetch(`${API}/regist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: tmp.username,
      sub: tmp.sub,
      circuit: tmp.circuit,
    }),
  });
  const data = await response.json();
  if (handleApiError(response, data)) return;

  sucsessMsg(); // 成功演出→ページ遷移
}

// コードの再送信
function doResend() {
  const usr = new AmazonCognitoIdentity.CognitoUser({
    Username: document.getElementById("username").value,
    Pool: pool,
  });

  usr.resendConfirmationCode((err, res) => {
    const msgEl = document.getElementById("resendMsg");
    if (err) {
      msgEl.style.color = "red";
      msgEl.innerText = err.message;
      return;
    }
    msgEl.style.color = "green";
    msgEl.innerText = "確認コードを再送信しました";
  });
}

// 送信時チェック
formRegist.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  // 入力値取得
  const usernameInp = document.getElementById("username").value;
  const passInp = document.getElementById("password").value;
  const circuitInp = document.getElementById("circuit").value;
  const emailInp = [
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: "email",
      Value: document.getElementById("email").value,
    }),
  ];

  // Cognitoにサインアップ
  pool.signUp(usernameInp, passInp, emailInp, null, (err, res) => {
    if (err) {
      alert(err.message);
      return;
    }

    tmp.username = usernameInp;
    tmp.circuit = circuitInp;
    tmp.sub = res.userSub;
    // 確認コード入力画面に切り替え(既存のsucsessMsgとは別の画面遷移が必要)
    checkCode();
  });

  if (doConfirm()) {
    const response = await fetch(`${API}/regist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInp,
        sub: res.userSub,
        circuit: circuitInp,
      }),
    });
    const data = await response.json();
    if (handleApiError(response, data)) return;

    sucsessMsg(); // 既存の成功演出→ページ遷移
  }
});
