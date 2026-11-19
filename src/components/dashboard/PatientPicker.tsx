"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { Patient } from "@/lib/mockData";

export function PatientPicker({ patients, value, onChange }: {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
}) {
  const id = useId();
  const listId = `${id}-patients`;
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const selected = patients.find((patient) => patient._id === value);
  const query = (search ?? "").trim().toLowerCase();
  const matches = patients.filter((patient) => patient.name.toLowerCase().includes(query));
  const activeIndex = matches.findIndex((patient) => patient._id === activePatientId);
  const activeOption = expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;
  const needsSelection = !expanded && search !== null && !selected;

  useEffect(() => {
    if (activeOption) document.getElementById(activeOption)?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  const open = (target: HTMLInputElement | null) => {
    if (search === null) target?.select();
    setExpanded(true);
  };

  const close = () => {
    setExpanded(false);
    setActivePatientId(null);
  };

  const selectPatient = (patient: Patient) => {
    onChange(patient._id);
    setSearch(null);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        setExpanded(true);
        if (!matches.length) return;
        const down = event.key === "ArrowDown";
        const next = activeIndex < 0
          ? down ? 0 : matches.length - 1
          : Math.max(0, Math.min(matches.length - 1, activeIndex + (down ? 1 : -1)));
        setActivePatientId(matches[next]._id);
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (!expanded) {
          setExpanded(true);
          return;
        }
        const match = matches[activeIndex] ?? (matches.length === 1 ? matches[0] : undefined);
        if (match) selectPatient(match);
        break;
      }
      case "Escape":
        if (expanded) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
    }
  };

  return (
    <div className="space-y-1.5" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <label htmlFor={id} className="block font-semibold text-[#111C3A]">Patient *</label>
      <div className="fee-patient-picker">
        <div className="workspace-search fee-patient-field">
          <Search size={15} aria-hidden="true" />
          <input
            ref={input}
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={activeOption}
            aria-describedby={needsSelection ? `${id}-selection` : undefined}
            required
            placeholder="Type a patient name"
            value={search ?? selected?.name ?? ""}
            onFocus={(event) => open(event.currentTarget)}
            onClick={(event) => open(event.currentTarget)}
            onChange={(event) => {
              setSearch(event.target.value);
              setActivePatientId(null);
              setExpanded(true);
              if (value) onChange("");
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={expanded ? "Close patient list" : "Show patient list"}
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (expanded) close();
              else {
                input.current?.focus();
                open(input.current);
              }
            }}
          >
            <ChevronDown size={15} className={expanded ? "rotate-180" : undefined} aria-hidden="true" />
          </button>
        </div>
        {expanded && (
          <div className="fee-patient-dropdown">
            <ul id={listId} role="listbox" aria-label="Matching patients">
              {matches.map((patient, index) => (
                <li
                  key={patient._id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={patient._id === value}
                  data-active={index === activeIndex}
                  className="fee-patient-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPatient(patient)}
                >
                  <span className="min-w-0 break-words font-semibold">{patient.name}</span>
                  <span className="break-all text-[11px] text-[#64748B]">{patient.phone || patient._id}</span>
                </li>
              ))}
            </ul>
            {matches.length === 0 && <p role="status" className="p-3 text-[#64748B]">No matching patients.</p>}
          </div>
        )}
      </div>
      {selected && <p className="text-[11px] text-[#64748B]">{selected.phone || selected._id}</p>}
      {needsSelection && <p id={`${id}-selection`} className="text-[11px] text-[#64748B]">Select a patient from the list.</p>}
    </div>
  );
}
