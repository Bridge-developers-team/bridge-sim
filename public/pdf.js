// Read a PDF in the browser with pdf.js. The file never leaves the device;
// only the extracted text goes into the profile box.
const PDFJS = "/vendor/pdfjs/pdf.min.mjs";
const WORKER = "/vendor/pdfjs/pdf.worker.min.mjs";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 10;

let lib = null;
async function load() {
  if (!lib) {
    lib = await import(PDFJS);
    lib.GlobalWorkerOptions.workerSrc = WORKER;
  }
  return lib;
}

// Rebuild lines from pdf.js text items: keep end-of-line markers, and start a
// new line when the baseline (y) jumps.
export function pageText(items) {
  let out = "";
  let lastY = null;
  for (const it of items) {
    if (typeof it.str !== "string") continue;
    const y = Array.isArray(it.transform) ? Math.round(it.transform[5]) : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
    out += it.str;
    if (it.hasEOL) out += "\n";
    else if (it.str && !it.str.endsWith(" ")) out += " ";
    if (y !== null) lastY = y;
  }
  return out;
}

export function tidy(text) {
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Returns { text, pages, totalPages }. Throws with a user-facing message.
export async function extractPdfText(file) {
  if (!file) throw new Error("No file selected.");
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) throw new Error("Please choose a PDF file.");
  if (file.size > MAX_PDF_BYTES) throw new Error("That PDF is over 5 MB. Export a smaller copy or paste the text.");
  const pdfjs = await load();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    standardFontDataUrl: "/vendor/pdfjs-fonts/",
    cMapUrl: "/vendor/pdfjs-cmaps/",
    cMapPacked: true,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    task.destroy?.();
    if (err?.name === "PasswordException") throw new Error("That PDF is password-protected. Remove the password or paste the text.");
    throw new Error("Could not open that PDF. Try exporting it again, or paste the text.");
  }
  try {
    const totalPages = doc.numPages;
    const pages = Math.min(totalPages, MAX_PDF_PAGES);
    const parts = [];
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(pageText(content.items));
    }
    return { text: tidy(parts.join("\n\n")), pages, totalPages };
  } finally {
    // Free the worker and memory (loading-task API works across pdf.js versions).
    await task.destroy?.();
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}
