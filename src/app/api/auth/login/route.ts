import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/auth";

// Chuyển tới màn hình chọn tài khoản Google -- tương đương `on_click=st.login` ở app gốc.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/callback`;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  // Cookie state ngắn hạn để chống CSRF, kiểm tra lại ở callback -- không phải session thật.
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
