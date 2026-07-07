import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { JourneyProvider } from "@/components/journey-provider";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "JourneyOS",
  description: "本地优先的个人旅程记忆系统。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "JourneyOS",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#101315" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <JourneyProvider>
            <AppShell>{children}</AppShell>
          </JourneyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
