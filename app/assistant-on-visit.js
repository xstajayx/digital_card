import { runLocalPreparation } from "./assistant-runtime.js";
// Local demonstration only: no worker, network delivery or closed-browser timer.
runLocalPreparation().catch((error) => {
  const note = document.createElement("p");
  note.className = "helper";
  note.setAttribute("role", "status");
  note.textContent =
    "Local card preparation could not finish. Your existing records were kept. Open My Prepared Cards to review: " +
    error.message;
  document.querySelector("main").append(note);
});
