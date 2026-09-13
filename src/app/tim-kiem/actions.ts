"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference } from "@/lib/reading";
import { stripHtml, snippetAround } from "@/lib/text";

const PAGE_SIZE = 1000;

async function fetchAllNotes(): Promise<{ dateKey: string; note: string }[]> {
  const supabase = getSupabaseServerClient();
  const rows: { dateKey: string; note: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("notes")
      .select("note_date, note")
      .order("note_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) rows.push({ dateKey: r.note_date, note: r.note });
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchAllQuickNotes(): Promise<{ dateKey: string; text: string }[]> {
  const supabase = getSupabaseServerClient();
  const rows: { dateKey: string; text: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("quick_notes")
      .select("ts, note_text")
      .order("ts", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) rows.push({ dateKey: r.ts.slice(0, 10), text: r.note_text });
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

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

  const [notes, quickNotes, sessions, mapping, readingCtx] = await Promise.all([
    fetchAllNotes(),
    fetchAllQuickNotes(),
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const readingEntries = [...readingCtx.rlBooks, ...readingCtx.rlGundam];

  const noteByDay = new Map(notes.map((n) => [n.dateKey, n.note]));
  const quickByDay = new Map<string, string[]>();
  for (const q2 of quickNotes) {
    quickByDay.set(q2.dateKey, [...(quickByDay.get(q2.dateKey) ?? []), q2.text]);
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
