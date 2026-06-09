// submitBtn は passCheck.js で宣言済み
document.querySelectorAll("[data-confirms]").forEach((input) => {
  // data-confirms="targetId" の値で比較対象のパスワード欄を取得
  const target = document.getElementById(input.dataset.confirms);

  // data-errmsg="errMsgId" の値でエラー表示先の要素を取得
  const errEl = document.getElementById(input.dataset.errmsg);

  input.addEventListener("input", () => {
    const ok = input.value !== "" && input.value === target.value;
    errEl.textContent       = ok ? "OK!" : "パスワードが一致しません";
    errEl.style.color       = ok ? "green" : "red";
    input.style.borderColor = ok ? "green" : "red";
    if (!ok) submitBtn.disabled = true;
  });
});
