"use client";

import { useId } from "react";
import type { AppointmentTreatment } from "@/lib/appointmentTreatments";

const fieldClass = "w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 outline-none focus:border-[#0089A8]";

export function FeeProcedurePicker({ treatments, value, onChange }: {
  treatments: readonly AppointmentTreatment[];
  value: string;
  onChange: (procedureName: string, suggestedAmount: string) => void;
}) {
  const id = useId();

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block font-semibold text-[#111C3A]">Procedure Name *</label>
      <select
        id={id}
        required
        value={treatments.some(({ name }) => name === value) ? value : ""}
        className={fieldClass}
        onChange={(event) => {
          const treatment = treatments.find(({ name }) => name === event.target.value);
          if (treatment) onChange(treatment.name, treatment.charge?.toString() ?? "");
        }}
      >
        <option value="" disabled>Select a procedure</option>
        {treatments.map(({ name, charge }) => (
          <option key={name} value={name}>
            {name}{charge == null ? "" : ` (₹${charge.toLocaleString("en-IN")})`}
          </option>
        ))}
      </select>
    </div>
  );
}
