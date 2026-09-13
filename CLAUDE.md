# Forest Dashboard (bản Next.js/Vercel) — hướng dẫn cho Claude Code

Đây là bản viết lại của app Streamlit gốc trong repo `famxuannam/forest-dashboard` (dashboard
cá nhân, tiếng Việt, hồi cứu dữ liệu phiên tập trung Forest). Repo gốc là **tài liệu tham khảo
chính** cho logic nghiệp vụ (`app.py`, `docs/*.md`, `supabase_schema.sql`) — khi không chắc một
quy tắc/hành vi nào đó nên hoạt động ra sao, đọc lại repo gốc trước khi tự quyết định.

## Vì sao viết lại

Streamlit rerun toàn bộ script mỗi tương tác, không host được (miễn phí) tốt trên Vercel. Bản
này dùng Next.js (App Router) + Vercel + **dùng chung Supabase project với app gốc** (cùng
schema, cùng dữ liệu) — 2 app chạy song song được trong lúc chuyển đổi.

## Quyết định đã chốt với người dùng

- **Dùng chung Supabase project** với `forest-dashboard` — không tạo schema mới, không migrate
  dữ liệu. Kết nối qua tích hợp **Vercel Marketplace × Supabase** ("Connect an existing
  project", trỏ đúng project cũ) — Vercel tự bơm `NEXT_PUBLIC_SUPABASE_URL`/
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `src/lib/supabase.ts` chấp nhận cả tên đó lẫn
  `SUPABASE_URL`/`SUPABASE_KEY` (điền tay khi chạy local, giống `secrets.toml.example` của repo
  gốc) — CHỈ đọc anon key, không đọc `SUPABASE_SERVICE_ROLE_KEY` dù tích hợp có bơm sẵn (không
  cần bỏ qua RLS).
- **Port dần từng trang**, không viết lại toàn bộ 1 lần. Thứ tự: Hôm nay (xong bản đầu) →
  Báo cáo (xong sub-tab Tổng quan, sub-tab Tuần/Tháng/Năm/Dự án CHƯA làm) → Nhật ký đọc
  sách/Gundam → Tìm kiếm → Tuỳ biến.
- **Cắt bỏ**: import Nhật ký Day One (`parse_dayone_json`) — không port sang bản này.
- **Giữ lại**: Kindle highlights, CalDAV (lịch Work + Reading log qua Reminders) — port khi tới
  lượt trang tương ứng.
- Mục tiêu tối ưu: hiệu năng/UX (điều hướng tức thời, không rerun toàn trang), và có thể thiết
  kế lại giao diện — không bắt buộc giữ nguyên pixel-for-pixel bản Streamlit.

## Kiến trúc

- Next.js App Router, TypeScript, Tailwind CSS v4.
- `src/lib/supabase.ts` — client Supabase **server-only** (Server Component/Server Action), dùng
  anon key vì RLS ở Supabase đang mở toàn quyền qua anon key (xem `supabase_schema.sql` ở repo
  gốc) — không tạo client phía trình duyệt trừ khi thực sự cần realtime.
- `src/lib/date.ts` — `todayVN()` tương đương `_today_vn()` trong app gốc: mọi logic "hôm nay"
  PHẢI qua hàm này, không dùng `new Date()` trần để suy ra ngày (Vercel chạy UTC, lệch múi giờ
  Việt Nam trong khung 00:00–07:00 giờ VN mỗi ngày).
- `src/components/Sidebar.tsx` — Client Component (cần `usePathname` để tô đậm mục đang xem),
  nav + sub-nav (khi có) đọc từ 2 mảng tĩnh `NAV_A`/`NAV_B` + `BAOCAO_SUBS`; mục nào chưa port
  đánh dấu "sắp có" (không phải link chết ẩn đi — người dùng cần thấy lộ trình còn lại).
- `src/lib/analysis.ts` — `fetchAllSessions()`/`fetchMapping()`/`buildAnalysisRows()` tương
  đương `load_db()`+`load_mapping()`+`prep_analysis_data()` ở repo gốc, NHƯNG **CHƯA port suy
  luận Gundam/Sách** (`_assign_reading_sessions()`, cần `reading_log` + CalDAV — chưa tới lượt
  port). Phiên tag chung "Gundam"/"Reading" hiện hiện nguyên tên tag đó ở cột `project`, giống
  đúng hành vi "chưa suy luận được" của bản gốc khi thiếu `reading_log` — không phải bug, chỉ là
  chưa đủ tính năng. `fetchAllSessions()` tự phân trang qua `.range()` (PostgREST giới hạn 1000
  dòng/lần) — thêm truy vấn Supabase mới ở trang khác PHẢI nhớ làm tương tự nếu bảng có thể vượt
  1000 dòng.
- `src/lib/stats.ts` — `streakStats()`/`topN()`/`weeklyTotals()` tương đương
  `_streak_stats()`/nhóm-rồi-sort/gộp-theo-tuần trong app gốc. `isoWeekKey()` (đặt ở
  `analysis.ts` vì `stats.ts` cần import lại) tính tuần ISO Thứ Hai-đầu-tuần, tương đương
  `%G-W%V` của pandas — KHÔNG dùng `Date.getDay()` trần (Chủ Nhật = 0, sai quy ước tuần ISO).
- Mỗi trang mới port: 1 Server Component đọc Supabase trực tiếp (không qua API route riêng trừ
  khi cần gọi từ client), phần tương tác (form/nút) tách thành Client Component nhỏ + Server
  Action, theo đúng mẫu `NoteEditor.tsx`/`actions.ts` đã có.

## Quy ước

- Toàn bộ text hiển thị bằng tiếng Việt, giữ nguyên thuật ngữ đã dùng ở app gốc (Nhóm/Dự án/Danh
  mục/Thời lượng...) để nhất quán khi người dùng dùng song song 2 app.
- Cột Supabase đọc/ghi giữ đúng tên `snake_case` như schema gốc — không đổi tên cột, không tạo
  bảng mới nếu chưa hỏi người dùng.
- `sessions.start_time`/`end_time` là timestamp **thô** (giờ treo tường, không timezone) — khi
  lọc theo ngày, so sánh chuỗi trực tiếp (`gte`/`lt` dạng `YYYY-MM-DDTHH:mm:ss`), không convert
  qua `Date`/UTC rồi so lại (sẽ lệch giờ).
- Token thiết kế (màu, font) khai báo trong `src/app/globals.css` — dùng biến CSS
  (`var(--accent)`, `var(--card)`...) thay vì mã màu cứng, hỗ trợ light/dark qua
  `prefers-color-scheme` + `[data-theme]`, cùng nguyên tắc với `docs/theming.md` ở repo gốc dù
  cơ chế kỹ thuật khác (không còn giới hạn CSS-hack của Streamlit).
- Không thêm dependency ngoài trừ khi thực sự cần (đã có `@supabase/supabase-js`; thêm thư viện
  biểu đồ/rich-text editor khi tới trang cần chúng, hỏi người dùng trước nếu có nhiều lựa chọn).

## Chạy local

```bash
npm install
cp .env.local.example .env.local   # điền SUPABASE_URL/SUPABASE_KEY thật
npm run dev
```

`npm run build` để kiểm tra type/lint trước khi commit các thay đổi lớn.
