// DOM宣言
const main = document.getElementById("main");
const conform = document.getElementById("conform");

const API = "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev";

// 大会ID照会フォームの初期化
function init() {
  const form = document.getElementById("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const todayId = document.getElementById("todayId").value;
    const token = sessionStorage.getItem("token"); // ログイン時に保存したトークン

    try {
      const response = await fetch(`${API}/user/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ todayId }),
      });

      const data = await response.json();

      if (response.ok) {
        // 大会IDが一致したらraceIdをセッションに保存してメイン画面へ
        sessionStorage.setItem("raceId", data.raceId);
        window.location.href = "./main.html";
      } else if (response.status === 400) {
        alert(data.msg || "error: 400 Bad Request");
      } else if (response.status === 500) {
        alert(data.msg || "error: 500 Internal Server Error");
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("送信失敗しました。管理者に一度報告してください。");
    }
  });
}

// プロフィール取得（GETリクエスト）
async function prof() {
  const textUser = document.getElementById("textUser");
  const textCir = document.getElementById("textCir");
  const token = sessionStorage.getItem("token"); // 認証トークン

  try {
    const response = await fetch(`${API}/user/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      // プロフィール情報を画面に表示
      textUser.textContent = "利用者ID: " + data.username;
      textCir.textContent = "所属サーキット: " + data.circuit;

      main.style.display = "none";
      conform.style.display = "block";
    } else if (response.status === 400) {
      alert(data.msg || "error: 400 Bad Request");
    } else if (response.status === 500) {
      alert(data.msg || "error: 500 Internal Server Error");
    }
  } catch (error) {
    console.error("プロフィール取得エラー:", error);
    alert("プロフィールの取得に失敗しました。管理者に一度報告してください。");
  }
}

// メイン画面に戻る
function back() {
  main.style.display = "block";
  conform.style.display = "none";
}
