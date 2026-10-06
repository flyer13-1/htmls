// パスワードの強度チェック。regist / forgetPass の2画面で使う。
// ログイン画面は対象外で、<form> の標準検証（required / minlength / maxlength）に任せる
// （doc/IF/common.md §6）。
//
// 合否は common.js の判定表（formValidity）に setValidity で書き込む。
// 送信ボタンは触らない。ボタンの有効・無効を決めるのは refreshSubmit だけ。

function isPasswordStrong(pwd) {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isLongEnough = pwd.length >= 6; // パスワード　6文字以上
  const isWithinMax = pwd.length <= 20; // パスワード　20文字以内
  const isAlnumOnly = /^[A-Za-z0-9]*$/.test(pwd); // 半角英数字以外（記号・全角）を禁止

  return {
    valid:
      hasLowercase &&
      hasUppercase &&
      hasNumber &&
      isLongEnough &&
      isWithinMax &&
      isAlnumOnly,
    hasLowercase,
    hasUppercase,
    hasNumber,
    isLongEnough,
    isWithinMax,
    isAlnumOnly,
  };
}

document.querySelectorAll("[data-passcheck]").forEach((input) => {
  // data-passcheckを持つ全inputをループ（1つでも2つでも動く）

  // data-errmsg="errMsg" の値（ID文字列）を使ってエラー表示先の要素を取得
  // → smallが別の場所に移動してもIDが同じなら壊れない
  const errEl = document.getElementById(input.dataset.errmsg);

  input.addEventListener("input", () => {
    const result = isPasswordStrong(input.value);

    if (!result.valid) {
      let msg = "次を含めてください: ";
      if (!result.isLongEnough) msg += "6文字以上 ";
      if (!result.hasLowercase) msg += "小文字 ";
      if (!result.hasUppercase) msg += "大文字 ";
      if (!result.hasNumber) msg += "数字 ";
      if (!result.isWithinMax) msg += "20文字以内 ";
      if (!result.isAlnumOnly) msg += "半角英数字のみ ";
      errEl.textContent = msg.trim();
      errEl.style.color = "red";
      input.style.borderColor = "red";
    } else {
      errEl.textContent = "OK!";
      errEl.style.color = "green";
      input.style.borderColor = "green";
    }

    setValidity(input.id, result.valid); // common.js
  });
});
