import type { AnalysisRow } from "@/lib/analysis";
import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference, type ReadingLogEntry } from "@/lib/reading";
import { todayVN, addDaysToDateString, formatDurationMin } from "@/lib/date";
import { buoiOf, averageHoursForWeekday, sessionFlowStats } from "@/lib/period";
import { fetchNoteForDate, fetchQuickNotesForDate, fetchAllNotesMap, fetchAllQuickNotesMap, type QuickNote } from "@/lib/notes";
import { computeDayBadges, type DayBadge } from "@/lib/records";
import NoteEditor from "@/components/NoteEditor";
import DayPicker from "@/components/DayPicker";
import DayTimeline from "@/components/DayTimeline";
import RankedBars from "@/components/RankedBars";
import SameDayCard, { type SameDayData } from "@/components/SameDayCard";

export const dynamic = "force-dynamic";

const VN_DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function timeOfDay(ts: string): string {
  const match = ts.match(/T?(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : ts;
}

function weekdayNameOf(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return VN_DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function formatDateVN(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dow = weekdayNameOf(dateKey);
  return `${dow}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function shortDateVN(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${weekdayNameOf(dateKey)}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

/** Gộp số liệu 1 ngày bất kỳ (phiên/đọc sách/ghi chú) từ dữ liệu ĐÃ nạp sẵn cho cả trang — dùng
 * cho "Ngày này tuần trước"/"Ngày này năm trước", tránh mỗi thẻ tự query Supabase riêng. */
function buildSameDayData(
  dateKey: string,
  label: string,
  rows: AnalysisRow[],
  readingEntries: ReadingLogEntry[],
  notesMap: Map<string, string>,
  quickNotesMap: Map<string, QuickNote[]>,
  dayBadgesMap: Map<string, DayBadge[]>
): SameDayData {
  const dayRows = rows.filter((r) => r.dateKey === dateKey);
  const stats =
    dayRows.length > 0
      ? {
          minutes: dayRows.reduce((s, r) => s + r.durationMin, 0),
          sessions: dayRows.length,
          startTime: dayRows.reduce((min, r) => (r.startTime < min ? r.startTime : min), dayRows[0].startTime),
          endTime: dayRows.reduce((max, r) => (r.endTime > max ? r.endTime : max), dayRows[0].endTime),
        }
      : null;
  return {
    dateKey,
    label,
    badges: dayBadgesMap.get(dateKey) ?? [],
    stats,
    readingParts: readingEntries
      .filter((e) => e.completedDate.slice(0, 10) === dateKey)
      .map((e) => ({ book: e.book, title: e.title })),
    quickNotes: (quickNotesMap.get(dateKey) ?? []).map((q) => q.text),
    noteHtml: notesMap.get(dateKey) ?? null,
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const sp = await searchParams;
  const today = todayVN();
  const selectedDay = sp.day && sp.day <= today ? sp.day : today;

  const [sessions, mapping, readingCtx, note, quickNotes, notesMap, quickNotesMap] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
    fetchNoteForDate(selectedDay),
    fetchQuickNotesForDate(selectedDay),
    fetchAllNotesMap(),
    fetchAllQuickNotesMap(),
  ]);
  const allRows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const readingEntries = [...readingCtx.rlBooks, ...readingCtx.rlGundam];
  const dayRows = allRows.filter((r) => r.dateKey === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayBadgesMap = computeDayBadges(allRows);
  const dayBadges = dayBadgesMap.get(selectedDay) ?? [];
  const flowStats = dayRows.length >= 2 ? sessionFlowStats(dayRows) : null;

  const totalMin = dayRows.reduce((s, r) => s + r.durationMin, 0);
  const avgSessionMin = dayRows.length > 0 ? totalMin / dayRows.length : 0;

  const lastWeekDay = addDaysToDateString(selectedDay, -7);
  const lastWeekMin = allRows.filter((r) => r.dateKey === lastWeekDay).reduce((s, r) => s + r.durationMin, 0);
  const avgWeekdayHours = averageHoursForWeekday(allRows, selectedDay);
  const lastWeekCard = buildSameDayData(
    lastWeekDay,
    shortDateVN(lastWeekDay),
    allRows,
    readingEntries,
    notesMap,
    quickNotesMap,
    dayBadgesMap
  );

  const [selYearStr, selMonthStr, selDayStr] = selectedDay.split("-");
  const mmdd = `${selMonthStr}-${selDayStr}`;
  const pastYears = new Set<number>();
  const collectYear = (dateKey: string) => {
    if (dateKey.slice(5) === mmdd && dateKey.slice(0, 4) < selYearStr) pastYears.add(Number(dateKey.slice(0, 4)));
  };
  for (const r of allRows) collectYear(r.dateKey);
  for (const dateKey of notesMap.keys()) collectYear(dateKey);
  for (const dateKey of quickNotesMap.keys()) collectYear(dateKey);
  for (const e of readingEntries) collectYear(e.completedDate.slice(0, 10));
  const onThisDayCards = Array.from(pastYears)
    .sort((a, b) => b - a)
    .map((y) => buildSameDayData(`${y}-${mmdd}`, String(y), allRows, readingEntries, notesMap, quickNotesMap, dayBadgesMap));

  const byGroup = new Map<string, number>();
  for (const r of dayRows) byGroup.set(r.group, (byGroup.get(r.group) ?? 0) + r.durationMin);
  const groupBars = Array.from(byGroup.entries())
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const byBuoi = new Map<string, number>();
  for (const r of dayRows) {
    const hour = Number(r.startTime.match(/T?(\d{2}):/)?.[1] ?? 0);
    const b = buoiOf(hour);
    byBuoi.set(b, (byBuoi.get(b) ?? 0) + r.durationMin);
  }
  const buoiOrder = ["Sáng", "Chiều", "Tối", "Khuya"].filter((b) => byBuoi.has(b));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">Hôm nay</div>
          <h1 className="font-display text-[22px] font-semibold">{formatDateVN(selectedDay)}</h1>
        </div>
        <DayPicker
          selectedDay={selectedDay}
          prevDay={addDaysToDateString(selectedDay, -1)}
          nextDay={addDaysToDateString(selectedDay, 1)}
          todayStr={today}
        />
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-gradient-to-br from-[var(--card-tl)] to-[var(--card)] p-6 shadow-[var(--shadow)]">
        <div className="text-[12px] uppercase tracking-[.08em] text-[var(--text-3)]">
          Tổng thời gian tập trung
        </div>
        <div className="font-display tnum text-[40px] font-semibold leading-tight">
          {formatDurationMin(totalMin)}
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--text-2)]">
          {dayRows.length} phiên{dayRows.length > 0 ? ` · ${avgSessionMin.toFixed(0)} phút/phiên` : ""}
        </div>
        {dayRows.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--bg-2)] px-3 py-1 text-[12px] text-[var(--text-2)]">
              vs {weekdayNameOf(lastWeekDay)} tuần trước:{" "}
              {lastWeekMin > 0 ? formatDurationMin(lastWeekMin) : "không có"}
            </span>
            {avgWeekdayHours > 0 && (
              <span className="rounded-full bg-[var(--bg-2)] px-3 py-1 text-[12px] text-[var(--text-2)]">
                vs TB các {weekdayNameOf(selectedDay)}: {formatDurationMin(Math.round(avgWeekdayHours * 60))}
              </span>
            )}
            {flowStats && (
              <span className="rounded-full bg-[var(--bg-2)] px-3 py-1 text-[12px] text-[var(--text-2)]">
                Khối liền mạch dài nhất: {formatDurationMin(Math.round(flowStats.longestBlockMin))}
                {flowStats.longestGapMin !== null &&
                  ` · Nghỉ dài nhất: ${formatDurationMin(Math.round(flowStats.longestGapMin))}`}
              </span>
            )}
          </div>
        )}
      </div>

      {dayRows.length > 0 && (
        <>
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
            <h3 className="mb-3 text-[14px] font-semibold">Dòng thời gian</h3>
            <DayTimeline rows={dayRows} />
            <div className="mt-3 text-[12px] text-[var(--text-3)]">
              {timeOfDay(dayRows[0].startTime)} → {timeOfDay(dayRows[dayRows.length - 1].endTime)}
              {buoiOrder.length > 0 && (
                <span>
                  {" · "}
                  {buoiOrder.map((b) => `${b} ${formatDurationMin(byBuoi.get(b) ?? 0)}`).join(" · ")}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
            <h3 className="mb-3 text-[14px] font-semibold">Phân bổ thời gian</h3>
            <RankedBars items={groupBars} />
          </div>
        </>
      )}

      <NoteEditor date={selectedDay} initialNote={note} quickNotes={quickNotes} badges={dayBadges} />

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-0 overflow-hidden">
        <h3 className="p-4 pb-0 text-[14px] font-semibold sm:p-5 sm:pb-0">Danh sách phiên</h3>
        {dayRows.length === 0 ? (
          <p className="p-4 text-[13px] text-[var(--text-3)] sm:p-5">Chưa có phiên tập trung nào hôm nay.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                  <th className="px-4 py-2.5 sm:px-5">#</th>
                  <th className="px-4 py-2.5 sm:px-5">Dự án</th>
                  <th className="px-4 py-2.5 sm:px-5">Bắt đầu</th>
                  <th className="px-4 py-2.5 sm:px-5">Kết thúc</th>
                  <th className="px-4 py-2.5 sm:px-5">Độ dài</th>
                  <th className="px-4 py-2.5 sm:px-5">Nhóm</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((r, i) => (
                  <tr key={`${r.startTime}-${i}`} className="border-b border-[var(--divider)] last:border-b-0 hover:bg-[var(--bg-2)]">
                    <td className="font-mono-num tnum px-4 py-2 text-[12px] text-[var(--text-3)] sm:px-5">{i + 1}</td>
                    <td className="px-4 py-2 text-[13px] font-medium sm:px-5">{r.project}</td>
                    <td className="font-mono-num tnum px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                      {timeOfDay(r.startTime)}
                    </td>
                    <td className="font-mono-num tnum px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                      {timeOfDay(r.endTime)}
                    </td>
                    <td className="font-mono-num tnum px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                      {formatDurationMin(r.durationMin)}
                    </td>
                    <td className="px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">{r.group}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-semibold">
                  <td className="px-4 py-2 sm:px-5"></td>
                  <td className="px-4 py-2 text-[13px] sm:px-5">Tổng</td>
                  <td className="px-4 py-2 sm:px-5"></td>
                  <td className="px-4 py-2 sm:px-5"></td>
                  <td className="font-mono-num tnum px-4 py-2 text-[12.5px] sm:px-5">{formatDurationMin(totalMin)}</td>
                  <td className="px-4 py-2 sm:px-5"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <h3 className="mb-1 text-[14px] font-semibold">Ngày này tuần trước</h3>
        <SameDayCard data={lastWeekCard} />
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <h3 className="mb-1 text-[14px] font-semibold">Ngày này năm trước</h3>
        {onThisDayCards.length === 0 ? (
          <p className="py-2 text-[12.5px] text-[var(--text-3)]">
            Chưa có dữ liệu ngày {selDayStr}/{selMonthStr} ở các năm trước.
          </p>
        ) : (
          <div className="flex flex-col">
            {onThisDayCards.map((d) => (
              <SameDayCard key={d.dateKey} data={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
