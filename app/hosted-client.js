import { hostedBase } from "./hosted-config.js";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export async function hostedRequest(
  path,
  {
    owner = "",
    key = "",
    body,
    method = "GET",
    image = false,
    type = "application/json",
  } = {},
) {
  const base = hostedBase();
  if (!base)
    throw new Error(
      "Hosted photos are not configured. Your local card is kept.",
    );
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 45000);
  try {
    const headers = {};
    if (owner) {
      if (!TOKEN.test(owner))
        throw new Error("Enter a valid private owner key.");
      headers.Authorization = `Bearer ${owner}`;
    }
    if (key) headers["Idempotency-Key"] = key;
    if (body !== undefined) headers["Content-Type"] = type;
    const response = await fetch(base + path, {
      method,
      headers,
      body,
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
    if (!response.ok) {
      let detail =
        "The hosted card service is temporarily unavailable. Your local card is kept.";
      try {
        const data = await response.json();
        if (typeof data.detail === "string" && data.detail.length < 300)
          detail = data.detail;
      } catch {}
      throw new Error(detail);
    }
    if (response.status === 204) return null;
    if (image) {
      if (response.headers.get("Content-Type")?.split(";")[0] !== "image/webp")
        throw new Error("This card photo could not be loaded.");
      const reader = response.body.getReader(),
        chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2 * 1024 * 1024)
            throw new Error("This card photo exceeds the supported size.");
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      return new Blob(chunks, { type: "image/webp" });
    }
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 50000)
          throw new Error("The hosted card response is too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const text = await new Blob(chunks).text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(
        "The hosted card service returned an unreadable response. Please try again later.",
      );
    if (error.name === "AbortError" || error instanceof TypeError)
      throw new Error(
        "The hosted card service could not be reached. Your local card is kept; try again later.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function hostedToken(value) {
  return typeof value === "string" && TOKEN.test(value);
}
