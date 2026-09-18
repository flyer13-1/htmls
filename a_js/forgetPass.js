//宣言
const formForget = document.getElementById("form");
let tmp = {};
let isSubmitting = false;

// 確認コード入力画面に切り替え
function showCodeArea() {
  document.getElementById("formArea").style.display = "none";
  document.getElementById("codeArea").style.display = "block";
}

// ステップ1: メールアドレスを送信し、Cognitoから確認コードをメール送信させる
// Cognitoはメールアドレスをusernameとして扱う設定のため、ここで渡すUsernameもメールアドレスになる
formForget.addEventListener("submit", (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  if (isSubmitting) return;
  isSubmitting = true;
  const submitBtn = formForget.querySelector("[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  const usernameInp = document.getElementById("username").value;

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: usernameInp,
    Pool: cognitoPool,
  });

  cognitoUser.forgotPassword({
    onSuccess: () => {
      tmp.username = usernameInp;
      tmp.cognitoUser = cognitoUser;
      showCodeArea();
      isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    },
    onFailure: (err) => {
      alert(err.message || "確認コードの送信に失敗しました");
      isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    },
  });
});

// ステップ2: 確認コードと新しいパスワードでパスワードを再設定
function doReset() {
  const code = document.getElementById("code").value;
  const newPassword = document.getElementById("newPassword").value;

  tmp.cognitoUser.confirmPassword(code, newPassword, {
    onSuccess: () => {
      sucsessMsg(); // 成功演出→ページ遷移
      window.location.href = "./index.html"; //ページ遷移
    },
    onFailure: (err) => {
      alert(err.message || "確認コードが正しくありません");
    },
  });
}

// コードの再送信
function doResend() {
  tmp.cognitoUser.forgotPassword({
    onSuccess: () => {
      const msgEl = document.getElementById("resendMsg");
      msgEl.style.color = "green";
      msgEl.innerText = "確認コードを再送信しました";
    },
    onFailure: (err) => {
      const msgEl = document.getElementById("resendMsg");
      msgEl.style.color = "red";
      msgEl.innerText = err.message;
    },
  });
}
