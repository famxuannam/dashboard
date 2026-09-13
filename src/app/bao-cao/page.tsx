import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { streakStats, avgSessionMin, topN, weeklyTotals } from "@/lib/stats";
import { formatDurationMin } from "@/lib/date";
import { loadReadingContext, applyReadingInference } from "@/lib/reading";

export const dynamic = "force-dynamic";

function timeOfDay(ts: string): string {
  const match = ts.match(/T?(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : ts;
}

function formatDateVN(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export default async function BaoCaoPage() {
  const [sessions, mapping, readingCtx] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);

  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-6 text-[13.5px] text-[var(--text-3)]">
        Chưa có dữ liệu nào cả. Đồng bộ CSV Forest trước ở app hiện tại (mục &quot;Tuỳ biến&quot;
        chưa được port sang bản này).
      </div>
    );
  }

  const totalMin = rows.reduce((s, r) => s + r.durationMin, 0);
  const uniqueDays = new Set(rows.map((r) => r.dateKey)).size;
  const uniqueGroups = new Set(rows.map((r) => r.group)).size;
  const uniqueProjects = new Set(rows.map((r) => r.project)).size;
  const streak = streakStats(rows);
  const avgPerDayMin = totalMin / uniqueDays;
  const avgSession = avgSessionMin(rows);

  const currentWeek = rows.length > 0 ? rows[rows.length - 1].weekKey : "";
  const thisWeekRows = rows.filter((r) => r.weekKey === currentWeek);
  const topGroups = topN(thisWeekRows, "group", 3);
  const topProjects = topN(thisWeekRows, "project", 3);

  const trend = weeklyTotals(rows, 12);
  const maxHours = Math.max(1, ...trend.map((p) => p.hours));
  const chartW = 420;
  const chartH = 168;
  const padL = 30;
  const padR = 10;
  const padT = 18;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const stepX = trend.length > 1 ? plotW / (trend.length - 1) : 0;
  const points = trend.map((p, i) => ({
    x: padL + i * stepX,
    y: padT + plotH - (p.hours / maxHours) * plotH,
    ...p,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${padT + plotH} L${points[0].x.toFixed(1)},${padT + plotH} Z`;

  const recentRows = [...rows].slice(-50).reverse();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Báo cáo · Tổng quan
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-gradient-to-br from-[var(--card-tl)] to-[var(--card)] p-6 shadow-[var(--shadow)]">
        <div className="text-[12px] uppercase tracking-[.08em] text-[var(--text-3)]">
          Tổng thời gian đã trồng
        </div>
        <div className="font-display tnum text-[40px] font-semibold leading-tight">
          {formatDurationMin(totalMin)}
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--text-2)]">
          {uniqueDays} ngày · {uniqueGroups} nhóm · {uniqueProjects} dự án
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <KpiCard label="Trung bình / ngày" value={formatDurationMin(Math.round(avgPerDayMin))} />
        <KpiCard label="Thời gian / phiên" value={`${avgSession.toFixed(0)} phút`} />
        <KpiCard label="Chuỗi hiện tại" value={`${streak.current} ngày`} highlight />
        <KpiCard label="Chuỗi dài nhất" value={`${streak.longest} ngày`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <h3 className="mb-3 text-[14px] font-semibold">
            Xu hướng <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">tổng giờ/tuần · 12 tuần gần nhất</span>
          </h3>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={chartH}>
            <line x1={padL} y1={padT} x2={chartW - padR} y2={padT} stroke="var(--divider)" />
            <line x1={padL} y1={padT + plotH / 2} x2={chartW - padR} y2={padT + plotH / 2} stroke="var(--divider)" />
            <line x1={padL} y1={padT + plotH} x2={chartW - padR} y2={padT + plotH} stroke="var(--divider)" />
            <text x={4} y={padT + 4} fontSize="9.5" fontFamily="var(--font-data)" fill="var(--text-3)">
              {maxHours.toFixed(0)}g
            </text>
            <text x={4} y={padT + plotH + 4} fontSize="9.5" fontFamily="var(--font-data)" fill="var(--text-3)">
              0g
            </text>
            <path d={areaPath} fill="rgba(var(--accent-rgb),.16)" />
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle
                key={p.weekKey}
                cx={p.x}
                cy={p.y}
                r={i === points.length - 1 ? 4 : 3.2}
                fill={i === points.length - 1 ? "var(--accent)" : "var(--card)"}
                stroke="var(--accent)"
                strokeWidth="2"
              />
            ))}
            {points.map((p, i) =>
              i % 2 === 0 || i === points.length - 1 ? (
                <text
                  key={`lbl-${p.weekKey}`}
                  x={p.x}
                  y={chartH - 6}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="var(--font-data)"
                  fill="var(--text-3)"
                >
                  {p.weekKey.slice(6)}
                </text>
              ) : null
            )}
          </svg>
        </div>

        <div className="flex flex-col gap-4">
          <TopCard title="Top 3 Nhóm — tuần này" items={topGroups} />
          <TopCard title="Top 3 Dự án — tuần này" items={topProjects} />
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-0 overflow-hidden">
        <h3 className="p-4 pb-0 text-[14px] font-semibold sm:p-5 sm:pb-0">
          Bảng số liệu <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">{recentRows.length} phiên gần nhất</span>
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                <th className="px-4 py-2.5 sm:px-5">Ngày</th>
                <th className="px-4 py-2.5 sm:px-5">Dự án</th>
                <th className="px-4 py-2.5 sm:px-5">Nhóm</th>
                <th className="px-4 py-2.5 sm:px-5">Bắt đầu</th>
                <th className="px-4 py-2.5 sm:px-5">Kết thúc</th>
                <th className="px-4 py-2.5 sm:px-5">Thời lượng</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.map((r, i) => (
                <tr key={`${r.startTime}-${i}`} className="border-b border-[var(--divider)] last:border-b-0 hover:bg-[var(--bg-2)]">
                  <td className="font-mono-num tnum whitespace-nowrap px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {formatDateVN(r.dateKey)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-[13px] sm:px-5">{r.project}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-[13px] text-[var(--text-2)] sm:px-5">{r.group}</td>
                  <td className="font-mono-num tnum whitespace-nowrap px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {timeOfDay(r.startTime)}
                  </td>
                  <td className="font-mono-num tnum whitespace-nowrap px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {timeOfDay(r.endTime)}
                  </td>
                  <td className="font-mono-num tnum whitespace-nowrap px-4 py-2 text-[12.5px] text-[var(--text-2)] sm:px-5">
                    {formatDurationMin(r.durationMin)}
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
      <div
        className={`font-display tnum text-[21px] font-semibold ${highlight ? "text-[var(--accent-dark)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function TopCard({ title, items }: { title: string; items: { name: string; minutes: number }[] }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-3)]">Chưa có phiên nào tuần này.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((it, i) => (
            <div key={it.name} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[10.5px] font-semibold text-[var(--accent-dark)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{it.name}</span>
              <span className="font-mono-num tnum shrink-0 text-[12.5px] text-[var(--text-2)]">
                {formatDurationMin(it.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
