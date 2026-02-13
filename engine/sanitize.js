export function sanitizeGiftUrl(input) {
  if (typeof input !== 'string') return '';

  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) return '';

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return '';
  }

  if (url.protocol !== 'https:') return '';
  if (url.username || url.password) return '';

  const href = url.href;
  return href.length <= 500 ? href : '';
}
