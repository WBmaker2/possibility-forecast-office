import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가능성 예보국 | 자료로 예보 다시 보기",
  description: "초등 5~6학년을 위한 반복 실험 자료 기반 가능성 학습 활동",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "가능성 예보국 | 자료로 예보 다시 보기",
    description: "첫 자료로 예보하고, 새 자료를 누적해 다시 살펴보는 초등 수학 활동",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "가능성 예보국: 8/10에서 9/20으로 예보를 다시 살펴보는 자료 관측판" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "가능성 예보국 | 자료로 예보 다시 보기",
    description: "첫 자료와 새 자료를 누적해 예보를 다시 살펴봐요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
