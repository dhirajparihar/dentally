import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dentally — The AI-Native Dental Operating System",
  description: "Seamlessly connect your dental clinic to ChatGPT and Claude via Model Context Protocol (MCP). Zero API keys, 1-click Google sign-in, interactive odontograms, and chairside AI intelligence.",
  keywords: ["dental software", "mcp server", "chatgpt dental", "dental EHR", "odontogram", "dentist dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${playfair.variable} ${plusJakartaSans.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen bg-[#FBF9F1] text-[#1E2D2B] selection:bg-[#BDDBD1] selection:text-[#162321] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

