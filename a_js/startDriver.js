// スタートドライバーの登録・変更（一般利用者向け）。
// 登録: POST /entries/start-driver ／ 変更: PUT /entries/start-driver（どちらも X-Race-Id ヘッダー）

const startDriverBody = document.getElementById("startDriverBody");
const startDriverEmpty = document.getElementById("startDriverEmpty");

function makeCell(content) {
  const td = document.createElement("td");
  td.textContent = content;
  return td;
}

// init の driver は "A<br>氏名" の文字列の配列。枠（A〜F）と氏名に分ける
function parseDriverOptions(labels) {
  return (labels || []).map((label) => {
    const [letter, name] = label.split("<br>");
    return { letter, name };
  });
}

async function loadStartDrivers() {
  const auth = requireAuth(true);
  if (!auth) return;

  const data = await apiFetch(`${API}/entries/init`, {
    method: "GET",
    headers: { "X-Race-Id": auth.raceToken, Authorization: `Bearer ${auth.token}` },
  }); // common.js
  if (!data) return;

  renderStartDrivers(data, auth);
}

function renderStartDrivers(data, auth) {
  startDriverBody.innerHTML = "";
  startDriverEmpty.hidden = (data.carNum || []).length > 0;

  for (const carNum of data.carNum || []) {
    const current = data.startDriver?.[String(carNum)] ?? null;
    const options = parseDriverOptions(data.driver?.[String(carNum)]);

    const tr = document.createElement("tr");
    tr.appendChild(makeCell(carNum));
    tr.appendChild(makeCell(current ?? "未登録"));

    const select = document.createElement("select");
    for (const { letter, name } of options) {
      const opt = document.createElement("option");
      opt.value = letter;
      opt.textContent = `${letter}：${name}`;
      select.appendChild(opt);
    }
    if (current) select.value = current;
    const selectTd = document.createElement("td");
    selectTd.appendChild(select);
    tr.appendChild(selectTd);

    const btnTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = current ? "変更" : "登録";
    btn.disabled = options.length === 0;
    btn.addEventListener("click", () => saveStartDriver(auth, carNum, select.value, current));
    btnTd.appendChild(btn);
    tr.appendChild(btnTd);

    startDriverBody.appendChild(tr);
  }
}

async function saveStartDriver(auth, carNum, driver, current) {
  const data = await apiFetch(`${API}/entries/start-driver`, {
    method: current ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Race-Id": auth.raceToken,
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ carNum, driver }),
  }); // common.js
  if (!data) return;

  await loadStartDrivers();
}

loadStartDrivers();
