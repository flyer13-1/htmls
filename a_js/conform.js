// DOM宣言
const main = document.getElementById("main");
const success = document.getElementById("success");
const conform = document.getElementById("conform");

const form = document.getElementById("form");
const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");

// API は common.js で宣言済み。
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

  const auth = requireAuth(); // token を取得（無ければログイン画面へ）
  if (!auth) return;

  const todayId = document.getElementById("todayId").value;
  console.log("[conform POST] token:", auth.token, "todayId:", todayId); // 診断用（後で削除）

  try {
    const response = await fetch(`${API}/user/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ todayId }),
    });

    const data = await response.json();
    console.log("[conform POST] status:", response.status, "data:", data); // 診断用（後で削除）
    if (handleApiError(response, data)) return;

    // 大会ID照合成功：Lambda が返した raceId を保存してメイン画面へ
    sessionStorage.setItem("raceId", data.raceId);
    sucsessMsg();
  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信失敗しました。管理者に一度報告してください。");
  }
}

// プロフィール取得（GETリクエスト）
async function prof() {
  const auth = requireAuth();
  if (!auth) return;
  console.log("[conform GET] token:", auth.token); // 診断用（後で削除）

  const textUser = document.getElementById("textUser");
  const textCir = document.getElementById("textCir");

  try {
    const response = await fetch(`${API}/user/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });

    const data = await response.json();
    console.log("[conform GET] status:", response.status, "data:", data); // 診断用（後で削除）
    if (handleApiError(response, data)) return;

    // プロフィール情報を画面に表示
    textUser.textContent = "利用者ID: " + data.username;
    textCir.textContent = "所属サーキット: " + circuits[data.circuit];

    main.style.display = "none";
    conform.style.display = "block";
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
