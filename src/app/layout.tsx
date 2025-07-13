import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Modmail Web",
  description: "Discord modmail web interface",
  icons: {
    icon: [
      {
        url: "/Subject.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/Subject.png",
        sizes: "16x16", 
        type: "image/png",
      },
      {
        url: "/Subject.png",
        sizes: "any",
        type: "image/png",
      },
    ],
    shortcut: "/Subject.png",
    apple: [
      {
        url: "/Subject.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/Subject.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/Subject.png" />
        <link rel="shortcut icon" href="/Subject.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/Subject.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
