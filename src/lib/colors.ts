/** Màu HSL ổn định suy từ tên (Nhóm/Dự án) — cùng 1 tên luôn ra cùng 1 màu trong cùng phiên,
 * không cần bảng màu cố định như `build_color_map()` ở app gốc (bản rút gọn, chưa gán màu theo
 * Nhóm rồi tô sắc độ cho Dự án con cùng Nhóm). */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 42%, 45%)`;
}
