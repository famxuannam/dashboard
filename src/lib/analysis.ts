import { getSupabaseServerClient } from "./supabase";

export type SessionRow = {
  startTime: string; // timestamp thô "YYYY-MM-DDTHH:mm:ss" (giờ treo tường, không timezone)
  endTime: string;
  project: string;
  durationMin: number;
};

export type AnalysisRow = SessionRow & {
  group: string; // "Nhóm" — từ mapping, hoặc = project nếu chưa gán
  hasMapping: boolean;
  dateKey: string; // "YYYY-MM-DD" theo giờ treo tường, dùng làm "Ngày"
  weekKey: string; // "YYYY-Www" tuần ISO (Thứ Hai đầu tuần)
  projectOriginal: string; // "Dự án gốc" — tên tag Forest thật, trước khi applyReadingInference() ghi đè `project`
};

const PAGE_SIZE = 1000;

/**
 * Nạp toàn bộ bảng `sessions` — PostgREST giới hạn 1000 dòng/lần mặc định, nên phải tự phân
 * trang bằng .range() thay vì gọi 1 lần rồi tưởng đã đủ (bug im lặng thật dễ gặp: dữ liệu vài
 * năm của 1 người dùng Forest có thể vượt 1000 phiên).
 */
export async function fetchAllSessions(): Promise<SessionRow[]> {
  const supabase = getSupabaseServerClient();
  const rows: SessionRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("sessions")
      .select("start_time, end_time, project, duration_min")
      .order("start_time", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        startTime: r.start_time,
        endTime: r.end_time,
        project: r.project,
        durationMin: r.duration_min,
      });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchMapping(): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("mapping").select("project, category");
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of data ?? []) map.set(r.project, r.category);
  return map;
}

function dateKeyOf(startTime: string): string {
  return startTime.slice(0, 10);
}

/** Tuần ISO "YYYY-Www", Thứ Hai là ngày đầu tuần — tương đương `%G-W%V` của pandas. */
export function isoWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7; // Thứ Hai = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // đưa về Thứ Năm cùng tuần ISO
  const isoYear = date.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);
  const weekNum = Math.round((date.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1;
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/** Thứ Hai (00:00) của tuần chứa `dateKey`, dạng "YYYY-MM-DD". */
export function mondayOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum);
  return date.toISOString().slice(0, 10);
}

/**
 * Tương đương phần đầu của prep_analysis_data() (join mapping + sinh cột kỳ). Suy luận
 * Gundam/Sách theo tag chung (phần còn lại của prep_analysis_data()) nằm ở
 * `applyReadingInference()` trong reading.ts — gọi SAU hàm này, vì cần đọc thêm `reading_log`.
 */
export function buildAnalysisRows(sessions: SessionRow[], mapping: Map<string, string>): AnalysisRow[] {
  return sessions.map((s) => {
    const mapped = mapping.get(s.project);
    const dateKey = dateKeyOf(s.startTime);
    return {
      ...s,
      group: mapped && mapped.trim() !== "" ? mapped : s.project,
      hasMapping: Boolean(mapped && mapped.trim() !== ""),
      dateKey,
      weekKey: isoWeekKey(dateKey),
      projectOriginal: s.project,
    };
  });
}
