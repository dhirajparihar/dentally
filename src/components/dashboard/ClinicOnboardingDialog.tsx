"use client";

import { type FormEvent, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { flattenError } from "zod";
import { clinicOnboardingSchema, type ClinicOnboardingErrors, type ClinicOnboardingInput } from "@/lib/clinicOnboarding";
import { WorkspaceDialog } from "./WorkspaceDialog";

const inputClass = "w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] px-3 py-2 text-sm aria-[invalid=true]:border-rose-500";
const labelClass = "mb-1 block text-xs font-semibold text-[#111C3A]";

export function ClinicOnboardingDialog({ email, doctorName, onComplete }: {
  email: string;
  doctorName: string;
  onComplete: () => Promise<boolean>;
}) {
  const [details, setDetails] = useState<ClinicOnboardingInput>({
    name: "", phone: "", address: "", dentistName: doctorName, qualification: "", regNo: "",
  });
  const [fieldErrors, setFieldErrors] = useState<ClinicOnboardingErrors>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const showFieldErrors = (errors: ClinicOnboardingErrors) => {
    setFieldErrors(errors);
    const firstField = Object.keys(errors)[0];
    if (firstField) (formRef.current?.elements.namedItem(firstField) as HTMLInputElement | null)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setFieldErrors({});
    const result = clinicOnboardingSchema.safeParse(details);
    if (!result.success) {
      showFieldErrors(flattenError(result.error).fieldErrors);
      return;
    }

    submitting.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_onboarding", data: result.data }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.fieldErrors) {
          setFieldErrors(body.fieldErrors);
          return;
        }
        throw new Error(typeof body.error === "string" ? body.error : "Clinic setup could not be saved. Please try again.");
      }
      if (!(await onComplete())) throw new Error("Clinic setup was saved, but we couldn’t reload your clinic. Please try again.");
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError)
        ? err.message : "Could not connect to Dentally. Your details are still here. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const field = (name: keyof ClinicOnboardingInput, label: string, type = "text", autoComplete?: string) => {
    const id = `clinic-setup-${name}`;
    const message = fieldErrors[name]?.[0];
    return (
      <div>
        <label htmlFor={id} className={labelClass}>{label} <span className="text-rose-700" aria-hidden="true">*</span></label>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required
          className={inputClass}
          value={details[name]}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(event) => {
            setDetails({ ...details, [name]: event.target.value });
            if (message) setFieldErrors({ ...fieldErrors, [name]: undefined });
          }}
        />
        {message && <p className="mt-1 text-xs text-rose-700" id={`${id}-error`} role="alert">{message}</p>}
      </div>
    );
  };

  return (
    <WorkspaceDialog label="Set up your clinic">
      <div className="clinic-onboarding-panel rounded-2xl border border-[#E4E9F0] bg-white shadow-xl">
        <div className="shrink-0 border-b border-[#E4E9F0] px-4 py-4 sm:px-6">
          <h1 className="text-xl font-bold sm:text-2xl">Set up your clinic</h1>
          <p className="mt-1 text-sm text-[#52627A]">Enter your clinic and dentist details to get started.</p>
        </div>
        <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-col" aria-busy={saving}>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <fieldset disabled={saving} className="min-w-0">
              <legend className="mb-3 text-sm font-bold">Clinic Information</legend>
              <div className="workspace-form-grid">
                {field("name", "Clinic / Dental Studio Name", "text", "organization")}
                {field("phone", "Clinic Phone / WhatsApp Line", "tel", "tel")}
                <div className="sm:col-span-2">
                  <label htmlFor="clinic-setup-email" className={labelClass}>Account Email</label>
                  <input id="clinic-setup-email" type="email" autoComplete="email" readOnly value={email} className={`${inputClass} text-[#52627A]`} />
                </div>
                <div className="sm:col-span-2">{field("address", "Physical Address", "text", "street-address")}</div>
              </div>
            </fieldset>
            <fieldset disabled={saving} className="min-w-0 border-t border-[#E4E9F0] pt-3">
              <legend className="pr-2 text-sm font-bold">Attending Dentist Credentials</legend>
              <div className="workspace-form-grid">
                {field("dentistName", "Doctor Name", "text", "name")}
                {field("qualification", "Degree & Specialization")}
                <div className="sm:col-span-2">{field("regNo", "State Dental Council / DCI Registration Number")}</div>
              </div>
            </fieldset>
          </div>
          <div className="shrink-0 border-t border-[#E4E9F0] px-4 py-3 sm:px-6">
            {error && <p className="mb-2 text-xs text-rose-700" role="alert">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="workspace-button secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
              <button type="submit" className="workspace-button primary" disabled={saving}>{saving ? "Saving…" : "Complete Setup"}</button>
            </div>
          </div>
        </form>
      </div>
    </WorkspaceDialog>
  );
}
