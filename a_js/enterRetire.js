const carNumber = document.getElementById("carNumber");
const notes = document.getElementById("notes");
const reason = document.getElementById("reason");
const submitBtn = document.getElementById("submit");
const toast = document.getElementById("toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

let isSubmitting = false;

document.getElementById("retireForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const auth = requireAuth(true);
  if (!auth) return;

  const carNum = parseInt(carNumber.value);
  if (!carNum) {
    alert("車番を入力してください");
    return;
  }

  const reasonVal = reason.value.trim();
  if (!reasonVal) {
    alert("リタイア理由を入力してください");
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API}/entries/retire?race_id=${encodeURIComponent(auth.raceId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ carNum, reason: reasonVal }),
    });
    const data = await res.json();
    if (handleApiError(res, data)) return;

    showToast("送信完了");
    carNumber.value = "";
    reason.value = "";
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
  }
});
