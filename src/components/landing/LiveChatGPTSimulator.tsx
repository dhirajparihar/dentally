"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

const scenarios = [
  {
    id: "appointments",
    label: "Appointments",
    prompt: "What appointments do I have today?",
    summary: "You have two appointments on today’s schedule.",
    details: [
      { label: "9:30 AM", value: "Routine check-up" },
      { label: "10:15 AM", value: "Crown review" },
    ],
  },
  {
    id: "patient",
    label: "Patient lookup",
    prompt: "Find Rahul Sharma’s patient record.",
    summary: "I found Rahul Sharma’s record. Here’s a summary of his last visit.",
    details: [
      { label: "Last visit", value: "Root canal treatment" },
      { label: "Allergy on file", value: "Penicillin" },
    ],
  },
  {
    id: "balance",
    label: "Patient balance",
    prompt: "How much has Rahul paid so far?",
    summary: "Rahul has paid ₹11,500 toward ₹16,500 in treatment fees.",
    details: [
      { label: "Payments received", value: "₹11,500" },
      { label: "Outstanding balance", value: "₹5,000" },
    ],
  },
  {
    id: "collections",
    label: "Daily collections",
    prompt: "How much did we collect today?",
    summary: "Your practice collected ₹4,000 today.",
    details: [
      { label: "UPI", value: "₹4,000" },
      { label: "Cash and card", value: "₹0" },
    ],
  },
];

export function LiveChatGPTSimulator() {
  const [scenario, setScenario] = useState(scenarios[0]);

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.25rem] border border-dental-limestone bg-white shadow-card-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dental-limestone px-5 py-4 sm:px-6">
        <p className="flex items-center gap-2.5 text-sm font-bold">
          <MessageCircle size={18} className="text-viridian-700" aria-hidden="true" />
          ChatGPT example
        </p>
        <p className="text-xs font-medium text-dental-slate">Sample data</p>
      </div>

      <div className="p-4 sm:p-6">
        <div role="group" aria-label="Choose an example" className="grid grid-cols-2 gap-1.5 rounded-xl bg-dental-mint-light p-1.5 sm:grid-cols-4">
          {scenarios.map((example) => (
            <button
              key={example.id}
              type="button"
              aria-pressed={scenario.id === example.id}
              onClick={() => setScenario(example)}
              className={scenario.id === example.id
                ? "min-h-11 rounded-lg bg-viridian-700 px-2 py-2 text-xs font-bold leading-4 text-white"
                : "min-h-11 rounded-lg px-2 py-2 text-xs font-semibold leading-4 text-dental-spruce hover:bg-white"}
            >
              {example.label}
            </button>
          ))}
        </div>

        <div role="status" aria-atomic="true" className="mt-5 space-y-4">
          <p className="ml-auto w-fit rounded-2xl rounded-tr-md bg-dental-cerulean-light px-4 py-3 text-sm font-semibold">
            <span className="sr-only">Example prompt. </span>
            {scenario.prompt}
          </p>
          <div className="rounded-2xl rounded-tl-md border border-dental-limestone bg-[#fafbf9] p-4">
            <p className="text-sm leading-6 text-dental-spruce">
              <span className="sr-only">Example response. </span>
              {scenario.summary}
            </p>
            <dl className="mt-3 divide-y divide-dental-limestone border-t border-dental-limestone text-sm">
              {scenario.details.map(({ label, value }) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5 last:pb-0">
                  <dt className="text-dental-slate">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
