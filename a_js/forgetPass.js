//宣言
const usernameInput = document.getElementById("username");
const passInputForget = document.getElementById("password");
const newPassInput = document.getElementById("newPassword");
const formForget = document.getElementById("form");

function sucsessMsg() {
  const formArea = document.getElementById("formarea");
  const msg = document.getElementById("msgarea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "./login.html";
  }, 1000);
}

// 送信時チェック
formForget.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  // JSONで送信
  const response = await fetch(`${API}/user/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passInputForget.value,
      newpassword: newPassInput.value,
    }),
  });
  const data = await response.json();

  if (handleApiError(response, data)) return;

  // 正常終了：ページ遷移
  sucsessMsg();
});
