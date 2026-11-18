"use client";

import React from "react";
import { ToothCondition } from "@/lib/mockData";

interface ToothItemProps {
  tooth: ToothCondition;
  isSelected?: boolean;
  onClick: (tooth: ToothCondition) => void;
  isUpper?: boolean;
}

export const ToothItem: React.FC<ToothItemProps> = ({ tooth, isSelected, onClick, isUpper = true }) => {
  const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(tooth.id);
  const isPremolar = [15, 14, 24, 25, 45, 44, 34, 35].includes(tooth.id);
  const isCanine = [13, 23, 33, 43].includes(tooth.id);
  const isIncisor = [11, 12, 21, 22, 31, 32, 41, 42].includes(tooth.id);
  const isAnterior = isCanine || isIncisor;
  const isUpperArch = tooth.quadrant === 1 || tooth.quadrant === 2;

  // Surface status mapping
  const hasSurfaces = tooth.surfaces && tooth.surfaces.length > 0;
  const surfaceCode = hasSurfaces
    ? tooth.surfaces!
        .map((s) => {
          if (s === "occlusal") return isAnterior ? "I" : "O";
          if (s === "buccal") return isAnterior ? "F" : "B";
          if (s === "lingual") return isUpperArch ? "P" : "L";
          return s[0].toUpperCase();
        })
        .sort()
        .join("")
    : "";

  const getStatusColor = () => {
    switch (tooth.status) {
      case "caries":
        return { bg: "bg-rose-50/90", border: "border-rose-400", fill: "#FDA4AF", stroke: "#E11D48", text: "text-rose-700" };
      case "filled":
        return { bg: "bg-sky-50/90", border: "border-sky-400", fill: "#BAE6FD", stroke: "#0284C7", text: "text-sky-700" };
      case "rct":
        return { bg: "bg-amber-50/90", border: "border-amber-400", fill: "#FDE68A", stroke: "#D97706", text: "text-amber-800" };
      case "crown":
        return { bg: "bg-purple-50/90", border: "border-purple-400", fill: "#DDD6FE", stroke: "#7C3AED", text: "text-purple-700" };
      case "implant":
        return { bg: "bg-emerald-50/90", border: "border-emerald-500", fill: "#A7F3D0", stroke: "#059669", text: "text-emerald-800" };
      case "missing":
        return { bg: "bg-slate-100/60", border: "border-dashed border-slate-300", fill: "#F1F5F9", stroke: "#94A3B8", text: "text-slate-400" };
      default:
        return { bg: "bg-white", border: "border-slate-200", fill: "#FFFFFF", stroke: "#94A3B8", text: "text-slate-600" };
    }
  };

  const style = getStatusColor();

  return (
    <button
      type="button"
      onClick={() => onClick(tooth)}
      className={`group relative flex flex-col items-center p-1 rounded-xl transition-all duration-150 outline-none select-none ${
        isSelected
          ? "ring-2 ring-[#2F8EAC] shadow-xs scale-110 z-10 bg-[#E8F0F1]"
          : "hover:bg-[#E8F0F1]/60 hover:scale-105"
      }`}
      title={`Tooth #${tooth.id} - ${tooth.name} (${tooth.status.toUpperCase()})`}
    >
      {/* Upper tooth number header */}
      {isUpper && (
        <span
          className={`text-[10px] font-mono font-bold transition-colors ${
            isSelected ? "text-[#1E2D2B] font-extrabold" : "text-[#7E9691] group-hover:text-[#1E2D2B]"
          }`}
        >
          {tooth.id}
        </span>
      )}

      {/* Anatomical Tooth SVG Container */}
      <div
        className={`w-8 h-12 sm:w-10 sm:h-14 rounded-lg flex flex-col items-center justify-center p-0.5 border transition-all ${
          style.bg
        } ${style.border} ${tooth.status === "missing" ? "opacity-30" : "shadow-xs"}`}
      >
        {tooth.status === "implant" ? (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-[9px] font-mono font-extrabold text-emerald-800">IMP</span>
            <div className="w-3 h-5 border-l-2 border-r-2 border-dashed border-emerald-600 my-0.5" />
          </div>
        ) : (
          <svg viewBox="0 0 36 48" className="w-full h-full">
            {/* Tooth Crown */}
            <rect
              x="5"
              y={isUpper ? "14" : "4"}
              width="26"
              height="20"
              rx={isIncisor ? "2" : isCanine ? "4" : "6"}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth="1.8"
            />

            {/* Occlusal / Surface matrix pit */}
            <circle
              cx="18"
              cy={isUpper ? "24" : "14"}
              r="3.5"
              fill={hasSurfaces ? style.stroke : tooth.status !== "sound" ? style.stroke : "#F1F5F9"}
              stroke="#64748B"
              strokeWidth="0.8"
            />

            {/* Anatomical Roots */}
            {isUpper ? (
              // Upper roots point upwards towards maxillary sinus
              <g stroke={tooth.status === "rct" ? "#D97706" : "#94A3B8"} strokeWidth="1.6" strokeLinecap="round" fill="none">
                {isMolar ? (
                  // Tri-rooted upper molar
                  <>
                    <path d="M9 14 C8 6, 11 2, 11 2" />
                    <path d="M27 14 C28 6, 25 2, 25 2" />
                    <path d="M18 14 L18 3" />
                  </>
                ) : isPremolar ? (
                  // Bi-rooted premolar
                  <>
                    <path d="M12 14 C11 6, 14 2, 14 2" />
                    <path d="M24 14 C25 6, 22 2, 22 2" />
                  </>
                ) : (
                  // Single long conical root
                  <path d="M18 14 C18 5, 18 1, 18 1" strokeWidth="2.2" />
                )}
              </g>
            ) : (
              // Lower roots point downwards into mandibular bone
              <g stroke={tooth.status === "rct" ? "#D97706" : "#94A3B8"} strokeWidth="1.6" strokeLinecap="round" fill="none">
                {isMolar ? (
                  // Bi-rooted lower molar
                  <>
                    <path d="M10 24 C8 34, 12 45, 12 45" />
                    <path d="M26 24 C28 34, 24 45, 24 45" />
                  </>
                ) : (
                  // Single root
                  <path d="M18 24 C18 35, 18 45, 18 45" strokeWidth="2.2" />
                )}
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Surface Shorthand Tag (e.g. MO, MOD, O) */}
      <span className="text-[8px] font-mono font-bold tracking-tighter text-slate-600 h-2.5 overflow-hidden">
        {surfaceCode || (tooth.status !== "sound" ? tooth.status.slice(0, 3).toUpperCase() : "")}
      </span>

      {/* Lower tooth number footer */}
      {!isUpper && (
        <span
          className={`text-[10px] font-mono font-bold transition-colors ${
            isSelected ? "text-[#1E2D2B] font-extrabold" : "text-[#7E9691] group-hover:text-[#1E2D2B]"
          }`}
        >
          {tooth.id}
        </span>
      )}
    </button>
  );
};
