import { cookies } from "next/headers";
import { isAuthConfigured, verifySessionToken, SESSION_COOKIE, type Session } from "@/lib/auth";

/** Session hiện tại cho Server Component (vd layout Sidebar). Luôn `null` khi chưa cấu hình
 * đăng nhập Google (`isAuthConfigured()` false) -- app chạy không cổng đăng nhập, không có khái
 * niệm "đang đăng nhập". Dùng `next/headers` nên KHÔNG import được từ middleware (Edge runtime). */
export async function getSession(): Promise<Session | null> {
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
