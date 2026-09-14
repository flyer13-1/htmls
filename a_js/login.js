//宣言

const formLogin = document.getElementById("form");

let isSubmitting = false;

function sucsessMsg() {
  const formArea = document.getElementById("formArea");
  const msg = document.getElementById("msgArea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "./conform.html";
  }, 1000);
}

// 送信時チェック
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  if (isSubmitting) return;
  isSubmitting = true;
  const submitBtn = formLogin.querySelector("[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  //要素のdom要素
  const usernameInput = document.getElementById("username");
  const passInputLogin = document.getElementById("password");

  try {
    // JSONで送信
    const response = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passInputLogin.value,
      }),
    });
    const data = await response.json();

    if (handleApiError(response, data)) return;

    // 正常終了：トークンを保存してページ遷移
    sessionStorage.setItem("token", data.token);
    sucsessMsg();
  } finally {
    isSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
});
