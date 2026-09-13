import { colorForName } from "@/lib/colors";

type Row = { startTime: string; endTime: string; project: string; group: string };

function minutesOfDay(ts: string): number {
  const m = ts.match(/T?(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export default function DayTimeline({ rows }: { rows: Row[] }) {
  return (
    <div>
      <div className="relative h-[38px] w-full overflow-hidden rounded-[8px] bg-[var(--bg-2)]">
        {rows.map((r, i) => {
          const start = minutesOfDay(r.startTime);
          let end = minutesOfDay(r.endTime);
          if (end <= start) end = 1440; // phiên qua nửa đêm — kẹp về cuối ngày hiển thị
          const left = (start / 1440) * 100;
          const width = Math.max(0.4, ((end - start) / 1440) * 100);
          return (
            <div
              key={i}
              title={`${r.project} · ${r.startTime.slice(11, 16)}–${r.endTime.slice(11, 16)}`}
              className="absolute top-1 h-[30px] rounded-[4px]"
              style={{ left: `${left}%`, width: `${width}%`, background: colorForName(r.group) }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--text-3)]">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
    </div>
  );
}
