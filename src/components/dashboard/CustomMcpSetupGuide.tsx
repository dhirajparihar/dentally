import type { ReactNode } from "react";
import { ArrowUpRight, Check, CircleCheck, Copy, Plug, type LucideIcon } from "lucide-react";

function SetupStep({ number, title, icon: Icon, complete = false, children }: {
  number: number;
  title: string;
  icon: LucideIcon;
  complete?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={`min-w-0 rounded-xl border p-3 ${complete
      ? "border-[#D4E9EE] bg-[#EDF7FA]"
      : "border-[var(--workspace-border)] bg-[var(--workspace-background)]"}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-[#E4F2F5] text-xs font-bold text-[var(--workspace-accent)]">{number}</span>
        <h3 className="min-w-0 text-sm font-bold">{title}</h3>
        <Icon size={16} aria-hidden="true" className="ml-auto shrink-0 text-[var(--workspace-accent)]" />
      </div>
      <div className="mt-2 text-sm leading-5 text-[var(--workspace-muted)]">{children}</div>
    </li>
  );
}

const pathChip = "rounded-md border border-[#D4E9EE] bg-[#EDF7FA] px-2 py-1 text-xs font-semibold leading-4 text-[var(--workspace-accent)]";

export function CustomMcpSetupGuide({ urlCopied }: { urlCopied: boolean }) {
  return (
    <section id="mcp-setup-guide" className="mcp-connection scroll-mt-24" aria-labelledby="mcp-setup-heading">
      <h2 id="mcp-setup-heading" className="text-base font-bold">Custom MCP Setup Guide</h2>

      <ol role="list" className="mt-3 grid gap-2.5 lg:grid-cols-3">
        <SetupStep number={1} icon={urlCopied ? Check : Copy} title="Copy URL" complete={urlCopied}>
          <p role="status" className={urlCopied ? "font-semibold text-[var(--workspace-accent)]" : undefined}>
            {urlCopied ? "Private URL copied" : "Use Copy URL in the card above."}
          </p>
        </SetupStep>

        <SetupStep number={2} icon={Plug} title="Add to ChatGPT">
          <a
            href="https://chatgpt.com/plugins"
            target="_blank"
            rel="noopener noreferrer"
            className="workspace-button secondary small"
          >
            Open ChatGPT Plugins <ArrowUpRight size={15} className="shrink-0" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </SetupStep>

        <SetupStep number={3} icon={CircleCheck} title="Save Connection">
          <p>Finish setup in ChatGPT.</p>
        </SetupStep>
      </ol>

      <section aria-labelledby="mcp-configuration-heading" className="mt-4 border-t border-[var(--workspace-border)] pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 id="mcp-configuration-heading" className="text-sm font-semibold">Follow this in ChatGPT</h3>
          <ol role="list" aria-label="ChatGPT navigation path" className="flex flex-wrap items-center gap-1.5">
            <li className={pathChip}>Plugins</li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-xs text-[var(--workspace-muted)]">→</span>
              <span aria-hidden="true" className={pathChip}>+</span>
              <span className="sr-only">Plus button</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-xs text-[var(--workspace-muted)]">→</span>
              <span className={pathChip}>Add custom MCP server</span>
            </li>
          </ol>
        </div>

        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--workspace-muted)]">
          <li>Enter a <strong>Name</strong> of your choice.</li>
          <li>Under <strong>Connection</strong>, paste the copied link into <strong>Server URL</strong>.</li>
          <li>Under <strong>Authentication</strong>, choose <strong>No authentication</strong>.</li>
          <li>Select <strong>Create as a plugin</strong>.</li>
        </ul>
      </section>
    </section>
  );
}
