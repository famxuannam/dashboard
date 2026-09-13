"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_A = [
  { label: "Hôm nay", href: "/", ready: true },
  { label: "Báo cáo", href: "/bao-cao", ready: true },
  { label: "Nhật ký đọc sách", href: "/sach", ready: true },
  { label: "Gundam", href: "/gundam", ready: true },
  { label: "Tìm kiếm", href: "/tim-kiem", ready: true },
];

const NAV_B = [{ label: "Tuỳ biến", href: "/tuy-bien", ready: false }];

const BAOCAO_SUBS = [
  { label: "Tổng quan", href: "/bao-cao", ready: true },
  { label: "Tuần", ready: false },
  { label: "Tháng", ready: false },
  { label: "Năm", ready: false },
  { label: "Dự án", ready: false },
];

function NavRow({ label, ready, active, href }: { label: string; ready: boolean; active: boolean; href: string }) {
  const className = [
    "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.6px] font-medium",
    active
      ? "bg-[var(--accent-tint)] text-[var(--accent-dark)]"
      : ready
        ? "text-[var(--text-2)] hover:bg-[var(--card)] hover:text-[var(--text)]"
        : "text-[var(--text-4)]",
  ].join(" ");
  const content = (
    <>
      {label}
      {!ready && <span className="ml-auto text-[10px] uppercase tracking-wide">sắp có</span>}
    </>
  );
  return ready ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className} title="Chưa port sang bản Next.js">
      {content}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const onBaoCao = pathname.startsWith("/bao-cao");

  return (
    <aside className="hidden sm:flex w-[236px] shrink-0 flex-col gap-4 border-r border-[var(--divider)] bg-[var(--bg-2)] px-3.5 py-5">
      <div className="flex items-center gap-2.5 px-2 pb-1">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[var(--accent)] text-[var(--card-tl)]">
          🌲
        </div>
        <div>
          <div className="font-display text-[17px] font-semibold leading-tight">Forest</div>
          <div className="text-[10.5px] uppercase tracking-[.09em] text-[var(--text-3)] -mt-0.5">
            Bản Next.js
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_A.map((item) => (
          <NavRow key={item.href} label={item.label} ready={item.ready} href={item.href} active={pathname === item.href} />
        ))}
        {onBaoCao && (
          <div className="ml-[13px] mr-1 mt-0.5 flex flex-col gap-px border-l border-[var(--divider)] pl-2.5">
            {BAOCAO_SUBS.map((sub) => (
              <div
                key={sub.label}
                className={[
                  "rounded-[6px] px-2 py-1.5 text-[12.6px]",
                  sub.ready
                    ? "font-semibold text-[var(--accent-dark)]"
                    : "text-[var(--text-4)]",
                ].join(" ")}
              >
                {sub.label}
                {!sub.ready && <span className="ml-1.5 text-[9.5px] uppercase tracking-wide">sắp có</span>}
              </div>
            ))}
          </div>
        )}
      </nav>
      <div className="mx-2.5 border-t border-[var(--divider)]" />
      <nav className="flex flex-col gap-0.5">
        {NAV_B.map((item) => (
          <NavRow key={item.href} label={item.label} ready={item.ready} href={item.href} active={pathname === item.href} />
        ))}
      </nav>
    </aside>
  );
}
