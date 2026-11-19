"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { AppointmentTreatment } from "@/lib/appointmentTreatments";

export function TreatmentPicker({ presets, value, onChange }: {
  presets: readonly AppointmentTreatment[];
  value: string;
  onChange: (preset: AppointmentTreatment) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matches = presets.filter(({ name }) => name.toLowerCase().includes(query));

  useEffect(() => {
    if (expanded) searchInput.current?.focus();
  }, [expanded]);

  const close = () => {
    setExpanded(false);
    setSearch("");
  };

  const select = (preset: AppointmentTreatment) => {
    onChange(preset);
    close();
    trigger.current?.focus();
  };

  return (
    <div
      className="relative space-y-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (expanded && event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          close();
          trigger.current?.focus();
        }
      }}
    >
      <span id={`${id}-label`} className="block font-semibold text-[#111C3A]">Treatment</span>
      <button
        ref={trigger}
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-options` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        className="workspace-search w-full justify-between text-left text-sm font-medium hover:border-[#0089A8]"
        onClick={() => expanded ? close() : setExpanded(true)}
      >
        <span id={`${id}-value`} className="min-w-0 break-words text-[#111C3A]">{value}</span>
        <ChevronDown size={15} className={expanded ? "rotate-180" : undefined} aria-hidden="true" />
      </button>

      {expanded && (
        <div id={`${id}-options`} className="absolute inset-x-0 top-full z-20 space-y-1 rounded-xl border border-[#DCE7ED] bg-white p-1 shadow-lg">
          <div className="workspace-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchInput}
              type="search"
              aria-label="Search treatments"
              autoComplete="off"
              placeholder="Search treatments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                if (matches.length === 1) select(matches[0]);
              }}
            />
          </div>
          {matches.length ? (
            <ul role="list" className="max-h-44 overflow-y-auto overscroll-contain">
              {matches.map((preset) => (
                <li key={preset.name}>
                  <button
                    type="button"
                    aria-current={preset.name === value ? "true" : undefined}
                    className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-[#E5F4F8] aria-[current=true]:bg-[#F1F8FA]"
                    onClick={() => select(preset)}
                  >
                    <span className="min-w-0 break-words font-semibold">{preset.name}</span>
                    <span className="shrink-0 text-[#64748B]">{preset.duration} min</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p role="status" className="px-2.5 py-3 text-xs text-[#64748B]">No matching treatments.</p>}
        </div>
      )}
    </div>
  );
}
