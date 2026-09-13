import type { AnalysisRow } from "./analysis";

/** Số ngày dữ liệu tối thiểu để 1 Nhóm/Dự án đủ điều kiện có "kỷ lục" riêng — tương đương
 * `RECORD_MIN_DAYS` ở app gốc (tránh 1 Dự án chỉ có đúng 1-2 ngày dữ liệu nghiễm nhiên "giữ kỷ
 * lục" ngày đó, vô nghĩa vì chưa có gì để so sánh). */
const RECORD_MIN_DAYS = 5;

export type DayBadge =
  | { kind: "overall"; rank: number }
  | { kind: "group"; name: string }
  | { kind: "project"; name: string };

function topDaysByHours(rows: AnalysisRow[], n: number): { dateKey: string; rank: number }[] {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.dateKey, (totals.get(r.dateKey) ?? 0) + r.durationMin);
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

  const ranked: { dateKey: string; minutes: number; rank: number }[] = [];
  let rank = 0;
  let prevMinutes: number | null = null;
  sorted.forEach(([dateKey, minutes], i) => {
    if (minutes !== prevMinutes) {
      rank = i + 1;
      prevMinutes = minutes;
    }
    ranked.push({ dateKey, minutes, rank });
  });
  // rank(method='min') + lọc <= n -- có thể trả nhiều hơn n dòng nếu đồng hạng ở biên (vd 3 ngày
  // cùng giữ hạng 3), khớp _top_days() ở app gốc.
  return ranked.filter((r) => r.rank <= n).map(({ dateKey, rank }) => ({ dateKey, rank }));
}

/** Với mỗi tên (Nhóm/Dự án) có đủ `RECORD_MIN_DAYS` ngày dữ liệu, tìm (các) ngày giữ kỷ lục giờ
 * nhiều nhất — đồng hạng thì CẢ HAI ngày đều giữ kỷ lục (khớp `_group_records()` ở app gốc). */
function groupRecords(rows: AnalysisRow[], key: "group" | "project"): Map<string, string[]> {
  const byName = new Map<string, AnalysisRow[]>();
  for (const r of rows) {
    const name = key === "group" ? r.group : r.project;
    byName.set(name, [...(byName.get(name) ?? []), r]);
  }
  const result = new Map<string, string[]>();
  for (const [name, groupRows] of byName) {
    const distinctDays = new Set(groupRows.map((r) => r.dateKey));
    if (distinctDays.size < RECORD_MIN_DAYS) continue;
    const daily = new Map<string, number>();
    for (const r of groupRows) daily.set(r.dateKey, (daily.get(r.dateKey) ?? 0) + r.durationMin);
    const best = Math.max(...daily.values());
    const bestDays = Array.from(daily.entries())
      .filter(([, minutes]) => minutes === best)
      .map(([dateKey]) => dateKey);
    result.set(name, bestDays);
  }
  return result;
}

/** "Bảng vàng": tra ngược ngày -> danh sách badge (top 3 ngày nhiều giờ nhất toàn thời gian +
 * kỷ lục riêng theo Nhóm/Dự án) — tương đương `_compute_alltime_records()` ở app gốc. `rows`
 * PHẢI là toàn bộ lịch sử (đã qua `applyReadingInference()`), không phải 1 ngày/kỳ lọc sẵn. */
export function computeDayBadges(rows: AnalysisRow[]): Map<string, DayBadge[]> {
  const dayBadges = new Map<string, DayBadge[]>();
  const add = (dateKey: string, badge: DayBadge) => {
    dayBadges.set(dateKey, [...(dayBadges.get(dateKey) ?? []), badge]);
  };

  for (const { dateKey, rank } of topDaysByHours(rows, 3)) {
    add(dateKey, { kind: "overall", rank });
  }

  // Kỷ lục Nhóm CHỈ tính trên phiên ĐÃ gán Nhóm thật (hasMapping) -- nếu không, "Nhóm" trùng tên
  // "Dự án" (fallback khi chưa gán) sẽ ra 2 badge đọc y hệt nhau cho cùng 1 khái niệm.
  for (const [name, days] of groupRecords(rows.filter((r) => r.hasMapping), "group")) {
    for (const d of days) add(d, { kind: "group", name });
  }
  for (const [name, days] of groupRecords(rows, "project")) {
    for (const d of days) add(d, { kind: "project", name });
  }

  return dayBadges;
}
