import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference } from "@/lib/reading";
import { todayVN, addDaysToDateString, formatDurationMin } from "@/lib/date";
import { buoiOf, averageHoursForWeekday } from "@/lib/period";
import { fetchNoteForDate, fetchQuickNotesForDate } from "@/lib/notes";
import NoteEditor from "@/components/NoteEditor";
import DayPicker from "@/components/DayPicker";
import DayTimeline from "@/components/DayTimeline";
import RankedBars from "@/components/RankedBars";

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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const sp = await searchParams;
  const today = todayVN();
  const selectedDay = sp.day && sp.day <= today ? sp.day : today;

  const [sessions, mapping, readingCtx, note, quickNotes] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
    fetchNoteForDate(selectedDay),
    fetchQuickNotesForDate(selectedDay),
  ]);
  const allRows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const dayRows = allRows.filter((r) => r.dateKey === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const totalMin = dayRows.reduce((s, r) => s + r.durationMin, 0);
  const avgSessionMin = dayRows.length > 0 ? totalMin / dayRows.length : 0;

  const lastWeekDay = addDaysToDateString(selectedDay, -7);
  const lastWeekMin = allRows.filter((r) => r.dateKey === lastWeekDay).reduce((s, r) => s + r.durationMin, 0);
  const avgWeekdayHours = averageHoursForWeekday(allRows, selectedDay);

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

      <NoteEditor date={selectedDay} initialNote={note} quickNotes={quickNotes.map((q) => ({ id: q.id, note_text: q.text }))} />

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
    </div>
  );
}
