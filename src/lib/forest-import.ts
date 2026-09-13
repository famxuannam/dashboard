/** Parser CSV thuần (không phụ thuộc thư viện ngoài) — RFC4180, xử lý field có dấu phẩy/xuống
 * dòng trong ngoặc kép. Dùng cho CSV xuất từ Forest (không có field lồng phức tạp nhưng tiêu đề
 * phiên có thể chứa dấu phẩy, cần bọc quote đúng chuẩn). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      // bỏ qua, \n ngay sau đó (nếu có) mới thực sự kết thúc dòng
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

type DateParts = { y: number; mo: number; d: number; h: number; mi: number; s: number };

/** Tách trực tiếp các thành phần ngày giờ từ chuỗi thô — KHÔNG qua `new Date()` để tránh mọi suy
 * diễn múi giờ (CSV Forest là giờ treo tường thuần, không mang thông tin múi giờ — xem
 * `supabase_schema.sql` ở repo gốc). Chấp nhận "YYYY-MM-DD"/"YYYY/MM/DD" kèm "HH:MM" hoặc
 * "HH:MM:SS", phân cách bằng khoảng trắng hoặc "T". */
function parseWallClock(raw: string): DateParts | null {
  const m = raw
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return { y: Number(y), mo: Number(mo), d: Number(d), h: Number(h), mi: Number(mi), s: Number(s ?? "0") };
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/** "YYYY-MM-DD HH:MM:SS" — tương đương `_fmt_ts()` ở app gốc, dùng làm khoá dedupe/khoá lưu. */
export function formatWallClock(p: DateParts): string {
  return `${pad(p.y, 4)}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

function toComparableNumber(p: DateParts): number {
  // Chỉ dùng để TÍNH HIỆU (thời lượng) — không phải mốc thời gian thật, nên quy ước UTC nào cũng
  // được miễn nhất quán giữa 2 vế trừ.
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
}

export type ForestImportStats = { raw: number; failed: number; unset: number; valid: number };
export type ForestRow = { startTime: string; endTime: string; project: string; durationMin: number };

const PROJECT_HEADERS = ["Tag", "Project"];
const START_HEADERS = ["Start Time"];
const END_HEADERS = ["End Time"];
const SUCCESS_HEADERS = ["Is Success"];

/** Tương đương parse_forest_csv() trong import_parsers.py. */
export function parseForestCsv(csvText: string): {
  rows: ForestRow[];
  stats: ForestImportStats;
  missing: string[];
} {
  const table = parseCsv(csvText);
  const emptyStats: ForestImportStats = { raw: 0, failed: 0, unset: 0, valid: 0 };
  if (table.length === 0) {
    return { rows: [], stats: emptyStats, missing: ["Dự án", "Thời gian bắt đầu", "Thời gian kết thúc"] };
  }

  const header = table[0].map((h) => h.trim());
  const findCol = (names: string[]) => header.findIndex((h) => names.includes(h));
  const projectIdx = findCol(PROJECT_HEADERS);
  const startIdx = findCol(START_HEADERS);
  const endIdx = findCol(END_HEADERS);
  const successIdx = findCol(SUCCESS_HEADERS);

  const dataRows = table.slice(1);
  const stats: ForestImportStats = { raw: dataRows.length, failed: 0, unset: 0, valid: 0 };

  const missing: string[] = [];
  if (projectIdx === -1) missing.push("Dự án");
  if (startIdx === -1) missing.push("Thời gian bắt đầu");
  if (endIdx === -1) missing.push("Thời gian kết thúc");
  if (missing.length > 0) return { rows: [], stats, missing };

  let candidates = dataRows;
  if (successIdx !== -1) {
    const before = candidates.length;
    candidates = candidates.filter((r) => (r[successIdx] ?? "").trim().toLowerCase() === "true");
    stats.failed = before - candidates.length;
  }

  const rows: ForestRow[] = [];
  let unsetCount = 0;
  for (const r of candidates) {
    const project = (r[projectIdx] ?? "").trim();
    if (!project) continue; // dropna(subset=['Dự án'])
    const start = parseWallClock(r[startIdx] ?? "");
    const end = parseWallClock(r[endIdx] ?? "");
    if (!start || !end) continue; // dropna sau to_datetime(errors='coerce')
    if (project.toLowerCase() === "unset") {
      unsetCount++;
      continue;
    }
    const durationMin = Math.round((toComparableNumber(end) - toComparableNumber(start)) / 60000);
    rows.push({ startTime: formatWallClock(start), endTime: formatWallClock(end), project, durationMin });
  }
  stats.unset = unsetCount;
  stats.valid = rows.length;
  return { rows, stats, missing: [] };
}
