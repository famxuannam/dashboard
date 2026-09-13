import { fetchAllSessions, fetchMapping, buildAnalysisRows } from "@/lib/analysis";
import { loadReadingContext, applyReadingInference, summarizeByBook, GUNDAM_TAG } from "@/lib/reading";
import ReadingOverview from "@/components/ReadingOverview";

export const dynamic = "force-dynamic";

export default async function GundamPage() {
  const [sessions, mapping, readingCtx] = await Promise.all([
    fetchAllSessions(),
    fetchMapping(),
    loadReadingContext(),
  ]);
  const rows = applyReadingInference(buildAnalysisRows(sessions, mapping), readingCtx);
  const tagRows = rows.filter((r) => r.projectOriginal === GUNDAM_TAG);
  const seriesSummaries = summarizeByBook(readingCtx.rlGundam);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
        Gundam · Tổng quan
      </div>
      <ReadingOverview
        itemLabel="series"
        countLabel="Số series"
        partsLabel="Số phần đã xem"
        tagRows={tagRows}
        bookSummaries={seriesSummaries}
      />
    </div>
  );
}
