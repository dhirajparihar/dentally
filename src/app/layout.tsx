import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { FloatingChatGPTLink } from "@/components/ChatGPTLink";
import { AuthProvider } from "@/components/providers/AuthProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dentally — The AI-Native Dental Operating System",
  description: "Seamlessly connect your dental clinic to ChatGPT and Claude via Model Context Protocol (MCP). Zero API keys, 1-click Google sign-in, appointment management, and chairside AI collections.",
  keywords: ["dental software", "mcp server", "chatgpt dental", "dental EHR", "appointment scheduling", "dentist dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${plusJakartaSans.variable}`}
    >
      <body className="min-h-screen bg-[#FBF9F1] text-[#1E2D2B] selection:bg-[#BDDBD1] selection:text-[#162321] font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <FloatingChatGPTLink />
      </body>
    </html>
  );
}

