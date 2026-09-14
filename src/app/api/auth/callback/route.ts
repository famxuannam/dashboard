import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, OAUTH_STATE_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

// Đổi authorization code lấy access token rồi gọi userinfo lấy email -- không dùng id_token/JWT
// verify vì access token + endpoint userinfo chính chủ Google đã đủ tin cậy cho 1 lần đăng nhập,
// tự viết verify JWT (kiểm chữ ký RS256 bằng JWKS của Google) sẽ tốn công hơn nhiều so với gọi
// thẳng https://www.googleapis.com/oauth2/v3/userinfo.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !state || !savedState || state !== savedState || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
  const userJson = (await userRes.json()) as { email?: string; email_verified?: boolean };
  if (!userJson.email || userJson.email_verified === false) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  // Không so ALLOWED_EMAIL ở đây -- luôn cấp session cho bất kỳ tài khoản Google nào đăng nhập
  // thành công, để middleware.ts (chạy trên MỌI request sau đó) là nơi DUY NHẤT quyết định
  // quyền truy cập -- tránh 2 nơi cùng kiểm tra dễ lệch nhau nếu sau này ALLOWED_EMAIL đổi.
  const token = await createSessionToken(userJson.email);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
