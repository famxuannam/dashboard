"use client";

import { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";

const TOOLBAR = [
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  ["link"],
  ["clean"],
];

/**
 * Bọc thư viện Quill thật (không phải textarea giả) để giữ đúng định dạng HTML đã lưu trong cột
 * `notes.note` (kể cả ghi chú cũ tạo từ app Streamlit — cùng dùng class `ql-indent-N` cho thụt
 * lề). "Uncontrolled" giống hệt `streamlit-quill` ở app gốc: `initialHtml` chỉ áp dụng lúc mount,
 * đổi prop sau đó KHÔNG cập nhật lại nội dung đang gõ — muốn nạp nội dung mới (vd sau khi bấm
 * "Gộp" ghi chú nhanh lúc trình soạn đang mở) phải đổi `key` ở component cha để ép remount, xem
 * NoteEditor.tsx.
 *
 * `import("quill")` PHẢI nạp động bên trong `useEffect` (không import tĩnh ở đầu file) — package
 * `quill` export thẳng mã nguồn ESM (`main: "quill.js"`, không có bản dist/UMD làm entry mặc
 * định) và một số module con của nó đụng tới `document` NGAY LÚC NẠP MODULE (không đợi gọi hàm),
 * nên import tĩnh sẽ crash "document is not defined" khi Next.js render Server Component lần đầu
 * (kể cả với "use client", cây component vẫn được render 1 lần trên server trước khi hydrate) —
 * import động trong effect đảm bảo chỉ chạy trên trình duyệt.
 */
export default function QuillEditor({
  initialHtml,
  onChange,
  placeholder,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    import("quill").then(({ default: Quill }) => {
      if (cancelled || !container) return;
      const quill = new Quill(container, {
        theme: "snow",
        modules: { toolbar: TOOLBAR },
        placeholder,
      });
      if (initialHtml) quill.clipboard.dangerouslyPasteHTML(initialHtml);
      quill.on("text-change", () => onChange(quill.root.innerHTML));
    });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="note-quill" ref={containerRef} />;
}
