import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "服薬チェックアプリ",
  description: "介護スタッフ向け 服薬管理・確認アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
