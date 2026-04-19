import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TimelineSyncProvider } from "@/context/TimelineSyncContext";
import { SettingsProvider } from "@/context/SettingsContext";

// Plus Jakarta Sans is the closest Google Font to Aptos (Microsoft's humanist sans-serif)
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Timeline do Petróleo",
  description:
    "Visualização interativa da geopolítica do petróleo e correlação com preços históricos do Brent.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <SettingsProvider>
          <TimelineSyncProvider>{children}</TimelineSyncProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
