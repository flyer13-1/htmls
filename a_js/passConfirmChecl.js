const passInput = document.getElementById("pass");
const passConfirmInput = document.getElementById("passConfirm");
const passConfError = document.getElementById("passConfError");

//パスワード確認のリアルタイムチェック
passConfirmInput.addEventListener("input", () => {
  if (passConfirmInput.value !== passInput.value) {
    passConfError.textContent = "パスワードが一致しません";
    passConfError.style.color = "red";
    passConfirmInput.style.borderColor = "red";
    submitBtn.disabled = true; // 不一致なら送信ボタン無効化
  } else {
    passConfError.textContent = "OK!";
    passConfError.style.color = "green";
    passConfirmInput.style.borderColor = "green";
    submitBtn.disabled = false; // 一致すれば送信ボタン有効化
  }
});
