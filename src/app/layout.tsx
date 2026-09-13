import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const data = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Forest Dashboard",
  description: "Xem lại dữ liệu phiên tập trung từ Forest.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${data.variable} h-full`}>
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-7 max-w-[1180px]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
