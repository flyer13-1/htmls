// DOM宣言
const main = document.getElementById("main");
const success = document.getElementById("success");
const conform = document.getElementById("conform");

const form = document.getElementById("form");
const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");
const adminBtn = document.getElementById("adminBtn");
const logoutBtn = document.getElementById("logoutBtn");

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

// ページロード時: 管理者フラグを確認してadminBtnを表示制御
document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API}/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      adminBtn.style.display = data.isAdmin ? "" : "none";
    }
  } catch { /* 無視 */ }
});

// ログアウト
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("raceId");
  window.location.href = "./index.html";
});

let isSending = false;

// 大会ID照会フォームの送信処理
async function send(event) {
  event.preventDefault();

  if (isSending) return;
  isSending = true;
  const submitBtn = form.querySelector("[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  const auth = requireAuth(); // token を取得（無ければログイン画面へ）
  if (!auth) {
    isSending = false;
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  const todayId = document.getElementById("todayId").value;

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
    if (handleApiError(response, data)) return;

    // 大会ID照合成功：Lambda が返した raceId を保存してメイン画面へ
    sessionStorage.setItem("raceId", data.raceId);
    sucsessMsg();
  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信失敗しました。管理者に一度報告してください。");
  } finally {
    isSending = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

// プロフィール取得（GETリクエスト）
async function prof() {
  const auth = requireAuth();
  if (!auth) return;

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
    if (handleApiError(response, data)) return;

    // プロフィール情報を画面に表示
    textUser.textContent = "利用者ID: " + data.username;
    textCir.textContent = "所属サーキット: " + circuits[data.circuit];
    adminBtn.style.display = data.isAdmin ? "" : "none";

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
