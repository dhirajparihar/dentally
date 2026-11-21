"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import type { Patient } from "@/lib/mockData";
import { getPatientPhoneQuery, normalizePatientName, normalizePatientPhone } from "@/lib/patientSearch";
import { shiftAppointmentDate } from "@/lib/appointmentTime";

const fieldClass = "w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 outline-none focus:border-[#0089A8]";
const labelClass = "mb-1 block font-semibold text-[#111C3A]";

export function PatientRegistrationForm({ compact = false, initialSearch = "", onCancel, onSaved, onSelectExisting }: {
  compact?: boolean;
  initialSearch?: string;
  onCancel: () => void;
  onSaved: (patient: Patient) => void;
  onSelectExisting?: (patient: Patient) => void;
}) {
  const { patients, addPatient } = useClinic();
  const id = useId();
  const patientId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmedMatches, setConfirmedMatches] = useState("");
  const [form, setForm] = useState(() => {
    const phoneSearch = Boolean(getPatientPhoneQuery(initialSearch));
    return {
      name: phoneSearch ? "" : initialSearch,
      phone: phoneSearch ? initialSearch : "",
      age: "",
      gender: (compact ? "" : "Male") as Patient["gender"] | "",
      email: "",
      address: "",
      medicalAlerts: "",
      bloodGroup: compact ? "" : "O+",
      followUpDue: "",
    };
  });

  const normalizedName = normalizePatientName(form.name);
  const normalizedPhone = normalizePatientPhone(form.phone);
  const matches = patients.flatMap((patient) => {
    const sameName = Boolean(normalizedName) && normalizePatientName(patient.name) === normalizedName;
    const samePhone = Boolean(normalizedPhone) && normalizePatientPhone(patient.phone ?? "") === normalizedPhone;
    return sameName || samePhone ? [{ patient, exact: sameName && samePhone }] : [];
  });
  const exactMatch = matches.some(({ exact }) => exact);
  const matchIds = matches.map(({ patient }) => patient._id).join("|");
  const needsConfirmation = Boolean(matchIds) && confirmedMatches !== matchIds;

  const updateIdentity = (field: "name" | "phone", value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setConfirmedMatches("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || exactMatch || needsConfirmation) return;

    const age = Number(form.age);
    if (!normalizedName || !normalizedPhone || !form.age.trim() || !Number.isInteger(age) || age < 0 || !form.gender) {
      setError("Enter a name, mobile number, age, and gender.");
      return;
    }

    submitting.current = true;
    setIsSaving(true);
    setError("");
    patientId.current ??= `pat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const patient: Patient = {
      _id: patientId.current,
      name: form.name.trim(),
      phone: form.phone.trim(),
      age,
      gender: form.gender,
      email: form.email.trim(),
      address: form.address.trim(),
      medicalAlerts: form.medicalAlerts.trim() ? form.medicalAlerts.split(",").map((alert) => alert.trim()).filter(Boolean) : ["None"],
      bloodGroup: form.bloodGroup,
      registeredDate: new Date().toISOString().slice(0, 10),
      followUpDue: form.followUpDue.trim() || undefined,
      notes: [],
      history: [],
    };

    try {
      if (await addPatient(patient)) onSaved(patient);
      else setError("Could not register the patient. Try again.");
    } catch {
      setError("Could not register the patient. Try again.");
    } finally {
      submitting.current = false;
      setIsSaving(false);
    }
  };

  const additionalDetails = (
    <div className="space-y-3">
      <div className="workspace-form-grid">
        <div>
          <label className={labelClass} htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-blood-group`}>Blood Group</label>
          <select id={`${id}-blood-group`} value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} className={fieldClass}>
            <option value="">Unknown</option>
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => <option key={group}>{group}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${id}-address`}>Address / Locality</label>
        <input id={`${id}-address`} type="text" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${id}-alerts`}>Alerts / Allergies</label>
        <input id={`${id}-alerts`} type="text" placeholder="Separate alerts with commas" value={form.medicalAlerts} onChange={(event) => setForm({ ...form, medicalAlerts: event.target.value })} className={fieldClass} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass} htmlFor={`${id}-follow-up`}>Follow-up / Recall Due (Optional)</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setForm((prev) => ({ ...prev, followUpDue: shiftAppointmentDate(today, 7) }));
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#E4E9F0] text-[#0089A8] hover:bg-[#EDF7FA]"
            >
              +1 Wk
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setForm((prev) => ({ ...prev, followUpDue: shiftAppointmentDate(today, 14) }));
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#E4E9F0] text-[#0089A8] hover:bg-[#EDF7FA]"
            >
              +2 Wk
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 6);
                setForm((prev) => ({ ...prev, followUpDue: d.toISOString().slice(0, 10) }));
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#CDEBF2] bg-[#EDF7FA] text-[#00738E] font-semibold hover:bg-[#DDF1F6]"
            >
              +6 Mo
            </button>
            {form.followUpDue && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, followUpDue: "" }))}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded text-[#8291A7] hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <input
          id={`${id}-follow-up`}
          type="date"
          value={form.followUpDue}
          onChange={(event) => setForm({ ...form, followUpDue: event.target.value })}
          className={fieldClass}
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} aria-busy={isSaving}>
      <fieldset disabled={isSaving} className="min-w-0 space-y-3">
        <div>
          <label className={labelClass} htmlFor={`${id}-name`}>Full Name *</label>
          <input id={`${id}-name`} type="text" autoComplete="name" autoFocus={compact} required value={form.name} onChange={(event) => updateIdentity("name", event.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-phone`}>Mobile Number *</label>
          <input id={`${id}-phone`} type="tel" autoComplete="tel" required placeholder="+91 98201 44521" value={form.phone} onChange={(event) => updateIdentity("phone", event.target.value)} className={fieldClass} />
        </div>
        <div className="workspace-form-grid">
          <div>
            <label className={labelClass} htmlFor={`${id}-age`}>Age *</label>
            <input id={`${id}-age`} type="number" min="0" required value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${id}-gender`}>Gender *</label>
            <select id={`${id}-gender`} required value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Patient["gender"] | "" })} className={fieldClass}>
              <option value="" disabled>Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
            <p className="font-semibold">{exactMatch ? "A patient already has this name and mobile number." : "Possible duplicate patients"}</p>
            <ul role="list" className="max-h-32 space-y-1 overflow-y-auto">
              {matches.map(({ patient }) => (
                <li key={patient._id} className="flex flex-wrap items-center justify-between gap-x-3">
                  <span className="min-w-0 break-words"><strong>{patient.name}</strong> · {patient.phone}</span>
                  {onSelectExisting ? (
                    <button type="button" onClick={() => onSelectExisting(patient)} className="font-semibold text-[#00738E] hover:underline">Use this patient</button>
                  ) : (
                    <Link href={`/dashboard/patients/${encodeURIComponent(patient._id)}`} className="font-semibold text-[#00738E] hover:underline">View patient</Link>
                  )}
                </li>
              ))}
            </ul>
            {!exactMatch && (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4 !min-h-0" checked={!needsConfirmation} onChange={(event) => setConfirmedMatches(event.target.checked ? matchIds : "")} />
                Register a different patient
              </label>
            )}
          </div>
        )}

        {compact ? (
          <details className="rounded-xl border border-[#E4E9F0] bg-white px-3">
            <summary className="cursor-pointer py-2.5 font-semibold text-[#00738E]">Additional registration details</summary>
            <div className="pb-3">{additionalDetails}</div>
          </details>
        ) : additionalDetails}

        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#E4E9F0] pt-3">
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 font-semibold text-[#64748B] hover:bg-[#EDF7FA]">
            {compact ? "Back to Appointment" : "Cancel"}
          </button>
          <button type="submit" disabled={isSaving || exactMatch || needsConfirmation} className="rounded-xl bg-[#0089A8] px-5 py-2 font-semibold text-white hover:bg-[#00738E] disabled:opacity-50">
            {isSaving ? "Saving…" : compact ? "Register Patient" : "Add Patient"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
