"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  Key,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { DENTALLY_MCP_TOOLS, McpToolDefinition } from "@/lib/mcp/tools";
import { clinicProfile } from "@/lib/mockData";

export default function McpSettingsPage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "patient" | "appointment" | "fee" | "assistant">("all");
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition>(DENTALLY_MCP_TOOLS[0]);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mcpUrl, setMcpUrl] = useState<string>("");
  const [doctorToken, setDoctorToken] = useState<string>("");

  useEffect(() => {
    // Fetch doctor's private tokenized URL
    fetch("/api/mcp/key")
      .then((r) => r.json())
      .then((data) => {
        if (data.mcpUrl) {
          setMcpUrl(data.mcpUrl);
          setDoctorToken(data.token);
        } else {
          setMcpUrl(`${window.location.origin}/api/mcp`);
        }
      })
      .catch(() => {
        setMcpUrl(`${window.location.origin}/api/mcp`);
      });
  }, [session?.user?.email]);

  const handleCopy = () => {
    if (!mcpUrl) return;
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
      const res = await fetch(mcpUrl || "/api/mcp", {
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

  const doctorName = session?.user?.name || clinicProfile.dentistName;
  const doctorEmail = session?.user?.email || clinicProfile.email;

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

      {/* URL Banner: Private Scoped URL */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#162321] text-white border border-[#243532] shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#203330] border border-[#2B423E] text-[#BDDBD1] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Private MCP Endpoint: Active</span>
            <span className="text-[#586B67]">•</span>
            <span>Auth: None (Key Embedded in URL)</span>
          </div>

          <div>
            <h3 className="font-bold text-xl sm:text-2xl text-white">
              Connect ChatGPT in 30 Seconds
            </h3>
            <p className="text-xs sm:text-sm text-[#BDDBD1] mt-1 leading-relaxed font-sans">
              Copy this private URL and paste it into ChatGPT. Because your unique authorization token is already inside the URL, you select <strong>Authentication: None</strong> in ChatGPT.
            </p>
          </div>

          {/* Quick Setup Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-2xl bg-[#0F1715]/70 border border-[#243532] space-y-1">
              <span className="font-bold text-[#2F8EAC] font-mono block">1. Server URL</span>
              <p className="text-[#A7BCB7] text-[11px]">Paste the private URL below into ChatGPT connection field.</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0F1715]/70 border border-[#243532] space-y-1">
              <span className="font-bold text-emerald-400 font-mono block">2. Authentication</span>
              <p className="text-[#A7BCB7] text-[11px]">Select <strong>None</strong> (or No Auth) in the dropdown.</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0F1715]/70 border border-[#243532] space-y-1">
              <span className="font-bold text-[#BDDBD1] font-mono block">3. Click Save</span>
              <p className="text-[#A7BCB7] text-[11px]">ChatGPT automatically loads all 10 clinical tools!</p>
            </div>
          </div>

          {/* URL Input with Copy Button */}
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#0F1715] border border-[#243532] max-w-2xl">
            <input
              type="text"
              readOnly
              value={mcpUrl || "Loading your private MCP URL..."}
              className="bg-transparent font-mono text-xs sm:text-sm text-[#C7E7EC] px-3 flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Private URL"}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#243532] flex flex-wrap items-center justify-between text-xs font-mono text-[#A7BCB7] gap-2">
          <span className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Scoped to: <strong className="text-[#C7E7EC]">{doctorName}</strong> ({doctorEmail})
          </span>
          <span className="text-[#BDDBD1]">{DENTALLY_MCP_TOOLS.length} Active AI Tools Ready</span>
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
                <span className="font-mono font-bold text-[#1E2D2B] group-hover:text-[#2F8EAC] transition-colors">
                  {tool.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#E8F0F1] text-[#2F8EAC] font-semibold uppercase">
                  {tool.category}
                </span>
              </div>
              <p className="mt-2 text-[#586B67] leading-relaxed line-clamp-3">
                {tool.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#DCE2DE] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#7E9691]">
                {Object.keys(tool.inputSchema?.properties || {}).length} arguments
              </span>
              <button
                onClick={() => runTestTool(tool)}
                className="px-3 py-1.5 rounded-lg bg-[#E8F0F1] hover:bg-[#2F8EAC] hover:text-white text-[#2F8EAC] font-semibold font-mono text-[11px] flex items-center gap-1 transition-all"
              >
                <Play className="w-3 h-3" />
                <span>Simulate Call</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Tool Inspector Console */}
      <div className="p-6 rounded-3xl bg-white border border-[#DCE2DE] shadow-card-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE2DE]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#2F8EAC]" />
            <h4 className="font-bold text-sm text-[#1E2D2B]">
              MCP Tool Execution Inspector ({selectedTool.name})
            </h4>
          </div>
          {loading && (
            <span className="text-xs font-mono text-[#2F8EAC] animate-pulse">
              Dispatching JSON-RPC...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1.5">
            <span className="font-bold text-[#3D5450] text-[11px] uppercase tracking-wider">
              Tool Schema Input Parameters
            </span>
            <pre className="p-4 rounded-2xl bg-[#0F1715] text-[#C7E7EC] overflow-x-auto max-h-72 border border-[#243532] text-[11px] leading-relaxed">
              {JSON.stringify(selectedTool.inputSchema, null, 2)}
            </pre>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-[#3D5450] text-[11px] uppercase tracking-wider">
              Live Response Output
            </span>
            <pre className="p-4 rounded-2xl bg-[#0F1715] text-emerald-300 overflow-x-auto max-h-72 border border-[#243532] text-[11px] leading-relaxed">
              {testOutput
                ? JSON.stringify(testOutput, null, 2)
                : '// Click "Simulate Call" above to test any MCP tool directly against your database.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
