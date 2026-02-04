//パスワードのチェック
const passInput = document.getElementById("pass");
const passError = document.getElementById("passError");
const submitBtn = document.getElementById("submitBtn");
const form = document.getElementById("myForm");

// パスワードの強度チェック関数
function isPasswordStrong(pwd) {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isLongEnough = pwd.length >= 8;

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
    if (!result.isLongEnough) errorMsg += "8文字以上 ";
    if (!result.hasLowercase) errorMsg += "小文字 ";
    if (!result.hasUppercase) errorMsg += "大文字 ";
    if (!result.hasNumber) errorMsg += "数字 ";

    passError.textContent = errorMsg.trim();
    passError.style.color = "red";
    passInput.style.borderColor = "red";

    submitBtn.disabled = true; // 条件満たさなければ送信ボタン無効化
  } else {
    passError.textContent = "OK";
    passError.style.color = "green";
    passInput.style.borderColor = "green";

    submitBtn.disabled = false; // 条件満たせば送信ボタン有効化
  }
});

// 送信時チェック
form.addEventListener("submit", (event) => {
  const pwd = passInput.value;
  const result = isPasswordStrong(pwd);

  if (!result.valid) {
    event.preventDefault(); // 送信キャンセル
    alert(
      "パスワードが条件を満たしていません。8文字以上、小文字・大文字・数字を含めてください。"
    );
    passInput.focus();
  }
});

//
