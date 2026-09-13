"use client";

import { useState, useTransition } from "react";
import { previewForestImport, confirmForestImport, type ForestPreview, type ForestImportResult } from "@/app/tuy-bien/actions";
import { formatDurationMin } from "@/lib/date";

export default function CsvUploader() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ForestPreview | null>(null);
  const [result, setResult] = useState<ForestImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      startTransition(async () => {
        setPreview(await previewForestImport(text));
      });
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    if (!csvText) return;
    startTransition(async () => {
      const r = await confirmForestImport(csvText);
      setResult(r);
      setPreview(null);
      setCsvText(null);
      setFileName(null);
    });
  }

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <h3 className="mb-3 text-[14px] font-semibold">Tải lên file CSV từ Forest</h3>

      {result && (
        <div className="mb-3 rounded-[9px] bg-[var(--accent-tint)] px-3 py-2 text-[13px] text-[var(--accent-dark)]">
          Đã thêm {result.added} phiên mới (bỏ {result.duplicate} trùng
          {result.skippedDeleted > 0 ? `, ${result.skippedDeleted} phiên đã xoá trước đó` : ""}).
        </div>
      )}

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="block w-full text-[13px] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[var(--bg-2)] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-[var(--text-2)]"
      />

      {fileName && isPending && !preview && (
        <p className="mt-3 text-[12.5px] text-[var(--text-3)]">Đang đọc {fileName}…</p>
      )}

      {preview && preview.missing.length > 0 && (
        <p className="mt-3 text-[13px] text-red-600">
          File thiếu cột: {preview.missing.join(", ")}. Hãy dùng CSV xuất từ Forest (Tag/Project,
          Start Time, End Time, Is Success).
        </p>
      )}

      {preview && preview.missing.length === 0 && preview.importableCount === 0 && (
        <p className="mt-3 text-[13px] text-[var(--text-3)]">
          {preview.stats.valid === 0
            ? "Không tìm thấy phiên hợp lệ nào trong file."
            : `Tất cả ${preview.stats.valid} phiên hợp lệ đều đã nằm trong danh sách đã xoá trước đó — không có gì để thêm.`}
        </p>
      )}

      {preview && preview.missing.length === 0 && preview.importableCount > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[12.5px] text-[var(--text-3)]">
            Đọc được <b className="text-[var(--text)]">{preview.stats.valid}</b> phiên hợp lệ — bỏ{" "}
            {preview.stats.failed} phiên thất bại, {preview.stats.unset} phiên unset/rỗng
            {preview.skippedDeleted > 0 ? `, ${preview.skippedDeleted} phiên đã xoá trước đó` : ""}. Xem trước:
          </p>
          <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
            <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10.5px] uppercase tracking-wide text-[var(--text-3)]">
                  <th className="px-3 py-2">Dự án</th>
                  <th className="px-3 py-2">Bắt đầu</th>
                  <th className="px-3 py-2">Kết thúc</th>
                  <th className="px-3 py-2">Thời lượng</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--divider)] last:border-b-0">
                    <td className="px-3 py-1.5">{r.project}</td>
                    <td className="font-mono-num tnum px-3 py-1.5">{r.startTime}</td>
                    <td className="font-mono-num tnum px-3 py-1.5">{r.endTime}</td>
                    <td className="font-mono-num tnum px-3 py-1.5">{formatDurationMin(r.durationMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="w-fit rounded-[9px] bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Đang cập nhật…" : "Xác nhận cập nhật dữ liệu"}
          </button>
        </div>
      )}
    </div>
  );
}
