import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mặc định 1MB — CSV Forest xuất nhiều năm dữ liệu có thể vượt mức này khi gửi nguyên văn
    // vào Server Action (xem src/app/tuy-bien/actions.ts).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
