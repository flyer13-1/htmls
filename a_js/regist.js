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
  const response = await fetch(
    "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev/user",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passInputRegist.value,
        circuit: circuitInput.value,
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
