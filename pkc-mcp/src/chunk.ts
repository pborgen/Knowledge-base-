export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - overlap;
  }
  return chunks;
}
