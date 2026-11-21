"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { WorkspaceDialog } from "./WorkspaceDialog";

const PatientRegistrationForm = dynamic(
  () => import("./PatientRegistrationForm").then((module) => module.PatientRegistrationForm),
  { ssr: false, loading: () => <p role="status">Loading patient form…</p> }
);

export function AddPatientDialog({ onClose }: { onClose: () => void }) {
  return (
    <WorkspaceDialog label="Add patient" onDismiss={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[#E4E9F0] bg-white p-6 text-xs shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#E4E9F0] pb-3">
          <h2 className="text-base font-bold text-[#111C3A]">Add Patient</h2>
          <button type="button" onClick={onClose} aria-label="Close add patient form" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#52627A] hover:bg-[#EDF7FA] hover:text-[#111C3A]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">
          <PatientRegistrationForm onCancel={onClose} onSaved={onClose} />
        </div>
      </div>
    </WorkspaceDialog>
  );
}
