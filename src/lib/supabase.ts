import { createClient } from "@supabase/supabase-js";

/**
 * Client server-side, dùng anon key như app Streamlit gốc (RLS mở toàn quyền qua anon key,
 * xem supabase_schema.sql ở repo forest-dashboard — không có lớp đăng nhập theo quyết định đã
 * chốt). KHÔNG import file này từ Client Component — chỉ dùng trong Server Component/Server Action.
 *
 * Tên biến môi trường: chấp nhận cả 2 quy ước — `SUPABASE_URL`/`SUPABASE_KEY` (điền tay, giống
 * secrets.toml của app gốc) LẪN tên do tích hợp Vercel Marketplace × Supabase tự bơm vào project
 * (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — cố ý CHỈ đọc biến "anon key",
 * không đọc `SUPABASE_SERVICE_ROLE_KEY` dù tích hợp có bơm sẵn, vì service role bỏ qua RLS hoàn
 * toàn trong khi app không cần quyền đó.
 */
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Thiếu SUPABASE_URL/SUPABASE_KEY (hoặc NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) trong biến môi trường."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
