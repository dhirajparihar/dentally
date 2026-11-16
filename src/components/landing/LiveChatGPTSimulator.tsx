"use client";

import React, { useState } from "react";
import { Terminal, Bot, User, CheckCircle2, ShieldCheck, Play, Volume2 } from "lucide-react";

interface Scenario {
  id: string;
  label: string;
  category: "Patient Search" | "Appointments" | "Fees History" | "Daily Collection";
  userPrompt: string;
  toolCalled: string;
  toolInput: Record<string, any>;
  assistantResponse: string;
  dataCard: {
    title: string;
    badge: string;
    metrics: { label: string; value: string }[];
  };
}

const scenarios: Scenario[] = [
  {
    id: "search",
    label: "1. Patient Search",
    category: "Patient Search",
    userPrompt: "Find Rahul Sharma.",
    toolCalled: "search_patient({ query: 'Rahul Sharma' })",
    toolInput: { query: "Rahul Sharma" },
    assistantResponse:
      "Found Rahul Sharma (ID: pat_101, Age 34, Phone: +91 98201 44521).\n• Medical Alert: ⚠️ Penicillin Allergy\n• Previous Visit: Nov 10, 2026 (Completed Root Canal on #46)\n• Total Billed: ₹16,500 | Total Paid: ₹11,500\n• Outstanding Balance: ₹5,000",
    dataCard: {
      title: "Rahul Sharma • Patient Card",
      badge: "Penicillin Allergy",
      metrics: [
        { label: "Phone", value: "+91 98201 44521" },
        { label: "Last Visit", value: "Nov 10, 2026 (#46)" },
        { label: "Pending Balance", value: "₹5,000" },
      ],
    },
  },
  {
    id: "appointments",
    label: "2. Today's Appointments",
    category: "Appointments",
    userPrompt: "Show my appointments today.",
    toolCalled: "get_today_appointments()",
    toolInput: {},
    assistantResponse:
      "Here is your appointment schedule for today:\n1. 10:30 AM — Rahul Sharma (Crown Preparation #46)\n2. 11:45 AM — Sarah Jenkins (Veneer Luting #11, #21)\n3. 03:15 PM — Vikram Malhotra (Implant Healing Abutment #36)\nTotal: 3 patients scheduled.",
    dataCard: {
      title: "Today's Clinic Schedule",
      badge: "3 Patients Scheduled",
      metrics: [
        { label: "10:30 AM", value: "Rahul Sharma" },
        { label: "11:45 AM", value: "Sarah Jenkins" },
        { label: "03:15 PM", value: "Vikram Malhotra" },
      ],
    },
  },
  {
    id: "fees",
    label: "3. Fees History",
    category: "Fees History",
    userPrompt: "How much has Rahul paid so far?",
    toolCalled: "get_patient_fees_history({ patientId: 'Rahul Sharma' })",
    toolInput: { patientId: "Rahul Sharma" },
    assistantResponse:
      "Here is Rahul Sharma's complete fee and payment history:\n• Total Gross Billed: ₹17,000\n• Total Discounts Given: ₹500\n• Net Payable: ₹16,500\n• Payments Received: ₹11,500 (₹7,500 via UPI on Nov 10 + ₹4,000 via UPI today)\n• Outstanding Balance: ₹5,000",
    dataCard: {
      title: "Rahul Sharma • Financial Ledger",
      badge: "Partial Payment",
      metrics: [
        { label: "Net Billed", value: "₹16,500" },
        { label: "Total Paid", value: "₹11,500" },
        { label: "Balance Due", value: "₹5,000" },
      ],
    },
  },
  {
    id: "collection",
    label: "4. Daily Collection",
    category: "Daily Collection",
    userPrompt: "What is today's total collection?",
    toolCalled: "get_daily_collection({ date: 'today' })",
    toolInput: { date: "today" },
    assistantResponse:
      "Today's total fee collection is ₹4,000, separated by payment method:\n• UPI (Google Pay / PhonePe): ₹4,000\n• Cash: ₹0\n• Card: ₹0\nAll receipts have been generated and recorded in the clinic ledger.",
    dataCard: {
      title: "Today's Collections Summary",
      badge: "UPI & Cash Breakdown",
      metrics: [
        { label: "Total Collection", value: "₹4,000" },
        { label: "UPI Payments", value: "₹4,000" },
        { label: "Cash / Card", value: "₹0" },
      ],
    },
  },
];

export const LiveChatGPTSimulator: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<Scenario>(scenarios[0]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [displayedText, setDisplayedText] = useState<string>(scenarios[0].assistantResponse);

  const switchScenario = (s: Scenario) => {
    setActiveScenario(s);
    setIsTyping(true);
    setDisplayedText("");

    setTimeout(() => {
      setDisplayedText(s.assistantResponse);
      setIsTyping(false);
    }, 300);
  };

  return (
    <div className="w-full rounded-3xl bg-[#162321] text-slate-100 border border-[#243532] shadow-2xl overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-[#121D1B] px-5 py-3.5 border-b border-[#243532] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono text-[#A7BCB7] ml-2">ChatGPT • Connected to Your Clinic</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#203330] text-[#BDDBD1] border border-[#2B423E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BDDBD1] animate-pulse" />
            Google Sign-In Active
          </span>
        </div>
      </div>

      {/* 4 Interactive Scenarios directly from user specification */}
      <div className="p-3 bg-[#131D1B] border-b border-[#243532] flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <span className="text-[#7E9691] whitespace-nowrap">Try Conversations:</span>
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => switchScenario(s)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-medium ${
              activeScenario.id === s.id
                ? "bg-[#2F8EAC] text-white font-bold shadow-xs"
                : "bg-[#1E2D2B] text-[#A7BCB7] hover:text-white hover:bg-[#253935]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Conversation Terminal */}
      <div className="p-5 sm:p-6 space-y-5 min-h-[340px] flex flex-col justify-between">
        <div className="space-y-4">
          {/* Dentist User Message */}
          <div className="flex items-start gap-3 justify-end">
            <div className="bg-[#2F8EAC] text-white p-3.5 rounded-2xl rounded-tr-xs text-sm max-w-[85%] font-medium shadow-xs">
              <span className="text-[10px] text-[#C7E7EC] font-mono block mb-0.5">Dentist</span>
              {activeScenario.userPrompt}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#203330] border border-[#2B423E] flex items-center justify-center shrink-0 text-[#BDDBD1] text-xs font-bold font-mono">
              DR
            </div>
          </div>

          {/* Quick Database Activity Indicator */}
          <div className="pl-11 pr-2">
            <div className="bg-[#1E2D2B]/90 rounded-xl p-2.5 border border-[#243532] text-xs font-mono text-[#A7BCB7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#BDDBD1] shrink-0" />
                <span>
                  <span className="text-[#7E9691]">Clinic Records:</span>{" "}
                  <strong className="text-[#C7E7EC] font-normal">{activeScenario.toolCalled}</strong>
                </span>
              </div>
              <span className="text-[10px] text-[#BDDBD1] bg-[#121D1B] px-2 py-0.5 rounded border border-[#243532]">
                ⚡ 12ms
              </span>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#203330] border border-[#2B423E] flex items-center justify-center shrink-0 text-[#2F8EAC]">
              <Bot className="w-4 h-4" />
            </div>

            <div className="space-y-3 max-w-[90%] flex-1">
              <div className="bg-[#1E2D2B] p-4 rounded-2xl rounded-tl-xs border border-[#2B423E] text-sm leading-relaxed text-[#FBF9F1] whitespace-pre-line font-sans shadow-xs">
                {isTyping ? (
                  <div className="flex items-center gap-2 text-[#A7BCB7] py-1">
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-[#2F8EAC] border-t-transparent rounded-full" />
                    <span>Accessing patient records...</span>
                  </div>
                ) : (
                  displayedText
                )}
              </div>

              {/* Data Card */}
              {!isTyping && (
                <div className="p-3.5 rounded-xl bg-[#121D1B] border border-[#243532] text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-[#243532] text-[#A7BCB7]">
                    <span className="font-bold text-white font-sans">{activeScenario.dataCard.title}</span>
                    <span className="px-2 py-0.5 rounded bg-[#203330] text-[#BDDBD1] text-[10px] font-bold">
                      {activeScenario.dataCard.badge}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-1 text-[11px]">
                    {activeScenario.dataCard.metrics.map((m, idx) => (
                      <div key={idx}>
                        <span className="text-[#7E9691] block text-[10px]">{m.label}</span>
                        <strong className="text-white font-bold">{m.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#243532] flex items-center justify-between text-[11px] text-[#7E9691] font-mono">
          <span className="flex items-center gap-1 text-[#A7BCB7]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#BDDBD1]" /> Google Account Security
          </span>
          <span>Zero passwords or API keys needed</span>
        </div>
      </div>
    </div>
  );
};
