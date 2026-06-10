// DOM宣言
const main = document.getElementById("main");
const success = document.getElementById("success");
const conform = document.getElementById("conform");

const form = document.getElementById("form");
const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");

const API = "https://phtodjmcv1.execute-api.ap-northeast-1.amazonaws.com/dev";
// サーキット番号に対応するサーキット名の配列（1始まりのため index 0 は null）
const circuits = [
  null,
  "富士",
  "茂木",
  "菅生",
  "鈴鹿",
  "岡山国際",
  "その他",
  "無所属",
];

function sucsessMsg() {
  main.style.display = "none";
  conform.style.display = "none";
  success.style.display = "block";

  setTimeout(() => {
    success.style.display = "none";
    main.style.display = "block";
    window.location.href = "./main.html";
  }, 1000);
}

// 大会ID照会フォームの送信処理
async function send(event) {
  event.preventDefault();

  // 大会IDとトークンを取得
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
      sucsessMsg();
    } else if (response.status === 400) {
      alert(data.msg || "error: 400 Bad Request");
    } else if (response.status === 500) {
      alert(data.msg || "error: 500 Internal Server Error");
    }
  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信失敗しました。管理者に一度報告してください。");
  }
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
      textCir.textContent = "所属サーキット: " + circuits[data.circuit];

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

form.addEventListener("submit", send);
conformBtn.addEventListener("click", prof);
backBtn.addEventListener("click", back);
