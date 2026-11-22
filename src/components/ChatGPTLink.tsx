"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

export function FloatingChatGPTLink() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <ChatGPTLink
      iconOnly
      className="floating-chatgpt-link no-print inline-flex items-center justify-center rounded-full border border-dental-limestone bg-white shadow-md transition-colors hover:bg-dental-cerulean-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dental-cerulean-dark"
    />
  );
}

export function ChatGPTLink({ className, iconOnly = false }: { className: string; iconOnly?: boolean }) {
  return (
    <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className={className} title={iconOnly ? "Open ChatGPT" : undefined}>
      <span className={iconOnly ? "sr-only" : undefined}>Open ChatGPT</span>
      {iconOnly ? (
        <Image src="/openai-blossom.png" width={42} height={42} alt="" unoptimized />
      ) : (
        <ExternalLink size={15} aria-hidden="true" />
      )}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
