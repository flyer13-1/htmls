//DOM宣言
const main = document.getElementById("main");
const conform = document.getElementById("conform");
const changed = document.getElementById("changed");

const conformBtn = document.getElementById("conformBtn");
const backBtn = document.getElementById("backBtn");
const changeBtn = document.getElementById("changeBtn");

function prof() {
  const textUser = document.getElementById("textUser");
  const textNum = document.getElementById("textNum");
  const textCir = document.getElementById("textCir");

  fetch("http://localhost:8080/api/user/profile", {
    method: "GET",
  })
    .then((response) => {
      if (!response.ok) {
        alert("プロフィールの取得に失敗しました");
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      textUser.textContent = "利用者ID: " + data.userId;
      textNum.textContent = "会員番号: " + data.memberNumber;
      textCir.textContent = "所属サーキット: " + data.circuit;

      // プロフィール表示
      main.style.display = "none";
      conform.style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching profile:", error);
    });

  //テスト用
  main.style.display = "none";
  conform.style.display = "block";
}

function back() {
  main.style.display = "block";
  conform.style.display = "none";
}

function change() {
  conform.style.display = "none";
  changed.style.display = "block";
}

function cancel() {
  changed.style.display = "none";
  prof();
}
