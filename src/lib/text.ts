/** Bỏ thẻ HTML (ghi chú lưu dạng Quill HTML) để lấy text thuần phục vụ tìm kiếm/hiển thị. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Đoạn trích ngắn quanh vị trí khớp `query` trong `text` (không phân biệt hoa/thường). */
export function snippetAround(text: string, query: string, radius = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const idx = flat.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return flat.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(flat.length, idx + query.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}
