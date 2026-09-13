import type { AnalysisRow } from "@/lib/analysis";
import type { BookSummary } from "@/lib/reading";
import { streakStats, avgSessionMin, paceHoursPerDay } from "@/lib/stats";
import { formatDurationMin } from "@/lib/date";

function formatDateVN(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Row = {
  name: string;
  hours: number;
  days: number;
  sessions: number;
  partsCount: number | null;
  latestTitle: string | null;
  latestDate: string | null;
};

export default function ReadingOverview({
  itemLabel,
  countLabel,
  partsLabel,
  tagRows,
  bookSummaries,
}: {
  itemLabel: string; // "cuốn" | "series"
  countLabel: string; // "Số cuốn" | "Số series"
  partsLabel: string; // "Số phần đã đọc" | "Số phần đã xem"
  tagRows: AnalysisRow[];
  bookSummaries: Map<string, BookSummary>;
}) {
  if (tagRows.length === 0 && bookSummaries.size === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-6 text-[13.5px] text-[var(--text-3)]">
        Chưa có dữ liệu — cần cả phiên Forest gắn tag tương ứng lẫn dữ liệu đồng bộ từ Reminders.
      </div>
    );
  }

  const totalMin = tagRows.reduce((s, r) => s + r.durationMin, 0);
  const streak = streakStats(tagRows);
  const avgSession = avgSessionMin(tagRows);
  const pace7 = paceHoursPerDay(tagRows, 7);
  const pace30 = paceHoursPerDay(tagRows, 30);

  const byName = new Map<string, { hours: number; days: Set<string>; sessions: number }>();
  for (const r of tagRows) {
    const entry = byName.get(r.project) ?? { hours: 0, days: new Set<string>(), sessions: 0 };
    entry.hours += r.durationMin / 60;
    entry.days.add(r.dateKey);
    entry.sessions += 1;
    byName.set(r.project, entry);
  }

  const names = new Set<string>([...byName.keys(), ...bookSummaries.keys()]);
  const rows: Row[] = Array.from(names).map((name) => {
    const forest = byName.get(name);
    const summary = bookSummaries.get(name);
    return {
      name,
      hours: forest?.hours ?? 0,
      days: forest?.days.size ?? 0,
      sessions: forest?.sessions ?? 0,
      partsCount: summary?.partsCount ?? null,
      latestTitle: summary?.latestTitle ?? null,
      latestDate: summary?.latestDate.slice(0, 10) ?? null,
    };
  });
  rows.sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? "") || b.hours - a.hours);

  const totalParts = Array.from(bookSummaries.values()).reduce((s, b) => s + b.partsCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-[var(--border)] bg-gradient-to-br from-[var(--card-tl)] to-[var(--card)] p-6 shadow-[var(--shadow)]">
        <div className="text-[12px] uppercase tracking-[.08em] text-[var(--text-3)]">
          Tổng thời gian
        </div>
        <div className="font-display tnum text-[40px] font-semibold leading-tight">
          {formatDurationMin(totalMin)}
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--text-2)]">
          {names.size} {itemLabel} · {totalParts} phần đã hoàn thành
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <KpiCard label={countLabel} value={`${names.size}`} />
        <KpiCard label={partsLabel} value={`${totalParts}`} />
        <KpiCard label="Chuỗi ngày hiện tại" value={`${streak.current} ngày`} highlight />
        <KpiCard label="Chuỗi dài nhất" value={`${streak.longest} ngày`} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard label="Thời gian / phiên" value={`${avgSession.toFixed(0)} phút`} />
        <KpiCard label="Nhịp 7 ngày" value={`${formatDurationMin(Math.round(pace7 * 60))}/ngày`} />
        <KpiCard label="Nhịp 30 ngày" value={`${formatDurationMin(Math.round(pace30 * 60))}/ngày`} />
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-0 overflow-hidden">
        <h3 className="p-4 pb-0 text-[14px] font-semibold sm:p-5 sm:pb-0">
          Chi tiết từng {itemLabel}
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <th className="px-4 py-2.5 sm:px-5">Tên</th>
                <th className="px-4 py-2.5 sm:px-5">Phần gần nhất</th>
                <th className="px-4 py-2.5 sm:px-5">Ngày</th>
                <th className="px-4 py-2.5 sm:px-5">Số phần</th>
                <th className="px-4 py-2.5 sm:px-5">Số ngày</th>
                <th className="px-4 py-2.5 sm:px-5">Tổng giờ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-[var(--divider)] last:border-b-0 hover:bg-[var(--bg-2)]">
                  <td className="px-4 py-2.5 text-[13px] font-medium sm:px-5">{r.name}</td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {r.latestTitle ?? "—"}
                  </td>
                  <td className="font-mono-num tnum whitespace-nowrap px-4 py-2.5 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {r.latestDate ? formatDateVN(r.latestDate) : "—"}
                  </td>
                  <td className="font-mono-num tnum px-4 py-2.5 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {r.partsCount ?? "—"}
                  </td>
                  <td className="font-mono-num tnum px-4 py-2.5 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {r.days || "—"}
                  </td>
                  <td className="font-mono-num tnum px-4 py-2.5 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {r.hours > 0 ? formatDurationMin(Math.round(r.hours * 60)) : "—"}
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

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-[12px] text-[var(--text-3)]">{label}</div>
      <div className={`font-display tnum text-[21px] font-semibold ${highlight ? "text-[var(--accent-dark)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
