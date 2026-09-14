// DOM宣言
const excelButton = document.getElementById("excle");
const pdfButton   = document.getElementById("pdf");

// グローバル変数（showAllGimic.js の renderTable / filterAndSortEntries が参照する）
let entries = [];

// ── API取得 ──
async function loadEntries() {
  const auth = requireAuth(true);
  if (!auth) return;

  try {
    const response = await fetch(
      `${API}/entries/show?race_id=${encodeURIComponent(auth.raceId)}&act=1`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );
    const data = await response.json();

    if (handleApiError(response, data)) return;

    entries = Object.keys(data)
      .filter((key) => key !== "msg")
      .map((key) => {
        const value = data[key];
        return {
          managerId:    value.managerId,
          manager:      value.manager,
          pitNum:       value.pitNum,
          carNum:       value.carNum,
          className:    value.className,
          teamName:     value.teamName,
          retire:       value.retire,
          inDriver:     value.inDriver,
          outDriver:    value.outDriver,
          inTime:       value.inTime,
          outTime:      value.outTime,
          garageInTime: value.garageInTime,
          pitGap:       value.pitGap,
          tire:         value.tire,
          oil:          value.oil,
          note:         value.note,
        };
      });

    renderTable(); // showAllGimic.js が提供
  } catch (err) {
    console.error(err);
    alert("データの取得に失敗しました。サーバーまたはネットワークを確認してください。");
  }
}

// ── Excel 出力（SpreadsheetML / .xls）──
function exportExcel() {
  if (entries.length === 0) {
    alert("出力するデータがありません。");
    return;
  }

  const cols = [
    { key: "pitNum",    label: "ピット番号",       type: "Number" },
    { key: "carNum",    label: "ゼッケン番号",     type: "Number" },
    { key: "manager",   label: "担当者",           type: "String" },
    { key: "retire",    label: "リタイア",         type: "String", fmt: (v) => (v ? "はい" : "いいえ") },
    { key: "inDriver",  label: "インドライバー",   type: "String", fmt: (v) => v || "" },
    { key: "outDriver", label: "アウトドライバー", type: "String", fmt: (v) => v || "" },
    { key: "inTime",    label: "ピットイン",       type: "String", fmt: formatDatetime },
    { key: "outTime",   label: "ピットアウト",     type: "String", fmt: formatDatetime },
    { key: "pitGap",    label: "ピットGAP",        type: "String", fmt: formatGap },
    { key: "className", label: "クラス名",         type: "String" },
    { key: "teamName",  label: "チーム名",         type: "String" },
    { key: "note",      label: "備考",             type: "String", fmt: (v) => v || "" },
  ];

  const esc = (s) =>
    String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerRow =
    "<Row>" +
    cols.map((c) => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(c.label)}</Data></Cell>`).join("") +
    "</Row>";

  const dataRows = filterAndSortEntries() // showAllGimic.js が提供（フィルターなし・全件）
    .map((e) => {
      const cells = cols.map((c) => {
        const val = c.fmt ? c.fmt(e[c.key]) : e[c.key];
        return `<Cell><Data ss:Type="${c.type}">${esc(val)}</Data></Cell>`;
      });
      return `<Row>${cells.join("")}</Row>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="h"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="ピット情報">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pit-log-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── PDF 出力（ブラウザ印刷）──
function exportPdf() {
  if (entries.length === 0) {
    alert("出力するデータがありません。");
    return;
  }
  window.print();
}

// ── イベント ──
excelButton.addEventListener("click", exportExcel);
pdfButton.addEventListener("click", exportPdf);

loadEntries();
