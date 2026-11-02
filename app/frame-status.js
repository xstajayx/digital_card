window.addEventListener("message", (event) => {
  const frame = document.querySelector("iframe");
  if (
    event.origin !== location.origin ||
    event.source !== frame?.contentWindow ||
    event.data?.type !== "card-fit"
  )
    return;
  const valid = event.data.valid === true;
  document.getElementById("fitStatus").textContent = valid
    ? ""
    : event.data.error ||
      "This message needs more room. Choose smaller text (minimum 14px) or shorten it. All the words are preserved below.";
  const full = document.getElementById("fullMessage");
  if (full) {
    full.hidden = valid;
    full.open = !valid;
  }
});
