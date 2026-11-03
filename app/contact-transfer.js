import { exportContacts, importContacts } from "../engine/card-assistant.js";
const status = document.getElementById("occasionStatus"),
  error = document.getElementById("occasionError");
document.getElementById("exportContacts").onclick = () => {
  try {
    const url = URL.createObjectURL(
      new Blob([exportContacts()], { type: "application/json;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "silent-hello-family-friends.json";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent =
      "Private records export prepared. Check your downloads; nothing was uploaded.";
  } catch (e) {
    error.textContent = e.message;
  }
};
document.getElementById("importContacts").onchange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 2_000_000)
      throw new Error("Choose an occasion JSON export under 2 MB.");
    const result = importContacts(await file.text(), {
      replace: document.getElementById("replaceContacts").checked,
    });
    status.textContent = `Imported ${result.added} records and updated ${result.updated}. Reloading your list…`;
    location.reload();
  } catch (e) {
    error.textContent = e.message;
  }
};
