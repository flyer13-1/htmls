//宣言
const formRegist = document.getElementById("form");
let tmp = {};

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
  const ojUser = new AmazonCognitoIdentity.CognitoUser({
    Username: tmp.username,
    Pool: cognitoPool,
  });

  // confirmRegistrationでコードを検証する
  ojUser.confirmRegistration(code, true, async (err) => {
    if (err) {
      alert("確認コードが正しくありません" + err.message);
      return;
    }

    // 正常終了：APIにユーザー情報を登録（コード検証が通った後に送る）
    const response = await fetch(`${API}/user`, {
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
  });
}

// コードの再送信
function doResend() {
  const usr = new AmazonCognitoIdentity.CognitoUser({
    Username: document.getElementById("username").value,
    Pool: cognitoPool,
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
  cognitoPool.signUp(usernameInp, passInp, emailInp, null, (err, res) => {
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
});
