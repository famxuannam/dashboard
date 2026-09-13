"use client";

import { useRouter } from "next/navigation";

export default function DayPicker({
  selectedDay,
  prevDay,
  nextDay,
  todayStr,
}: {
  selectedDay: string;
  prevDay: string;
  nextDay: string;
  todayStr: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/?day=${prevDay}`)}
        className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--text-2)] hover:border-[var(--accent)]"
        aria-label="Ngày trước"
      >
        ◂
      </button>
      <input
        type="date"
        value={selectedDay}
        max={todayStr}
        onChange={(e) => {
          if (e.target.value) router.push(`/?day=${e.target.value}`);
        }}
        className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={() => router.push(`/?day=${nextDay}`)}
        disabled={selectedDay >= todayStr}
        className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--text-2)] hover:border-[var(--accent)] disabled:opacity-40"
        aria-label="Ngày sau"
      >
        ▸
      </button>
      {selectedDay !== todayStr && (
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-[var(--accent-tint)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-dark)]"
        >
          Hôm nay
        </button>
      )}
    </div>
  );
}
