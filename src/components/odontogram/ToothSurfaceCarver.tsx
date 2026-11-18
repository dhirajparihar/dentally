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
  const isUpper = tooth.quadrant === 1 || tooth.quadrant === 2;
  const isRightSide = tooth.quadrant === 1 || tooth.quadrant === 4; // Patient right: midline is toward the right of the tooth

  // Clinical Anatomical Surface Names & Labels
  const occlusalLabel = isAnterior ? "Incisal (I)" : "Occlusal (O)";
  const occlusalCode = isAnterior ? "I" : "O";
  const buccalLabel = isAnterior ? "Facial / Labial (F)" : "Buccal (B)";
  const buccalCode = isAnterior ? "F" : "B";
  const lingualLabel = isUpper ? "Palatal (P)" : "Lingual (L)";
  const lingualCode = isUpper ? "P" : "L";

  // Left & Right Trapezoids depending on midline position:
  // Patient Right (Q1, Q4): Midline is to the right -> Left is Distal, Right is Mesial
  // Patient Left (Q2, Q3): Midline is to the left -> Left is Mesial, Right is Distal
  const leftSurfaceKey: SurfaceType = isRightSide ? "distal" : "mesial";
  const leftSurfaceCode = isRightSide ? "D" : "M";
  const rightSurfaceKey: SurfaceType = isRightSide ? "mesial" : "distal";
  const rightSurfaceCode = isRightSide ? "M" : "D";

  const getClinicalSurfaceName = (s: SurfaceType) => {
    switch (s) {
      case "occlusal": return occlusalLabel;
      case "buccal": return buccalLabel;
      case "lingual": return lingualLabel;
      case "mesial": return "Mesial (M)";
      case "distal": return "Distal (D)";
    }
  };

  const getClinicalSurfaceCode = (s: SurfaceType) => {
    switch (s) {
      case "occlusal": return occlusalCode;
      case "buccal": return buccalCode;
      case "lingual": return lingualCode;
      case "mesial": return "M";
      case "distal": return "D";
    }
  };

  const isWholeToothStatus = ["crown", "rct", "implant", "missing"].includes(selectedStatus);

  // Surface fill color depending on diagnosis
  const getSurfaceFill = (surface: SurfaceType) => {
    const isTagged = surfaces.includes(surface);
    if (!isTagged) return "fill-white/80 hover:fill-slate-100/90";
    if (selectedStatus === "caries") return "fill-rose-500 hover:fill-rose-600";
    if (selectedStatus === "filled") return "fill-sky-500 hover:fill-sky-600";
    if (selectedStatus === "rct") return "fill-amber-500 hover:fill-amber-600";
    if (selectedStatus === "crown") return "fill-purple-500 hover:fill-purple-600";
    if (selectedStatus === "missing") return "fill-slate-400 hover:fill-slate-500";
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
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest mb-2 font-semibold">
                {buccalLabel}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-slate-400 w-12 text-right">
                  {leftSurfaceCode} ({leftSurfaceKey === "mesial" ? "Midline" : "Away"})
                </span>

                <div className="relative w-44 h-44 drop-shadow-xl">
                  <svg viewBox="0 0 160 160" className="w-full h-full cursor-pointer select-none">
                    {/* Top Trapezoid: Buccal / Facial */}
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
                    {/* Left Trapezoid: Mesial (Q2,Q3) or Distal (Q1,Q4) */}
                    <polygon
                      points="20,20 50,50 50,110 20,140"
                      className={`transition-colors duration-150 ${getSurfaceFill(leftSurfaceKey)} ${getSurfaceStroke(leftSurfaceKey)}`}
                      onClick={() => toggleSurface(leftSurfaceKey)}
                    />
                    {/* Right Trapezoid: Distal (Q2,Q3) or Mesial (Q1,Q4) */}
                    <polygon
                      points="140,20 140,140 110,110 110,50"
                      className={`transition-colors duration-150 ${getSurfaceFill(rightSurfaceKey)} ${getSurfaceStroke(rightSurfaceKey)}`}
                      onClick={() => toggleSurface(rightSurfaceKey)}
                    />
                    {/* Center Square: Occlusal / Incisal Pit */}
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
                    <text x="80" y="38" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">{buccalCode}</text>
                    <text x="80" y="130" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">{lingualCode}</text>
                    <text x="36" y="84" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">{leftSurfaceCode}</text>
                    <text x="124" y="84" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700 pointer-events-none">{rightSurfaceCode}</text>
                    <text x="80" y="84" textAnchor="middle" className="text-[11px] font-mono font-bold fill-slate-900 pointer-events-none">{occlusalCode}</text>
                  </svg>
                </div>

                <span className="text-[9px] font-mono text-slate-400 w-12 text-left">
                  {rightSurfaceCode} ({rightSurfaceKey === "mesial" ? "Midline" : "Away"})
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest mt-2 font-semibold">
                {lingualLabel}
              </span>
            </div>

            {/* Selected Surfaces Badges & Restorative Code */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                  Anatomical Surfaces:
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {isRightSide ? "Right Quadrant (Midline → Right)" : "Left Quadrant (Left ← Midline)"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["occlusal", "mesial", "distal", "buccal", "lingual"] as const).map((s) => {
                  const active = surfaces.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSurface(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        active
                          ? "bg-[#2F8EAC] text-white border-[#2F8EAC] shadow-xs"
                          : "bg-[#0F1715] text-[#A7BCB7] border-[#243532] hover:border-[#2F8EAC]/50"
                      }`}
                    >
                      {getClinicalSurfaceCode(s)} &middot; {getClinicalSurfaceName(s)}
                    </button>
                  );
                })}
              </div>

              {/* Surface Composite Code preview */}
              <div className="p-3 rounded-xl bg-[#0F1715] border border-[#243532] text-xs font-mono space-y-1">
                <span className="text-[#A7BCB7] block text-[11px]">Clinical Notation:</span>
                <span className="text-[#BDDBD1] font-bold text-sm tracking-wider block">
                  {isWholeToothStatus
                    ? `${selectedStatus.toUpperCase()} (Whole Tooth Restoration / Pathology)`
                    : surfaces.length === 0
                    ? "SOUND (Whole Crown Intact)"
                    : surfaces.map((s) => getClinicalSurfaceCode(s)).sort().join("") +
                      ` (${surfaces.length}-Surface ${selectedStatus.toUpperCase()})`}
                </span>
                {isWholeToothStatus && (
                  <span className="text-[10px] text-amber-400/90 block">
                    Note: {selectedStatus.toUpperCase()} affects the full tooth / crown. Specific surfaces denote margins/cores.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Diagnostic Classification */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Diagnostic Classification:
            </span>
            <div className="grid grid-cols-2 min-[420px]:grid-cols-4 sm:grid-cols-7 gap-2 text-xs font-mono">
              {(
                [
                  { id: "sound", label: "Sound", border: "border-slate-700", bg: "bg-slate-800" },
                  { id: "caries", label: "Caries", border: "border-rose-500", bg: "bg-rose-950/60" },
                  { id: "filled", label: "Filled", border: "border-sky-500", bg: "bg-sky-950/60" },
                  { id: "rct", label: "RCT", border: "border-amber-500", bg: "bg-amber-950/60" },
                  { id: "crown", label: "Crown", border: "border-purple-500", bg: "bg-purple-950/60" },
                  { id: "implant", label: "Implant", border: "border-emerald-500", bg: "bg-emerald-950/60" },
                  { id: "missing", label: "Missing", border: "border-slate-400", bg: "bg-slate-700/80" },
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

