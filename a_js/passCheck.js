//各パスワードのリアルタイムチェック
//宣言
const passInput = document.getElementById("password");
const passError = document.getElementById("errMsg");
const newPassInput = document.getElementById("newPassword");
const newPassError = document.getElementById("newPassErrMsg");
const submitBtn = document.getElementById("submit");
const form = document.getElementById("form");

// パスワードの強度チェック関数
function isPasswordStrong(pwd) {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isLongEnough = pwd.length >= 6;

  return {
    valid: hasLowercase && hasUppercase && hasNumber && isLongEnough,
    hasLowercase,
    hasUppercase,
    hasNumber,
    isLongEnough,
  };
}

// 入力中のリアルタイムチェック
passInput.addEventListener("input", () => {
  const pwd = passInput.value;
  const result = isPasswordStrong(pwd);

  if (!result.valid) {
    let errorMsg = "次を含めてください: ";
    if (!result.isLongEnough) errorMsg += "6文字以上 ";
    if (!result.hasLowercase) errorMsg += "小文字 ";
    if (!result.hasUppercase) errorMsg += "大文字 ";
    if (!result.hasNumber) errorMsg += "数字 ";

    passError.textContent = errorMsg.trim();
    passError.style.color = "red";
    passInput.style.borderColor = "red";

    submitBtn.disabled = true; // 条件満たさなければ送信ボタン無効化
  } else {
    passError.textContent = "OK!";
    passError.style.color = "green";
    passInput.style.borderColor = "green";

    submitBtn.disabled = false; // 条件満たせば送信ボタン有効化
  }
});

// 入力中のリアルタイムチェック
newPassInput.addEventListener("input", () => {
  const pwd = newPassInput.value;
  const result = isPasswordStrong(pwd);

  if (!result.valid) {
    let errorMsg = "次を含めてください: ";
    if (!result.isLongEnough) errorMsg += "6文字以上 ";
    if (!result.hasLowercase) errorMsg += "小文字 ";
    if (!result.hasUppercase) errorMsg += "大文字 ";
    if (!result.hasNumber) errorMsg += "数字 ";

    newPassError.textContent = errorMsg.trim();
    newPassError.style.color = "red";
    newPassInput.style.borderColor = "red";

    submitBtn.disabled = true; // 条件満たさなければ送信ボタン無効化
  } else {
    newPassError.textContent = "OK!";
    newPassError.style.color = "green";
    newPassInput.style.borderColor = "green";

    submitBtn.disabled = false; // 条件満たせば送信ボタン有効化
  }
});
