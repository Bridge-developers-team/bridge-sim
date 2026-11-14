/** Read a CV file in the browser. PDFs with selectable text are read by pdf.js,
 * loaded only when someone actually picks a PDF; the file never leaves the
 * device. Scanned PDFs have no text, and we say so instead of guessing. */

const MAX_BYTES = 5 * 1024 * 1024;

export async function readCvFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("That file is over 5 MB. Paste the text instead.");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) return (await file.text()).trim();
    throw new Error("Use a PDF or a .txt file, or paste the text.");
  }
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 10); n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      } else if (item.str && !item.str.endsWith(" ")) {
        line += " ";
      }
    }
    if (line.trim()) lines.push(line);
    pages.push(lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"));
  }
  await task.destroy(); // frees the worker
  const text = pages.join("\n\n").trim();
  if (text.length < 40) {
    throw new Error("This PDF looks scanned (no selectable text). Paste the text instead.");
  }
  return text;
}
