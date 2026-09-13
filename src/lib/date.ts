const APP_TZ = "Asia/Ho_Chi_Minh";

/**
 * Ngày "hôm nay" theo giờ Việt Nam, bất kể server chạy múi giờ nào (Vercel chạy UTC) —
 * tương đương _today_vn() trong app.py. KHÔNG dùng `new Date()` trần để suy ra ngày.
 */
export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date());
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatDurationMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}
