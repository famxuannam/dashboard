"use client";

import { useState, useTransition } from "react";
import { saveDayNote, updateQuickNoteText, deleteQuickNoteById } from "@/app/actions";
import QuillEditor from "@/components/QuillEditor";

type QuickNote = { id: number; timeLabel: string; text: string };

const VN_DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayBadge(date: string): { dow: string; dm: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dow = VN_DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { dow, dm: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
}

export default function NoteEditor({
  date,
  initialNote,
  quickNotes,
}: {
  date: string;
  initialNote: string;
  quickNotes: QuickNote[];
}) {
  const [savedNote, setSavedNote] = useState(initialNote);
  const [notes, setNotes] = useState(quickNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote);
  const [editorGen, setEditorGen] = useState(0);
  const [pendingMerge, setPendingMerge] = useState<number[]>([]);
  const [editingQuickId, setEditingQuickId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const badge = dayBadge(date);

  function enterEdit(baseContent?: string) {
    setDraft(baseContent ?? savedNote);
    setIsEditing(true);
  }

  function handleMerge(q: QuickNote) {
    const piece = `<p><strong>${q.timeLabel}</strong> — ${escapeHtml(q.text)}</p>`;
    const base = isEditing ? draft : savedNote;
    const merged = (base || "") + piece;
    setDraft(merged);
    setPendingMerge((prev) => [...prev, q.id]);
    if (isEditing) {
      setEditorGen((g) => g + 1); // ép remount QuillEditor để nạp nội dung vừa gộp
    } else {
      setIsEditing(true);
    }
  }

  function handleSave() {
    startTransition(async () => {
      await saveDayNote(date, draft, pendingMerge);
      if (pendingMerge.length > 0) {
        setNotes((prev) => prev.filter((n) => !pendingMerge.includes(n.id)));
      }
      setSavedNote(draft);
      setPendingMerge([]);
      setIsEditing(false);
    });
  }

  function handleCancel() {
    setPendingMerge([]);
    setIsEditing(false);
  }

  function handleDeleteNote() {
    startTransition(async () => {
      await saveDayNote(date, "", []);
      setSavedNote("");
      setPendingMerge([]);
      setIsEditing(false);
    });
  }

  function handleDeleteQuick(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setPendingMerge((prev) => prev.filter((p) => p !== id));
    startTransition(async () => {
      await deleteQuickNoteById(id);
    });
  }

  function handleSaveQuick(id: number, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    setEditingQuickId(null);
    startTransition(async () => {
      await updateQuickNoteText(id, text);
    });
  }

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="grid grid-cols-[52px_1fr] gap-4">
        <div className="text-center">
          <div className="text-[13px] font-semibold text-[var(--accent-dark)]">{badge.dow}</div>
          <div className="font-mono-num tnum text-[11.5px] text-[var(--text-3)]">{badge.dm}</div>
        </div>

        <div className="flex flex-col gap-3">
          {notes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Ghi chú nhanh
              </span>
              {notes.map((q) => {
                const pending = pendingMerge.includes(q.id);
                return (
                  <div key={q.id} className="grid grid-cols-[48px_1fr_auto] items-start gap-2">
                    <span className="font-mono-num tnum pt-0.5 text-[11.5px] text-[var(--text-3)]">
                      {q.timeLabel}
                    </span>
                    {editingQuickId === q.id ? (
                      <QuickNoteEditRow initialText={q.text} onSave={(t) => handleSaveQuick(q.id, t)} onCancel={() => setEditingQuickId(null)} />
                    ) : (
                      <>
                        <span className={`text-[13px] ${pending ? "text-[var(--text-3)] line-through" : ""}`}>
                          {q.text}
                        </span>
                        <div className="flex gap-1">
                          <IconButton
                            title={pending ? "Đã gộp — chờ Lưu" : "Gộp vào ghi chú chính"}
                            disabled={pending}
                            onClick={() => handleMerge(q)}
                          >
                            {pending ? "✓✓" : "⤵"}
                          </IconButton>
                          <IconButton title="Sửa" onClick={() => setEditingQuickId(q.id)}>
                            ✎
                          </IconButton>
                          <IconButton title="Xoá" onClick={() => handleDeleteQuick(q.id)}>
                            ✕
                          </IconButton>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Ghi chú chính
            </span>

            {!isEditing ? (
              savedNote ? (
                <div className="note-content" dangerouslySetInnerHTML={{ __html: savedNote }} />
              ) : (
                <div className="note-empty">Chưa có ghi chú cho ngày này.</div>
              )
            ) : (
              <QuillEditor
                key={editorGen}
                initialHtml={draft}
                onChange={setDraft}
                placeholder="Viết vài dòng về ngày này…"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => enterEdit()}
                className="rounded-[9px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white"
              >
                {savedNote ? "Sửa ghi chú" : "Thêm ghi chú"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-[9px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
                >
                  {isPending ? "Đang lưu…" : "Cập nhật"}
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-[9px] border border-[var(--border)] px-4 py-1.5 text-[13px] text-[var(--text-2)]"
                >
                  Huỷ
                </button>
                {savedNote && (
                  <button
                    onClick={handleDeleteNote}
                    disabled={isPending}
                    className="rounded-[9px] px-3 py-1.5 text-[13px] text-red-600 disabled:opacity-60"
                  >
                    Xoá ghi chú
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] text-[var(--text-3)] hover:bg-[var(--bg-2)] hover:text-[var(--text)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function QuickNoteEditRow({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        autoFocus
        className="w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--card-tl)] p-2 text-[12.5px] outline-none focus:border-[var(--accent)]"
      />
      <div className="flex gap-2">
        <button onClick={() => onSave(text)} className="rounded-[7px] bg-[var(--accent)] px-2.5 py-1 text-[11.5px] text-white">
          Lưu
        </button>
        <button onClick={onCancel} className="rounded-[7px] border border-[var(--border)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)]">
          Huỷ
        </button>
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
