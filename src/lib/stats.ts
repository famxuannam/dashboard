import { isoWeekKey, type AnalysisRow } from "./analysis";
import { todayVN } from "./date";

export type StreakStats = { total: number; longest: number; current: number; gap: number | null };

/** Tương đương _streak_stats() trong app.py: tổng số ngày hoạt động, chuỗi dài nhất, chuỗi hiện
 * tại (còn hiệu lực nếu lần gần nhất là hôm nay/hôm qua). */
export function streakStats(rows: AnalysisRow[]): StreakStats {
  const uniqueDates = Array.from(new Set(rows.map((r) => r.dateKey))).sort();
  if (uniqueDates.length === 0) return { total: 0, longest: 0, current: 0, gap: null };

  const dayMs = 86400000;
  const toUTC = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };

  let longest = 1;
  let runLength = 1;
  let lastRunLength = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diffDays = (toUTC(uniqueDates[i]) - toUTC(uniqueDates[i - 1])) / dayMs;
    runLength = diffDays > 1 ? 1 : runLength + 1;
    longest = Math.max(longest, runLength);
    lastRunLength = runLength;
  }

  const lastDate = uniqueDates[uniqueDates.length - 1];
  const gap = Math.round((toUTC(todayVN()) - toUTC(lastDate)) / dayMs);
  const current = gap <= 1 ? lastRunLength : 0;

  return { total: uniqueDates.length, longest, current, gap };
}

export function avgSessionMin(rows: AnalysisRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, r) => sum + r.durationMin, 0) / rows.length;
}

export type TopEntry = { name: string; minutes: number };

/** Top n theo tổng phút, gộp theo `key` ("group" hoặc "project"). */
export function topN(rows: AnalysisRow[], key: "group" | "project", n: number): TopEntry[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const name = key === "group" ? r.group : r.project;
    totals.set(name, (totals.get(name) ?? 0) + r.durationMin);
  }
  return Array.from(totals.entries())
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, n);
}

export type WeekPoint = { weekKey: string; monday: string; hours: number };

/** Tổng giờ mỗi tuần, `weeks` tuần ISO gần nhất tính đến tuần chứa `todayVN()`. */
export function weeklyTotals(rows: AnalysisRow[], weeks: number): WeekPoint[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.weekKey, (totals.get(r.weekKey) ?? 0) + r.durationMin);
  }
  const today = todayVN();
  const points: WeekPoint[] = [];
  const [y, m, d] = today.split("-").map(Number);
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1, d - i * 7));
    const dateKey = date.toISOString().slice(0, 10);
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum);
    const monday = date.toISOString().slice(0, 10);
    const weekKey = isoWeekKey(dateKey);
    points.push({ weekKey, monday, hours: (totals.get(weekKey) ?? 0) / 60 });
  }
  return points;
}
