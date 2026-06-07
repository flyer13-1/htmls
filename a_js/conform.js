//DOM宣言
const main = document.getElementById("main");
const conform = document.getElementById("conform");
const changed = document.getElementById("changed");

const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");
const changeBtn = document.getElementById("changeBtn");

function init() {
  const form = document.getElementById("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // デフォルト送信をキャンセル

    //送信処理
    const todayId = document.getElementById("todayId").value;
    const token = sessionStorage.getItem("token"); // ログイン時に保存したトークンを取得

    const response = await fetch(
      "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev/user/me",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          todayId: todayId,
        }),
      },
    )
      .then((response) => {
        if (response.ok) {
          if (data.msg === "") {
                const responseData = await response.json();
                sessionStorage.setItem("raceId", responseData.raceId);
          } else {
            // エラーメッセージ表示
            alert(data.msg);
          }
        } else if (response.status === 400) {
          alert(data.msg || "error: 400 Bad Request");
        } else if (response.status === 500) {
          alert(data.msg || "error: 500 Internal Server Error");
        }
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
        alert(
          "送信失敗しました。管理者に一度報告してください。",
        );
      });
    // 保存

    sessionStorage.setItem("raceId", responseData.raceId);
  });
}

function prof() {
  const textUser = document.getElementById("textUser");
  const textCir = document.getElementById("textCir");

  fetch(
    "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev/user/me",
    {
      method: "GET",
    },
  )
    .then((response) => {
      if (response.ok) {
        if (data.msg === "") {
        } else {
          // エラーメッセージ表示
          alert(data.msg);
        }
      } else if (response.status === 400) {
        alert(data.msg || "error: 400 Bad Request");
      } else if (response.status === 500) {
        alert(data.msg || "error: 500 Internal Server Error");
      }
    })
    .then((data) => {
      textUser.textContent = "利用者ID: " + data.userId;
      textCir.textContent = "所属サーキット: " + data.circuit;

      // プロフィール表示
      main.style.display = "none";
      conform.style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching profile:", error);
      alert("プロフィールの取得に失敗しました。管理者に一度報告してください。");
    });

  // //テスト用
  // main.style.display = "none";
  // conform.style.display = "block";
}

function back() {
  main.style.display = "block";
  conform.style.display = "none";
}
