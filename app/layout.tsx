import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TimelineSyncProvider } from "@/context/TimelineSyncContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { CategoriesProvider } from "@/context/CategoriesContext";
import { listCategories } from "@/lib/categories";
import { ThemeApplicator } from "@/components/ui/ThemeApplicator";

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
  verification: {
    google: "uPJ41I9rL3gBtLUvF77owQnmEZJ0MACZYP-iUTTscHU",
  },
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
  const categories = listCategories();

  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <CategoriesProvider initialCategories={categories}>
          <SettingsProvider>
            <ThemeApplicator />
            <TimelineSyncProvider>{children}</TimelineSyncProvider>
          </SettingsProvider>
        </CategoriesProvider>
      </body>
    </html>
  );
}
