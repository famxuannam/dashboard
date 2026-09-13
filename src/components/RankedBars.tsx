import type { TopEntry } from "@/lib/stats";
import { formatDurationMin } from "@/lib/date";
import { colorForName } from "@/lib/colors";

export default function RankedBars({ title, items }: { title?: string; items: TopEntry[] }) {
  if (items.length === 0) {
    return <p className="text-[12.5px] text-[var(--text-3)]">Không có dữ liệu.</p>;
  }
  const max = Math.max(...items.map((i) => i.minutes));
  return (
    <div>
      {title && <div className="mb-2 text-[12.5px] font-medium text-[var(--text-3)]">{title}</div>}
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-3">
            <span className="w-[110px] shrink-0 truncate text-[12.5px]">{it.name}</span>
            <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[var(--bg-2)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${(it.minutes / max) * 100}%`, background: colorForName(it.name) }}
              />
            </div>
            <span className="font-mono-num tnum w-[92px] shrink-0 whitespace-nowrap text-right text-[11px] text-[var(--text-2)]">
              {formatDurationMin(it.minutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
