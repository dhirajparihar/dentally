import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ChatGPTLink } from "@/components/ChatGPTLink";
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
        <ChatGPTLink
          iconOnly
          className="floating-chatgpt-link no-print inline-flex items-center justify-center rounded-full border border-dental-limestone bg-white shadow-md transition-colors hover:bg-dental-cerulean-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dental-cerulean-dark"
        />
      </body>
    </html>
  );
}

