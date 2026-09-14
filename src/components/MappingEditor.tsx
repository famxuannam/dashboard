"use client";

import { useState, useTransition } from "react";
import { saveMappingRows, type MappingRow } from "@/app/(app)/tuy-bien/actions";

export default function MappingEditor({ initialRows }: { initialRows: MappingRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function updateCategory(project: string, category: string) {
    setRows((prev) => prev.map((r) => (r.project === project ? { ...r, category } : r)));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveMappingRows(rows);
      setSaved(true);
    });
  }

  const unmapped = rows.filter((r) => r.category.trim() === "").length;

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">
          Dự án → Nhóm{" "}
          <span className="ml-1.5 text-[11.5px] font-normal text-[var(--text-3)]">
            {rows.length} dự án{unmapped > 0 ? ` · ${unmapped} chưa gán` : ""}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[12px] text-[var(--accent-dark)]">Đã lưu.</span>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-[9px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--text-3)]">Chưa có dự án nào (chưa có phiên Forest nào được nạp).</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((r) => (
            <div
              key={r.project}
              className="grid grid-cols-[1fr_200px] items-center gap-3 border-b border-[var(--divider)] py-2 last:border-b-0"
            >
              <span className="truncate text-[13px]">{r.project}</span>
              <input
                value={r.category}
                onChange={(e) => updateCategory(r.project, e.target.value)}
                placeholder="Chưa gán Nhóm"
                className="rounded-[8px] border border-[var(--border)] bg-[var(--card-tl)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--accent)]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
