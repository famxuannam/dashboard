const NAV_A = [
  { label: "Hôm nay", href: "/", ready: true },
  { label: "Báo cáo", href: "/bao-cao", ready: false },
  { label: "Nhật ký đọc sách", href: "/sach", ready: false },
  { label: "Gundam", href: "/gundam", ready: false },
  { label: "Tìm kiếm", href: "/tim-kiem", ready: false },
];

const NAV_B = [{ label: "Tuỳ biến", href: "/tuy-bien", ready: false }];

function NavItem({ label, ready, active }: { label: string; ready: boolean; active: boolean }) {
  return (
    <div
      className={[
        "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.6px] font-medium",
        active
          ? "bg-[var(--accent-tint)] text-[var(--accent-dark)]"
          : ready
            ? "text-[var(--text-2)]"
            : "text-[var(--text-4)]",
      ].join(" ")}
      title={ready ? undefined : "Chưa port sang bản Next.js"}
    >
      {label}
      {!ready && <span className="ml-auto text-[10px] uppercase tracking-wide">sắp có</span>}
    </div>
  );
}

export default function Sidebar() {
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
          <NavItem key={item.href} label={item.label} ready={item.ready} active={item.href === "/"} />
        ))}
      </nav>
      <div className="mx-2.5 border-t border-[var(--divider)]" />
      <nav className="flex flex-col gap-0.5">
        {NAV_B.map((item) => (
          <NavItem key={item.href} label={item.label} ready={item.ready} active={false} />
        ))}
      </nav>
    </aside>
  );
}
