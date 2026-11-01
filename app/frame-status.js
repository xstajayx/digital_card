window.addEventListener("message", (event) => {
  const frame = document.querySelector("iframe");
  if (
    event.origin !== location.origin ||
    event.source !== frame?.contentWindow ||
    event.data?.type !== "card-fit"
  )
    return;
  const status = document.getElementById("fitStatus");
  status.textContent = event.data.valid
    ? ""
    : "Content does not fit this card. Choose smaller text (minimum 14px), or edit your message. All text is preserved; scroll the card to review it.";
});
