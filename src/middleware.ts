import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

// Chặn TOÀN BỘ trang trừ /login và /api/auth/* (route đăng nhập/callback/đăng xuất) -- tương
// đương khối `if not st.user.is_logged_in: ... st.stop()` ở app gốc, nhưng chạy trước khi Next.js
// render bất kỳ Server Component nào (kể cả layout).
export const config = {
  matcher: ["/((?!api/auth|login|_next/|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  // Không cấu hình GOOGLE_CLIENT_ID/SECRET -> app chạy không cổng đăng nhập, giữ hành vi cũ.
  if (!isAuthConfigured()) return NextResponse.next();

  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (!allowedEmail) {
    return redirectToLogin(req, { error: "config" });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return redirectToLogin(req, {});
  }
  if (session.email !== allowedEmail) {
    return redirectToLogin(req, { error: "unauthorized", email: session.email });
  }
  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, params: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}
