export const dynamic = "force-dynamic";

// Nằm NGOÀI route group (app) nên không có Sidebar (xem src/app/(app)/layout.tsx) -- tương đương
// màn hình đăng nhập render trước cổng `st.stop()` ở app gốc (chỉ wordmark + nút Google, không
// có điều hướng). middleware.ts là nơi duy nhất điều hướng tới đây kèm `error=`.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { error, email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px] text-center">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)] text-xl text-[var(--card-tl)]">
            🌲
          </div>
          <div className="font-display text-[20px] font-semibold text-[var(--text)]">Forest Dashboard</div>
        </div>

        {error === "config" ? (
          <p className="text-[13px] text-red-600">
            Cấu hình đăng nhập chưa đầy đủ: thiếu <code>ALLOWED_EMAIL</code>. Liên hệ quản trị viên.
          </p>
        ) : error === "unauthorized" ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px] text-red-600">
              Tài khoản <strong>{email}</strong> không có quyền truy cập ứng dụng này.
            </p>
            <a href="/api/auth/logout" className="text-[13px] text-[var(--text-2)] underline">
              Đăng xuất và thử tài khoản khác
            </a>
          </div>
        ) : (
          <>
            <p className="mb-6 text-[13px] text-[var(--text-2)]">
              {error === "oauth" ? "Đăng nhập thất bại, vui lòng thử lại." : "Đăng nhập để tiếp tục."}
            </p>
            <a
              href="/api/auth/login"
              className="inline-flex items-center justify-center rounded-[9px] bg-[var(--accent)] px-5 py-2 text-[13.5px] font-medium text-white"
            >
              Đăng nhập bằng Google
            </a>
          </>
        )}
      </div>
    </div>
  );
}
