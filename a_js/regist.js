//宣言
const formRegist = document.getElementById("form");
let isSend = false; // 送信済みかどうかのフラグ
let isConfirmSend = false; // 確認コード検証中かどうかのフラグ

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
  if (isConfirmSend) return;
  isConfirmSend = true;

  const code = document.getElementById("code").value; // 入力された確認コード

  // 対象ユーザーのCognitoUserオブジェクトを作る
  // Cognitoはメールアドレスをusernameとして扱う設定のため、担当者名(tmp.username)ではなく
  // signUp時に使ったメールアドレス(tmp.email)を指定する
  const ojUser = new AmazonCognitoIdentity.CognitoUser({
    Username: tmp.email,
    Pool: cognitoPool,
  });

  // confirmRegistrationでコードを検証する
  ojUser.confirmRegistration(code, true, async (err) => {
    if (err) {
      alert("確認コードが正しくありません" + err.message);
      isConfirmSend = false;
      return;
    }

    // 正常終了：APIにユーザー情報を登録（コード検証が通った後に送る）
    try {
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

      sucsessMsg(); // 成功演出
      window.location.href = "./index.html"; //ページ遷移
    } catch (error) {
      console.error("ユーザー登録エラー:", error);
      alert("通信に失敗しました。もう一度お試しください。");
    } finally {
      isConfirmSend = false;
    }
  });
}

// コードの再送信
function doResend() {
  // Cognitoのusernameはメールアドレスなので担当者名欄ではなくemail欄を参照する
  const usr = new AmazonCognitoIdentity.CognitoUser({
    Username: document.getElementById("email").value,
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
  if (isSend) return;
  isSend = true;

  // 入力値取得
  const usernameInp = document.getElementById("username").value;
  const passInp = document.getElementById("password").value;
  const circuitInp = document.getElementById("circuit").value;
  const emailValue = document.getElementById("email").value;
  const emailInp = [
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: "email",
      Value: emailValue,
    }),
  ];

  //usernameの重複チェック
  try {
    const checkResponse = await fetch(
      `${API}/user/check?username=${encodeURIComponent(usernameInp)}`,
    );
    const checkData = await checkResponse.json();
    if (handleApiError(checkResponse, checkData)) {
      isSend = false;
      return;
    }
    if (checkData.exists) {
      alert("その担当者名は既に使用されています");
      isSend = false;
      return;
    }
  } catch (error) {
    console.error("重複チェックエラー:", error);
    alert("通信に失敗しました。もう一度お試しください。");
    isSend = false;
    return;
  }

  // Cognitoにサインアップ
  // Cognitoはメールアドレスをusernameとして扱う設定のため、担当者名(usernameInp)ではなく
  // メールアドレス(emailValue)をUsernameとして渡す
  cognitoPool.signUp(emailValue, passInp, emailInp, null, (err, res) => {
    if (err) {
      alert(err.message);
      isSend = false;
      return;
    }

    tmp.username = usernameInp;
    tmp.email = emailValue;
    tmp.circuit = circuitInp;
    tmp.sub = res.userSub;
    // 確認コード入力画面に切り替え(既存のsucsessMsgとは別の画面遷移が必要)
    checkCode();
    isSend = false; // 送信フラグをリセット
  });
});
