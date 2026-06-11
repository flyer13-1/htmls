//宣言
const formRegist = document.getElementById("form");

function sucsessMsg() {
  const formArea = document.getElementById("formArea");
  const msg = document.getElementById("msgArea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "./login.html";
  }, 1000);
}

// 送信時チェック
formRegist.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  const usernameInput = document.getElementById("username");
  const circuitInput = document.getElementById("circuit");
  const passInputRegist = document.getElementById("password");

  // JSONで送信
  const response = await fetch(`${API}/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passInputRegist.value,
      circuit: circuitInput.value,
    }),
  });
  const data = await response.json();

  if (handleApiError(response, data)) return;

  // 正常終了：ページ遷移
  sucsessMsg();
});
