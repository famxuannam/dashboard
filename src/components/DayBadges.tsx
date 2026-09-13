import type { DayBadge } from "@/lib/records";

const RANK_LABEL: Record<number, string> = { 1: "Hạng nhất", 2: "Hạng nhì", 3: "Hạng ba" };

function labelOf(badge: DayBadge): string {
  if (badge.kind === "overall") return `${RANK_LABEL[badge.rank] ?? `Hạng ${badge.rank}`} mọi thời đại`;
  if (badge.kind === "group") return `Kỷ lục Nhóm ${badge.name}`;
  return `Kỷ lục ${badge.name}`;
}

export default function DayBadges({ badges }: { badges: DayBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        Kỷ lục
      </span>
      {badges.map((b, i) => (
        <span
          key={i}
          className="rounded-full bg-[var(--amber-tint)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--amber)]"
        >
          🏆 {labelOf(b)}
        </span>
      ))}
    </div>
  );
}
