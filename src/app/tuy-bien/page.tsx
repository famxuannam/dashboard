import { fetchMappingRows } from "./actions";
import MappingEditor from "@/components/MappingEditor";
import CsvUploader from "@/components/CsvUploader";

export const dynamic = "force-dynamic";

export default async function TuyBienPage() {
  const mappingRows = await fetchMappingRows();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Tuỳ biến
      </div>

      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-2)] px-4 py-3 text-[12.5px] text-[var(--text-3)]">
        Bản Next.js mới chỉ port 2 mục: gán Dự án→Nhóm và tải CSV Forest lên. Đồng bộ lịch/Reminder,
        import Kindle, engine giao diện, và backup/khôi phục vẫn cần dùng app Streamlit hiện tại.
      </div>

      <CsvUploader />
      <MappingEditor initialRows={mappingRows} />
    </div>
  );
}
