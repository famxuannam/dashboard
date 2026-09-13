"use client";

import { useEffect, useRef } from "react";
import Quill from "quill";
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
    const quill = new Quill(container, {
      theme: "snow",
      modules: { toolbar: TOOLBAR },
      placeholder,
    });
    if (initialHtml) quill.clipboard.dangerouslyPasteHTML(initialHtml);
    quill.on("text-change", () => onChange(quill.root.innerHTML));
    return () => {
      container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="note-quill" ref={containerRef} />;
}
