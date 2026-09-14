import SearchBox from "@/components/SearchBox";

export default function TimKiemPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Tìm kiếm
      </div>
      <SearchBox />
    </div>
  );
}
