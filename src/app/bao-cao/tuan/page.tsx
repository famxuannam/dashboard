import Link from "next/link";
import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference } from "@/lib/reading";
import {
  buildWeekSummary,
  avgWeekHoursExcluding,
  prevWeekKey,
  nextWeekKey,
  listWeeks,
} from "@/lib/period";
import { fetchNotesInRange, fetchQuickNotesInRange } from "@/lib/notes";
import { stripHtml, snippetAround } from "@/lib/text";
import { formatDurationMin, addDaysToDateString, todayVN } from "@/lib/date";
import { isoWeekKey } from "@/lib/analysis";
import RankedBars from "@/components/RankedBars";

export const dynamic = "force-dynamic";

function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default async function TuanPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const [sessions, mapping, readingCtx] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);

  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-6 text-[13.5px] text-[var(--text-3)]">
        Chưa có dữ liệu nào cả.
      </div>
    );
  }

  const weeks = listWeeks(rows);
  const currentWeekKey = isoWeekKey(todayVN());
  const selectedWeek = sp.week && weeks.includes(sp.week) ? sp.week : currentWeekKey;
  const summary = buildWeekSummary(rows, selectedWeek);
  const avgHours = avgWeekHoursExcluding(rows, selectedWeek);
  const prevKey = prevWeekKey(selectedWeek);
  const prevSummary = weeks.includes(prevKey) ? buildWeekSummary(rows, prevKey) : null;

  const notesByDay = await fetchNotesInRange(summary.monday, addDaysToDateString(summary.sunday, 1));
  const quickNotesByDay = await fetchQuickNotesInRange(summary.monday, addDaysToDateString(summary.sunday, 1));

  const maxDayHours = Math.max(1, ...summary.byDay.map((d) => d.hours));
  const currHrs = summary.totalMin / 60;
  const deltaVsPrev = prevSummary ? currHrs - prevSummary.totalMin / 60 : null;
  const deltaVsAvg = currHrs - avgHours;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Báo cáo · Tuần
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-gradient-to-br from-[var(--card-tl)] to-[var(--card)] p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] uppercase tracking-[.08em] text-[var(--text-3)]">
            Tuần {summary.weekNum} · {summary.year} · {formatDateShort(summary.monday)}–{formatDateShort(summary.sunday)}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/bao-cao/tuan?week=${prevWeekKey(selectedWeek)}`}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--text-2)] hover:border-[var(--accent)]"
            >
              ◂ Tuần trước
            </Link>
            <Link
              href={`/bao-cao/tuan?week=${nextWeekKey(selectedWeek)}`}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--text-2)] hover:border-[var(--accent)]"
            >
              Tuần sau ▸
            </Link>
          </div>
        </div>
        <div className="font-display tnum mt-1 text-[40px] font-semibold leading-tight">
          {formatDurationMin(summary.totalMin)}
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--text-2)]">
          Hoạt động {summary.activeDays}/7 ngày · {summary.sessionsCount} phiên
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {deltaVsPrev !== null && (
            <span className="rounded-full bg-[var(--bg-2)] px-3 py-1 text-[12px] text-[var(--text-2)]">
              vs tuần trước: {deltaVsPrev >= 0 ? "▲" : "▼"} {formatDurationMin(Math.abs(Math.round(deltaVsPrev * 60)))}
            </span>
          )}
          <span className="rounded-full bg-[var(--bg-2)] px-3 py-1 text-[12px] text-[var(--text-2)]">
            vs trung bình: {deltaVsAvg >= 0 ? "▲" : "▼"} {formatDurationMin(Math.abs(Math.round(deltaVsAvg * 60)))}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <h3 className="mb-3 text-[14px] font-semibold">Nhóm & dự án</h3>
          <div className="flex flex-col gap-4">
            <RankedBars title="Theo Nhóm" items={summary.byGroup} />
            <RankedBars title="Theo Dự án" items={summary.byProject} />
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <h3 className="mb-3 text-[14px] font-semibold">Theo ngày</h3>
          <div className="flex h-[160px] items-end gap-2.5">
            {summary.byDay.map((d) => (
              <div key={d.dateKey} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="font-mono-num tnum text-[10.5px] text-[var(--text-3)]">
                  {d.hours > 0 ? d.hours.toFixed(1) : ""}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-[6px] bg-[var(--accent)]"
                    style={{ height: `${Math.max(2, (d.hours / maxDayHours) * 100)}%`, opacity: d.hours > 0 ? 1 : 0.15 }}
                  />
                </div>
                <span className="text-[10.5px] text-[var(--text-3)]">{d.dow.replace("Thứ ", "T")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold">Nhật ký</h3>
        <div className="flex flex-col gap-2.5">
          {summary.byDay.map((d) => {
            const note = notesByDay.get(d.dateKey);
            const quick = quickNotesByDay.get(d.dateKey) ?? [];
            if (!note && quick.length === 0) return null;
            return (
              <div key={d.dateKey} className="border-b border-[var(--divider)] pb-2.5 last:border-b-0">
                <div className="mb-1 text-[11.5px] font-semibold text-[var(--text-3)]">
                  {d.dow} {formatDateShort(d.dateKey)}
                </div>
                {note && <div className="text-[13px]">{snippetAround(stripHtml(note), "", 140)}</div>}
                {quick.map((q) => (
                  <div key={q.id} className="text-[12.5px] text-[var(--text-2)]">
                    {q.text}
                  </div>
                ))}
              </div>
            );
          })}
          {summary.byDay.every((d) => !notesByDay.get(d.dateKey) && (quickNotesByDay.get(d.dateKey) ?? []).length === 0) && (
            <p className="text-[12.5px] text-[var(--text-3)]">Không có ghi chú nào trong tuần này.</p>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-0 overflow-hidden">
        <h3 className="p-4 pb-0 text-[14px] font-semibold sm:p-5 sm:pb-0">Bảng số liệu</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <th className="px-4 py-2.5 sm:px-5">Ngày</th>
                <th className="px-4 py-2.5 sm:px-5">Tổng giờ</th>
              </tr>
            </thead>
            <tbody>
              {summary.byDay.map((d) => (
                <tr key={d.dateKey} className="border-b border-[var(--divider)] last:border-b-0 hover:bg-[var(--bg-2)]">
                  <td className="px-4 py-2 text-[13px] sm:px-5">
                    {d.dow}, {formatDateShort(d.dateKey)}
                  </td>
                  <td className="font-mono-num tnum px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {d.hours > 0 ? formatDurationMin(Math.round(d.hours * 60)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
