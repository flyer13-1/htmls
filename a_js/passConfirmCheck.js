// 確認用入力欄の一致チェック。パスワードとメールアドレスの両方で使う。
// 合否は common.js の判定表（formValidity）に setValidity で書き込む。
// 送信ボタンは触らない（doc/IF/common.md §6）。

document.querySelectorAll("[data-confirms]").forEach((input) => {
  // data-confirms="targetId" の値で比較対象の欄を取得
  const target = document.getElementById(input.dataset.confirms);

  // data-errmsg="errMsgId" の値でエラー表示先の要素を取得
  const errEl = document.getElementById(input.dataset.errmsg);

  // data-label="パスワード" の値をエラー文言に使う。
  // 1つの仕組みをパスワードとメールアドレスで共用するため、何が一致しないのかを
  // 欄ごとに指定できるようにしている。
  const label = input.dataset.label || "入力内容";

  function check() {
    const ok = input.value !== "" && input.value === target.value;
    errEl.textContent = ok ? "OK!" : `${label}が一致しません`;
    errEl.style.color = ok ? "green" : "red";
    input.style.borderColor = ok ? "green" : "red";
    setValidity(input.id, ok); // common.js
  }

  input.addEventListener("input", check);

  // 参照先（本体の欄）が書き換わったときも再判定する。
  // これが無いと、一致させた後に本体を編集しても古い判定が残り、
  // 不一致のまま送信できてしまう。
  target.addEventListener("input", check);
});
