"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchApp, type DayHit } from "@/app/tim-kiem/actions";

function formatDateVN(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DayHit[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showResults = query.trim().length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!showResults) return;
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchApp(query));
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, showResults]);

  return (
    <div className="flex flex-col gap-5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm ghi chú, dự án, cuốn sách…"
        className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
        autoFocus
      />

      {showResults && (
        <div className="text-[12.5px] text-[var(--text-3)]">
          {isPending ? "Đang tìm…" : results ? `Tìm thấy ${results.length} ngày khớp.` : ""}
        </div>
      )}

      {showResults && results && results.length === 0 && !isPending && (
        <p className="text-[13px] text-[var(--text-3)]">Không tìm thấy kết quả nào chứa &quot;{query}&quot;.</p>
      )}

      {showResults && results && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((hit) => (
            <div key={hit.dateKey} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                {formatDateVN(hit.dateKey)}
              </div>

              {hit.sessions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {hit.sessions.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]"
                    >
                      <span className="font-mono-num tnum">{s.time}</span> · {s.project}
                    </span>
                  ))}
                </div>
              )}

              {hit.readingParts.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {hit.readingParts.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[11.5px] text-[var(--accent-dark)]"
                    >
                      {p.book}: {p.title}
                    </span>
                  ))}
                </div>
              )}

              {hit.quickNotes.length > 0 && (
                <div className="mb-2 flex flex-col gap-1">
                  {hit.quickNotes.map((t, i) => (
                    <div key={i} className="text-[12.5px] text-[var(--text-2)]">
                      {t}
                    </div>
                  ))}
                </div>
              )}

              {hit.noteSnippet && <div className="text-[13px]">{hit.noteSnippet}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
