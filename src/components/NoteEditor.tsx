"use client";

import { useState, useTransition } from "react";
import { saveDayNote } from "@/app/actions";

type QuickNote = { id: number; ts: string; note_text: string };

export default function NoteEditor({
  date,
  initialNote,
  quickNotes,
}: {
  date: string;
  initialNote: string;
  quickNotes: QuickNote[];
}) {
  const [text, setText] = useState(initialNote);
  const [pendingMerge, setPendingMerge] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const visibleQuickNotes = quickNotes.filter((q) => !pendingMerge.includes(q.id));

  function handleMerge(q: QuickNote) {
    setText((prev) => (prev.trim() === "" ? q.note_text : `${prev}\n${q.note_text}`));
    setPendingMerge((prev) => [...prev, q.id]);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveDayNote(date, text, pendingMerge);
      setPendingMerge([]);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <h3 className="mb-3 text-[14px] font-semibold">Ghi chú</h3>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="Ghi chú cho hôm nay…"
        className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--card-tl)] p-3 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[9px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Đang lưu…" : "Cập nhật"}
        </button>
        {saved && <span className="text-[12px] text-[var(--accent-dark)]">Đã lưu.</span>}
      </div>

      {visibleQuickNotes.length > 0 && (
        <div className="mt-5 border-t border-[var(--divider)] pt-4">
          <div className="mb-2 text-[12px] font-medium text-[var(--text-3)]">
            Ghi chú nhanh chưa gộp
          </div>
          <div className="flex flex-col gap-2">
            {visibleQuickNotes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-[9px] bg-[var(--bg-2)] px-3 py-2 text-[12.5px]"
              >
                <span className="min-w-0 flex-1 break-words">{q.note_text}</span>
                <button
                  onClick={() => handleMerge(q)}
                  className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                >
                  Gộp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
