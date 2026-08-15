import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Gowun_Batang, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/** 제목용 한글 명조 — 라디오 서재의 인쇄물 느낌을 낸다 */
const gowunBatang = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

/** 본문용 한글 산세리프 */
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

/** 숫자·시간 표시용 */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "voca-listen",
  description: "들으면서 외우는 나만의 단어장",
  applicationName: "voca-listen",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "voca-listen" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 아래 탭 막대가 주소창에 가리지 않게
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2EA" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1714" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${gowunBatang.variable} ${plexSansKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
