import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/session";

// Nhóm mọi trang cần Sidebar (mọi trang trừ /login) -- route group `(app)` không đổi URL, chỉ
// tách layout để trang /login không thừa hưởng Sidebar. `getSession()` trả `null` nếu chưa cấu
// hình đăng nhập Google -- khi đó Sidebar không hiện khối "Tài khoản", giữ hành vi cũ.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar accountEmail={session?.email} />
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-7 max-w-[1180px]">{children}</main>
    </div>
  );
}
