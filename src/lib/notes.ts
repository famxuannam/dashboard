import { getSupabaseServerClient } from "./supabase";
import { addDaysToDateString } from "./date";

const PAGE_SIZE = 1000;

/** Toàn bộ bảng `notes` — dùng khi cần tra theo ngày bất kỳ trong lịch sử (Tìm kiếm, "Ngày này
 * năm trước"/"Ngày này tuần trước" ở Hôm nay), khác `fetchNotesInRange()` (1 khoảng ngày liền)
 * hay `fetchNoteForDate()` (đúng 1 ngày). */
export async function fetchAllNotesMap(): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const map = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("notes")
      .select("note_date, note")
      .order("note_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) map.set(r.note_date, r.note);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

/** Toàn bộ bảng `quick_notes`, gộp theo ngày — cùng lý do với `fetchAllNotesMap()`. */
export async function fetchAllQuickNotesMap(): Promise<Map<string, QuickNote[]>> {
  const supabase = getSupabaseServerClient();
  const map = new Map<string, QuickNote[]>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("quick_notes")
      .select("id, ts, note_text")
      .order("ts", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const dateKey = r.ts.slice(0, 10);
      const timeLabel = r.ts.match(/T?(\d{2}:\d{2})/)?.[1] ?? "";
      map.set(dateKey, [...(map.get(dateKey) ?? []), { id: r.id, timeLabel, text: r.note_text }]);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

/** Ghi chú chính trong khoảng [startDate, endDateExclusive) — dùng cho các trang cần nhiều ngày
 * cùng lúc (Báo cáo → Tuần), khác Hôm nay (chỉ 1 ngày, xem fetchNoteForDate()). */
export async function fetchNotesInRange(startDate: string, endDateExclusive: string): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("note_date, note")
    .gte("note_date", startDate)
    .lt("note_date", endDateExclusive);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of data ?? []) map.set(r.note_date, r.note);
  return map;
}

export type QuickNote = { id: number; timeLabel: string; text: string };

export async function fetchQuickNotesInRange(
  startDate: string,
  endDateExclusive: string
): Promise<Map<string, QuickNote[]>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quick_notes")
    .select("id, ts, note_text")
    .gte("ts", `${startDate}T00:00:00`)
    .lt("ts", `${endDateExclusive}T00:00:00`)
    .order("ts", { ascending: true });
  if (error) throw new Error(error.message);
  const map = new Map<string, QuickNote[]>();
  for (const r of data ?? []) {
    const dateKey = r.ts.slice(0, 10);
    const timeLabel = r.ts.match(/T?(\d{2}:\d{2})/)?.[1] ?? "";
    map.set(dateKey, [...(map.get(dateKey) ?? []), { id: r.id, timeLabel, text: r.note_text }]);
  }
  return map;
}

export async function fetchNoteForDate(dateKey: string): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("notes").select("note").eq("note_date", dateKey).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.note ?? "";
}

export async function fetchQuickNotesForDate(dateKey: string): Promise<QuickNote[]> {
  const map = await fetchQuickNotesInRange(dateKey, addDaysToDateString(dateKey, 1));
  return map.get(dateKey) ?? [];
}
