"use client";

import React, { useState } from "react";
import { ToothCondition, generateDefaultToothMap } from "@/lib/mockData";
import { ToothItem } from "./ToothItem";
import { ToothSurfaceCarver } from "./ToothSurfaceCarver";
import { X, Sliders } from "lucide-react";

interface ToothMapProps {
  teeth?: Record<number, ToothCondition>;
  onUpdateTooth?: (updated: ToothCondition) => void;
  readOnly?: boolean;
  patientName?: string;
}

export const ToothMap: React.FC<ToothMapProps> = ({
  teeth = generateDefaultToothMap(),
  onUpdateTooth,
  readOnly = false,
  patientName = "Patient",
}) => {
  const [selectedTooth, setSelectedTooth] = useState<ToothCondition | null>(null);
  const [isCarverOpen, setIsCarverOpen] = useState(false);
  const [localTeeth, setLocalTeeth] = useState<Record<number, ToothCondition>>(teeth);

  // Quadrants
  const q1 = [18, 17, 16, 15, 14, 13, 12, 11].map((id) => localTeeth[id] || { id, name: `Tooth #${id}`, quadrant: 1, status: "sound" });
  const q2 = [21, 22, 23, 24, 25, 26, 27, 28].map((id) => localTeeth[id] || { id, name: `Tooth #${id}`, quadrant: 2, status: "sound" });
  const q4 = [48, 47, 46, 45, 44, 43, 42, 41].map((id) => localTeeth[id] || { id, name: `Tooth #${id}`, quadrant: 4, status: "sound" });
  const q3 = [31, 32, 33, 34, 35, 36, 37, 38].map((id) => localTeeth[id] || { id, name: `Tooth #${id}`, quadrant: 3, status: "sound" });

  const handleToothClick = (tooth: ToothCondition) => {
    setSelectedTooth(tooth);
  };

  const handleSaveCarver = (updated: ToothCondition) => {
    setLocalTeeth((prev) => ({ ...prev, [updated.id]: updated }));
    setSelectedTooth(updated);
    setIsCarverOpen(false);
    if (onUpdateTooth) {
      onUpdateTooth(updated);
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#E7E9E3] shadow-card-subtle p-5 sm:p-7 relative overflow-hidden">
      {/* Precision Instrument Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E7E9E3] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base sm:text-lg text-[#1E2D2B] flex items-center gap-2 tracking-tight">
              Anatomical 32-Tooth Odontogram
              <span className="text-[11px] bg-[#E8F0F1] text-[#2F8EAC] font-mono font-bold px-2.5 py-0.5 rounded-md border border-[#C7E7EC]">
                FDI Two-Digit Standard (ISO 3950)
              </span>
            </h3>
          </div>
          <p className="text-xs text-[#586B67] mt-1 font-sans">
            Click any tooth to carve 5 anatomical surfaces (Mesial, Occlusal, Distal, Buccal, Lingual).
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-300" /> Sound
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Caries
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Filled
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> RCT
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Crown
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Implant
          </span>
        </div>
      </div>

      {/* Dental Arch Geometric Blueprint View */}
      <div className="my-6 overflow-x-auto pb-2">
        <div className="min-w-[680px] flex flex-col items-center gap-5">
          {/* Maxillary (Upper) Arch */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-[620px] px-2 mb-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              <span>Quadrant 1 (Upper Right)</span>
              <span>Maxillary Arch</span>
              <span>Quadrant 2 (Upper Left)</span>
            </div>

            <div className="flex items-center justify-center gap-1 p-2 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 shadow-xs">
              {/* Q1 */}
              <div className="flex items-center gap-0.5 sm:gap-1 pr-1.5 border-r border-slate-300">
                {q1.map((t) => (
                  <ToothItem
                    key={t.id}
                    tooth={t}
                    isSelected={selectedTooth?.id === t.id}
                    onClick={handleToothClick}
                    isUpper={true}
                  />
                ))}
              </div>

              {/* Midline Line */}
              <div className="w-px h-14 bg-[#2F8EAC] mx-1" />

              {/* Q2 */}
              <div className="flex items-center gap-0.5 sm:gap-1 pl-1.5">
                {q2.map((t) => (
                  <ToothItem
                    key={t.id}
                    tooth={t}
                    isSelected={selectedTooth?.id === t.id}
                    onClick={handleToothClick}
                    isUpper={true}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Occlusal Plane Separator */}
          <div className="w-full flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
            <div className="h-px bg-slate-200 flex-1 max-w-[260px]" />
            <span className="px-3 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-mono tracking-widest uppercase">
              MID-SAGITTAL & OCCLUSAL PLANE
            </span>
            <div className="h-px bg-slate-200 flex-1 max-w-[260px]" />
          </div>

          {/* Mandibular (Lower) Arch */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 p-2 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 shadow-xs">
              {/* Q4 */}
              <div className="flex items-center gap-0.5 sm:gap-1 pr-1.5 border-r border-slate-300">
                {q4.map((t) => (
                  <ToothItem
                    key={t.id}
                    tooth={t}
                    isSelected={selectedTooth?.id === t.id}
                    onClick={handleToothClick}
                    isUpper={false}
                  />
                ))}
              </div>

              {/* Midline Line */}
              <div className="w-px h-14 bg-[#2F8EAC] mx-1" />

              {/* Q3 */}
              <div className="flex items-center gap-0.5 sm:gap-1 pl-1.5">
                {q3.map((t) => (
                  <ToothItem
                    key={t.id}
                    tooth={t}
                    isSelected={selectedTooth?.id === t.id}
                    onClick={handleToothClick}
                    isUpper={false}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between w-full max-w-[620px] px-2 mt-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              <span>Quadrant 4 (Lower Right)</span>
              <span>Mandibular Arch</span>
              <span>Quadrant 3 (Lower Left)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Tooth Inspector Strip */}
      {selectedTooth && (
        <div className="mt-4 p-4 rounded-2xl bg-[#162321] text-white border border-[#243532] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#203330] border border-[#2B423E] flex items-center justify-center font-mono font-extrabold text-[#2F8EAC] text-base">
              #{selectedTooth.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm tracking-tight text-white">{selectedTooth.name}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203330] text-[#A7BCB7] border border-[#2B423E]">
                  Status: {selectedTooth.status.toUpperCase()}
                </span>
                {selectedTooth.surfaces && selectedTooth.surfaces.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203330] text-[#BDDBD1] border border-[#2B423E]">
                    Surfaces: {selectedTooth.surfaces.join(", ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A7BCB7] mt-0.5 font-mono">
                {selectedTooth.notes || "No pathological notes recorded for this tooth."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => setIsCarverOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#2F8EAC] text-white font-bold text-xs hover:bg-[#24728A] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
                Carve 5-Surfaces (MOD)
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="p-2 text-[#A7BCB7] hover:text-white rounded-lg hover:bg-[#203330]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5-Surface Carver Modal */}
      {isCarverOpen && selectedTooth && (
        <ToothSurfaceCarver
          tooth={selectedTooth}
          onSave={handleSaveCarver}
          onClose={() => setIsCarverOpen(false)}
        />
      )}
    </div>
  );
};
