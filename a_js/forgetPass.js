//宣言
const usernameInput = document.getElementById("username");
const passInput = document.getElementById("password");
const newPassInput = document.getElementById("newPassword");
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

// 送信時チェック
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // デフォルト送信をキャンセル

  // JSONで送信
  const res = await fetch("/user/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passInput.value,
      newpassword: newPassInput.value,
    }),
  }).then((res) => {
    if (res.ok) {
      // 200系
      res.json().then((data) => {
        if (data.msg === "") {
          // ページ遷移
          sucsessMsg();
        } else {
          // エラーメッセージ表示
          alert(data.msg);
        }
      });
    } else if (res.status === 400) {
      alert("error: 400 Bad Request");
    } else if (res.status === 500) {
      alert("error: 500 Internal Server Error");
    }
  });
});
