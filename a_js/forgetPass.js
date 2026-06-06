//宣言
const usernameInput = document.getElementById("username");
const passInput = document.getElementById("password");
const newPassInput = document.getElementById("newPassword");
const newPassError = document.getElementById("newPassErrMsg");
const form = document.getElementById("form");

function sucsessMsg() {
  const formArea = document.getElementById("formarea");
  const msg = document.getElementById("msgarea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "/login";
  }, 2000);
}

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

// 送信時チェック
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  // JSONで送信
  const response = await fetch(
    "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev/user/password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passInput.value,
        newpassword: newPassInput.value,
      }),
    },
  );
  const data = await response.json();

  if (response.ok) {
    if (data.msg === "") {
      // ページ遷移
      sucsessMsg();
    } else {
      // エラーメッセージ表示
      alert(data.msg);
    }
  } else if (response.status === 400) {
    alert(data.msg || "error: 400 Bad Request");
  } else if (response.status === 500) {
    alert(data.msg || "error: 500 Internal Server Error");
  }
});
