import Link from "next/link";
import type { DayBadge } from "@/lib/records";
import { formatDurationMin } from "@/lib/date";
import DayBadges from "@/components/DayBadges";

export type SameDayData = {
  dateKey: string;
  label: string; // "Thứ Bảy, 12/09" hoặc "2024" (năm trước dùng nhãn năm riêng bên ngoài card)
  badges: DayBadge[];
  stats: { minutes: number; sessions: number; startTime: string; endTime: string } | null;
  readingParts: { book: string; title: string }[];
  quickNotes: string[];
  noteHtml: string | null;
};

function timeOf(ts: string): string {
  return ts.match(/T?(\d{2}:\d{2})/)?.[1] ?? ts;
}

export default function SameDayCard({ data }: { data: SameDayData }) {
  const { dateKey, label, badges, stats, readingParts, quickNotes, noteHtml } = data;
  const empty = !stats && readingParts.length === 0 && quickNotes.length === 0 && !noteHtml && badges.length === 0;

  return (
    <div className="grid grid-cols-[52px_1fr] gap-4 border-b border-[var(--divider)] py-3 last:border-b-0">
      <Link href={`/?day=${dateKey}`} className="text-center">
        <div className="text-[12px] font-semibold text-[var(--accent-dark)]">{label}</div>
      </Link>

      <div className="flex flex-col gap-2.5">
        {empty ? (
          <p className="text-[12.5px] text-[var(--text-3)]">Không có hoạt động nào vào ngày này.</p>
        ) : (
          <>
            <DayBadges badges={badges} />

            {stats && (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]">
                  {formatDurationMin(stats.minutes)}
                </span>
                <span className="rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]">
                  {stats.sessions} phiên
                </span>
                <span className="rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]">
                  {timeOf(stats.startTime)}–{timeOf(stats.endTime)}
                </span>
              </div>
            )}

            {readingParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {readingParts.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[11.5px] text-[var(--accent-dark)]"
                  >
                    {p.book}: {p.title}
                  </span>
                ))}
              </div>
            )}

            {quickNotes.length > 0 && (
              <div className="flex flex-col gap-1">
                {quickNotes.map((t, i) => (
                  <div key={i} className="text-[12.5px] text-[var(--text-2)]">
                    {t}
                  </div>
                ))}
              </div>
            )}

            {noteHtml && <div className="note-content text-[13px]" dangerouslySetInnerHTML={{ __html: noteHtml }} />}
          </>
        )}
      </div>
    </div>
  );
}
