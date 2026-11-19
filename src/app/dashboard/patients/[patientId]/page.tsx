"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PatientDetails } from "@/components/dashboard/PatientDetails";
import { useClinic } from "@/context/ClinicContext";
import { findBookedFollowUp } from "@/lib/appointmentTime";

const loadingPatient = <div role="status" className="p-8 text-[#64748B]">Loading patient details...</div>;

function PatientDetailContent() {
  const { patientId } = useParams<{ patientId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { patients, fees, payments, appointments, loading, updatePatient, deletePatient, recordPayment, addFee } = useClinic();
  const patient = patients.find((entry) => entry._id === patientId);

  if (loading) return loadingPatient;

  if (!patient) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#E4E9F0] bg-white p-8">
        <h1 className="text-xl font-bold text-[#111C3A]">Patient not found</h1>
        <p className="text-[#64748B]">This patient record is unavailable. Select a patient from the directory.</p>
        <Link href="/dashboard/patients" className="inline-block font-semibold text-[#0089A8]">Back to Patients</Link>
      </div>
    );
  }

  const followUpId = search.get("followUp");
  const visitId = search.get("visit");
  const patientVisits = appointments.filter((visit) => visit.patientId === patient._id);
  const source = patientVisits.find((visit) => visit._id === followUpId && visit.status === "completed");
  const bookedVisit = visitId
    ? patientVisits.find((visit) => visit._id === visitId)
    : source && findBookedFollowUp(patientVisits, source._id);

  return (
    <div className="space-y-4">
      {((visitId && !bookedVisit) || (followUpId && !source && !bookedVisit)) && (
        <p role="status" className="rounded-xl border border-[#E4E9F0] bg-white p-3 text-xs text-[#64748B]">This visit is unavailable. You can view the patient&apos;s other visits below.</p>
      )}
      <PatientDetails
        key={`${patient._id}:${followUpId ?? ""}:${visitId ?? ""}`}
        patient={patient}
        onBack={() => router.push("/dashboard/patients")}
        onUpdatePatient={updatePatient}
        onDeletePatient={async (id: string) => {
          const success = await deletePatient(id);
          if (success) {
            router.push("/dashboard/patients");
          }
          return success;
        }}
        fees={fees}
        payments={payments}
        appointments={appointments}
        onAddPayment={recordPayment}
        onAddFee={addFee}
        openVisits={Boolean(followUpId || visitId)}
        initialFollowUpSource={bookedVisit || visitId ? undefined : source}
        focusedVisitId={bookedVisit?._id}
      />
    </div>
  );
}

export default function PatientDetailPage() {
  return <Suspense fallback={loadingPatient}><PatientDetailContent /></Suspense>;
}
