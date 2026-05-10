import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terrarium OS",
  description: "A virtual terrarium ecosystem — control lighting, humidity, temperature, and add plants & organisms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
