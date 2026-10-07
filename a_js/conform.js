// DOM宣言
const form = document.getElementById("form");
const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");
const adminBtn = document.getElementById("adminBtn");

// API・showStep・finishTo・ログアウト関数・CIRCUIT_NAMES は common.js で宣言済み。
// 区画（formArea / conform / msgArea）の切り替えは showStep に任せる。

// プロフィール（GET /user/me）。取得済みなら再取得しない。失敗時は null。
let profile = null;

// 取得を試みる回数。通信の瞬断やサーバーの一時的な失敗で画面が使えなくなるのを防ぐ
// （doc/IF/userMenu2.md）。401・403 などは再試行しても変わらないので数に入れない。
const PROFILE_RETRY_MAX = 3;

async function loadProfile() {
  if (profile) return profile;

  const auth = requireAuth();
  if (!auth) return null;

  for (let attempt = 1; attempt <= PROFILE_RETRY_MAX; attempt++) {
    try {
      const response = await fetch(`${API}/user/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      // 500番台は一時的な失敗として再試行する。それ以外（401・403・400）は
      // 繰り返しても結果が変わらないため handleApiError に任せて打ち切る。
      if (response.status >= 500) throw new Error(`server ${response.status}`);

      const data = await response.json();
      if (handleApiError(response, data)) return null;

      profile = data;
      adminBtn.style.display = data.isAdmin ? "" : "none";
      sessionStorage.setItem("circuit", data.circuit);

      return profile;
    } catch (error) {
      console.error(
        `プロフィール取得エラー(${attempt}/${PROFILE_RETRY_MAX}):`,
        error,
      );
      if (attempt === PROFILE_RETRY_MAX) {
        alert("サーバーエラー：プロフィールを取得できません");
        return null;
      }
      // 続けて叩いても直らないことが多いため、少し待ってから試す
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  return null;
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

    // 大会ID照合成功：Lambda が返した raceToken（署名付き）を保存してメイン画面へ。
    // 以降の一般向けAPIには、この値をそのまま X-Race-Id ヘッダーで送る
    // （doc/IF/raceIdToken.md §3・§4、01章 R10）。
    sessionStorage.setItem("raceToken", data.raceToken);

    // 終了日が設定されていないレース（データの欠損・改ざん）。
    // トークンは2時間しか有効でないため、作業中に失効する。その場で管理者への
    // 連絡を促す（doc/IF/userMenu1.md「終了日が無いレースについて」）。
    if (data.warning === "finish_date_missing") {
      alert(
        "このレースには終了日が設定されていません。\n" +
          "利用できるのは2時間だけです。至急、管理者に連絡してください。",
      );
    }

    finishTo("./main.html"); // 成功表示の後にメイン画面へ（common.js）
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
  // 読み込み時に取得できていなければ、ここで取り直す。
  // 押しても何も起きない状態を避けるため（doc/IF/userMenu2.md）。
  const data = await loadProfile();
  if (!data) return;

  document.getElementById("textUser").textContent =
    "担当者名: " + data.username;
  document.getElementById("textCir").textContent =
    "所属サーキット: " + CIRCUIT_NAMES[data.circuit];

  showStep("conform");
}

// 大会ID入力の区画に戻る
function back() {
  showStep("formArea");
}

// 大会IDの前後の空白（半角・全角とも）を入力時点で取り除く。
// 貼り付け・入力のどちらでも効くよう input イベントで処理する。
// 大会IDは英数字のみなので、空白を含むと HTML の形式チェックで弾かれるため。
const todayIdInput = document.getElementById("todayId");
todayIdInput.addEventListener("input", () => {
  const trimmed = todayIdInput.value.trim();
  if (trimmed !== todayIdInput.value) todayIdInput.value = trimmed;
});

form.addEventListener("submit", send);
conformBtn.addEventListener("click", prof);
backBtn.addEventListener("click", back);
