import { createClient } from "@supabase/supabase-js";

/**
 * Client server-side, dùng anon key như app Streamlit gốc (RLS mở toàn quyền qua anon key,
 * xem supabase_schema.sql ở repo forest-dashboard — không có lớp đăng nhập theo quyết định đã
 * chốt). KHÔNG import file này từ Client Component — chỉ dùng trong Server Component/Server Action.
 */
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Thiếu SUPABASE_URL/SUPABASE_KEY trong biến môi trường.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
