import Image from "next/image";
import { ExternalLink } from "lucide-react";

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
