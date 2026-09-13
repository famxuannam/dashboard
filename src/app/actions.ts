"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isNoteEmpty } from "@/lib/text";

/**
 * Lưu ghi chú chính của 1 ngày, đồng thời xoá các quick_notes đã gộp vào — CHỈ xoá SAU khi lưu
 * ghi chú chính thành công (tương đương luồng "Gộp" trong render_note_editor() ở app.py: không
 * mất ghi chú nhanh nếu request lưu thất bại giữa chừng, và Huỷ vẫn giữ lại ghi chú nhanh vì
 * KHÔNG gọi hàm này).
 */
export async function saveDayNote(date: string, html: string, mergedQuickNoteIds: number[]) {
  const supabase = getSupabaseServerClient();

  if (isNoteEmpty(html)) {
    const { error } = await supabase.from("notes").delete().eq("note_date", date);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("notes").upsert({ note_date: date, note: html });
    if (error) throw new Error(error.message);
  }

  if (mergedQuickNoteIds.length > 0) {
    const { error } = await supabase.from("quick_notes").delete().in("id", mergedQuickNoteIds);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/bao-cao/tuan");
}

/** Sửa nội dung 1 ghi chú nhanh (nút Sửa trên từng dòng) — độc lập với ghi chú chính, có hiệu
 * lực ngay (không qua cơ chế "chờ Lưu" như Gộp). */
export async function updateQuickNoteText(id: number, text: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("quick_notes").update({ note_text: text }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Xoá 1 ghi chú nhanh (nút Xoá trên từng dòng) — có hiệu lực NGAY, không chờ người dùng bấm
 * Cập nhật/Huỷ ở ghi chú chính (khác luồng Gộp). Ở app Streamlit gốc, việc xoá này bị hoãn tới
 * khi bấm Cập nhật/Huỷ vì bug remount của component Quill chạy trong iframe — bản Next.js không
 * có giới hạn kỹ thuật đó nên xoá thẳng, không cần cơ chế "chờ xoá" tương ứng. */
export async function deleteQuickNoteById(id: number) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("quick_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
