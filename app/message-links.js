export function emailDraft(url, { to = "", from = "" } = {}) {
  const subject = from
    ? `A little hello from ${from.replace(/[\r\n]/g, " ")}`
    : "Someone sent you a little hello";
  const body = `${to ? `Hello ${to},` : "Hello!"}\n\n${from ? `${from} has` : "Someone has"} made a card especially for you.\nTap the complete link to open your card:\n${url}\n\nNo account or app installation needed.\nSilent Hello · A little message. A big smile.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function smsDraft(url) {
  return `sms:?body=${encodeURIComponent(`A little message. A big smile. Open your Silent Hello card: ${url}`)}`;
}
