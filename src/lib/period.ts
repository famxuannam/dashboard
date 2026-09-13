import { isoWeekKey, type AnalysisRow } from "./analysis";
import { addDaysToDateString } from "./date";
import { topN, type TopEntry } from "./stats";

export const VN_DOW = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

/** 0=Thứ Hai .. 6=Chủ Nhật, tương đương `.dt.dayofweek` (đã lệch 0 để khớp quy ước ISO). */
export function dowIndexMonday0(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (dt.getUTCDay() + 6) % 7;
}

/** "Sáng"/"Chiều"/"Tối"/"Khuya" theo giờ trong ngày — tương đương `_buoi_of()`. */
export function buoiOf(hour: number): string {
  if (hour >= 5 && hour < 11) return "Sáng";
  if (hour >= 11 && hour < 17) return "Chiều";
  if (hour >= 17 && hour < 22) return "Tối";
  return "Khuya";
}

function toEpochMinutes(ts: string): number {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  const [, y, mo, d, h, mi] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) / 60000;
}

export type SessionFlowStats = { longestBlockMin: number; longestGapMin: number | null };

/** Khối tập trung liền mạch dài nhất (các phiên cách nhau < `gapMin` phút gộp làm 1 khối) +
 * khoảng nghỉ dài nhất giữa 2 khối — tương đương `_session_flow_stats()`. `rows` PHẢI đã sắp
 * theo `startTime` tăng dần. */
export function sessionFlowStats(rows: AnalysisRow[], gapMin = 15): SessionFlowStats {
  if (rows.length === 0) return { longestBlockMin: 0, longestGapMin: null };
  const blocks: { start: number; end: number }[] = [
    { start: toEpochMinutes(rows[0].startTime), end: toEpochMinutes(rows[0].endTime) },
  ];
  for (const r of rows.slice(1)) {
    const start = toEpochMinutes(r.startTime);
    const end = toEpochMinutes(r.endTime);
    const last = blocks[blocks.length - 1];
    if (start - last.end < gapMin) {
      last.end = Math.max(last.end, end);
    } else {
      blocks.push({ start, end });
    }
  }
  const longestBlockMin = Math.max(...blocks.map((b) => b.end - b.start));
  if (blocks.length < 2) return { longestBlockMin, longestGapMin: null };
  const gaps = blocks.slice(1).map((b, i) => b.start - blocks[i].end);
  return { longestBlockMin, longestGapMin: Math.max(...gaps) };
}

/** Thứ Hai (00:00) của tuần ISO "YYYY-Www", dạng "YYYY-MM-DD". */
export function mondayOfIsoWeek(weekKey: string): string {
  const [yearStr, wStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const week = Number(wStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Dow);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}

export function prevWeekKey(weekKey: string): string {
  return isoWeekKey(addDaysToDateString(mondayOfIsoWeek(weekKey), -7));
}

export function nextWeekKey(weekKey: string): string {
  return isoWeekKey(addDaysToDateString(mondayOfIsoWeek(weekKey), 7));
}

export function listWeeks(rows: AnalysisRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.weekKey))).sort();
}

export type WeekSummary = {
  weekKey: string;
  year: number;
  weekNum: number;
  monday: string;
  sunday: string;
  totalMin: number;
  activeDays: number;
  sessionsCount: number;
  byDay: { dateKey: string; dow: string; hours: number }[];
  byGroup: TopEntry[];
  byProject: TopEntry[];
};

export function buildWeekSummary(allRows: AnalysisRow[], weekKey: string): WeekSummary {
  const [yearStr, wStr] = weekKey.split("-W");
  const monday = mondayOfIsoWeek(weekKey);
  const sunday = addDaysToDateString(monday, 6);
  const weekRows = allRows.filter((r) => r.weekKey === weekKey);
  const totalMin = weekRows.reduce((s, r) => s + r.durationMin, 0);
  const activeDays = new Set(weekRows.map((r) => r.dateKey)).size;

  const byDayMin = new Map<string, number>();
  for (const r of weekRows) byDayMin.set(r.dateKey, (byDayMin.get(r.dateKey) ?? 0) + r.durationMin);
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToDateString(monday, i);
    return { dateKey, dow: VN_DOW[i], hours: (byDayMin.get(dateKey) ?? 0) / 60 };
  });

  return {
    weekKey,
    year: Number(yearStr),
    weekNum: Number(wStr),
    monday,
    sunday,
    totalMin,
    activeDays,
    sessionsCount: weekRows.length,
    byDay,
    byGroup: topN(weekRows, "group", Infinity),
    byProject: topN(weekRows, "project", Infinity),
  };
}

/** Trung bình tổng giờ/tuần trên MỌI tuần khác `weekKey` — bản đơn giản hoá của
 * `_period_comparison()` ở app gốc (KHÔNG cắt theo số ngày đã trôi qua của tuần hiện tại). */
export function avgWeekHoursExcluding(allRows: AnalysisRow[], weekKey: string): number {
  const totals = new Map<string, number>();
  for (const r of allRows) {
    if (r.weekKey === weekKey) continue;
    totals.set(r.weekKey, (totals.get(r.weekKey) ?? 0) + r.durationMin);
  }
  if (totals.size === 0) return 0;
  const sum = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  return sum / totals.size / 60;
}

/** Trung bình tổng giờ/ngày trên MỌI ngày khác `dateKey` cùng thứ trong tuần — dùng cho chip "vs
 * TB các Thứ X" ở trang Hôm nay. */
export function averageHoursForWeekday(rows: AnalysisRow[], dateKey: string): number {
  const targetDow = dowIndexMonday0(dateKey);
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.dateKey === dateKey) continue;
    if (dowIndexMonday0(r.dateKey) !== targetDow) continue;
    totals.set(r.dateKey, (totals.get(r.dateKey) ?? 0) + r.durationMin);
  }
  if (totals.size === 0) return 0;
  const sum = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  return sum / totals.size / 60;
}
