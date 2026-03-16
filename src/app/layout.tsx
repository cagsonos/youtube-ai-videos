import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Neural Cinema — YouTube AI Videos",
  description: "Colección curada de videos de YouTube sobre Inteligencia Artificial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${geistSans.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen noise-bg cinema-bg">
        {children}
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            style: {
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(1 0 0 / 8%)",
              color: "oklch(0.93 0.005 260)",
            },
          }}
        />
      </body>
    </html>
  );
}
