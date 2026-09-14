/**
 * Đăng nhập Google (tuỳ chọn), cổng bằng 1 email cho phép -- port của khối `[auth]` +
 * `ALLOWED_EMAIL` trong app Streamlit gốc (xem app.py, quanh dòng `st.login`/`st.user`).
 * KHÔNG dùng thư viện auth (next-auth/...) -- tự ký session bằng HMAC qua Web Crypto (`crypto.subtle`,
 * global sẵn có ở cả Node runtime lẫn Edge runtime của middleware) để không cần thêm dependency.
 *
 * File này PHẢI không import "next/headers" (chỉ dùng được trong Server Component/Server Action,
 * không dùng được trong middleware chạy Edge runtime) -- `getSession()` cần cookies() nằm riêng ở
 * `src/lib/session.ts`.
 */

export const SESSION_COOKIE = "fd_session";
export const OAUTH_STATE_COOKIE = "fd_oauth_state";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

/** Có cấu hình đăng nhập Google hay không -- giống `_auth_configured` ở app gốc (dựa vào
 * client_id). Thiếu thì app chạy KHÔNG có cổng đăng nhập, giữ hành vi cũ (mặc định mở). */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Email duy nhất được phép vào app. Ném lỗi nếu đã bật [auth] nhưng thiếu ALLOWED_EMAIL --
 * an toàn theo kiểu mặc định chặn khi cấu hình dở dang, giống app gốc. */
export function allowedEmail(): string {
  const email = process.env.ALLOWED_EMAIL;
  if (!email) {
    throw new Error(
      "Cấu hình đăng nhập chưa đầy đủ: đã có GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET nhưng thiếu ALLOWED_EMAIL.",
    );
  }
  return email;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    throw new Error("Thiếu AUTH_COOKIE_SECRET trong biến môi trường (dùng để ký session cookie).");
  }
  return secret;
}

let cachedKey: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getAuthSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return cachedKey;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

export type Session = { email: string };

/** Tạo session token đã ký: `<payload base64url>.<chữ ký HMAC base64url>`. */
export async function createSessionToken(email: string): Promise<string> {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(signature)}`;
}

/** Kiểm tra chữ ký + hạn dùng, trả về `null` nếu token giả mạo/hết hạn/sai định dạng. */
export async function verifySessionToken(token: string): Promise<Session | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex < 0) return null;
  const payloadB64 = token.slice(0, dotIndex);
  const sigB64 = token.slice(dotIndex + 1);
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      new TextEncoder().encode(payloadB64),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as {
      email?: unknown;
      exp?: unknown;
    };
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}
