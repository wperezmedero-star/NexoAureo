import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./future.css";

const siteUrl = "https://menteabaco.waltermusica.chatgpt.site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NexoÁureo",
  description: "Inteligencia híbrida en español para entrevistas, análisis verificable de necesidades y exploración privada de escenarios.",
  applicationName: "NexoÁureo",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "NexoÁureo",
    description: "Inteligencia verificable para conversaciones que importan.",
    type: "website",
    locale: "es_US",
    url: "/",
    images: [
      {
        url: "https://menteabaco.waltermusica.chatgpt.site/og.png",
        width: 1200,
        height: 630,
        alt: "NexoÁureo · Inteligencia verificable para conversaciones que importan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexoÁureo",
    description: "Inteligencia verificable para conversaciones que importan.",
    images: ["https://menteabaco.waltermusica.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NexoÁureo",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "es",
    description: "Plataforma en español para entrevistas guiadas y análisis verificable de necesidades familiares.",
  };

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
