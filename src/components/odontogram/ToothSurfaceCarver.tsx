"use client";

import React, { useState } from "react";
import { ToothCondition } from "@/lib/mockData";
import { X, Check } from "lucide-react";

export type SurfaceType = "occlusal" | "mesial" | "distal" | "buccal" | "lingual";

interface ToothSurfaceCarverProps {
  tooth: ToothCondition;
  onSave: (updatedTooth: ToothCondition) => void;
  onClose: () => void;
}

export const ToothSurfaceCarver: React.FC<ToothSurfaceCarverProps> = ({
  tooth,
  onSave,
  onClose,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ToothCondition["status"]>(tooth.status);
  const [surfaces, setSurfaces] = useState<SurfaceType[]>(
    (tooth.surfaces as SurfaceType[]) || (tooth.status === "caries" || tooth.status === "filled" ? ["occlusal"] : [])
  );
  const [notes, setNotes] = useState(tooth.notes || "");

  const toggleSurface = (surface: SurfaceType) => {
    if (surfaces.includes(surface)) {
      setSurfaces(surfaces.filter((s) => s !== surface));
    } else {
      setSurfaces([...surfaces, surface]);
    }
  };

  const handleApply = () => {
    onSave({
      ...tooth,
      status: selectedStatus,
      surfaces: surfaces,
      notes: notes,
      lastTreated: new Date().toISOString().split("T")[0],
    });
  };

  const isAnterior = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43].includes(tooth.id);

  // Surface fill color depending on diagnosis
  const getSurfaceFill = (surface: SurfaceType) => {
    const isTagged = surfaces.includes(surface);
    if (!isTagged) return "fill-white/80 hover:fill-slate-100/90";
    if (selectedStatus === "caries") return "fill-rose-500 hover:fill-rose-600";
    if (selectedStatus === "filled") return "fill-sky-500 hover:fill-sky-600";
    if (selectedStatus === "rct") return "fill-amber-500 hover:fill-amber-600";
    return "fill-emerald-500 hover:fill-emerald-600";
  };

  const getSurfaceStroke = (surface: SurfaceType) => {
    return surfaces.includes(surface) ? "stroke-slate-900 stroke-[1.5]" : "stroke-slate-300 stroke-[1]";
  };

  return (
    <div className="mobile-dialog fixed inset-0 bg-[#0F1715]/75 backdrop-blur-md z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-[#162321] text-slate-100 rounded-3xl border border-[#243532] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Elite Precision Header */}
        <div className="px-6 py-4 border-b border-[#243532] flex items-center justify-between bg-[#0F1715]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#203330] border border-[#2B423E] flex items-center justify-center font-mono font-bold text-[#2F8EAC] text-sm">
              #{tooth.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  {tooth.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203330] text-[#A7BCB7] border border-[#2B423E]">
                  Quadrant {tooth.quadrant} • {isAnterior ? "Anterior" : "Posterior Molar"}
                </span>
              </div>
              <p className="text-[11px] text-[#A7BCB7] font-mono mt-0.5">
                5-Surface Anatomical Matrix (FDI ISO 3950)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Anatomical 5-Surface Interactive Diagram */}
          <div className="bg-[#0B0E11] p-6 rounded-2xl border border-slate-800/90 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* SVG 5-Surface Cross Section */}
            <div className="relative flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
                Vestibular / Buccal (B)
              </span>

              <div className="relative w-44 h-44 drop-shadow-xl">
                <svg viewBox="0 0 160 160" className="w-full h-full cursor-pointer select-none">
                  {/* Top Trapezoid: Buccal */}
                  <polygon
                    points="20,20 140,20 110,50 50,50"
                    className={`transition-colors duration-150 ${getSurfaceFill("buccal")} ${getSurfaceStroke("buccal")}`}
                    onClick={() => toggleSurface("buccal")}
                  />
                  {/* Bottom Trapezoid: Lingual / Palatal */}
                  <polygon
                    points="50,110 110,110 140,140 20,140"
                    className={`transition-colors duration-150 ${getSurfaceFill("lingual")} ${getSurfaceStroke("lingual")}`}
                    onClick={() => toggleSurface("lingual")}
                  />
                  {/* Left Trapezoid: Mesial */}
                  <polygon
                    points="20,20 50,50 50,110 20,140"
                    className={`transition-colors duration-150 ${getSurfaceFill("mesial")} ${getSurfaceStroke("mesial")}`}
                    onClick={() => toggleSurface("mesial")}
                  />
                  {/* Right Trapezoid: Distal */}
                  <polygon
                    points="140,20 140,140 110,110 110,50"
                    className={`transition-colors duration-150 ${getSurfaceFill("distal")} ${getSurfaceStroke("distal")}`}
                    onClick={() => toggleSurface("distal")}
                  />
                  {/* Center Square / Diamond: Occlusal / Incisal Pit */}
                  <rect
                    x="50"
                    y="50"
                    width="60"
                    height="60"
                    rx="4"
                    className={`transition-colors duration-150 ${getSurfaceFill("occlusal")} ${getSurfaceStroke("occlusal")}`}
                    onClick={() => toggleSurface("occlusal")}
                  />
                  {/* Text Labels inside surfaces */}
                  <text x="80" y="38" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">B</text>
                  <text x="80" y="130" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">L</text>
                  <text x="36" y="84" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">M</text>
                  <text x="124" y="84" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">D</text>
                  <text x="80" y="84" textAnchor="middle" className="text-[11px] font-mono font-bold fill-slate-900 pointer-events-none">O</text>
                </svg>
              </div>

              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-2">
                Lingual / Palatal (L)
              </span>
            </div>

            {/* Selected Surfaces Badges & Restorative Code */}
            <div className="flex-1 space-y-3 w-full">
              <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                Anatomical Surface Notation:
              </span>

              <div className="flex flex-wrap gap-1.5">
                {(["occlusal", "mesial", "distal", "buccal", "lingual"] as const).map((s) => {
                  const active = surfaces.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSurface(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-bold border transition-all ${
                        active
                          ? "bg-[#2F8EAC] text-white border-[#2F8EAC] shadow-xs"
                          : "bg-[#0F1715] text-[#A7BCB7] border-[#243532] hover:border-[#2F8EAC]/50"
                      }`}
                    >
                      {s[0].toUpperCase()} ({s})
                    </button>
                  );
                })}
              </div>

              {/* Surface Composite Code preview */}
              <div className="p-3 rounded-xl bg-[#0F1715] border border-[#243532] text-xs font-mono">
                <span className="text-[#A7BCB7] block text-[11px]">Clinical Shorthand:</span>
                <span className="text-[#BDDBD1] font-bold text-sm tracking-wider">
                  {surfaces.length === 0
                    ? "SOUND (Whole Crown Intact)"
                    : surfaces.map((s) => s[0].toUpperCase()).sort().join("") +
                      ` (${surfaces.length}-Surface ${selectedStatus.toUpperCase()})`}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Diagnostic Classification */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Diagnostic Classification:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs font-mono">
              {(
                [
                  { id: "sound", label: "Sound", border: "border-slate-700", bg: "bg-slate-800" },
                  { id: "caries", label: "Caries", border: "border-rose-500", bg: "bg-rose-950/60" },
                  { id: "filled", label: "Filled", border: "border-sky-500", bg: "bg-sky-950/60" },
                  { id: "rct", label: "RCT", border: "border-amber-500", bg: "bg-amber-950/60" },
                  { id: "crown", label: "Crown", border: "border-purple-500", bg: "bg-purple-950/60" },
                  { id: "implant", label: "Implant", border: "border-emerald-500", bg: "bg-emerald-950/60" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStatus(item.id)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    selectedStatus === item.id
                      ? `${item.border} ${item.bg} text-white shadow-sm ring-1 ring-white/20 font-bold`
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Endodontic / Restorative Note */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Chairside Clinical Procedure Log:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cavity prepared with #330 bur. Etched 37% H3PO4, bonded Single Bond Universal, layered A2 Nanohybrid composite."
              className="w-full p-3 rounded-xl bg-[#0F1715] border border-[#243532] text-xs text-slate-200 font-mono outline-none focus:border-[#2F8EAC] transition-colors"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-6 py-4 border-t border-[#243532] bg-[#0F1715] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#7E9691]">
            Auto-syncs with ChatGPT MCP endpoint
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#A7BCB7] hover:text-white hover:bg-[#203330] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[#2F8EAC] text-white font-bold text-xs hover:bg-[#24728A] transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Save to Patient Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

