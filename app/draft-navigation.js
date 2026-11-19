// Use the browser's leave-page prompt so Back, reload and ordinary links work alike.
export function draftNavigation() {
  function confirmLeave(event) {
    event.preventDefault();
    event.returnValue = true;
  }
  return (dirty) => {
    if (dirty) window.addEventListener("beforeunload", confirmLeave);
    else window.removeEventListener("beforeunload", confirmLeave);
  };
}
