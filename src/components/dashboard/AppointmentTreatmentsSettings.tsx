"use client";

import { type FormEvent, useRef, useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { getAppointmentTreatments } from "@/lib/appointmentTreatments";
import { appointmentTreatmentsSchema } from "@/lib/validations/clinic";

const inputClass = "w-full min-w-0 rounded-xl border border-[#E4E9F0] bg-white px-3 py-2 text-sm text-[#111C3A]";
const columns = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6rem_2.75rem]";

export function AppointmentTreatmentsSettings() {
  const { clinicProfile, saveAppointmentTreatments } = useClinic();
  const [rows, setRows] = useState(() => getAppointmentTreatments(clinicProfile.appointmentTreatments).map(
    ({ name, duration, charge }, id) => ({ id, name, duration: String(duration), charge: charge?.toString() ?? "" })
  ));
  const nextId = useRef(rows.length);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const updateRow = (id: number, field: "name" | "duration" | "charge", value: string) => {
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const result = appointmentTreatmentsSchema.safeParse(rows.map(({ name, duration, charge }) => ({
      name,
      duration: Number(duration),
      charge: charge.trim() ? Number(charge) : null,
    })));
    if (!result.success) {
      setMessage({ text: result.error.issues[0].message, error: true });
      return;
    }

    setMessage(null);
    setSaving(true);
    try {
      const saved = await saveAppointmentTreatments(result.data);
      setMessage(saved
        ? { text: "Treatment catalog saved.", error: false }
        : { text: "Could not save treatments. Try again.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="appointment-treatments-heading" className="space-y-4 rounded-[22px] border border-[#E4E9F0] bg-white p-6 sm:p-7">
      <div className="flex items-center gap-2.5 border-b border-[#E4E9F0] pb-3">
        <Calendar size={16} className="text-[#0089A8]" aria-hidden="true" />
        <h3 id="appointment-treatments-heading" className="text-base font-bold text-[#111C3A]">Treatment Catalog</h3>
      </div>
      <form onSubmit={handleSubmit} aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 space-y-2">
          <div className={`${columns} hidden text-xs font-semibold text-[#52627A] sm:grid`} aria-hidden="true">
            <span>Treatment name</span><span>Minutes</span><span>Charge (₹)</span>
          </div>
          {rows.map((row, index) => (
            <div key={row.id} className={`${columns} border-b border-[#E4E9F0] pb-3 sm:border-0 sm:pb-0`}>
              <input
                type="text"
                required
                aria-label={`Treatment ${index + 1} name`}
                value={row.name}
                onChange={(event) => updateRow(row.id, "name", event.target.value)}
                className={`${inputClass} col-span-2 sm:col-span-1`}
              />
              <div className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1">
                <span className="mb-1 block text-xs text-[#52627A] sm:hidden" aria-hidden="true">Minutes</span>
                <input
                  type="number"
                  required
                  min={5}
                  max={480}
                  step={1}
                  aria-label={`Treatment ${index + 1} duration in minutes`}
                  value={row.duration}
                  onChange={(event) => updateRow(row.id, "duration", event.target.value)}
                  className={`${inputClass} px-2`}
                />
              </div>
              <div className="col-span-2 col-start-2 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                <span className="mb-1 block text-xs text-[#52627A] sm:hidden" aria-hidden="true">Charge (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={`Treatment ${index + 1} default charge in rupees`}
                  placeholder="Optional"
                  value={row.charge}
                  onChange={(event) => updateRow(row.id, "charge", event.target.value)}
                  className={`${inputClass} px-2`}
                />
              </div>
              <button
                type="button"
                disabled={rows.length === 1}
                aria-label={`Remove ${row.name || `treatment ${index + 1}`}`}
                className="col-start-3 row-start-1 grid min-h-10 place-items-center rounded-xl text-[#64748B] hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 sm:col-start-4"
                onClick={() => {
                  setRows((previous) => previous.filter(({ id }) => id !== row.id));
                  setMessage(null);
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button type="button" className="workspace-button secondary small" onClick={() => {
              const id = nextId.current++;
              setRows((previous) => [...previous, { id, name: "", duration: "30", charge: "" }]);
              setMessage(null);
            }}>
              <Plus size={15} aria-hidden="true" /> Add Treatment
            </button>
            <button type="submit" className="workspace-button primary small">{saving ? "Saving…" : "Save Treatments"}</button>
          </div>
        </fieldset>
        {message && <p role={message.error ? "alert" : "status"} className={`mt-3 text-xs ${message.error ? "text-rose-700" : "text-emerald-700"}`}>{message.text}</p>}
      </form>
    </section>
  );
}
