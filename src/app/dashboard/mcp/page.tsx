"use client";

import React, { useState } from "react";
import {
  Cpu,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Play,
  Users,
  Calendar,
  CreditCard,
  Bot,
  Zap,
} from "lucide-react";
import { DENTALLY_MCP_TOOLS, McpToolDefinition } from "@/lib/mcp/tools";
import { clinicProfile } from "@/lib/mockData";

export default function McpSettingsPage() {
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "patient" | "appointment" | "fee" | "assistant">("all");
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition>(DENTALLY_MCP_TOOLS[0]);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : clinicProfile.mcpServerUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTools = DENTALLY_MCP_TOOLS.filter((t) => {
    if (selectedCategory === "all") return true;
    return t.category === selectedCategory;
  });

  const runTestTool = async (tool: McpToolDefinition) => {
    setSelectedTool(tool);
    setLoading(true);

    let sampleParams: Record<string, any> = {};
    if (tool.name === "search_patient") sampleParams = { query: "Rahul Sharma" };
    else if (tool.name === "get_patient_details") sampleParams = { patientId: "pat_101" };
    else if (tool.name === "get_patient_history") sampleParams = { patientId: "pat_101" };
    else if (tool.name === "get_patient_balance") sampleParams = { patientId: "pat_101" };
    else if (tool.name === "get_patient_fees_history") sampleParams = { patientId: "pat_101" };
    else if (tool.name === "get_patient_appointment_history") sampleParams = { patientId: "pat_101" };
    else if (tool.name === "get_today_appointments") sampleParams = {};
    else if (tool.name === "get_upcoming_appointments") sampleParams = { limit: 5 };
    else if (tool.name === "check_available_slots") sampleParams = { date: "today" };
    else if (tool.name === "get_daily_collection") sampleParams = {};
    else if (tool.name === "get_daily_summary") sampleParams = {};
    else if (tool.name === "get_patients_with_pending_fees") sampleParams = {};
    else if (tool.name === "get_patient_summary") sampleParams = { patientQuery: "Rahul Sharma" };
    else if (tool.name === "get_pending_fees") sampleParams = {};
    else if (tool.name === "search_patient_by_phone") sampleParams = { phone: "98201" };
    else if (tool.name === "get_monthly_collection") sampleParams = {};

    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `mcp_req_${Date.now()}`,
          method: "tools/call",
          params: {
            name: tool.name,
            arguments: sampleParams,
          },
        }),
      });
      const data = await res.json();
      setTestOutput(data);
    } catch (e: any) {
      setTestOutput({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2F8EAC] animate-pulse" />
          <h2 className="font-bold text-2xl sm:text-3xl text-[#1E2D2B] flex items-center gap-2.5 tracking-tight">
            <Cpu className="w-6 h-6 text-[#2F8EAC]" />
            Dentist AI MCP Server Hub
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#586B67] mt-1">
          Model Context Protocol endpoint providing ChatGPT complete access to Patients, Appointments, and Fees.
        </p>
      </div>

      {/* URL Banner */}
      <div className="p-6 rounded-3xl bg-[#162321] text-white border border-[#243532] shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#203330] border border-[#2B423E] text-[#BDDBD1] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#BDDBD1] animate-pulse" />
            <span>MCP Remote Server: Online</span>
            <span className="text-[#586B67]">•</span>
            <span>Auth: Google Identity</span>
          </div>

          <h3 className="font-bold text-xl sm:text-2xl text-white">
            Connect ChatGPT via Clinic URL
          </h3>

          <p className="text-xs sm:text-sm text-[#BDDBD1] leading-relaxed font-sans">
            Add this URL to ChatGPT under <strong>Settings → Connected Apps / MCP</strong>.
            ChatGPT will redirect to <strong>Sign in with Google</strong> using your registered Gmail ID.
            No API keys needed.
          </p>

          <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#0F1715] border border-[#243532] max-w-xl">
            <input
              type="text"
              readOnly
              value={mcpUrl}
              className="bg-transparent font-mono text-xs sm:text-sm text-[#C7E7EC] px-3 flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-[#BDDBD1]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy URL"}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#243532] flex flex-wrap items-center justify-between text-xs font-mono text-[#A7BCB7] gap-2">
          <span className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-4 h-4 text-[#BDDBD1]" />
            Authenticated for: {clinicProfile.dentistName} ({clinicProfile.email})
          </span>
          <span>{DENTALLY_MCP_TOOLS.length} Active AI Tools</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: `All Tools (${DENTALLY_MCP_TOOLS.length})` },
            { id: "patient", label: "1. Patients (10)" },
            { id: "appointment", label: "2. Appointments (9)" },
            { id: "fee", label: "3. Fees & History (11)" },
            { id: "assistant", label: "4. Daily Assistant (6)" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              selectedCategory === tab.id
                ? "bg-[#1E2D2B] text-white shadow-sm ring-1 ring-[#2F8EAC]"
                : "bg-white text-[#2D433F] border border-[#DCE2DE] hover:border-[#2F8EAC] hover:bg-[#F8FAF9]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <div
            key={tool.name}
            className="p-5 rounded-2xl bg-white border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] flex flex-col justify-between hover:border-[#2F8EAC]/70 transition-all text-xs group"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#DCE2DE]">
                <span className="font-mono font-bold text-[#2F8EAC] bg-[#E8F0F1] px-2.5 py-1 rounded-lg border border-[#C7E7EC] text-[11px]">
                  {tool.name}
                </span>
                <button
                  onClick={() => runTestTool(tool)}
                  disabled={loading}
                  className="px-3 py-1 rounded-lg text-[#1E2D2B] hover:bg-[#E8F0F1] flex items-center gap-1.5 font-bold text-[11px] border border-[#DCE2DE] shadow-2xs group-hover:border-[#2F8EAC]"
                >
                  <Play className="w-3 h-3 text-[#2F8EAC] fill-current" />
                  <span>Test</span>
                </button>
              </div>

              <p className="text-[#3D5450] mt-3 leading-relaxed font-sans font-normal">
                {tool.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#DCE2DE] flex items-center justify-between text-[11px] font-mono text-[#3D5450]">
              <span className="uppercase font-bold text-[#1E2D2B]">{tool.category}</span>
              <span className="text-[#2F8EAC] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Tool
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Live In-Browser Execution Console */}
      <div className="bg-[#162321] rounded-3xl p-6 text-white border border-[#243532] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#243532]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#BDDBD1]" />
            <h4 className="font-bold font-mono text-sm">MCP Live Tool Inspector</h4>
          </div>
          <span className="text-xs font-mono text-[#A7BCB7]">
            Testing: <strong className="text-[#BDDBD1]">{selectedTool.name}</strong>
          </span>
        </div>

        <div className="bg-[#0F1715] p-4 rounded-2xl border border-[#243532] font-mono text-xs overflow-x-auto min-h-[140px] flex flex-col justify-between">
          <pre className="text-[#BDDBD1] leading-relaxed max-h-[300px]">
            {loading
              ? "Executing tool against clinic records via MCP..."
              : testOutput
              ? JSON.stringify(testOutput, null, 2)
              : `Click "Test" on any tool above (e.g. search_patient, get_today_appointments, get_daily_collection) to inspect the JSON response.`}
          </pre>

          <div className="pt-2 border-t border-[#243532] flex items-center justify-between text-[10px] text-[#7E9691]">
            <span>JSON-RPC 2.0 Spec (Remote MCP)</span>
            <span>Google OAuth Authenticated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
