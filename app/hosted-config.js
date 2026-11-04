// Public deployment setting only. Empty keeps every existing static/local flow.
// Set to the approved HTTPS FastAPI origin AFTER the deployment checklist passes.
export const HOSTED_API = "";
export function validatedHostedBase(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname))
      )
    )
      return "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
export function hostedBase() {
  return validatedHostedBase(HOSTED_API);
}
