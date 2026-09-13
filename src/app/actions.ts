"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Lưu ghi chú chính của 1 ngày, đồng thời xoá các quick_notes đã gộp vào — CHỈ xoá SAU khi lưu
 * ghi chú chính thành công (tương đương luồng "Gộp" trong render_note_editor() ở app.py: không
 * mất ghi chú nhanh nếu request lưu thất bại giữa chừng).
 */
export async function saveDayNote(date: string, text: string, mergedQuickNoteIds: number[]) {
  const supabase = getSupabaseServerClient();

  if (text.trim() === "") {
    const { error } = await supabase.from("notes").delete().eq("note_date", date);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("notes").upsert({ note_date: date, note: text });
    if (error) throw new Error(error.message);
  }

  if (mergedQuickNoteIds.length > 0) {
    const { error } = await supabase.from("quick_notes").delete().in("id", mergedQuickNoteIds);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
