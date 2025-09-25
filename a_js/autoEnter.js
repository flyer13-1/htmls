document.addEventListener("DOMContentLoaded", function () {
  //ピットの時間設定
  let inClicked = false;
  let outClicked = false;
  let noneClicked = false;
  const inTimeBtn = document.getElementById("inTime");
  const outTimeBtn = document.getElementById("outTime");
  const noneTimeBtn = document.getElementById("noneTime");
  const clickedInInput = document.getElementById("clickedInTime");
  const clickedOutInput = document.getElementById("clickedOutTime");
  const clickedNoneInput = document.getElementById("clickedNoneTime");
  const offsetInput = document.getElementById("offset");

  function getCorrectedTime() {
    const offsetSec = parseFloat(offsetInput.value) || 0;
    return new Date(Date.now() + offsetSec * 1000);
  }

  //ピットイン時間の動き
  inTimeBtn.addEventListener("click", () => {
    if (inClicked) return;

    const now = getCorrectedTime();
    clickedInInput.value = now.toISOString();
    inClicked = true;

    // ボタン色を変更
    inTimeBtn.style.backgroundColor = "#9e9b9b";
    inTimeBtn.style.color = "rgb(255, 0, 204)";

    console.log("押した時刻：", now.toLocaleString());
    inTimeBtn.disabled = true;

    validateForm();
  });

  //ピットアウト時間の動き
  outTimeBtn.addEventListener("click", () => {
    if (outClicked) return;

    const now = getCorrectedTime();
    clickedOutInput.value = now.toISOString();
    outClicked = true;

    // ボタン色を変更
    outTimeBtn.style.backgroundColor = "#9e9b9b";
    outTimeBtn.style.color = "rgb(255, 0, 204)";

    console.log("押した時間；", now.toLocaleString());
    outTimeBtn.disabled = true;

    validateForm();
  });

  //ピットアウトしない時時間の動き
  noneTimeBtn.addEventListener("click", () => {
    if (noneClicked) return;

    const now = getCorrectedTime();
    clickedNoneInput.value = "none";
    noneClicked = true;

    // ボタン色を変更
    noneTimeBtn.style.backgroundColor = "#9e9b9b";
    noneTimeBtn.style.color = "rgb(255, 0, 204)";

    console.log("押した時刻：", now.toLocaleString());
    noneTimeBtn.disabled = true;

    validateForm();
  });

  //全ての必須項目を入れないと送信できないようにする
  const form = document.getElementById("myForm");
  const inputs = form.querySelectorAll(":required");
  const radios = form.querySelectorAll('input[name="driver"]');
  const submitBtn = document.getElementById("submit");

  function validateForm() {
    //let allFilled = true;

    // 通常必須チェック
    const inputsFilled = Array.from(inputs).every((input) =>
      input.value.trim()
    );

    // ラジオボタン必須チェック
    const radioChecked =
      document.querySelector('input[type="radio"]:checked') !== null;

    // ピットイン/アウトチェック
    const pitOk =
      (inClicked && outClicked) ||
      (inClicked && noneClicked) ||
      (outClicked && noneClicked);

    // 送信ボタン制御
    submitBtn.disabled = !(inputsFilled && radioChecked && pitOk);

    // // 通常の必須入力チェック
    // inputs.forEach((input) => {
    //   if (!input.value.trim()) {
    //     allFilled = false;
    //   }
    // });

    // // ラジオボタン必須チェック
    // const radioChecked = Array.from(radios).some((r) => r.checked);
    // if (!radioChecked) {
    //   allFilled = false;
    // }

    // // ピットイン・アウトのどちらかが押されているか確認
    // if (!inClicked || !outClicked) {
    //   allFilled = false;
    // }

    // submitBtn.disabled = !allFilled;
  }

  // 入力が変わるたびにチェック
  inputs.forEach((input) => {
    input.addEventListener("input", validateForm);
  });
  radios.forEach((radio) => {
    radio.addEventListener("change", validateForm);
  });

  // 初期状態もチェック
  validateForm();
});
