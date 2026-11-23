"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { CustomMcpSetupGuide } from "@/components/dashboard/CustomMcpSetupGuide";
import { DENTALLY_MCP_TOOLS } from "@/lib/mcp/tools";
import { useClinic } from "@/context/ClinicContext";

export default function McpSettingsPage() {
  const { clinicProfile, userEmail } = useClinic();
  const [mcpUrl, setMcpUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "complete">("idle");
  const [copyError, setCopyError] = useState("");
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpointSignal = useRef<AbortSignal | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    endpointSignal.current = controller.signal;
    const cleanup = () => {
      controller.abort();
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
    setMcpUrl("");
    setCopyError("");
    setCopyStatus("idle");
    if (!userEmail) return cleanup;
    fetch("/api/mcp/key", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.mcpUrl) throw new Error("Unable to load your private MCP URL. Refresh the page to retry.");
        return data.mcpUrl as string;
      })
      .then((url) => { if (!controller.signal.aborted) setMcpUrl(url); })
      .catch((error: Error) => { if (!controller.signal.aborted) setCopyError(error.message); });
    return cleanup;
  }, [userEmail]);

  const handleCopy = async () => {
    const signal = endpointSignal.current;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      if (signal?.aborted) return;
      setCopyStatus("copied");
      setCopyError("");
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopyStatus("complete"), 2000);
    } catch {
      if (!signal?.aborted) setCopyError("Select the URL to copy it manually.");
    }
  };

  const maskedUrl = useMemo(() => {
    if (!mcpUrl) return "";
    const keyIdx = mcpUrl.indexOf("key=");
    if (keyIdx === -1) return mcpUrl;
    const base = mcpUrl.slice(0, keyIdx + 4);
    const token = mcpUrl.slice(keyIdx + 4);
    if (token.length <= 8) return `${base}••••••••••••••••••••••••••••••••`;
    return `${base}${token.slice(0, 4)}••••••••••••••••••••••••${token.slice(-4)}`;
  }, [mcpUrl]);

  const displayUrl = showKey ? mcpUrl : maskedUrl;
  const copied = copyStatus === "copied";

  return (
    <div className="mcp-workspace space-y-4">
      <section className="mcp-connection" aria-labelledby="connection-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="connection-heading" className="text-base font-bold">Connect your assistant</h2><p className="mt-1 text-xs leading-5 text-[#64748B]">Connect your assistant with your private clinic endpoint.</p></div>
          <span className="mcp-protocol">MCP &middot; JSON-RPC 2.0</span>
        </div>
        <label htmlFor="mcp-endpoint" className="mb-2 mt-4 block text-xs font-medium text-[#52627A]">Private Server URL</label>
        <div className="mcp-endpoint-field">
          <div className="relative flex-1 min-w-0">
            <input
              id="mcp-endpoint"
              type="text"
              readOnly
              value={displayUrl}
              placeholder="Loading endpoint..."
              onFocus={(event) => event.currentTarget.select()}
              onCopy={(event) => {
                if (!showKey && mcpUrl) {
                  event.preventDefault();
                  void handleCopy();
                }
              }}
              className="pr-10 font-mono"
            />
            {mcpUrl && (
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide private key" : "Show private key"}
                title={showKey ? "Hide private key" : "Show private key"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#8291A7] hover:text-[#111C3A] hover:bg-[#E4E9F0]/70 transition-colors"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!mcpUrl}
            className="workspace-button primary"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
        {copyError && <p role="status" className="mt-2 text-xs text-[#64748B]">{copyError}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[#64748B]"><p className="flex min-w-0 items-center gap-1.5"><ShieldCheck size={14} className="shrink-0 text-[#0089A8]" /><span className="break-all">{clinicProfile.dentistName} &middot; {clinicProfile.email}</span></p><span>{DENTALLY_MCP_TOOLS.length} tools</span></div>
        <details className="mcp-connection-help"><summary>Connection details</summary><p>Your private server URL includes the clinic access key. Keep the full URL private and enter it only in the MCP client you want to connect.</p></details>
      </section>

      <CustomMcpSetupGuide urlCopied={copyStatus !== "idle"} />
    </div>
  );
}
