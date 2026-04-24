import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "美股交易复盘系统",
  description: "个人美股交易记录与复盘分析工具",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iOS 安全区支持
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex flex-col h-full">
                {children}
              </div>
            </main>
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
