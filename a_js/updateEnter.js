//    定数の宣言
//車両
const carNum = document.getElementById("carNum");
const carNumber = document.getElementById("carNumber");

//表記
const selected = document.getElementById("selection");
const retire = document.getElementById("retire");
const change = document.getElementById("change");

selected.addEventListener("change", () => {
  const val = selected.value;
  retire.style.display = val === "2" ? "block" : "none";
  change.style.display = val === "1" ? "block" : "none";
});

carNumber.addEventListener("change", () => {
  carNum.value = carNumber.value;
});
