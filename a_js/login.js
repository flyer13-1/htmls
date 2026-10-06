//宣言
const formLogin = document.getElementById("form");
let isSubmitting = false;

// 送信時チェック
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  if (isSubmitting) return;
  isSubmitting = true;
  const submitBtn = formLogin.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  //要素のdom要素
  const usernameInput = document.getElementById("username");
  const passInputLogin = document.getElementById("password");

  // Cognitoでのログイン認証（common.jsのcognitoPoolを使う）
  const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: usernameInput.value,
    Password: passInputLogin.value,
  });
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: usernameInput.value,
    Pool: cognitoPool,
  });

  cognitoUser.authenticateUser(authDetails, {
    onSuccess: (result) => {
      // 正常終了：Cognitoが発行したIDトークンを保存し、成功表示の後にページ遷移
      // （finishTo は common.js。500ms 見せてから replace する）
      sessionStorage.setItem("token", result.getIdToken().getJwtToken());
      finishTo("./conform.html");
    },
    onFailure: (err) => {
      alert(err.message || "メールアドレスまたはパスワードが違います");
      isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    },
  });
});
