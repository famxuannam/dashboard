"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchAllSessions, fetchMapping, fetchDistinctProjects } from "@/lib/analysis";
import { parseForestCsv, type ForestImportStats } from "@/lib/forest-import";

const PAGE_SIZE = 1000;

export type MappingRow = { project: string; category: string };

export async function fetchMappingRows(): Promise<MappingRow[]> {
  const [projects, mapping] = await Promise.all([fetchDistinctProjects(), fetchMapping()]);
  const allNames = new Set<string>([...projects, ...mapping.keys()]);
  return Array.from(allNames)
    .sort()
    .map((project) => ({ project, category: mapping.get(project) ?? "" }));
}

/**
 * Ghi đè TOÀN BỘ bảng `mapping` — tương đương save_mapping() ở app gốc (xoá sạch rồi chèn lại,
 * không phải upsert từng dòng). Dòng có `category` rỗng bị bỏ qua (dự án đó coi như CHƯA gán
 * Nhóm — không lưu category rỗng vào bảng, khớp hành vi mapping ở repo gốc).
 */
export async function saveMappingRows(rows: MappingRow[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error: delErr } = await supabase.from("mapping").delete().not("project", "is", null);
  if (delErr) throw new Error(delErr.message);

  const toInsert = rows
    .filter((r) => r.category.trim() !== "")
    .map((r) => ({ project: r.project, category: r.category.trim() }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("mapping").insert(toInsert);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/bao-cao");
  revalidatePath("/sach");
  revalidatePath("/gundam");
}

export type ForestPreview = {
  stats: ForestImportStats;
  missing: string[];
  skippedDeleted: number;
  importableCount: number;
  preview: { startTime: string; endTime: string; project: string; durationMin: number }[];
};

async function fetchDeletedKeys(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const keys = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("deleted_sessions")
      .select("start_time, end_time")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) keys.add(`${r.start_time}|${r.end_time}`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return keys;
}

/** Xem trước — CHƯA ghi gì vào Supabase (dùng cho bước "Xem trước" trước khi người dùng bấm
 * xác nhận, tương đương preview trong tab "Tải lên từ Forest" ở app gốc). */
export async function previewForestImport(csvText: string): Promise<ForestPreview> {
  const { rows, stats, missing } = parseForestCsv(csvText);
  if (missing.length > 0) {
    return { stats, missing, skippedDeleted: 0, importableCount: 0, preview: [] };
  }
  const deletedKeys = await fetchDeletedKeys();
  const importable = rows.filter((r) => !deletedKeys.has(`${r.startTime}|${r.endTime}`));
  return {
    stats,
    missing: [],
    skippedDeleted: rows.length - importable.length,
    importableCount: importable.length,
    preview: importable.slice(0, 8),
  };
}

export type ForestImportResult = { added: number; duplicate: number; skippedDeleted: number };

/**
 * Nạp thật vào `sessions` — tương đương _merge_forest_into_db() gọi từ tab "Tải lên từ Forest":
 * lọc phiên đã xoá, cộng vào dữ liệu hiện có, bỏ trùng theo khoá (start_time, end_time) GIỮ dòng
 * CŨ khi trùng, rồi ghi đè toàn bộ bảng `sessions` (khớp save_db() — xoá sạch rồi chèn lại, không
 * phải upsert từng dòng).
 */
export async function confirmForestImport(csvText: string): Promise<ForestImportResult> {
  const supabase = getSupabaseServerClient();
  const { rows: newRows, missing } = parseForestCsv(csvText);
  if (missing.length > 0) throw new Error("File thiếu cột bắt buộc.");

  const deletedKeys = await fetchDeletedKeys();
  const importable = newRows.filter((r) => !deletedKeys.has(`${r.startTime}|${r.endTime}`));
  const skippedDeleted = newRows.length - importable.length;

  const existing = await fetchAllSessions();
  const combined = new Map<string, { startTime: string; endTime: string; project: string; durationMin: number }>();
  // Dòng CŨ thêm trước -> `Map.set` sau (dòng mới) không ghi đè nếu đã có, dùng has() để giữ
  // đúng ngữ nghĩa "keep='first'" (ưu tiên dòng đang có sẵn) của pd.drop_duplicates() gốc.
  for (const r of existing) {
    combined.set(`${normalizeStoredTs(r.startTime)}|${normalizeStoredTs(r.endTime)}`, {
      startTime: r.startTime,
      endTime: r.endTime,
      project: r.project,
      durationMin: r.durationMin,
    });
  }
  const before = combined.size;
  let duplicate = 0;
  for (const r of importable) {
    const key = `${r.startTime}|${r.endTime}`;
    if (combined.has(key)) {
      duplicate++;
      continue;
    }
    combined.set(key, r);
  }
  const added = combined.size - before;

  const { error: delErr } = await supabase.from("sessions").delete().not("id", "is", null);
  if (delErr) throw new Error(delErr.message);

  const records = Array.from(combined.values()).map((r) => ({
    start_time: r.startTime,
    end_time: r.endTime,
    project: r.project,
    duration_min: r.durationMin,
  }));
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from("sessions").insert(records.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/bao-cao");
  revalidatePath("/sach");
  revalidatePath("/gundam");
  revalidatePath("/tuy-bien");

  return { added, duplicate, skippedDeleted };
}

/** `sessions.start_time` đọc từ Supabase có thể có giây lẻ/định dạng ISO khác chuỗi CSV vừa
 * parse — chuẩn hoá lại về "YYYY-MM-DD HH:MM:SS" trước khi so khoá, khớp `_fmt_ts()` ở cả 2 vế
 * như app gốc yêu cầu (nếu không, phiên cũ sẽ không được nhận diện trùng). */
function normalizeStoredTs(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}` : raw;
}
