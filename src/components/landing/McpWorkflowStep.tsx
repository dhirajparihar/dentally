"use client";

import React, { useState } from "react";
import { Copy, Check, MessageSquare, Sparkles, Smartphone, ShieldCheck } from "lucide-react";

export const McpWorkflowStep: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const sampleUrl = "https://dentally.reline.me/api/mcp?key=••••••••";

  const handleCopy = () => {
    navigator.clipboard.writeText("https://dentally.reline.me/api/mcp");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="how-it-works" className="py-20 bg-[#0B132B] text-white relative overflow-hidden">
      {/* Subtle background radial pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] font-mono font-semibold tracking-[0.16em] text-[#0089A8] uppercase bg-slate-800/80 px-3.5 py-1 rounded-full border border-slate-700">
            Zero Complicated Setup
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Connect in 30 Seconds. <br />
            <span className="text-[#0089A8] font-semibold">No IT skills or tech jargon required.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Old dental software forces you through hours of training, complex installations, and forgotten passwords.
            Dentally connects your clinic directly into ChatGPT using your Google login in 3 simple steps.
          </p>
        </div>

        {/* 3 Simple Steps */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="bg-[#111C3A] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-[#0089A8]/60 transition-all shadow-lg">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[#0089A8] font-bold text-lg border border-slate-700">
                1
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Copy Your Clinic Link</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Dentally generates a secure, private link for your clinic. You don&apos;t need to write any code or configure any servers.
              </p>

              {/* Interactive Copy Box */}
              <div className="mt-4 p-3 rounded-2xl bg-[#0B132B] border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="truncate mr-2">{sampleUrl}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white flex items-center gap-1 shrink-0 transition-colors shadow-xs font-sans text-xs font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0089A8]" />
              <span>Encrypted & private to your clinic</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111C3A] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-[#0089A8]/60 transition-all shadow-lg">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[#0089A8] font-bold text-lg border border-slate-700">
                2
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Paste into ChatGPT Once</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Open ChatGPT on your phone or computer, go to Settings, and paste your clinic link. Sign in with your clinic Google account.
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-[#0B132B] border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-[#0089A8]" />
                  <span>Works on iPhone, Android & Web</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Zero passwords to remember &middot; Sign in with Google
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#0089A8]" />
              <span>One-time setup takes under 30 seconds</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#111C3A] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-[#0089A8]/60 transition-all shadow-lg">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[#0089A8] font-bold text-lg border border-slate-700">
                3
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Just Speak or Ask Naturally</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Now talk or speak to ChatGPT like a smart receptionist: <em>&ldquo;Show today&apos;s schedule&rdquo;</em>, <em>&ldquo;Did Rahul pay?&rdquo;</em>, or <em>&ldquo;Book Priya tomorrow at 4 PM&rdquo;</em>.
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-[#0B132B] border border-slate-800 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Example voice prompt:</span>
                <p className="text-white italic text-[13px] font-sans">
                  &ldquo;Find Rahul Sharma and tell me if he has any pending balance.&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0089A8]" />
              <span>Instant answers with zero manual searching</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
