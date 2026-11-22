"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, ShieldCheck, Play, Search, X, Terminal, ChevronRight, Eye, EyeOff } from "lucide-react";
import { ChatGPTLink } from "@/components/ChatGPTLink";
import { DENTALLY_MCP_TOOLS, McpToolDefinition } from "@/lib/mcp/tools";
import { useClinic } from "@/context/ClinicContext";

const categories = [
  { id: "all", label: "All" },
  { id: "patient", label: "Patients" },
  { id: "appointment", label: "Appointments" },
  { id: "fee", label: "Billing" },
  { id: "assistant", label: "Assistant" },
] as const;

const samplePatient = "<sample patient>";
const starterPrompt = "Show me tomorrow’s open appointment slots.";

function formatToolResponse(data: unknown, patientIds: ReadonlySet<string>) {
  function hidePatientIds(this: Record<string, unknown>, key: string, value: unknown): unknown {
    if (/^patient_?ids?$/i.test(key)) return undefined;
    if (key === "_id" && typeof this.name === "string" && typeof this.phone === "string") return undefined;
    if (typeof value !== "string") return value;
    if (patientIds.has(value)) return "[hidden]";

    if (key === "text" && this.type === "text") {
      try {
        const payload: unknown = JSON.parse(value);
        return JSON.stringify(payload, hidePatientIds, 2);
      } catch {
        // MCP tools can return plain text as well as serialized JSON.
      }
    }

    return value.replace(/\bPatient '[^']+' not found\./gi, "Patient not found.");
  }

  return JSON.stringify(data, hidePatientIds, 2);
}

export default function McpSettingsPage() {
  const { clinicProfile, patients, userEmail } = useClinic();
  const [mcpUrl, setMcpUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [promptCopyMessage, setPromptCopyMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]["id"]>("all");
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition>(DENTALLY_MCP_TOOLS.find((tool) => tool.name === "get_today_appointments") || DENTALLY_MCP_TOOLS[0]);
  const [argumentsText, setArgumentsText] = useState("{}");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState("");
  const [loading, setLoading] = useState(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const samplePatientId = useRef<string | undefined>(undefined);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setMcpUrl("");
    setCopyError("");
    setCopied(false);
    if (!userEmail) return;
    fetch("/api/mcp/key", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.mcpUrl) throw new Error("Unable to load your private MCP URL. Refresh the page to retry.");
        return data.mcpUrl as string;
      })
      .then((url) => { if (!controller.signal.aborted) setMcpUrl(url); })
      .catch((error: Error) => { if (!controller.signal.aborted) setCopyError(error.message); });
    return () => controller.abort();
  }, [userEmail]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setCopyError("");
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Select the URL to copy it manually.");
    }
  };

  const copyStarterPrompt = async () => {
    try {
      await navigator.clipboard.writeText(starterPrompt);
      setPromptCopyMessage("Prompt copied.");
    } catch {
      promptRef.current?.focus();
      setPromptCopyMessage("Copy the selected prompt manually.");
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

  const filteredTools = DENTALLY_MCP_TOOLS.filter((tool) => (selectedCategory === "all" || tool.category === selectedCategory) && `${tool.name} ${tool.description}`.toLowerCase().includes(search.trim().toLowerCase()));

  const selectTool = (tool: McpToolDefinition) => {
    setSelectedTool(tool);
    const patient = patients[0];
    samplePatientId.current = patient?._id;
    let parameters: Record<string, unknown> = {};
    if (tool.name === "get_clinic_profile") parameters = {};
    else if (tool.name === "update_clinic_profile") parameters = {};
    else if (tool.name === "search_patient") parameters = { query: patient?.name || "" };
    else if (["get_patient_details", "get_patient_history", "get_patient_balance", "get_patient_fees_history", "get_patient_appointment_history"].includes(tool.name)) parameters = { patientId: patient ? samplePatient : "" };
    else if (tool.name === "get_patient_notes") parameters = { appointmentId: "" };
    else if (tool.name === "add_patient_notes") parameters = { appointmentId: "", note: "" };
    else if (tool.name === "update_patient_notes") parameters = { appointmentId: "", noteId: "", note: "" };
    else if (tool.name === "get_upcoming_appointments") parameters = { limit: 5 };
    else if (tool.name === "check_available_slots") parameters = { date: "today" };
    else if (tool.name === "get_patient_summary") parameters = { patientQuery: patient?.name || "" };
    else if (tool.name === "search_patient_by_phone") parameters = { phone: patient?.phone || "" };
    setArgumentsText(JSON.stringify(parameters, null, 2));
    setTestOutput(null);
    setTestError("");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      inspectorRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  };

  const runTestTool = async () => {
    let parameters: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(argumentsText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      parameters = parsed as Record<string, unknown>;
    } catch {
      setTestError("Enter a valid JSON object for the tool arguments.");
      return;
    }
    setLoading(true);
    setTestOutput(null);
    setTestError("");
    try {
      if (parameters.patientId === samplePatient) parameters.patientId = samplePatientId.current ?? "";
      const response = await fetch(mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: `mcp_req_${Date.now()}`, method: "tools/call", params: { name: selectedTool.name, arguments: parameters } }),
      });
      const data: unknown = await response.json();
      setTestOutput(formatToolResponse(data, new Set(patients.map((patient) => patient._id))));
      if (!response.ok) setTestError(`Request failed (${response.status}). See the response below.`);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Unable to run this tool.");
    } finally {
      setLoading(false);
    }
  };

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
                  navigator.clipboard.writeText(mcpUrl);
                  setCopied(true);
                  if (copyTimeout.current) clearTimeout(copyTimeout.current);
                  copyTimeout.current = setTimeout(() => setCopied(false), 2000);
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
        <details className="mcp-connection-help"><summary>Connection details</summary><p>Add the private server URL in your MCP client and select Authentication: None. Your clinic authorization key is included in the URL.</p></details>
      </section>

      <section className="mcp-connection" aria-labelledby="chatgpt-heading">
        <h2 id="chatgpt-heading" className="text-base font-bold">Use Dentally in ChatGPT</h2>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">
          Once connected, open ChatGPT, select <strong>@Dentally</strong>, and paste the starter prompt.
        </p>
        <textarea
          ref={promptRef}
          value={starterPrompt}
          readOnly
          rows={2}
          aria-label="Starter prompt"
          onFocus={(event) => event.currentTarget.select()}
          className="mcp-arguments mt-3"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyStarterPrompt} className="workspace-button secondary">
            <Copy size={15} aria-hidden="true" /> Copy Prompt
          </button>
          <ChatGPTLink className="workspace-button primary" />
        </div>
        <p role="status" className="mt-2 text-xs text-[#52627A] empty:mt-0">{promptCopyMessage}</p>
      </section>

      <div className="mcp-layout">
        <section className="mcp-tool-browser" aria-labelledby="tools-heading">
          <div className="mcp-browser-controls">
            <div className="mb-3 flex items-center justify-between gap-2"><h2 id="tools-heading" className="text-sm font-semibold">Tools</h2><span className="text-xs text-[#8291A7]">{filteredTools.length} results</span></div>
            <div className="workspace-search"><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search MCP tools" placeholder="Search tools" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear tool search"><X size={15} /></button>}</div>
            <div className="mcp-category-list" role="group" aria-label="Tool category">{categories.map(({ id, label }) => <button key={id} type="button" aria-pressed={selectedCategory === id} onClick={() => setSelectedCategory(id)}>{label}<span>{id === "all" ? DENTALLY_MCP_TOOLS.length : DENTALLY_MCP_TOOLS.filter((tool) => tool.category === id).length}</span></button>)}</div>
          </div>
          <div className="mcp-tool-list" role="group" aria-label="Available tools">
            {filteredTools.length === 0 ? <p className="p-6 text-center text-xs text-[#64748B]">No matching tools.</p> : filteredTools.map((tool) => <button key={tool.name} type="button" disabled={loading} aria-pressed={selectedTool.name === tool.name} onClick={() => selectTool(tool)} className="mcp-tool-row"><div className="min-w-0 flex-1"><h3>{tool.name.replace(/_/g, " ")}</h3><p>{tool.name}</p></div><span className="mcp-tool-category">{categories.find((category) => category.id === tool.category)?.label}</span><ChevronRight size={15} className="shrink-0" aria-hidden="true" /></button>)}
          </div>
        </section>

        <section ref={inspectorRef} className="mcp-inspector" aria-labelledby="inspector-heading">
          <div className="mcp-inspector-header"><Terminal size={17} className="text-[#0089A8]" aria-hidden="true" /><h2 id="inspector-heading" className="text-sm font-semibold">Tool Inspector</h2></div>
          <div className="p-4 sm:p-5">
            <h3 className="break-all text-sm font-semibold text-[#00738E]">{selectedTool.name}</h3><p className="mt-2 text-xs leading-6 text-[#64748B]">{selectedTool.description}</p>
            <details className="mcp-schema"><summary>Input schema</summary><pre>{JSON.stringify(selectedTool.inputSchema, null, 2)}</pre></details>
            <label htmlFor="tool-arguments" className="mb-2 mt-4 block text-xs font-semibold text-[#52627A]">Arguments <span className="font-normal text-[#8291A7]">JSON</span></label>
            <textarea id="tool-arguments" value={argumentsText} onChange={(event) => setArgumentsText(event.target.value)} disabled={loading} rows={5} spellCheck={false} className="mcp-arguments" />
            {testError && <p role="alert" className="mt-2 text-xs leading-5 text-rose-700">{testError}</p>}
            <div className="mt-3 flex justify-end"><button type="button" disabled={loading || !mcpUrl} onClick={runTestTool} className="workspace-button primary"><Play size={14} />{loading ? "Running..." : "Run Tool"}</button></div>
            <div className="mt-5 border-t border-[#E4E9F0] pt-4"><h4 className="mb-2 text-xs font-semibold text-[#52627A]">Response</h4><div aria-busy={loading}>{loading ? <p role="status" className="mcp-response-placeholder">Running against clinic records...</p> : testOutput !== null ? <pre className="mcp-response" tabIndex={0} aria-label="MCP tool response">{testOutput}</pre> : <p className="mcp-response-placeholder">Select a tool and run it to see the response.</p>}</div></div>
          </div>
        </section>
      </div>
    </div>
  );
}
