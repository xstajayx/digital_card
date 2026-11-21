import { decodeJar } from "../engine/heart-jar.js";
import { presentJar } from "./jar-presentation.js";

const root = document.getElementById("gift");
const status = document.getElementById("giftError");
const invitation = document.getElementById("jarReturn");
function load() {
  root.replaceChildren();
  status.hidden = true;
  invitation.hidden = true;
  try {
    const hash = location.hash;
    presentJar(root, decodeJar(hash.startsWith("#j=") ? hash.slice(3) : ""));
    invitation.hidden = false;
  } catch (error) {
    status.hidden = false;
    status.textContent = error.message;
  }
}
window.addEventListener("hashchange", load);
load();
document.querySelector(".home-skip").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("main").focus();
});
