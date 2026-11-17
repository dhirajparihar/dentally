"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PatientDetails } from "@/components/dashboard/PatientDetails";
import { useClinic } from "@/context/ClinicContext";

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  const { patients, fees, payments, appointments, loading, updatePatient, recordPayment, addFee, bookAppointment } = useClinic();
  const patient = patients.find((entry) => entry._id === patientId);

  if (loading) {
    return <div role="status" className="p-8 text-[#586B67]">Loading patient details...</div>;
  }

  if (!patient) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#DCE2DE] bg-white p-8">
        <h1 className="text-xl font-bold text-[#1E2D2B]">Patient not found</h1>
        <p className="text-[#586B67]">This patient record is unavailable. Select a patient from the directory.</p>
        <Link href="/dashboard/patients" className="inline-block font-semibold text-[#2F8EAC]">Back to Patients</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-sm text-[#586B67]">
        <Link href="/dashboard/patients" className="font-semibold text-[#2F8EAC]">Patients</Link>
        <span className="mx-2">/</span>{patient.name}
      </nav>
      <PatientDetails
        key={patient._id}
        patient={patient}
        onBack={() => router.push("/dashboard/patients")}
        onUpdatePatient={updatePatient}
        fees={fees}
        payments={payments}
        appointments={appointments}
        onAddPayment={recordPayment}
        onAddFee={addFee}
        onBookAppointment={bookAppointment}
      />
    </div>
  );
}
