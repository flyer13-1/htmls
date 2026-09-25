// DOM宣言
const main = document.getElementById("formArea");
const success = document.getElementById("success");
const conform = document.getElementById("conform");

const form = document.getElementById("form");
const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");
const adminBtn = document.getElementById("adminBtn");
const logoutBtn = document.getElementById("logoutBtn");

// API・成功メッセージ・ログアウト関数 は common.js で宣言済み。
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

// プロフィール（GET /user/me）。取得済みなら再取得しない。失敗時は null。
let profile = null;

async function loadProfile() {
  if (profile) return profile;

  const auth = requireAuth();
  if (!auth) return null;

  try {
    const response = await fetch(`${API}/user/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });

    const data = await response.json();
    if (handleApiError(response, data)) return null;

    profile = data;
    adminBtn.style.display = data.isAdmin ? "" : "none";
    return profile;
  } catch (error) {
    console.error("プロフィール取得エラー:", error);
    alert("プロフィールの取得に失敗しました。管理者に一度報告してください。");
    return null;
  }
}

// ページロード時: プロフィールを取得して管理者フラグでadminBtnを表示制御
document.addEventListener("DOMContentLoaded", () => {
  if (!sessionStorage.getItem("token")) return logout();
  loadProfile();
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
    return logout();
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
    window.location.href = "./main.html";
  } catch (error) {
    console.error("送信エラー:", error);
    alert("送信失敗しました。管理者に一度報告してください。");
  } finally {
    isSending = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

// プロフィール確認画面を表示
async function prof() {
  const data = profile;
  if (!data) return;

  document.getElementById("textUser").textContent =
    "利用者ID: " + data.username;
  document.getElementById("textCir").textContent =
    "所属サーキット: " + circuits[data.circuit];

  main.style.display = "none";
  conform.style.display = "block";
}

// メイン画面に戻る
function back() {
  main.style.display = "block";
  conform.style.display = "none";
}

form.addEventListener("submit", send);
conformBtn.addEventListener("click", prof);
backBtn.addEventListener("click", back);
logoutBtn.addEventListener("click", logout);
