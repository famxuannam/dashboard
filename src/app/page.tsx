import { getSupabaseServerClient } from "@/lib/supabase";
import { todayVN, addDaysToDateString, formatDurationMin } from "@/lib/date";
import NoteEditor from "@/components/NoteEditor";

export const dynamic = "force-dynamic";

type SessionRow = {
  start_time: string;
  end_time: string;
  project: string;
  duration_min: number;
};

function timeOfDay(ts: string): string {
  // "start_time"/"end_time" là timestamp thô (giờ treo tường), không có "Z" — lấy thẳng HH:MM.
  const match = ts.match(/T?(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : ts;
}

export default async function HomePage() {
  const today = todayVN();
  const tomorrow = addDaysToDateString(today, 1);
  const supabase = getSupabaseServerClient();

  const [{ data: sessions }, { data: noteRow }, { data: quickNotes }] = await Promise.all([
    supabase
      .from("sessions")
      .select("start_time, end_time, project, duration_min")
      .gte("start_time", `${today}T00:00:00`)
      .lt("start_time", `${tomorrow}T00:00:00`)
      .order("start_time", { ascending: true }),
    supabase.from("notes").select("note").eq("note_date", today).maybeSingle(),
    supabase
      .from("quick_notes")
      .select("id, ts, note_text")
      .gte("ts", `${today}T00:00:00`)
      .lt("ts", `${tomorrow}T00:00:00`)
      .order("ts", { ascending: true }),
  ]);

  const rows = (sessions ?? []) as SessionRow[];
  const totalMin = rows.reduce((sum, r) => sum + r.duration_min, 0);
  const [year, month, day] = today.split("-").map(Number);
  const dateLabel = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[11.5px] uppercase tracking-[.09em] text-[var(--text-3)]">
          Hôm nay
        </div>
        <h1 className="font-display text-[22px] font-semibold capitalize">{dateLabel}</h1>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-gradient-to-br from-[var(--card-tl)] to-[var(--card)] p-6 shadow-[var(--shadow)]">
        <div className="text-[12px] uppercase tracking-[.08em] text-[var(--text-3)]">
          Tổng thời gian tập trung
        </div>
        <div className="font-display tnum text-[40px] font-semibold leading-tight">
          {formatDurationMin(totalMin)}
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--text-2)]">{rows.length} phiên</div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold">Dòng thời gian</h3>
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--text-3)]">Chưa có phiên tập trung nào hôm nay.</p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div
                key={`${r.start_time}-${i}`}
                className="grid grid-cols-[92px_1fr_auto] items-center gap-3 border-b border-[var(--divider)] py-2.5 text-[13px] last:border-b-0"
              >
                <span className="font-mono-num tnum text-[12px] text-[var(--text-3)]">
                  {timeOfDay(r.start_time)}–{timeOfDay(r.end_time)}
                </span>
                <span className="font-medium">{r.project}</span>
                <span className="font-mono-num tnum text-[12.5px] text-[var(--text-2)]">
                  {formatDurationMin(r.duration_min)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <NoteEditor date={today} initialNote={noteRow?.note ?? ""} quickNotes={quickNotes ?? []} />
    </div>
  );
}
