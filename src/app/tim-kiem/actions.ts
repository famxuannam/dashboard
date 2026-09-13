"use server";

import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference } from "@/lib/reading";
import { fetchAllNotesMap, fetchAllQuickNotesMap } from "@/lib/notes";
import { stripHtml, snippetAround } from "@/lib/text";

export type DayHit = {
  dateKey: string;
  sessions: { time: string; project: string }[];
  readingParts: { book: string; title: string }[];
  quickNotes: string[];
  noteSnippet: string | null;
};

/**
 * Tìm theo từ khoá trên 4 nguồn ĐÃ port (ghi chú chính, ghi chú nhanh, phiên Forest, phần đã
 * đọc/xem) — tương đương render_search() ở app gốc nhưng CHƯA có lịch Work (CalDAV) và trích dẫn
 * Kindle (2 nguồn đó chưa port sang bản này). Gộp kết quả theo NGÀY, sắp mới nhất trước.
 */
export async function searchApp(query: string): Promise<DayHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const qLower = q.toLowerCase();

  const [noteByDay, quickNotesByDay, sessions, mapping, readingCtx] = await Promise.all([
    fetchAllNotesMap(),
    fetchAllQuickNotesMap(),
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const readingEntries = [...readingCtx.rlBooks, ...readingCtx.rlGundam];

  const quickByDay = new Map<string, string[]>();
  for (const [dateKey, entries] of quickNotesByDay) {
    quickByDay.set(dateKey, entries.map((e) => e.text));
  }
  const sessionsByDay = new Map<string, { time: string; project: string }[]>();
  for (const r of rows) {
    const time = r.startTime.match(/T?(\d{2}:\d{2})/)?.[1] ?? "";
    sessionsByDay.set(r.dateKey, [...(sessionsByDay.get(r.dateKey) ?? []), { time, project: r.project }]);
  }
  const readingByDay = new Map<string, { book: string; title: string }[]>();
  for (const e of readingEntries) {
    const dateKey = e.completedDate.slice(0, 10);
    readingByDay.set(dateKey, [...(readingByDay.get(dateKey) ?? []), { book: e.book, title: e.title }]);
  }

  const hitDays = new Set<string>();
  for (const [dateKey, note] of noteByDay) {
    if (stripHtml(note).toLowerCase().includes(qLower)) hitDays.add(dateKey);
  }
  for (const [dateKey, texts] of quickByDay) {
    if (texts.some((t) => t.toLowerCase().includes(qLower))) hitDays.add(dateKey);
  }
  for (const [dateKey, sess] of sessionsByDay) {
    if (sess.some((s) => s.project.toLowerCase().includes(qLower))) hitDays.add(dateKey);
  }
  for (const [dateKey, parts] of readingByDay) {
    if (parts.some((p) => p.title.toLowerCase().includes(qLower) || p.book.toLowerCase().includes(qLower))) {
      hitDays.add(dateKey);
    }
  }

  return Array.from(hitDays)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((dateKey) => {
      const note = noteByDay.get(dateKey);
      const matchedSessions = (sessionsByDay.get(dateKey) ?? []).filter((s) =>
        s.project.toLowerCase().includes(qLower)
      );
      return {
        dateKey,
        sessions: matchedSessions,
        readingParts: readingByDay.get(dateKey) ?? [],
        quickNotes: quickByDay.get(dateKey) ?? [],
        noteSnippet: note ? snippetAround(stripHtml(note), q) : null,
      };
    });
}
