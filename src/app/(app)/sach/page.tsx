import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference, summarizeByBook, BOOKS_TAG } from "@/lib/reading";
import ReadingOverview from "@/components/ReadingOverview";

export const dynamic = "force-dynamic";

export default async function SachPage() {
  const [sessions, mapping, readingCtx] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const tagRows = rows.filter((r) => r.projectOriginal === BOOKS_TAG);
  const bookSummaries = summarizeByBook(readingCtx.rlBooks);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Nhật ký đọc sách · Tổng quan
      </div>
      <ReadingOverview
        itemLabel="cuốn"
        countLabel="Số cuốn"
        partsLabel="Số phần đã đọc"
        tagRows={tagRows}
        bookSummaries={bookSummaries}
      />
    </div>
  );
}
