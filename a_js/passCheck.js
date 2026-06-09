function isPasswordStrong(pwd) {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const isLongEnough = pwd.length >= 6;

  return {
    valid: hasLowercase && hasUppercase && hasNumber && isLongEnough,
    hasLowercase,
    hasUppercase,
    hasNumber,
    isLongEnough,
  };
}

const submitBtn = document.getElementById("submit");
const passValidity = new Map(); // 各inputの合否を記録するMap

document.querySelectorAll("[data-passcheck]").forEach((input) => {
  // data-passcheckを持つ全inputをループ（1つでも2つでも動く）

  passValidity.set(input.id, false); // 初期値としてfalse（未入力）を登録

  // data-errmsg="errMsg" の値（ID文字列）を使ってエラー表示先の要素を取得
  // → smallが別の場所に移動してもIDが同じなら壊れない
  const errEl = document.getElementById(input.dataset.errmsg);

  input.addEventListener("input", () => {
    const result = isPasswordStrong(input.value);
    passValidity.set(input.id, result.valid); // このinputの合否をMapに更新

    if (!result.valid) {
      let msg = "次を含めてください: ";
      if (!result.isLongEnough) msg += "6文字以上 ";
      if (!result.hasLowercase)  msg += "小文字 ";
      if (!result.hasUppercase)  msg += "大文字 ";
      if (!result.hasNumber)     msg += "数字 ";
      errEl.textContent = msg.trim();
      errEl.style.color = "red";
      input.style.borderColor = "red";
    } else {
      errEl.textContent = "OK!";
      errEl.style.color = "green";
      input.style.borderColor = "green";
    }

    // Mapの全エントリがtrueの時だけ送信ボタンを有効化
    // → 1つでも未通過があれば無効のまま
    submitBtn.disabled = ![...passValidity.values()].every(Boolean);
  });
});
