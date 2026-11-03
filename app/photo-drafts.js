// One explicit photo draft, separate from the existing illustrated localStorage draft.
const DB = "silent-hello-photo-drafts-v1";
export async function photoDraft(operation, value) {
  if (!globalThis.indexedDB)
    throw new Error(
      "Photo draft storage is unavailable. Keep this tab open; your photo is only in memory.",
    );
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error("Close other Silent Hello tabs, then try saving again."),
        );
    });
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          "drafts",
          operation === "read" ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("drafts");
      const request =
        operation === "read"
          ? store.get("photo")
          : operation === "delete"
            ? store.delete("photo")
            : store.put(value, "photo");
      let result;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch {
    throw new Error(
      "The photo draft could not be accessed or saved. Storage may be blocked or full. Keep this tab open; your current photo is still editable.",
    );
  } finally {
    db?.close();
  }
}
