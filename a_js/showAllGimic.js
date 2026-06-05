const carNum = document.getElementById("car");

carNum.addEventListener("input", (event) => {
  const value = event.target.value;
  console.log("入力された値:", value);
  // ここで、valueを使用して必要な処理を行うことができます。

  const target = {
    carNum: value,
  };
});
