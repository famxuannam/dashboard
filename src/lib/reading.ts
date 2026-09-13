import { getSupabaseServerClient } from "./supabase";
import type { AnalysisRow } from "./analysis";

export const GUNDAM_TAG = "Gundam";
export const BOOKS_TAG = "Reading";

const PAGE_SIZE = 1000;

export type ReadingLogEntry = {
  completedDate: string; // timestamp thô
  bookRaw: string; // "Sách (gốc)" — tên Reminder List nguyên văn ("Tác giả - Tên sách"/"Gundam - Tên series")
  title: string; // tiêu đề phần/chương đã hoàn thành
  book: string; // "Cuốn sách" — đã tách khỏi bookRaw qua bookTitle()
};

/** Reminder List series Gundam (không phải sách) — nhận diện qua tiền tố "gundam". */
export function isGundamList(listName: string): boolean {
  return listName.trim().toLowerCase().startsWith("gundam");
}

/** "Tác giả - Tên sách" -> "Tên sách" (cũng dùng cho "Gundam - Tên series" -> "Tên series"). */
export function bookTitle(listName: string): string {
  const s = listName.trim();
  const sepWithSpace = s.indexOf(" - ");
  if (sepWithSpace !== -1) return s.slice(sepWithSpace + 3).trim();
  const sepPlain = s.indexOf("-");
  if (sepPlain !== -1) return s.slice(sepPlain + 1).trim();
  return s;
}

export async function fetchReadingLog(): Promise<ReadingLogEntry[]> {
  const supabase = getSupabaseServerClient();
  const rows: ReadingLogEntry[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("reading_log")
      .select("completed_date, book, title")
      .order("completed_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({ completedDate: r.completed_date, bookRaw: r.book, title: r.title, book: bookTitle(r.book) });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchOverrides(
  table: "gundam_overrides" | "book_overrides",
  column: "series" | "book"
): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(table).select(`session_date, ${column}`);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of (data ?? []) as unknown as Record<string, string>[]) {
    map.set(r.session_date, r[column]);
  }
  return map;
}

export function fetchGundamOverrides(): Promise<Map<string, string>> {
  return fetchOverrides("gundam_overrides", "series");
}

export function fetchBookOverrides(): Promise<Map<string, string>> {
  return fetchOverrides("book_overrides", "book");
}

type Mark = { dateKey: string; book: string };

function toEpochDay(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

/** 1 mốc/ngày (giữ mốc SỚM NHẤT trong ngày nếu hoàn thành nhiều phần cùng ngày ở nhiều
 * sách/series khác nhau) — tương đương `.drop_duplicates('_d', keep='first')` sau khi sort theo
 * "Ngày hoàn thành" trong _assign_reading_sessions(). */
function buildMarks(entries: ReadingLogEntry[]): Mark[] {
  const sorted = [...entries].sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const seen = new Set<string>();
  const marks: Mark[] = [];
  for (const e of sorted) {
    const dateKey = e.completedDate.slice(0, 10);
    if (seen.has(dateKey)) continue;
    seen.add(dateKey);
    marks.push({ dateKey, book: e.book });
  }
  return marks;
}

/** Mốc hoàn thành GẦN NHẤT (trước hoặc sau) với `dateKey` — tương đương
 * `pd.merge_asof(..., direction='nearest')`. `marks` phải đã sắp theo dateKey tăng dần. */
function nearestBook(dateKey: string, marks: Mark[]): string | undefined {
  if (marks.length === 0) return undefined;
  const target = toEpochDay(dateKey);
  let lo = 0;
  let hi = marks.length - 1;
  if (target <= toEpochDay(marks[0].dateKey)) return marks[0].book;
  if (target >= toEpochDay(marks[hi].dateKey)) return marks[hi].book;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (toEpochDay(marks[mid].dateKey) <= target) lo = mid;
    else hi = mid;
  }
  const dLo = Math.abs(target - toEpochDay(marks[lo].dateKey));
  const dHi = Math.abs(toEpochDay(marks[hi].dateKey) - target);
  return dLo <= dHi ? marks[lo].book : marks[hi].book;
}

export type ReadingContext = {
  rlGundam: ReadingLogEntry[];
  rlBooks: ReadingLogEntry[];
  gundamMarks: Mark[];
  bookMarks: Mark[];
  gundamOverrides: Map<string, string>;
  bookOverrides: Map<string, string>;
};

export async function loadReadingContext(): Promise<ReadingContext> {
  const [rlAll, gundamOverrides, bookOverrides] = await Promise.all([
    fetchReadingLog(),
    fetchGundamOverrides(),
    fetchBookOverrides(),
  ]);
  const rlGundam = rlAll.filter((r) => isGundamList(r.bookRaw));
  const rlBooks = rlAll.filter((r) => !isGundamList(r.bookRaw));
  return {
    rlGundam,
    rlBooks,
    gundamMarks: buildMarks(rlGundam),
    bookMarks: buildMarks(rlBooks),
    gundamOverrides,
    bookOverrides,
  };
}

/**
 * Tương đương đoạn suy luận Gundam/Sách trong prep_analysis_data(): ghi đè `project` cho phiên
 * tag chung GUNDAM_TAG/BOOKS_TAG thành tên series/cuốn cụ thể (ưu tiên gán tay trong
 * gundam_overrides/book_overrides, sau đó tới suy luận "lần hoàn thành gần nhất"). Không suy
 * luận được (chưa có reading_log đối chiếu) → giữ nguyên tên tag gốc, không phải bug.
 */
export function applyReadingInference(rows: AnalysisRow[], ctx: ReadingContext): AnalysisRow[] {
  return rows.map((r) => {
    if (r.project === GUNDAM_TAG && ctx.gundamMarks.length > 0) {
      const guess = nearestBook(r.dateKey, ctx.gundamMarks);
      return { ...r, project: ctx.gundamOverrides.get(r.dateKey) ?? guess ?? r.project };
    }
    if (r.project === BOOKS_TAG && ctx.bookMarks.length > 0) {
      const guess = nearestBook(r.dateKey, ctx.bookMarks);
      return { ...r, project: ctx.bookOverrides.get(r.dateKey) ?? guess ?? r.project };
    }
    return r;
  });
}

export type BookSummary = {
  book: string;
  partsCount: number;
  latestDate: string;
  latestTitle: string;
};

/** Tổng hợp theo cuốn/series: số phần đã hoàn thành + phần gần nhất — tương đương phần "nguồn
 * Reminders" của bảng "Chi tiết từng cuốn" (_render_stats_table()). */
export function summarizeByBook(entries: ReadingLogEntry[]): Map<string, BookSummary> {
  const map = new Map<string, BookSummary>();
  for (const e of entries) {
    const existing = map.get(e.book);
    if (!existing || e.completedDate > existing.latestDate) {
      map.set(e.book, {
        book: e.book,
        partsCount: (existing?.partsCount ?? 0) + 1,
        latestDate: e.completedDate,
        latestTitle: e.title,
      });
    } else {
      existing.partsCount += 1;
    }
  }
  return map;
}
