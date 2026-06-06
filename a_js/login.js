//宣言
const usernameInput = document.getElementById("username");
const passInputLogin = document.getElementById("password");
const formLogin = document.getElementById("form");

function sucsessMsg() {
  const formArea = document.getElementById("formarea");
  const msg = document.getElementById("msgarea");
  formArea.style.display = "none";
  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
    formArea.style.display = "block";
    window.location.href = "./conform.html";
  }, 2000);
}

// 送信時チェック
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  // JSONで送信
  const response = await fetch(
    "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passInputLogin.value,
      }),
    },
  );
  const data = await response.json();

  if (response.ok) {
    if (data.msg === "") {
      // 保存
      sessionStorage.setItem("token", data.token);

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
