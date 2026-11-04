import { illustration } from "./illustrations.js";
export const PAPERS = {
  ivory: ["#fff7e7", "#453a33"],
  linen: ["#f1eadc", "#433c34"],
  white: ["#fffefd", "#323238"],
  kraft: ["#dfc29b", "#3a2b20"],
  pastel: ["#faeaf0", "#4f3042"],
  textured: ["#f5f0e3", "#443c36"],
};
export function defaultPhysical() {
  return {
    paper: "ivory",
    coverGreeting: "",
    coverArt: "",
    insideArt: "default",
    handwriting: "pacifico",
    signature: "pacifico",
    effects: false,
  };
}
export function validatePhysical(raw, themeId) {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !Object.hasOwn(PAPERS, raw.paper) ||
    typeof raw.coverGreeting !== "string" ||
    raw.coverGreeting.length > 160 ||
    ![
      "fredoka",
      "pacifico",
      "quicksand",
      "poppins",
      "nunito",
      "playfair",
    ].includes(raw.handwriting) ||
    ![
      "fredoka",
      "pacifico",
      "quicksand",
      "poppins",
      "nunito",
      "playfair",
    ].includes(raw.signature) ||
    typeof raw.effects !== "boolean"
  )
    throw new Error("Invalid folded card configuration.");
  if (
    typeof raw.coverArt !== "string" ||
    (!["", "none"].includes(raw.coverArt) &&
      !illustration(themeId, raw.coverArt))
  )
    throw new Error("Invalid cover artwork.");
  if (
    typeof raw.insideArt !== "string" ||
    (!["", "default"].includes(raw.insideArt) &&
      !illustration(themeId, raw.insideArt))
  )
    throw new Error("Invalid inside illustration.");
  if (
    Object.hasOwn(raw, "coverName") &&
    (typeof raw.coverName !== "string" || raw.coverName.length > 120)
  )
    throw new Error("Invalid cover name.");
  return {
    ...(Object.hasOwn(raw, "coverName") ? { coverName: raw.coverName } : {}),
    paper: raw.paper,
    coverGreeting: raw.coverGreeting,
    coverArt: raw.coverArt,
    insideArt: raw.insideArt,
    handwriting: raw.handwriting,
    signature: raw.signature,
    effects: raw.effects,
  };
}
