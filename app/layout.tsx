import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "YouTube to Article Generator - Convert Videos to Well-Structured Articles",
  description:
    "Transform YouTube videos into beautifully formatted articles using AI. Perfect for students, researchers, and content creators who want to convert video content into written form.",
  keywords:
    "YouTube to article, video to text, AI article generator, content creation, video transcription, markdown generator",
  openGraph: {
    title: "YouTube to Article Generator",
    description: "Transform YouTube videos into beautifully formatted articles using AI",
    type: "website",
    locale: "en_US",
    url: "https://youtube-to-article.pages.dev/",
    siteName: "YouTube to Article Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube to Article Generator",
    description: "Transform YouTube videos into beautifully formatted articles using AI",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster />

        {children}
      </body>
    </html>
  );
}
